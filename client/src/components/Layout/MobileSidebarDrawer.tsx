/**
 * Mobile Sidebar Drawer — Slide-out navigation panel for small screens
 *
 * Triggered by hamburger icon in TopHeader. Shows the same menu groups
 * as ContextualSidebar but in an overlay drawer with backdrop.
 */

import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { SidebarMenuGroup } from "@/components/Layout/SidebarMenuGroup";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import BrandLogo from "@/components/common/BrandLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { MenuGroup, MenuItem, WaffleApp } from "@/config/menuConfig";
import { cn } from "@/lib/utils";
import { LogOut, X } from "lucide-react";

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  activeApp: WaffleApp;
  filteredMenuConfig: MenuGroup[];
  expandedGroups: string[];
  onToggleGroup: (name: string) => void;
  favoriteItems: MenuItem[];
  language: string;
  currentBU: string | null;
  alertCount: number;
  onNavigate: (path: string) => void;
  user: { name?: string; email?: string; openId?: string } | null;
  resolvedDisplayName: string;
  avatarInitial: string;
  logout: () => void;
}

export default function MobileSidebarDrawer({
  open,
  onClose,
  activeApp,
  filteredMenuConfig,
  expandedGroups,
  onToggleGroup,
  favoriteItems,
  language,
  currentBU,
  alertCount,
  onNavigate,
  user,
  resolvedDisplayName,
  avatarInitial,
  logout,
}: MobileSidebarDrawerProps) {
  const [location] = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  const prevLocation = useRef(location);
  useEffect(() => {
    if (prevLocation.current !== location) {
      prevLocation.current = location;
      onClose();
    }
  }, [location, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const activeGroups = filteredMenuConfig.filter((g) =>
    activeApp.menuGroupNames.includes(g.name)
  );

  const appFavorites = favoriteItems.filter((item) =>
    activeGroups.some((g) => g.items.some((i) => i.path === item.path))
  );

  const getLocalizedName = (item: { name: string; nameEn: string; nameDe?: string; nameFr?: string }) => {
    switch (language) {
      case "zh": return item.name;
      case "de": return item.nameDe || item.nameEn;
      case "fr": return item.nameFr || item.nameEn;
      default: return item.nameEn;
    }
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const AppIcon = activeApp.icon;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[70] bg-black/40 transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed inset-y-0 left-0 z-[80] w-80 max-w-[85vw] bg-white flex flex-col shadow-2xl transition-transform duration-250 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
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
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f3f2f1] transition-colors text-[#605e5c]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Favorites */}
        {appFavorites.length > 0 && (
          <div className="shrink-0 px-3 py-2 border-b border-[#edebe9] bg-[#faf9f8]">
            <div className="flex flex-wrap gap-1">
              {appFavorites.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path} onClick={() => onClose()}>
                    <div
                      className={cn(
                        "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer touch-feedback",
                        isActive
                          ? "bg-[#eff6fc] text-[#0078d4]"
                          : "text-[#605e5c] hover:bg-[#f3f2f1]"
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

        {/* Scrollable menu */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-1 overscroll-contain touch-pan-y sidebar-scroll"
          style={{ WebkitOverflowScrolling: "touch" }}
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
                onNavigate={handleNavigate}
              />
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#edebe9] p-4 bg-white space-y-3">
          <ProfileSwitcher />
          {user && (
            <div className="flex items-center gap-2 pt-2 border-t border-[#edebe9]">
              <Avatar className="h-8 w-8 border border-[#edebe9]">
                <AvatarFallback className="text-xs font-medium bg-[#deecf9] text-[#0078d4]">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#323130] truncate">{resolvedDisplayName}</p>
                <p className="text-xs text-[#605e5c] truncate">{user.email || ""}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#605e5c] hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
