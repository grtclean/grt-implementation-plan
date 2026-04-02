import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, Suspense, lazy } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { menuConfig, type MenuGroup, type MenuItem } from "@/config/menuConfig";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
const AIConversationPanel = lazy(() => import("@/components/AIConversationPanel"));
const AIFloatingButton = lazy(() => import("@/components/AIConversationPanel").then(m => ({ default: m.AIFloatingButton })));
const HelpOverlay = lazy(() => import("@/components/HelpOverlay"));
const HelpColumn = lazy(() => import("@/components/HelpColumn"));
const CopilotBar = lazy(() => import("@/components/CopilotBar"));
const AiCanvas = lazy(() => import("@/components/AiCanvas"));
const RoleBasedAIAgent = lazy(() => import("@/components/RoleBasedAIAgent"));
const GuidedWalkthrough = lazy(() => import("@/components/GuidedWalkthrough"));
import { GlobalMenuSearch } from "@/components/GlobalMenuSearch";
import { useMenuFavorites } from "@/hooks/useMenuFavorites";
import { useActiveApp } from "@/hooks/useActiveApp";
import { useUserProfile, ROLE_HIERARCHY, ROLE_CONFIGS } from "@/contexts/UserProfileContext";
import { isCustomerUser, CUSTOMER_ALLOWED_MENU_GROUPS } from "@shared/customer-access";
import TopHeader from "@/components/Layout/TopHeader";
import WaffleMenu from "@/components/Layout/WaffleMenu";
import ContextualSidebar from "@/components/Layout/ContextualSidebar";
import MobileBottomNav from "@/components/Layout/MobileBottomNav";
import MobileSidebarDrawer from "@/components/Layout/MobileSidebarDrawer";
import IdleTimeoutOverlay from "@/components/IdleTimeoutOverlay";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import ErrorBoundary from "@/components/ErrorBoundary";
// React imported at top of file (line 1)
import { useLocation } from "wouter";

// Context to prevent double-rendering of Layout (e.g., Suspense fallback + lazy page)
const LayoutActiveContext = createContext(false);
export const useIsInsideLayout = () => useContext(LayoutActiveContext);

/** Check if a route is accessible for customer users based on filtered menu config */
function isCustomerRouteAllowed(path: string, filteredMenu: MenuGroup[]): boolean {
  // Always allow root/home
  if (path === "/" || path === "/me") return true;
  // Check if any filtered menu item matches the current path
  for (const group of filteredMenu) {
    for (const item of group.items) {
      if (path === item.path || path.startsWith(item.path + "/")) return true;
    }
    if (group.subgroups) {
      for (const sg of group.subgroups) {
        for (const item of sg.items) {
          if (path === item.path || path.startsWith(item.path + "/")) return true;
        }
      }
    }
  }
  return false;
}

export default function Layout({ children }: { children: React.ReactNode }) {
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
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiCanvasOpen, setAiCanvasOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"agent" | "canvas">("agent");
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [waffleOpen, setWaffleOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const { language } = useLanguage();
  const { user, logout } = useAuth();
  const { currentUserRole, currentBU, permissions } = useUserProfile();
  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;
  const { favoriteItems, isHidden } = useMenuFavorites();
  const { activeApp, activeAppId, setActiveApp } = useActiveApp();

  // ── Display Name Resolution ──
  const resolvedDisplayName = useMemo(() => {
    let name = user?.name || '';
    // Fix: Strip Unicode replacement characters (garbled DB data from encoding mismatch)
    if (name && /\uFFFD/.test(name)) {
      name = '';  // Force fallback to role label
    }
    if (name && /%[0-9A-Fa-f]{2}/.test(name)) {
      try { name = decodeURIComponent(name); } catch { /* keep original */ }
    }
    if (!name || name === user?.openId) {
      const roleConfig = ROLE_CONFIGS[currentUserRole];
      return roleConfig
        ? (language === 'zh' ? roleConfig.label : roleConfig.labelEn)
        : (name || 'User');
    }
    return name;
  }, [user?.name, user?.openId, currentUserRole, language]);

  const avatarInitial = useMemo(() => {
    const chars = [...(resolvedDisplayName || 'U')];
    return (chars[0] || 'U').toUpperCase();
  }, [resolvedDisplayName]);

  // ── RBAC filtering ──
  // C-level roles (ceo/cto/cfo) and admin bypass allowedRoles — they see everything
  const isSuperRole = currentUserRole === "admin" || currentUserRole === "ceo" || currentUserRole === "cto" || currentUserRole === "cfo";

  const canAccessItem = useCallback((item: MenuItem): boolean => {
    if (!isSuperRole && item.allowedRoles && item.allowedRoles.length > 0) {
      if (!item.allowedRoles.includes(currentUserRole)) return false;
    }
    if (item.minLevel != null && currentLevel < item.minLevel) return false;
    return true;
  }, [currentUserRole, currentLevel, isSuperRole]);

  const canAccessGroup = useCallback((group: MenuGroup): boolean => {
    if (!isSuperRole && group.allowedRoles && group.allowedRoles.length > 0) {
      if (!group.allowedRoles.includes(currentUserRole)) return false;
    }
    if (group.minLevel != null && currentLevel < group.minLevel) return false;
    if (group.permissionKey && permissions) {
      const key = group.permissionKey as keyof typeof permissions;
      if (key in permissions && !permissions[key]) return false;
    }
    return true;
  }, [currentUserRole, currentLevel, permissions, isSuperRole]);

  // Customer whitelist check — user comes from useAuth()
  const isCustomer = useMemo(() => isCustomerUser(user), [user]);

  const filteredMenuConfig = useMemo(() => {
    return menuConfig
      .filter(group => {
        // Customer users: only allow whitelisted menu groups
        if (isCustomer && !CUSTOMER_ALLOWED_MENU_GROUPS.has(group.name)) return false;
        return canAccessGroup(group);
      })
      .map(group => ({
        ...group,
        items: group.items.filter(item => canAccessItem(item) && !isHidden(item.path)),
        // RBAC filter subgroups and their items
        subgroups: group.subgroups?.map(sg => ({
          ...sg,
          items: sg.items.filter(item => canAccessItem(item) && !isHidden(item.path)),
        })).filter(sg => sg.items.length > 0),
      }))
      .filter(group => group.items.length > 0 || (group.subgroups && group.subgroups.length > 0));
  }, [canAccessGroup, canAccessItem, isHidden, isCustomer]);

  // ── Sidebar collapse sync ──
  const updatePreferencesMutation = trpc.auth.updatePreferences.useMutation();
  const updatePrefsRef = useRef(updatePreferencesMutation);
  updatePrefsRef.current = updatePreferencesMutation;

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      if (user) {
        updatePrefsRef.current.mutate({ sidebarCollapsed: newState });
      }
      return newState;
    });
  }, [user]);

  // ── Expanded groups ──
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem('expandedMenuGroups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* use default */ }
    }
    const currentGroup = menuConfig.find(group =>
      group.items.some(item => item.path === location)
    );
    return currentGroup ? [currentGroup.name] : ["工作台"];
  });

  useEffect(() => {
    localStorage.setItem('expandedMenuGroups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  // Auto-expand group on route change
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

  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedGroups(filteredMenuConfig.map(g => g.name));
  }, [filteredMenuConfig]);

  const handleCollapseAll = useCallback(() => {
    setExpandedGroups([]);
  }, []);

  // ── Keyboard shortcuts: F1, Alt+A ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setHelpPanelOpen(prev => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAiCanvasOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-close help when AI panel opens
  useEffect(() => {
    if (aiPanelOpen) setHelpPanelOpen(false);
  }, [aiPanelOpen]);

  // ── Alert count ──
  const alertCountSelector = useCallback((d: any) => d?.count ?? 0, []);
  const alertCount = trpc.compliance.getPendingAlertCount.useQuery(undefined, {
    refetchInterval: 60000,
    staleTime: 55000,
    retry: false,
    throwOnError: false,
    select: alertCountSelector,
  }).data ?? 0;

  // ── Idle Timeout (30min) — forces re-auth on inactivity ──
  const [isLocked, setIsLocked] = useState(false);
  const { showWarning, resetTimer } = useIdleTimeout({
    timeoutMs: 30 * 60 * 1000,
    onTimeout: () => setIsLocked(true),
  });

  const handleReauthenticate = useCallback(() => {
    setIsLocked(false);
    resetTimer();
  }, [resetTimer]);

  // ── Navigation handler ──
  const handleMenuNavigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);

  // ── Waffle app selection ──
  const handleWaffleSelect = useCallback((app: { id: string; defaultPath: string }) => {
    setActiveApp(app.id);
    setLocation(app.defaultPath);
    setWaffleOpen(false);
  }, [setActiveApp, setLocation]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      {/* O365-style unified header */}
      <TopHeader
        language={language}
        aiCanvasOpen={aiCanvasOpen}
        onToggleAiCanvas={() => setAiCanvasOpen(prev => !prev)}
        helpPanelOpen={helpPanelOpen}
        onToggleHelpPanel={() => setHelpPanelOpen(prev => !prev)}
        alertCount={alertCount}
        onNavigate={handleMenuNavigate}
        waffleOpen={waffleOpen}
        onWaffleToggle={() => setWaffleOpen(prev => !prev)}
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)}
        user={user}
        resolvedDisplayName={resolvedDisplayName}
        avatarInitial={avatarInitial}
        logout={logout}
      />

      {/* Waffle app launcher dropdown */}
      <WaffleMenu
        open={waffleOpen}
        onClose={() => setWaffleOpen(false)}
        activeAppId={activeAppId}
        onSelectApp={handleWaffleSelect}
        language={language}
        filteredMenuConfig={filteredMenuConfig}
      />

      {/* Mobile sidebar drawer — slide-out on small screens */}
      <MobileSidebarDrawer
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        activeApp={activeApp}
        filteredMenuConfig={filteredMenuConfig}
        expandedGroups={expandedGroups}
        onToggleGroup={toggleGroup}
        favoriteItems={favoriteItems}
        language={language}
        currentBU={currentBU}
        alertCount={alertCount}
        onNavigate={handleMenuNavigate}
        user={user}
        resolvedDisplayName={resolvedDisplayName}
        avatarInitial={avatarInitial}
        logout={logout}
      />

      {/* Main body: sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop contextual sidebar — hidden on mobile */}
        <ContextualSidebar
          activeApp={activeApp}
          filteredMenuConfig={filteredMenuConfig}
          expandedGroups={expandedGroups}
          onToggleGroup={toggleGroup}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          favoriteItems={favoriteItems}
          language={language}
          currentBU={currentBU}
          alertCount={alertCount}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onNavigate={handleMenuNavigate}
          user={user}
          resolvedDisplayName={resolvedDisplayName}
          avatarInitial={avatarInitial}
          logout={logout}
        />

        {/* Main content — with customer route guard */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-14 md:pb-0 [scrollbar-gutter:stable]">
          <ErrorBoundary resetKeys={[location]} level="section">
            {isCustomer && !isCustomerRouteAllowed(location, filteredMenuConfig) ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m8-7a4 4 0 11-8 0 4 4 0 018 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  </div>
                  <h2 className="text-xl font-bold">无访问权限</h2>
                  <p className="text-muted-foreground text-sm">该模块暂未对客户账户开放，如需访问请联系 GRT 项目经理。</p>
                  <button onClick={() => window.location.href = "/"} className="text-sm text-primary hover:underline">← 返回首页</button>
                </div>
              </div>
            ) : (
              <div className="p-3 sm:p-6 lg:p-8">{children}</div>
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* DingTalk-style mobile bottom nav — hidden on desktop, hidden for customers */}
      {!isCustomer && (
        <MobileBottomNav
          language={language}
          alertCount={alertCount}
          onNavigate={handleMenuNavigate}
          userRole={currentUserRole}
        />
      )}

      {/* Right-side panels — hidden for customer users */}
      {!isCustomer && (
        <>
          <GlobalMenuSearch />
          <Suspense fallback={null}>
            <HelpColumn
              isOpen={helpPanelOpen}
              onClose={() => setHelpPanelOpen(false)}
              onOpenAI={() => setAiPanelOpen(true)}
            />
            <HelpOverlay />
            <CopilotBar />
            {panelMode === "agent" ? (
              <RoleBasedAIAgent
                isOpen={aiCanvasOpen}
                onClose={() => setAiCanvasOpen(false)}
                onSwitchToCanvas={() => setPanelMode("canvas")}
              />
            ) : (
              <AiCanvas
                isOpen={aiCanvasOpen}
                onClose={() => setAiCanvasOpen(false)}
                onSwitchToAgent={() => setPanelMode("agent")}
              />
            )}
            <GuidedWalkthrough />
            <AIFloatingButton onClick={() => setAiPanelOpen(true)} isOpen={aiPanelOpen} />
            {aiPanelOpen && <AIConversationPanel isOpen={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />}
          </Suspense>
        </>
      )}

      {/* Idle timeout — warning banner or full lock screen */}
      {(isLocked || showWarning) && (
        <IdleTimeoutOverlay
          showWarning={!isLocked && showWarning}
          onDismissWarning={resetTimer}
          onReauthenticate={handleReauthenticate}
          onLogout={logout}
          resolvedDisplayName={resolvedDisplayName}
        />
      )}
    </div>
  );
}
