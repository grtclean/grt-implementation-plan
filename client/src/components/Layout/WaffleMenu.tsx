import { useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { FlaskConical } from "lucide-react";
import { WAFFLE_APPS, type WaffleApp, type MenuGroup } from "@/config/menuConfig";
import { cn } from "@/lib/utils";

interface WaffleMenuProps {
  open: boolean;
  onClose: () => void;
  activeAppId: string;
  onSelectApp: (app: WaffleApp) => void;
  language: string;
  filteredMenuConfig: MenuGroup[];
}

export default function WaffleMenu({
  open,
  onClose,
  activeAppId,
  onSelectApp,
  language,
  filteredMenuConfig,
}: WaffleMenuProps) {
  const [, navigate] = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Close on click outside / Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onCloseRef.current();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // RBAC: only show apps whose menu groups survive filtering
  const filteredGroupNames = useMemo(
    () => new Set(filteredMenuConfig.map((g) => g.name)),
    [filteredMenuConfig]
  );
  const visibleApps = useMemo(
    () => WAFFLE_APPS.filter((app) => app.menuGroupNames.some((gn) => filteredGroupNames.has(gn))),
    [filteredGroupNames]
  );

  if (!open) return null;

  const getAppName = (app: WaffleApp) => {
    switch (language) {
      case "zh": return app.name;
      case "de": return app.nameDe || app.nameEn;
      case "fr": return app.nameFr || app.nameEn;
      default: return app.nameEn;
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-12 left-0 z-[60] bg-white border border-[#edebe9] rounded-lg shadow-xl p-3 waffle-enter"
      style={{ width: 288 }}
    >
      <div className="grid grid-cols-4 gap-1">
        {visibleApps.map((app) => {
          const Icon = app.icon;
          const isActive = app.id === activeAppId;
          return (
            <button
              key={app.id}
              onClick={() => onSelectApp(app)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-md transition-colors hover:bg-[#f3f2f1]",
                isActive && "ring-2 ring-[#0078d4] bg-[#eff6fc]"
              )}
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center"
                style={{ backgroundColor: app.color }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] text-[#323130] font-medium text-center leading-tight line-clamp-1 w-full">
                {getAppName(app)}
              </span>
            </button>
          );
        })}
      </div>
      {/* Sandbox Center quick entry */}
      <div className="border-t border-[#edebe9] mt-2 pt-2">
        <button
          onClick={() => { navigate("/sandbox"); onClose(); }}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-[#323130] hover:bg-[#f3f2f1] transition-colors"
        >
          <FlaskConical className="w-4 h-4 text-[#0078d4]" />
          <span className="font-medium">
            {language === "zh" ? "沙盘中心" : language === "de" ? "Sandbox-Center" : language === "fr" ? "Centre Sandbox" : "Sandbox Center"}
          </span>
          <span className="ml-auto text-xs text-[#a19f9d]">&rarr;</span>
        </button>
      </div>
    </div>
  );
}
