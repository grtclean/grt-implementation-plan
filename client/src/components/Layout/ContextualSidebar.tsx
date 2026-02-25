import { useRef, useState, useCallback, useLayoutEffect } from "react";
import { Link, useLocation } from "wouter";
import BrandLogo from "@/components/common/BrandLogo";
import FeedbackDialog from "@/components/FeedbackDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { MenuCustomizationPanel } from "@/components/MenuCustomizationPanel";
import { SidebarMenuGroup } from "@/components/Layout/SidebarMenuGroup";
import type { MenuGroup, MenuItem, WaffleApp } from "@/config/menuConfig";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
} from "lucide-react";

interface ContextualSidebarProps {
  activeApp: WaffleApp;
  filteredMenuConfig: MenuGroup[];
  expandedGroups: string[];
  onToggleGroup: (name: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  favoriteItems: MenuItem[];
  language: string;
  currentBU: string | null;
  alertCount: number;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onNavigate: (path: string) => void;
  user: { name?: string; email?: string; openId?: string } | null;
  resolvedDisplayName: string;
  avatarInitial: string;
  logout: () => void;
}

export default function ContextualSidebar({
  activeApp,
  filteredMenuConfig,
  expandedGroups,
  onToggleGroup,
  onExpandAll,
  onCollapseAll,
  favoriteItems,
  language,
  currentBU,
  alertCount,
  sidebarCollapsed,
  onToggleSidebar,
  onNavigate,
  user,
  resolvedDisplayName,
  avatarInitial,
  logout,
}: ContextualSidebarProps) {
  const [location] = useLocation();

  // Only show groups belonging to the active app
  const activeGroups = filteredMenuConfig.filter((g) =>
    activeApp.menuGroupNames.includes(g.name)
  );

  // Only show favorites that belong to current app
  const appFavorites = favoriteItems.filter((item) =>
    activeGroups.some((g) => g.items.some((i) => i.path === item.path))
  );

  // Scroll management
  const navRef = useRef<HTMLElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const showScrollTopRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  const handleNavScroll = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (navRef.current) {
        const { scrollTop } = navRef.current;
        const shouldShow = scrollTop > 200;
        if (shouldShow !== showScrollTopRef.current) {
          showScrollTopRef.current = shouldShow;
          setShowScrollTop(shouldShow);
        }
        sessionStorage.setItem("sidebarScrollPosition", String(scrollTop));
      }
    });
  }, []);

  useLayoutEffect(() => {
    const saved = sessionStorage.getItem("sidebarScrollPosition");
    if (saved && navRef.current) {
      navRef.current.scrollTop = parseInt(saved, 10);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    navRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Breadcrumb helper
  const getLocalizedName = (item: { name: string; nameEn: string; nameDe?: string; nameFr?: string }) => {
    switch (language) {
      case "zh": return item.name;
      case "de": return item.nameDe || item.nameEn;
      case "fr": return item.nameFr || item.nameEn;
      default: return item.nameEn;
    }
  };

  // --- COLLAPSED MODE ---
  if (sidebarCollapsed) {
    const AppIcon = activeApp.icon;
    return (
      <aside className="hidden md:flex flex-col bg-white border-r border-[#edebe9] w-14 shrink-0 z-40">
        <div className="p-2 border-b border-[#edebe9] flex flex-col items-center gap-2">
          <a href="/" className="block" title="GRT System">
            <BrandLogo size="sm" variant="icon" />
          </a>
          <button
            onClick={onToggleSidebar}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f3f2f1] transition-colors text-[#605e5c]"
            title="Expand sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto overscroll-contain">
          {/* Active app icon at top */}
          <div className="relative group mb-2">
            <div
              className="flex items-center justify-center w-full p-2 rounded-md bg-[#eff6fc]"
            >
              <AppIcon className="w-5 h-5" style={{ color: activeApp.color }} />
            </div>
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white text-[#323130] text-sm rounded-md shadow-lg border border-[#edebe9] opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 pointer-events-none">
              {getLocalizedName(activeApp)}
            </div>
          </div>

          {activeGroups.map((group) => {
            const GroupIcon = group.icon;
            const hasActiveItem = group.items.some((item) => location === item.path);
            return (
              <div key={group.name} className="relative group">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLButtonElement).blur();
                    onToggleGroup(group.name);
                  }}
                  className={cn(
                    "flex items-center justify-center w-full p-2 rounded-md transition-colors duration-150 focus:outline-none",
                    hasActiveItem
                      ? "bg-[#eff6fc] text-[#0078d4]"
                      : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]"
                  )}
                >
                  <GroupIcon className="w-5 h-5" />
                </button>
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white text-[#323130] text-sm rounded-md shadow-lg border border-[#edebe9] opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 pointer-events-none">
                  {getLocalizedName(group)}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-2 border-t border-[#edebe9] space-y-2">
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="w-full text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>
    );
  }

  // --- EXPANDED MODE ---
  const AppIcon = activeApp.icon;

  // Find current breadcrumb
  let currentGroup: MenuGroup | null = null;
  let currentItem: MenuItem | null = null;
  for (const group of activeGroups) {
    const item = group.items.find((i) => i.path === location);
    if (item) {
      currentGroup = group;
      currentItem = item;
      break;
    }
  }

  return (
    <aside className="hidden md:flex flex-col bg-white border-r border-[#edebe9] w-72 shrink-0 z-40 transition-[width] duration-200">
      <div className="flex flex-col h-full">
        {/* App header */}
        <div className="h-12 flex items-center px-4 shrink-0 border-b border-[#edebe9] gap-3">
          <div
            className="w-7 h-7 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: activeApp.color }}
          >
            <AppIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-[#323130] truncate flex-1">
            {getLocalizedName(activeApp)}
          </span>
          <button
            onClick={onToggleSidebar}
            className="w-8 h-8 hidden lg:flex items-center justify-center rounded-md hover:bg-[#f3f2f1] transition-colors text-[#605e5c]"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Breadcrumb */}
        {currentItem && location !== "/" && (
          <div className="flex-shrink-0 px-3 py-2 border-b border-sidebar-border/50 bg-sidebar-accent/20">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">
                {language === "zh" ? "当前位置" : language === "de" ? "Aktuell" : language === "fr" ? "Actuel" : "Current"}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
              <button
                onClick={() => {
                  if (currentGroup && !expandedGroups.includes(currentGroup.name)) {
                    onToggleGroup(currentGroup.name);
                  }
                  setTimeout(() => {
                    const el = document.querySelector(`[data-menu-group="${currentGroup?.name}"]`);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }}
                className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer"
              >
                {currentGroup ? getLocalizedName(currentGroup) : ""}
              </button>
              <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
              <span className="text-primary font-medium truncate">
                {getLocalizedName(currentItem)}
              </span>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex-shrink-0 px-3 py-1 border-b border-sidebar-border/30 flex items-center justify-between">
          <MenuCustomizationPanel />
          <div className="flex items-center gap-1">
            <button
              onClick={onExpandAll}
              className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-sm transition-colors"
            >
              {language === "zh" ? "展开" : language === "de" ? "Aufklappen" : language === "fr" ? "Déplier" : "Expand"}
            </button>
            <span className="text-muted-foreground/30">|</span>
            <button
              onClick={onCollapseAll}
              className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-sm transition-colors"
            >
              {language === "zh" ? "收起" : language === "de" ? "Zuklappen" : language === "fr" ? "Replier" : "Collapse"}
            </button>
          </div>
        </div>

        {/* Favorites */}
        {appFavorites.length > 0 && (
          <div className="flex-shrink-0 px-3 py-2 border-b border-sidebar-border/30 bg-sidebar-accent/10">
            <div className="flex flex-wrap gap-1">
              {appFavorites.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{getLocalizedName(item)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable menu area */}
        <div className="flex-1 min-h-0 relative">
          <nav
            ref={navRef}
            className="h-full overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 overscroll-contain touch-pan-y sidebar-scroll custom-scrollbar"
            style={{ WebkitOverflowScrolling: "touch" }}
            onScroll={handleNavScroll}
          >
            {activeGroups.map((group) => {
              const activeItem = group.items.find((item) => location === item.path);
              return (
                <SidebarMenuGroup
                  key={group.name}
                  group={group}
                  isExpanded={expandedGroups.includes(group.name)}
                  hasActiveItem={!!activeItem}
                  activeItemPath={activeItem?.path ?? null}
                  language={language}
                  currentBU={currentBU}
                  alertCount={alertCount}
                  onToggle={onToggleGroup}
                  onNavigate={onNavigate}
                />
              );
            })}

            <div className="pt-4 mt-4 border-t border-sidebar-border/50">
              <FeedbackDialog />
            </div>
          </nav>

          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-lg transition-colors duration-150 z-10"
              title={language === "zh" ? "返回顶部" : "Back to top"}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              {language === "zh" ? "返回顶部" : "Top"}
            </button>
          )}
        </div>

        {/* Footer: ProfileSwitcher + User info */}
        <div className="shrink-0 border-t border-[#edebe9] p-4 bg-white space-y-3 z-10">
          <ProfileSwitcher />
          {user && (
            <div className="flex items-center gap-2 pt-2 border-t border-[#edebe9]">
              <Avatar className="h-8 w-8 border border-[#edebe9]">
                <AvatarFallback className="text-xs font-medium bg-[#deecf9] text-[#0078d4]">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#323130] truncate">
                  {resolvedDisplayName}
                </p>
                <p className="text-xs text-[#605e5c] truncate">
                  {user.email || ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#605e5c] hover:text-destructive"
                onClick={logout}
                title={language === "zh" ? "退出登录" : "Sign out"}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
