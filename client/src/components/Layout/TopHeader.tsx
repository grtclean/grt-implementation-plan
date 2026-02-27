import BrandLogo from "@/components/common/BrandLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSelector from "@/components/LanguageSelector";
import { TopBarSearch } from "@/components/TopBarSearch";
import {
  Bell,
  ChevronDown,
  Grid3X3,
  HelpCircle,
  LogOut,
  Menu,
  PenSquare,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopHeaderProps {
  language: string;
  aiCanvasOpen: boolean;
  onToggleAiCanvas: () => void;
  helpPanelOpen: boolean;
  onToggleHelpPanel: () => void;
  alertCount: number;
  onNavigate: (path: string) => void;
  waffleOpen: boolean;
  onWaffleToggle: () => void;
  mobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  user: { name?: string; email?: string; openId?: string } | null;
  resolvedDisplayName: string;
  avatarInitial: string;
  logout: () => void;
}

export default function TopHeader({
  language,
  aiCanvasOpen,
  onToggleAiCanvas,
  onToggleHelpPanel,
  alertCount,
  onNavigate,
  waffleOpen,
  onWaffleToggle,
  mobileSidebarOpen,
  onToggleMobileSidebar,
  user,
  resolvedDisplayName,
  avatarInitial,
  logout,
}: TopHeaderProps) {
  return (
    <header className="h-12 bg-white border-b border-[#edebe9] flex items-center px-3 shrink-0 z-50 relative">
      {/* Left: Hamburger (mobile) + Waffle (desktop) + Brand */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Hamburger — mobile only */}
        <button
          onClick={onToggleMobileSidebar}
          className={cn(
            "w-9 h-9 flex md:hidden items-center justify-center rounded-md transition-colors",
            mobileSidebarOpen
              ? "bg-[#eff6fc] text-[#0078d4]"
              : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]"
          )}
          title={language === "zh" ? "菜单" : "Menu"}
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Waffle — desktop only */}
        <button
          onClick={onWaffleToggle}
          className={cn(
            "w-9 h-9 hidden md:flex items-center justify-center rounded-md transition-colors",
            waffleOpen
              ? "bg-[#eff6fc] text-[#0078d4]"
              : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]"
          )}
          title={language === "zh" ? "应用启动器" : "App launcher"}
        >
          <Grid3X3 className="w-5 h-5" />
        </button>
        <a href="/" className="flex items-center gap-2" title="GRT System">
          <span className="font-bold text-sm text-[#323130] select-none leading-none">
            GRT
            <span className="font-normal text-xs text-[#605e5c] ml-1">System</span>
          </span>
          <BrandLogo size="sm" variant="icon" />
        </a>
      </div>

      {/* Center: Search (desktop only) */}
      <div className="flex-1 hidden md:flex justify-center px-8 max-w-xl mx-auto">
        <TopBarSearch />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 ml-auto">
        {/* AI Canvas trigger (desktop only) */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 gap-1.5 text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1] hidden md:flex",
            aiCanvasOpen && "bg-[#eff6fc] text-[#0078d4]"
          )}
          onClick={onToggleAiCanvas}
          title={language === "zh" ? "AI 画布 (Alt+A)" : "AI Canvas (Alt+A)"}
        >
          <PenSquare className="w-4 h-4" />
          <span className="text-xs font-medium hidden xl:inline">
            {language === "zh" ? "AI画布" : "AI Canvas"}
          </span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1] relative"
          title={language === "zh" ? "通知" : "Notifications"}
          onClick={() => onNavigate("/notifications")}
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </Button>

        {/* Language (desktop) */}
        <div className="hidden md:block">
          <LanguageSelector variant="header" />
        </div>

        {/* Help (desktop) */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1] hidden md:flex"
          onClick={onToggleHelpPanel}
          title={language === "zh" ? "帮助 (F1)" : "Help (F1)"}
        >
          <HelpCircle className="w-4 h-4" />
        </Button>

        {/* User Profile Dropdown (desktop) */}
        {user && (
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-accent transition-colors">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {avatarInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden xl:inline">
                    {resolvedDisplayName}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 border-b border-border">
                  <p className="text-sm font-medium">{resolvedDisplayName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email || ""}
                  </p>
                </div>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => onNavigate("/user-profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>
                    {language === "zh" ? "个人资料" : "Profile"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>
                    {language === "zh" ? "退出登录" : "Sign out"}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
