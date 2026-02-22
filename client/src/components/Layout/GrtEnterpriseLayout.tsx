import { useState, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, Bell, CircleUser,
  ChevronDown, ChevronRight, Menu, X,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { menuConfig, type MenuGroup } from "@/config/menuConfig";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile, ROLE_HIERARCHY } from "@/contexts/UserProfileContext";

// ── Fluent Design System color tokens ──────────────────────────────
// Sourced from Microsoft Fluent UI v2 / M365 palette
const LOGO_URL = "https://www.gerrytech.com/wp-content/uploads/2021/08/logo.png";

interface GrtEnterpriseLayoutProps {
  children: React.ReactNode;
}

export default function GrtEnterpriseLayout({ children }: GrtEnterpriseLayoutProps) {
  const [location] = useLocation();

  // Sidebar collapse – persisted to localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem("fluent-sidebar-expanded");
    return saved !== "false";
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const g = menuConfig.find((gr) => gr.items.some((i) => i.path === location));
    return g ? [g.name] : [];
  });

  const { language } = useLanguage();
  const { currentUserRole, permissions } = useUserProfile();
  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;

  // ── RBAC filtering (identical logic to Layout.tsx) ─────────────────
  const canAccessItem = useCallback(
    (item: { allowedRoles?: string[]; minLevel?: number }) => {
      if (item.allowedRoles?.length && !item.allowedRoles.includes(currentUserRole)) return false;
      if (item.minLevel != null && currentLevel < item.minLevel) return false;
      return true;
    },
    [currentUserRole, currentLevel],
  );

  const canAccessGroup = useCallback(
    (group: MenuGroup) => {
      if (group.allowedRoles?.length && !group.allowedRoles.includes(currentUserRole)) return false;
      if (group.minLevel != null && currentLevel < group.minLevel) return false;
      if (group.permissionKey && permissions) {
        const key = group.permissionKey as keyof typeof permissions;
        if (key in permissions && !permissions[key]) return false;
      }
      return true;
    },
    [currentUserRole, currentLevel, permissions],
  );

  const filteredMenu = useMemo(
    () =>
      menuConfig
        .filter((g) => canAccessGroup(g))
        .map((g) => ({ ...g, items: g.items.filter((i) => canAccessItem(i)) }))
        .filter((g) => g.items.length > 0),
    [canAccessGroup, canAccessItem],
  );

  // ── Handlers ───────────────────────────────────────────────────────
  const toggleSidebar = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("fluent-sidebar-expanded", String(next));
      return next;
    });
  }, []);

  const toggleGroup = useCallback((name: string) => {
    setExpandedGroups((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name],
    );
  }, []);

  const getLabel = (item: { name: string; nameEn: string; nameDe?: string; nameFr?: string }) => {
    switch (language) {
      case "zh": return item.name;
      case "de": return item.nameDe || item.nameEn;
      case "fr": return item.nameFr || item.nameEn;
      default: return item.nameEn;
    }
  };

  // ── Logo with live-URL fallback to text ────────────────────────────
  const LogoImg = ({ className }: { className?: string }) => (
    <>
      <img
        src={LOGO_URL}
        alt="GRT System"
        className={cn("h-8 object-contain", className)}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
        }}
      />
      <span className="hidden font-bold text-xl text-[#323130]">GRT SYSTEM</span>
    </>
  );

  // ── Sidebar navigation (shared desktop & mobile) ───────────────────
  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1">
      {filteredMenu.map((group) => {
        const GroupIcon = group.icon;
        const isGroupOpen = expandedGroups.includes(group.name);
        const hasActive = group.items.some((i) => i.path === location);

        return (
          <div key={group.name} className="mb-px">
            {/* Group header */}
            <button
              type="button"
              onClick={() => toggleGroup(group.name)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-[7px] text-[13px] font-semibold transition-colors rounded-none",
                hasActive
                  ? "text-[#0078d4]"
                  : "text-[#323130] hover:bg-[#f3f2f1]",
              )}
            >
              <GroupIcon className="w-[18px] h-[18px] shrink-0" />
              <span className="flex-1 text-left truncate">{getLabel(group)}</span>
              {isGroupOpen
                ? <ChevronDown className="w-3 h-3 text-[#a19f9d]" />
                : <ChevronRight className="w-3 h-3 text-[#a19f9d]" />}
            </button>

            {/* Items */}
            {isGroupOpen && (
              <div>
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = item.path === location;
                  return (
                    <Link key={item.path} href={item.path} onClick={() => onNavigate?.()}>
                      <div
                        className={cn(
                          "relative flex items-center gap-3 pl-11 pr-4 py-[6px] text-[13px] transition-colors cursor-pointer",
                          isActive
                            ? "bg-[#eff6fc] text-[#0078d4] font-medium"
                            : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]",
                        )}
                      >
                        {/* Fluent active indicator pill */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-[#0078d4]" />
                        )}
                        <ItemIcon className="w-4 h-4 shrink-0" />
                        <span className="truncate flex-1">{getLabel(item)}</span>
                        {item.isNew && (
                          <span className="px-1.5 py-px text-[10px] font-semibold text-[#0078d4] bg-[#deecf9] rounded-sm leading-tight">
                            NEW
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen overflow-hidden bg-[#faf9f8]">

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-white shrink-0 z-50 transition-[width] duration-200 overflow-hidden border-r border-[#edebe9]",
          isExpanded ? "w-64" : "w-12",
        )}
      >
        {isExpanded ? (
          /* ── Expanded state ── */
          <>
            <div className="h-12 flex items-center gap-3 px-3 shrink-0 border-b border-[#edebe9]">
              <LogoImg />
              <div className="flex-1" />
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-sm hover:bg-[#f3f2f1] transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-[18px] h-[18px] text-[#605e5c]" />
              </button>
            </div>
            {renderNav()}
          </>
        ) : (
          /* ── Collapsed state: hamburger + group icons ── */
          <>
            <div className="h-12 flex items-center justify-center shrink-0 border-b border-[#edebe9]">
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-sm hover:bg-[#f3f2f1] transition-colors"
                title="Expand sidebar"
              >
                <Menu className="w-5 h-5 text-[#605e5c]" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-1 flex flex-col items-center gap-0.5">
              {filteredMenu.map((group) => {
                const GroupIcon = group.icon;
                const hasActive = group.items.some((i) => i.path === location);
                return (
                  <div key={group.name} className="relative group/tip">
                    <button
                      onClick={toggleSidebar}
                      className={cn(
                        "p-2 rounded-sm transition-colors",
                        hasActive
                          ? "text-[#0078d4] bg-[#eff6fc]"
                          : "text-[#605e5c] hover:bg-[#f3f2f1]",
                      )}
                    >
                      <GroupIcon className="w-[18px] h-[18px]" />
                    </button>
                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#323130] text-white text-xs rounded-sm opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none shadow-lg">
                      {getLabel(group)}
                    </div>
                  </div>
                );
              })}
            </nav>
          </>
        )}
      </aside>

      {/* ── Main area (header + content) ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top command bar */}
        <header className="h-12 bg-white border-b border-[#edebe9] flex items-center px-4 lg:px-6 shrink-0 z-40">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-1.5 mr-3 rounded-sm hover:bg-[#f3f2f1] transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5 text-[#605e5c]" />
          </button>

          {/* Logo in header: always on mobile, desktop only when sidebar collapsed */}
          <div className={cn("flex items-center gap-2", isExpanded ? "lg:hidden" : "")}>
            <LogoImg className="h-6" />
          </div>

          <div className="flex-1" />

          {/* Right command icons */}
          <div className="flex items-center gap-0.5">
            <button className="p-2 rounded-sm hover:bg-[#f3f2f1] transition-colors" title="Search">
              <Search className="w-[18px] h-[18px] text-[#605e5c]" />
            </button>
            <button className="p-2 rounded-sm hover:bg-[#f3f2f1] transition-colors" title="Notifications">
              <Bell className="w-[18px] h-[18px] text-[#605e5c]" />
            </button>
            <div className="w-px h-6 bg-[#edebe9] mx-1.5" />
            <button className="p-1.5 rounded-sm hover:bg-[#f3f2f1] transition-colors" title="Account">
              <CircleUser className="w-6 h-6 text-[#605e5c]" />
            </button>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* ── Mobile sidebar overlay ───────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-[70] w-64 bg-white border-r border-[#edebe9] flex flex-col lg:hidden shadow-2xl">
            <div className="h-12 flex items-center gap-3 px-3 shrink-0 border-b border-[#edebe9]">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-sm hover:bg-[#f3f2f1] transition-colors"
              >
                <X className="w-5 h-5 text-[#605e5c]" />
              </button>
              <LogoImg className="h-6" />
            </div>
            {renderNav(() => setMobileOpen(false))}
          </aside>
        </>
      )}
    </div>
  );
}
