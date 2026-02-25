import { useEffect, useRef } from "react";
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
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Delay adding listener to avoid the toggle click immediately closing
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Filter apps based on RBAC — hide apps whose menu groups are all filtered out
  const filteredGroupNames = new Set(filteredMenuConfig.map((g) => g.name));
  const visibleApps = WAFFLE_APPS.filter((app) =>
    app.menuGroupNames.some((gn) => filteredGroupNames.has(gn))
  );

  const getAppName = (app: WaffleApp) => {
    switch (language) {
      case "zh":
        return app.name;
      case "de":
        return app.nameDe || app.nameEn;
      case "fr":
        return app.nameFr || app.nameEn;
      default:
        return app.nameEn;
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-12 left-0 z-[60] bg-white border border-[#edebe9] rounded-lg shadow-xl p-4 waffle-enter"
      style={{ minWidth: 280 }}
    >
      <div className="text-xs font-semibold text-[#605e5c] uppercase tracking-wider mb-3 px-1">
        {language === "zh" ? "应用" : "Apps"}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {visibleApps.map((app) => {
          const Icon = app.icon;
          const isActive = app.id === activeAppId;
          return (
            <button
              key={app.id}
              onClick={() => onSelectApp(app)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-lg transition-colors hover:bg-[#f3f2f1]",
                isActive && "ring-2 ring-[#0078d4] bg-[#eff6fc]"
              )}
            >
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center"
                style={{ backgroundColor: app.color }}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] text-[#323130] font-medium text-center leading-tight line-clamp-2">
                {getAppName(app)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
