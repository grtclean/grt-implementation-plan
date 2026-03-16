import { useAuth } from "@/_core/hooks/useAuth";
import { menuConfig, type MenuGroup, type MenuItem } from "@/config/menuConfig";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
const AIConversationPanel = React.lazy(() => import("@/components/AIConversationPanel"));
const AIFloatingButton = React.lazy(() => import("@/components/AIConversationPanel").then(m => ({ default: m.AIFloatingButton })));
const HelpOverlay = React.lazy(() => import("@/components/HelpOverlay"));
const HelpColumn = React.lazy(() => import("@/components/HelpColumn"));
const CopilotBar = React.lazy(() => import("@/components/CopilotBar"));
const AiCanvas = React.lazy(() => import("@/components/AiCanvas"));
const RoleBasedAIAgent = React.lazy(() => import("@/components/RoleBasedAIAgent"));
const GuidedWalkthrough = React.lazy(() => import("@/components/GuidedWalkthrough"));
import { GlobalMenuSearch } from "@/components/GlobalMenuSearch";
import { useMenuFavorites } from "@/hooks/useMenuFavorites";
import { useActiveApp } from "@/hooks/useActiveApp";
import { useUserProfile, ROLE_HIERARCHY, ROLE_CONFIGS } from "@/contexts/UserProfileContext";
import TopHeader from "@/components/Layout/TopHeader";
import WaffleMenu from "@/components/Layout/WaffleMenu";
import ContextualSidebar from "@/components/Layout/ContextualSidebar";
import MobileBottomNav from "@/components/Layout/MobileBottomNav";
import MobileSidebarDrawer from "@/components/Layout/MobileSidebarDrawer";
import IdleTimeoutOverlay from "@/components/IdleTimeoutOverlay";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import ErrorBoundary from "@/components/ErrorBoundary";
import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useLocation } from "wouter";

// Context to prevent double-rendering of Layout (e.g., Suspense fallback + lazy page)
const LayoutActiveContext = createContext(false);
export const useIsInsideLayout = () => useContext(LayoutActiveContext);

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
  const canAccessItem = useCallback((item: MenuItem): boolean => {
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      if (!item.allowedRoles.includes(currentUserRole)) return false;
    }
    if (item.minLevel != null && currentLevel < item.minLevel) return false;
    return true;
  }, [currentUserRole, currentLevel]);

  const canAccessGroup = useCallback((group: MenuGroup): boolean => {
    if (group.allowedRoles && group.allowedRoles.length > 0) {
      if (!group.allowedRoles.includes(currentUserRole)) return false;
    }
    if (group.minLevel != null && currentLevel < group.minLevel) return false;
    if (group.permissionKey && permissions) {
      const key = group.permissionKey as keyof typeof permissions;
      if (key in permissions && !permissions[key]) return false;
    }
    return true;
  }, [currentUserRole, currentLevel, permissions]);

  const filteredMenuConfig = useMemo(() => {
    return menuConfig
      .filter(group => canAccessGroup(group))
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
  }, [canAccessGroup, canAccessItem, isHidden]);

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

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-14 md:pb-0 [scrollbar-gutter:stable]">
          <ErrorBoundary resetKeys={[location]} level="section">
            <div className="p-3 sm:p-6 lg:p-8">{children}</div>
          </ErrorBoundary>
        </main>
      </div>

      {/* DingTalk-style mobile bottom nav — hidden on desktop */}
      <MobileBottomNav
        language={language}
        alertCount={alertCount}
        onNavigate={handleMenuNavigate}
      />

      {/* Right-side panels — preserved exactly as before */}
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
