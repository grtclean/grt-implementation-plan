import { useAuth } from "@/_core/hooks/useAuth";
import BrandLogo from "@/components/common/BrandLogo";
import FeedbackDialog from "@/components/FeedbackDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { menuConfig, WAFFLE_APPS, type MenuGroup, type MenuItem, type WaffleApp } from "@/config/menuConfig";
import WaffleMenu from "@/components/Layout/WaffleMenu";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import AIConversationPanel, { AIFloatingButton } from "@/components/AIConversationPanel";
import HelpOverlay from "@/components/HelpOverlay";
import HelpColumn from "@/components/HelpColumn";
import CopilotBar from "@/components/CopilotBar";
import GuidedWalkthrough from "@/components/GuidedWalkthrough";
import LanguageSelector from "@/components/LanguageSelector";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { MenuCustomizationPanel } from "@/components/MenuCustomizationPanel";
import { GlobalMenuSearch } from "@/components/GlobalMenuSearch";
import { TopBarSearch } from "@/components/TopBarSearch";
import { useMenuFavorites } from "@/hooks/useMenuFavorites";
import { useUserProfile, ROLE_HIERARCHY, ROLE_CONFIGS, type UserRole } from "@/contexts/UserProfileContext";
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  HelpCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  User,
} from "lucide-react";
import { createContext, useContext, useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, memo } from "react";
import { Link, useLocation } from "wouter";
// ChevronLeft/Right no longer needed for sidebar toggle (using PanelLeftClose/Menu)
import ErrorBoundary from "@/components/ErrorBoundary";
import PrintHeader from "@/components/shared/PrintHeader";

// ============================================================
// Sidebar menu group – extracted outside LayoutInner so that
// its identity is stable across parent re-renders (prevents
// React from unmounting / remounting all menu groups on every
// state change such as the 60-second alert count refetch).
// ============================================================

interface SidebarMenuGroupProps {
  group: MenuGroup;
  isExpanded: boolean;
  hasActiveItem: boolean;
  /** The path of the active item inside this group, or null if none. */
  activeItemPath: string | null;
  language: string;
  currentBU: string | null;
  alertCount: number;
  onToggle: (groupName: string) => void;
  onNavigate: (path: string) => void;
}

function SidebarMenuGroupImpl({
  group,
  isExpanded,
  hasActiveItem,
  activeItemPath,
  language,
  currentBU,
  alertCount,
  onToggle,
  onNavigate,
}: SidebarMenuGroupProps) {
  const getGroupName = () => {
    switch (language) {
      case "zh": return group.name;
      case "de": return group.nameDe || group.nameEn;
      case "fr": return group.nameFr || group.nameEn;
      default: return group.nameEn;
    }
  };
  const groupName = getGroupName();
  const GroupIcon = group.icon;

  return (
    <div data-menu-group={group.name}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          const scrollContainer = document.querySelector('nav.overflow-y-auto');
          const scrollTop = scrollContainer?.scrollTop || 0;
          (e.currentTarget as HTMLButtonElement).blur();
          onToggle(group.name);
          requestAnimationFrame(() => {
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollTop;
            }
          });
        }}
        className={cn(
          "flex items-center gap-3 w-full px-4 py-2.5 rounded-md transition-colors duration-150 group cursor-pointer border border-transparent touch-feedback focus:outline-none",
          hasActiveItem
            ? "bg-[#f3f2f1] text-[#323130]"
            : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]"
        )}
      >
        <GroupIcon className={cn("w-5 h-5", hasActiveItem ? "text-[#0078d4]" : "text-[#605e5c] group-hover:text-[#323130]")} />
        <span className="font-medium tracking-wide flex-1 text-left text-sm">{groupName}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="pl-4 space-y-0.5 mt-1">
          {group.items.map((item) => {
            const isActive = activeItemPath === item.path;
            const getItemName = () => {
              switch (language) {
                case "zh": return item.name;
                case "de": return item.nameDe || item.nameEn;
                case "fr": return item.nameFr || item.nameEn;
                default: return item.nameEn;
              }
            };
            const itemName = getItemName();
            const ItemIcon = item.icon;
            const isCompliancePage = item.path === "/compliance-dashboard";

            return (
              <div
                key={item.path}
                className="relative group/item"
                data-menu-path={item.path}
                data-menu-active={isActive ? "true" : "false"}
              >
                <a href={item.path} onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.path);
                }}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-md transition-colors duration-150 cursor-pointer border border-transparent relative touch-feedback",
                      isActive
                        ? "bg-[#eff6fc] text-[#0078d4]"
                        : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]"
                    )}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-[#0078d4]" />}
                    <ItemIcon className={cn("w-4 h-4", isActive ? "text-[#0078d4]" : "text-[#605e5c] group-hover/item:text-[#323130]")} />
                    <span className="text-sm flex-1">{itemName}</span>
                    {item.isNew && (
                      <span className="px-1 py-0.5 text-[9px] font-bold text-[#0078d4] bg-[#deecf9] rounded leading-none">
                        NEW
                      </span>
                    )}
                    {item.requiresBU && !currentBU && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={language === 'zh' ? '请先选择事业部' : 'Select a BU first'} />
                    )}
                    {isCompliancePage && alertCount > 0 && (
                      <span className="flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse">
                        {alertCount > 99 ? '99+' : alertCount}
                      </span>
                    )}
                    {/* Active indicator is the blue pill on the left side */}
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SidebarMenuGroup = memo(SidebarMenuGroupImpl);

// Context to prevent double-rendering of Layout (e.g., Suspense fallback + lazy page)
const LayoutActiveContext = createContext(false);
export const useIsInsideLayout = () => useContext(LayoutActiveContext);

export default function Layout({ children }: { children: React.ReactNode }) {
  // Skip rendering if already inside a Layout (prevents double sidebar)
  const isInsideLayout = useContext(LayoutActiveContext);
  if (isInsideLayout) return <>{children}</>;

  return (
    <LayoutActiveContext.Provider value={true}>
      <LayoutInner>{children}</LayoutInner>
    </LayoutActiveContext.Provider>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  // Navigation is now synchronous (no startTransition) for reliable menu clicks
  const [open, setOpen] = useState(false);
  
  // 移动端左滑关闭菜单手势
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    // 如果水平滑动距离大于垂直滑动，且向左滑动超过50px，则关闭菜单
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50) {
      setOpen(false);
      touchStartX.current = null;
      touchStartY.current = null;
    }
  }, []);
  
  const handleTouchEnd = useCallback(() => {
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [waffleOpen, setWaffleOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const { language } = useLanguage();
  const { user, logout } = useAuth();
  const { currentUserRole, currentBU, permissions } = useUserProfile();
  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;
  const { favoriteItems, isHidden, isFavorite, toggleFavorite } = useMenuFavorites();

  // ── Display Name Resolution ──
  // Fixes "乱码" (garbled text) for usernames in sidebar and header.
  // 1. Decodes any URI-encoded characters (e.g. %E5%BC%A0 → 张)
  // 2. Falls back to role label when name === openId (no display name set)
  // 3. Uses spread operator for proper CJK/emoji first-character extraction
  const resolvedDisplayName = useMemo(() => {
    let name = user?.name || '';
    // Attempt to decode URI-encoded names (fixes garbled %xx sequences)
    if (name && /%[0-9A-Fa-f]{2}/.test(name)) {
      try { name = decodeURIComponent(name); } catch { /* keep original */ }
    }
    // If name is empty or equals the login ID (openId), use role label instead
    if (!name || name === user?.openId) {
      const roleConfig = ROLE_CONFIGS[currentUserRole];
      return roleConfig
        ? (language === 'zh' ? roleConfig.label : roleConfig.labelEn)
        : (name || 'User');
    }
    return name;
  }, [user?.name, user?.openId, currentUserRole, language]);

  // Extract first character safely for avatar (handles CJK, emoji, surrogate pairs)
  const avatarInitial = useMemo(() => {
    const chars = [...(resolvedDisplayName || 'U')];
    return (chars[0] || 'U').toUpperCase();
  }, [resolvedDisplayName]);

  // 新RBAC权限过滤 - 支持 allowedRoles / minLevel / permissionKey
  const canAccessItem = useCallback((item: MenuItem): boolean => {
    // allowedRoles 优先：明确指定了可访问角色列表
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      if (!item.allowedRoles.includes(currentUserRole)) return false;
    }
    // minLevel：需要达到最低角色等级
    if (item.minLevel != null && currentLevel < item.minLevel) return false;
    return true;
  }, [currentUserRole, currentLevel]);

  const canAccessGroup = useCallback((group: MenuGroup): boolean => {
    // allowedRoles 组级别过滤
    if (group.allowedRoles && group.allowedRoles.length > 0) {
      if (!group.allowedRoles.includes(currentUserRole)) return false;
    }
    // minLevel 组级别过滤
    if (group.minLevel != null && currentLevel < group.minLevel) return false;
    // permissionKey 检查上下文权限
    if (group.permissionKey && permissions) {
      const key = group.permissionKey as keyof typeof permissions;
      if (key in permissions && !permissions[key]) return false;
    }
    return true;
  }, [currentUserRole, currentLevel, permissions]);

  // 过滤后的菜单配置（权限+用户自定义隐藏）
  const filteredMenuConfig = useMemo(() => {
    return menuConfig
      .filter(group => canAccessGroup(group))
      .map(group => ({
        ...group,
        items: group.items.filter(item => canAccessItem(item) && !isHidden(item.path)),
      }))
      .filter(group => group.items.length > 0);
  }, [canAccessGroup, canAccessItem, isHidden]);
  
  // 同步侧边栏折叠状态到服务器
  const updatePreferencesMutation = trpc.auth.updatePreferences.useMutation();
  
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
    // 同步到服务器
    if (user) {
      updatePreferencesMutation.mutate({ sidebarCollapsed: newState });
    }
  };
  
  // 跟踪展开的菜单组 - 从localStorage恢复保存的状态
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    // 尝试从localStorage读取保存的展开状态
    const saved = localStorage.getItem('expandedMenuGroups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        // 解析失败，使用默认值
      }
    }
    // 默认展开包含当前路径的组
    const currentGroup = menuConfig.find(group => 
      group.items.some(item => item.path === location)
    );
    return currentGroup ? [currentGroup.name] : ["首页"];
  });

  // 当展开状态变化时，保存到localStorage
  useEffect(() => {
    localStorage.setItem('expandedMenuGroups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  // 当路由变化时，自动展开包含当前路径的菜单组
  // useLayoutEffect 保证在浏览器绘制前完成，避免菜单展开造成的可见跳跃
  const prevLocationRef = useRef(location);
  const expandedGroupsRef = useRef(expandedGroups);
  expandedGroupsRef.current = expandedGroups;
  useLayoutEffect(() => {
    if (prevLocationRef.current === location) return;
    prevLocationRef.current = location;

    const currentGroup = menuConfig.find(group =>
      group.items.some(item => item.path === location)
    );
    if (currentGroup && !expandedGroupsRef.current.includes(currentGroup.name)) {
      setExpandedGroups(prev => [...prev, currentGroup.name]);
    }
  }, [location]);

  // F1快捷键打开帮助面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setHelpPanelOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 当AI面板打开时自动关闭帮助面板
  useEffect(() => {
    if (aiPanelOpen) {
      setHelpPanelOpen(false);
    }
  }, [aiPanelOpen]);

  // 最近访问功能已移除

  // Language selection is now handled by LanguageSelector component

  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  }, []);

  // 获取未处理预警数量 - 使用安全的查询配置防止Layout崩溃
  // select extracts just the count so React Query only re-renders when the number changes
  const alertCount = trpc.compliance.getPendingAlertCount.useQuery(undefined, {
    refetchInterval: 60000,
    staleTime: 55000, // treat data as fresh for 55s to minimise refetches
    retry: false,
    throwOnError: false,
    select: (d) => d?.count ?? 0,
  }).data ?? 0;

  // 侧边栏导航区域引用和滚动状态
  const navRef = useRef<HTMLElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(() => {
    const saved = sessionStorage.getItem('sidebarScrollPosition');
    return saved ? parseInt(saved, 10) > 200 : false;
  });
  const showScrollTopRef = useRef(showScrollTop);
  const scrollProgressRef = useRef(0);

  // 监听侧边栏滚动，显示/隐藏返回顶部按钮和进度条，并保存滚动位置
  // 使用 ref + rAF 防止频繁 setState 导致重渲染/闪烁
  const scrollRafRef = useRef<number | null>(null);
  const handleNavScroll = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (navRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = navRef.current;
        const shouldShow = scrollTop > 200;
        if (shouldShow !== showScrollTopRef.current) {
          showScrollTopRef.current = shouldShow;
          setShowScrollTop(shouldShow);
        }
        const maxScroll = scrollHeight - clientHeight;
        const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
        scrollProgressRef.current = Math.min(100, Math.max(0, progress));
        sessionStorage.setItem('sidebarScrollPosition', String(scrollTop));
      }
    });
  }, []);
  
  // 恢复侧边栏滚动位置 — useLayoutEffect 在浏览器绘制前同步执行，防止可见跳跃
  useLayoutEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('sidebarScrollPosition');
    if (savedScrollPosition && navRef.current) {
      navRef.current.scrollTop = parseInt(savedScrollPosition, 10);
    }
  }, []);
  
  // 返回顶部函数
  const scrollToTop = useCallback(() => {
    if (navRef.current) {
      navRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);
  
  // 收藏菜单功能已移除

  // Stable navigate handler for sidebar items (closes mobile sheet + navigates)
  const handleMenuNavigate = useCallback((path: string) => {
    setOpen(false);
    setLocation(path);
  }, [setLocation]);

  // 折叠状态的侧边栏内容
  // Called as functions (not JSX elements) so React treats the output as
  // inline JSX in the parent, preventing unmount/remount on every re-render.
  const collapsedNavContent = () => (
    <>
      <div className="p-3 border-b border-[#edebe9] flex flex-col items-center gap-2">
        <a href="/" className="block" title="GRT System">
          <BrandLogo size="sm" variant="icon" />
        </a>
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f3f2f1] transition-colors text-[#605e5c]"
          title="Expand sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overscroll-contain">
        {filteredMenuConfig.map((group) => {
          const GroupIcon = group.icon;
          const hasActiveItem = group.items.some(item => location === item.path);
          return (
            <div key={group.name} className="relative group">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLButtonElement).blur();
                  toggleGroup(group.name);
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
              {/* Tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white text-[#323130] text-sm rounded-md shadow-lg border border-[#edebe9] opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 pointer-events-none">
                {language === 'zh' ? group.name : (language === 'de' ? group.nameDe : (language === 'fr' ? group.nameFr : group.nameEn))}
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
    </>
  );

  const navContent = () => (
    <div className="flex flex-col h-full">
      {/* 1. Fixed header - Logo + collapse toggle */}
      <div className="h-16 flex items-center px-4 shrink-0 border-b border-[#edebe9] gap-3">
        <a href="/" className="flex items-center" title="GRT System">
          <BrandLogo size="md" variant="full" />
        </a>
        <div className="flex-1" />
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 hidden lg:flex items-center justify-center rounded-md hover:bg-[#f3f2f1] transition-colors text-[#605e5c]"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* 当前页面指示器 - 点击菜单组名称可跳转 */}
      {(() => {
        // 查找当前页面对应的菜单项（在过滤后的菜单中查找）
        let currentGroup: MenuGroup | null = null;
        let currentItem: { name: string; nameEn: string; nameDe?: string; nameFr?: string; path: string } | null = null;
        for (const group of filteredMenuConfig) {
          const item = group.items.find(i => i.path === location);
          if (item) {
            currentGroup = group;
            currentItem = item;
            break;
          }
        }

        // 点击菜单组名称时，展开该组并滚动到该位置
        const handleGroupClick = (groupName: string) => {
          // 确保该菜单组展开
          if (!expandedGroups.includes(groupName)) {
            setExpandedGroups(prev => [...prev, groupName]);
          }
          // 延迟滚动以确保菜单组已展开
          setTimeout(() => {
            const groupElement = document.querySelector(`[data-menu-group="${groupName}"]`);
            if (groupElement) {
              groupElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        };

        const getLocalizedName = (item: { name: string; nameEn: string; nameDe?: string; nameFr?: string }) => {
          switch (language) {
            case "zh": return item.name;
            case "de": return item.nameDe || item.nameEn;
            case "fr": return item.nameFr || item.nameEn;
            default: return item.nameEn;
          }
        };

        if (currentItem && location !== '/') {
          const groupName = currentGroup ? getLocalizedName(currentGroup) : '';
          const itemName = getLocalizedName(currentItem);
          return (
            <div className="flex-shrink-0 px-3 py-2 border-b border-sidebar-border/50 bg-sidebar-accent/20">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">
                  {language === 'zh' ? '当前位置' : language === 'de' ? 'Aktuell' : language === 'fr' ? 'Actuel' : 'Current'}
                </span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <button
                  onClick={() => currentGroup && handleGroupClick(currentGroup.name)}
                  className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer"
                  title={language === 'zh' ? '点击跳转到该菜单组' : language === 'de' ? 'Klicken, um zur Menügruppe zu springen' : language === 'fr' ? 'Cliquer pour aller au groupe de menus' : 'Click to jump to this menu group'}
                >
                  {groupName}
                </button>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <span className="text-primary font-medium truncate">{itemName}</span>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* 工具栏：收起/展开 + 自定义 */}
      <div className="flex-shrink-0 px-3 py-1 border-b border-sidebar-border/30 flex items-center justify-between">
        <MenuCustomizationPanel />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpandedGroups(filteredMenuConfig.map(g => g.name))}
            className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-sm transition-colors"
            title={language === 'zh' ? '全部展开' : language === 'de' ? 'Alle aufklappen' : language === 'fr' ? 'Tout déplier' : 'Expand All'}
          >
            {language === 'zh' ? '展开' : language === 'de' ? 'Aufklappen' : language === 'fr' ? 'Déplier' : 'Expand'}
          </button>
          <span className="text-muted-foreground/30">|</span>
          <button
            onClick={() => setExpandedGroups([])}
            className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-sm transition-colors"
            title={language === 'zh' ? '全部收起' : language === 'de' ? 'Alle zuklappen' : language === 'fr' ? 'Tout replier' : 'Collapse All'}
          >
            {language === 'zh' ? '收起' : language === 'de' ? 'Zuklappen' : language === 'fr' ? 'Replier' : 'Collapse'}
          </button>
        </div>
      </div>

      {/* 收藏快捷栏 */}
      {favoriteItems.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-sidebar-border/30 bg-sidebar-accent/10">
          <div className="flex flex-wrap gap-1">
            {favoriteItems.map(item => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path} onClick={() => setOpen(false)}>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}>
                    <Icon className="h-3 w-3" />
                    <span>{(() => {
                      switch (language) {
                        case "zh": return item.name;
                        case "de": return item.nameDe || item.nameEn;
                        case "fr": return item.nameFr || item.nameEn;
                        default: return item.nameEn;
                      }
                    })()}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 可滚动菜单区域 - flex-1 overflow-y-auto */}
      <div className="flex-1 min-h-0 relative">
        <nav
          ref={navRef}
          className="h-full overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 overscroll-contain touch-pan-y sidebar-scroll custom-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onScroll={handleNavScroll}
        >
          {filteredMenuConfig.map((group) => {
            const activeItem = group.items.find(item => location === item.path);
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
                onToggle={toggleGroup}
                onNavigate={handleMenuNavigate}
              />
            );
          })}

          <div className="pt-4 mt-4 border-t border-sidebar-border/50">
            <FeedbackDialog />
          </div>
        </nav>

        {/* 返回顶部按钮 - 绝对定位在滚动区域外，避免改变滚动高度导致闪烁 */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-lg transition-colors duration-150 z-10"
            title={language === 'zh' ? '返回顶部' : 'Back to top'}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            {language === 'zh' ? '返回顶部' : 'Top'}
          </button>
        )}
      </div>

      {/* 3. Fixed footer - profile + user info */}
      <div className="shrink-0 border-t border-[#edebe9] p-4 bg-white space-y-3 z-10">
        {/* Role switcher */}
        <ProfileSwitcher />

        {/* User info and logout */}
        {user && (
          <div className="flex items-center gap-2 pt-2 border-t border-[#edebe9]">
            <Avatar className="h-8 w-8 border border-[#edebe9]">
              <AvatarFallback className="text-xs font-medium bg-[#deecf9] text-[#0078d4]">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#323130] truncate">{resolvedDisplayName}</p>
              <p className="text-xs text-[#605e5c] truncate">{user.email || ''}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#605e5c] hover:text-destructive"
              onClick={logout}
              title={language === 'zh' ? '退出登录' : 'Sign out'}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar - Fluent Design */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-white border-r border-[#edebe9] shrink-0 z-50 relative transition-[width] duration-200",
        sidebarCollapsed ? "w-16" : "w-72"
      )}>
        {sidebarCollapsed ? collapsedNavContent() : navContent()}
      </aside>

      {/* Mobile Header - Fluent Design */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#edebe9] z-50 flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-4 text-[#605e5c]">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-white border-[#edebe9] h-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {navContent()}
          </SheetContent>
        </Sheet>
        <a href="/" className="flex items-center gap-2 flex-1" title="GRT System">
          <BrandLogo size="sm" variant="full" />
        </a>
        <div className="flex items-center gap-2">
          <LanguageSelector variant="compact" />
        </div>
      </header>

      {/* Main Content - Sprint 1 flex布局，侧边栏为第一个子元素，主内容区为第二个子元素 flex-1 */}
      <main className="flex-1 pt-16 lg:pt-0 overflow-y-auto [scrollbar-gutter:stable]">
        {/* Desktop Top Bar - Fluent Design */}
        <div className="hidden lg:flex items-center justify-between px-8 py-3 border-b border-[#edebe9] bg-white sticky top-0 z-40 relative">
          {/* Left: Waffle + Brand Text + Logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWaffleOpen(prev => !prev)}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-md transition-colors",
                waffleOpen
                  ? "bg-[#eff6fc] text-[#0078d4]"
                  : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]"
              )}
              title={language === 'zh' ? '应用启动器' : 'App launcher'}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <a href="/" className="flex items-center gap-2" title="GRT System">
              <span className="text-sm font-bold text-[#323130] select-none">GRT</span>
              <span className="text-sm text-[#605e5c] select-none">System</span>
              <img src="/GRTlogo.gif" alt="GRT" className="h-8 w-auto object-contain" />
            </a>
          </div>
          {/* Waffle Menu Dropdown */}
          <WaffleMenu
            open={waffleOpen}
            onClose={() => setWaffleOpen(false)}
            activeAppId={(() => {
              const app = WAFFLE_APPS.find(a => a.menuGroupNames.some(gn => filteredMenuConfig.some(g => g.name === gn && g.items.some(i => i.path === location))));
              return app?.id || '';
            })()}
            onSelectApp={(app: WaffleApp) => { setWaffleOpen(false); setLocation(app.defaultPath); }}
            language={language}
            filteredMenuConfig={filteredMenuConfig}
          />
          {/* Center: Search */}
          <TopBarSearch />
          <div className="flex items-center gap-3">
            <LanguageSelector variant="header" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1]"
              onClick={() => setHelpPanelOpen(prev => !prev)}
              title={language === 'zh' ? '帮助 (F1)' : 'Help (F1)'}
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            {/* User Profile Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-accent transition-colors">
                    <Avatar className="h-7 w-7 border border-border">
                      <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                        {avatarInitial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden xl:inline">{resolvedDisplayName}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 border-b border-border">
                    <p className="text-sm font-medium">{resolvedDisplayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email || ''}</p>
                  </div>
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>{language === 'zh' ? '个人资料' : 'Profile'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{language === 'zh' ? '退出登录' : 'Sign out'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <PrintHeader />
        <ErrorBoundary resetKeys={[location]} level="section">
          <div className="p-6 lg:p-8">{children}</div>
        </ErrorBoundary>
      </main>

      {/* 全局菜单搜索 (Ctrl+K) */}
      <GlobalMenuSearch />
      {/* Help Column - 右侧帮助面板 (z-40, AI面板打开时自动隐藏) */}
      <HelpColumn
        isOpen={helpPanelOpen}
        onClose={() => setHelpPanelOpen(false)}
        onOpenAI={() => setAiPanelOpen(true)}
      />
      {/* Context-Aware Help Overlay */}
      <HelpOverlay />
      {/* GRT Copilot — AI Help Panel (Ctrl+/) */}
      <CopilotBar />
      {/* Guided Walkthrough — tooltip step-by-step overlay */}
      <GuidedWalkthrough />
      {/* AI Floating Button and Panel */}
      <AIFloatingButton onClick={() => setAiPanelOpen(true)} isOpen={aiPanelOpen} />
      <AIConversationPanel isOpen={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
    </div>
  );
}
