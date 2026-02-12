import { useAuth } from "@/_core/hooks/useAuth";
import FeedbackDialog from "@/components/FeedbackDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { menuConfig, type MenuGroup, type MenuItem } from "@/config/menuConfig";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import AIConversationPanel, { AIFloatingButton } from "@/components/AIConversationPanel";
import LanguageSelector from "@/components/LanguageSelector";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { MenuCustomizationPanel } from "@/components/MenuCustomizationPanel";
import { GlobalMenuSearch } from "@/components/GlobalMenuSearch";
import { useMenuFavorites } from "@/hooks/useMenuFavorites";
import { useUserProfile, ROLE_HIERARCHY, type UserRole } from "@/contexts/UserProfileContext";
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  X,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const { language, setLanguage, t, isChanging } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { currentUserRole, currentBU, permissions, dataScope } = useUserProfile();
  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;
  const { favoriteItems, isHidden, isFavorite, toggleFavorite } = useMenuFavorites();

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
  const prevLocationRef = useRef(location);
  useEffect(() => {
    // 只在路由真正变化时才执行
    if (prevLocationRef.current === location) return;
    prevLocationRef.current = location;
    
    const currentGroup = menuConfig.find(group => 
      group.items.some(item => item.path === location)
    );
    if (currentGroup && !expandedGroups.includes(currentGroup.name)) {
      setExpandedGroups(prev => [...prev, currentGroup.name]);
    }
  }, [location, expandedGroups]);

  // 最近访问功能已移除

  // Language selection is now handled by LanguageSelector component

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  // 获取未处理预警数量
  const { data: alertCountData } = trpc.compliance.getPendingAlertCount.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const alertCount = alertCountData?.count ?? 0;

  // 侧边栏导航区域引用和滚动状态
  const navRef = useRef<HTMLElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // 监听侧边栏滚动，显示/隐藏返回顶部按钮和进度条，并保存滚动位置
  const handleNavScroll = useCallback(() => {
    if (navRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      setShowScrollTop(scrollTop > 200);
      // 计算滚动进度百分比
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
      // 保存滚动位置到sessionStorage
      sessionStorage.setItem('sidebarScrollPosition', String(scrollTop));
    }
  }, []);
  
  // 恢复侧边栏滚动位置
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('sidebarScrollPosition');
    if (savedScrollPosition && navRef.current) {
      // 延迟恢复滚动位置，确保DOM已渲染
      const timer = setTimeout(() => {
        if (navRef.current) {
          navRef.current.scrollTop = parseInt(savedScrollPosition, 10);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // 返回顶部函数
  const scrollToTop = useCallback(() => {
    if (navRef.current) {
      navRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);
  
  // 收藏菜单功能已移除

  const MenuGroupComponent = ({ group }: { group: MenuGroup }) => {
    const isExpanded = expandedGroups.includes(group.name);
    const hasActiveItem = group.items.some(item => location === item.path);
    // Support all 4 languages for menu names
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
            // 保存当前滚动位置
            const scrollContainer = document.querySelector('nav.overflow-y-auto');
            const scrollTop = scrollContainer?.scrollTop || 0;
            // 阻止按钮获取焦点导致的滚动
            (e.currentTarget as HTMLButtonElement).blur();
            toggleGroup(group.name);
            // 恢复滚动位置
            requestAnimationFrame(() => {
              if (scrollContainer) {
                scrollContainer.scrollTop = scrollTop;
              }
            });
          }}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-2.5 rounded-sm transition-all duration-200 group cursor-pointer border border-transparent touch-feedback focus:outline-none",
            hasActiveItem
              ? "bg-sidebar-accent/50 text-sidebar-foreground border-primary/20"
              : "text-muted-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
          )}
        >
          <GroupIcon className={cn("w-5 h-5", hasActiveItem ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
          <span className="font-medium tracking-wide flex-1 text-left text-sm">{groupName}</span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {isExpanded && (
          <div className="pl-4 space-y-0.5 mt-1">
          {group.items.map((item, itemIndex) => {
            const isActive = location === item.path;
            // Support all 4 languages for menu item names
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
                <Link href={item.path} onClick={() => {
                  setOpen(false);
                }}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-sm transition-all duration-200 cursor-pointer border border-transparent relative touch-feedback",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground border-primary/30 shadow-[inset_0_0_10px_rgba(249,115,22,0.1)]"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:border-sidebar-border"
                    )}
                  >
                    <ItemIcon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-foreground")} />
                    <span className="text-sm flex-1">{itemName}</span>
                    {/* 新功能标记 */}
                    {item.isNew && (
                      <span className="px-1 py-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 rounded leading-none">
                        NEW
                      </span>
                    )}
                    {/* 需要BU选择但未选中BU时显示提示 */}
                    {item.requiresBU && !currentBU && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={language === 'zh' ? '请先选择事业部' : 'Select a BU first'} />
                    )}
                    {/* 合规预警徽章 */}
                    {isCompliancePage && alertCount > 0 && (
                      <span className="flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse">
                        {alertCount > 99 ? '99+' : alertCount}
                      </span>
                    )}
                    {isActive && !isCompliancePage && <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_var(--primary)]" />}
                  </div>
                </Link>
              </div>
            );
          })}
          </div>
        )}
      </div>
    );
  };

  // 折叠状态的侧边栏内容
  const CollapsedNavContent = () => (
    <>
      <div className="p-3 border-b border-sidebar-border flex items-center justify-center">
        <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.5)]">
          <Settings className="w-5 h-5 text-primary-foreground animate-spin-slow" />
        </div>
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
                  "flex items-center justify-center w-full p-2 rounded-sm transition-all duration-200 focus:outline-none",
                  hasActiveItem
                    ? "bg-sidebar-accent/50 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                )}
              >
                <GroupIcon className="w-5 h-5" />
              </button>
              {/* Tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                {language === 'zh' ? group.name : (language === 'de' ? group.nameDe : (language === 'fr' ? group.nameFr : group.nameEn))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border space-y-2">
        <Button 
          variant="ghost" 
          size="icon"
          className="w-full"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        {user && (
          <Button 
            variant="ghost" 
            size="icon"
            className="w-full"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </>
  );

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* 1. 固定顶部区域 - Logo (h-16 flex items-center px-4 shrink-0) */}
      <div className="h-16 flex items-center px-4 shrink-0 border-b border-sidebar-border gap-3">
        <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.5)]">
          <Settings className="w-5 h-5 text-primary-foreground animate-spin-slow" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-wider text-sidebar-foreground">GRT SYSTEM</h1>
          <p className="text-xs text-muted-foreground font-mono">V4.8.23 BUILD</p>
        </div>
      </div>

      {/* 当前页面指示器 - 点击菜单组名称可跳转 */}
      {(() => {
        // 查找当前页面对应的菜单项（在过滤后的菜单中查找）
        let currentGroup: MenuGroup | null = null;
        let currentItem: { name: string; nameEn: string; path: string } | null = null;
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
        
        if (currentItem && location !== '/') {
          const groupName = language === 'zh' ? currentGroup?.name : currentGroup?.nameEn;
          const itemName = language === 'zh' ? currentItem.name : currentItem.nameEn;
          return (
            <div className="flex-shrink-0 px-3 py-2 border-b border-sidebar-border/50 bg-sidebar-accent/20">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">
                  {language === 'zh' ? '当前位置' : 'Current'}
                </span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <button
                  onClick={() => currentGroup && handleGroupClick(currentGroup.name)}
                  className="text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer"
                  title={language === 'zh' ? '点击跳转到该菜单组' : 'Click to jump to this menu group'}
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
            title={language === 'zh' ? '全部展开' : 'Expand All'}
          >
            {language === 'zh' ? '展开' : 'Expand'}
          </button>
          <span className="text-muted-foreground/30">|</span>
          <button
            onClick={() => setExpandedGroups([])}
            className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-sm transition-colors"
            title={language === 'zh' ? '全部收起' : 'Collapse All'}
          >
            {language === 'zh' ? '收起' : 'Collapse'}
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
                    <span>{language === 'zh' ? item.name : item.nameEn}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 可滚动菜单区域 - flex-1 overflow-y-auto custom-scrollbar py-4 */}
      <nav 
        ref={navRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 overscroll-contain touch-pan-y scroll-smooth sidebar-scroll custom-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}
        onScroll={handleNavScroll}
      >
        {filteredMenuConfig.map((group) => (
          <MenuGroupComponent key={group.name} group={group} />
        ))}
        
        <div className="pt-4 mt-4 border-t border-sidebar-border/50">
          <FeedbackDialog />
        </div>
        
        {/* 返回顶部按钮 - 滚动超过200px时显示 */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            title={language === 'zh' ? '返回顶部' : 'Back to top'}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            {language === 'zh' ? '返回顶部' : 'Top'}
          </button>
        )}
      </nav>

      {/* 3. 固定底部区域 - p-4 border-t border-slate-700 shrink-0 bg-sidebar */}
      <div className="shrink-0 border-t border-sidebar-border p-4 bg-sidebar space-y-3 z-10">
        {/* 角色切换器 - Sprint 3 RBAC */}
        <ProfileSwitcher />
        
        {/* 主题切换按钮 */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-sidebar-border bg-sidebar hover:bg-sidebar-accent text-sidebar-foreground"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
          {theme === "dark" ? t("theme.light") : t("theme.dark")}
        </Button>
        
        {/* 用户信息和退出按钮 */}
        {user && (
          <div className="flex items-center gap-2 pt-2 border-t border-sidebar-border/50">
            <Avatar className="h-8 w-8 border border-sidebar-border">
              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email || ''}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar - Sprint 1 三段式布局 */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0 transition-all duration-300 z-50",
        sidebarCollapsed ? "w-16" : "w-72"
      )}>
        {/* 侧边栏折叠切换按钮 */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 z-50 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRightIcon className="w-4 h-4 text-primary-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-primary-foreground" />
          )}
        </button>
        {sidebarCollapsed ? <CollapsedNavContent /> : <NavContent />}
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-50 flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-4">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-72 p-0 bg-sidebar border-sidebar-border h-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <NavContent />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold tracking-wider">GRT SYSTEM</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelector variant="compact" />
        </div>
      </header>

      {/* Main Content - Sprint 1 flex布局，侧边栏为第一个子元素，主内容区为第二个子元素 flex-1 */}
      <main className="flex-1 pt-16 lg:pt-0 transition-all duration-300">
        {/* Desktop Top Bar with Language Selector and User */}
        <div className="hidden lg:flex items-center justify-end px-8 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <LanguageSelector variant="header" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {/* User Profile Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-accent transition-colors">
                    <Avatar className="h-7 w-7 border border-border">
                      <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden xl:inline">{user.name || 'User'}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 border-b border-border">
                    <p className="text-sm font-medium">{user.name || 'User'}</p>
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
        <div className={cn(
          "p-6 lg:p-8 lang-content-transition",
          isChanging && "lang-content-changing"
        )}>{children}</div>
      </main>

      {/* 全局菜单搜索 (Ctrl+K) */}
      <GlobalMenuSearch />
      {/* AI Floating Button and Panel */}
      <AIFloatingButton onClick={() => setAiPanelOpen(true)} isOpen={aiPanelOpen} />
      <AIConversationPanel isOpen={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
    </div>
  );
}
