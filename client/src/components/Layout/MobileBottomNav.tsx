import { useLocation } from "wouter";
import { Bot, LayoutDashboard, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  language: string;
  alertCount: number;
  onNavigate: (path: string) => void;
}

const TABS = [
  {
    id: "messages",
    icon: MessageSquare,
    labelZh: "消息",
    labelEn: "Messages",
    path: "/notifications",
    match: (loc: string) => loc.startsWith("/notification"),
    showBadge: true,
  },
  {
    id: "workspace",
    icon: LayoutDashboard,
    labelZh: "工作台",
    labelEn: "Workspace",
    path: "/my-workspace",
    match: (loc: string) =>
      loc === "/" || loc === "/my-workspace" || loc === "/dashboard",
    showBadge: false,
  },
  {
    id: "ai",
    icon: Bot,
    labelZh: "AI助手",
    labelEn: "AI",
    path: "/ai-hub",
    match: (loc: string) => loc.startsWith("/ai"),
    showBadge: false,
  },
  {
    id: "me",
    icon: User,
    labelZh: "我的",
    labelEn: "Me",
    path: "/user-profile",
    match: (loc: string) => loc.startsWith("/user-profile"),
    showBadge: false,
  },
] as const;

export default function MobileBottomNav({
  language,
  alertCount,
  onNavigate,
}: MobileBottomNavProps) {
  const [location] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#edebe9] safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match(location);
          const label = language === "zh" ? tab.labelZh : tab.labelEn;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                isActive ? "text-[#0078d4]" : "text-[#a19f9d]"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.showBadge && alertCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 text-[8px] font-bold text-white bg-red-500 rounded-full">
                    {alertCount > 99 ? "99+" : alertCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
