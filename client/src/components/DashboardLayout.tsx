import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, LogOut, PanelLeft, Shield, Users,
  MessageSquare, Briefcase, TrendingUp, GitBranch, Brain,
  Rocket, Settings, FileText, Target, Zap, Database, Webhook,
  Award, BookOpen, ChevronDown, ChevronRight, Folder, CloudCog,
  Timer, UserCog, Building2, BarChart3, UserCheck, Factory,
  Package, Truck, ClipboardList, Layers, Cpu,
  ShieldCheck, Route, Trophy, Radio, FileSpreadsheet, ClipboardCheck
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

// 菜单项类型定义
type MenuItem = {
  icon: any;
  label: string;
  path?: string;
  adminOnly?: boolean;
  children?: MenuItem[];
};

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "控制台", path: "/" },
  
  // 核心业务模块
  { 
    icon: Folder, 
    label: "核心业务",
    children: [
      { icon: Target, label: "项目管理", path: "/projects" },
      { icon: Target, label: "项目中心", path: "/project-hub" },
      { icon: GitBranch, label: "门径管理", path: "/stage-gate" },
      { icon: GitBranch, label: "门径中心", path: "/stage-gate" },
      { icon: Users, label: "CRM客户", path: "/crm" },
    ]
  },
  
  // GRT 5.0 智能模块
  { 
    icon: Zap, 
    label: "GRT 5.0 智能",
    children: [
      { icon: MessageSquare, label: "社群管理", path: "/social-community" },
      { icon: MessageSquare, label: "社群中心", path: "/social-community-hub" },
      { icon: Briefcase, label: "液态用工", path: "/liquid-workforce" },
      { icon: Briefcase, label: "液态用工中心", path: "/liquid-workforce-hub" },
      { icon: TrendingUp, label: "AI销售", path: "/ai-sales" },
      { icon: TrendingUp, label: "AI销售中心", path: "/ai-sales-hub" },
      { icon: Brain, label: "个人智能体", path: "/personal-agent" },
      { icon: Brain, label: "智能体中心", path: "/personal-agent-hub" },
    ]
  },
  
  // POS项目型组织操作系统
  {
    icon: Factory,
    label: "项目操作系统",
    children: [
      { icon: BarChart3, label: "经营概览", path: "/pos/dashboard" },
      { icon: Users, label: "客户管理", path: "/pos/customers" },
      { icon: Layers, label: "项目管理", path: "/pos/projects" },
      { icon: Package, label: "采购建议", path: "/pos/procurement" },
      { icon: Cpu, label: "MES同步", path: "/pos/mes" },
      { icon: GitBranch, label: "版本管理", path: "/pos/projects" },
      { icon: ClipboardList, label: "连接器配置", path: "/pos/connectors" },
      { icon: Factory, label: "工序步骤管理", path: "/production-steps" },
      { icon: BarChart3, label: "工序进度看板", path: "/process-progress" },
      { icon: Timer, label: "产线员工工位", path: "/worker-mobile" },
      { icon: Brain, label: "AI准确度分析", path: "/ai-accuracy" },
      { icon: ShieldCheck, label: "质量检查点", path: "/quality-checkpoints" },
      { icon: Route, label: "物料流转追踪", path: "/material-flow" },
      { icon: Trophy, label: "员工绩效排行", path: "/worker-performance" },
      { icon: ShieldCheck, label: "质量工序联动", path: "/quality-interlock" },
      { icon: Package, label: "BOM校验管理", path: "/bom-verification" },
      { icon: TrendingUp, label: "薪酬奖金管理", path: "/salary-bonus" },
      { icon: Cpu, label: "CCD检测集成", path: "/ccd-integration" },
      { icon: Database, label: "BOM数据导入", path: "/bom-import" },
      { icon: BarChart3, label: "薪酬报表分析", path: "/salary-report" },
      { icon: Radio, label: "CCD实时推送", path: "/ccd-realtime" },
      { icon: FileSpreadsheet, label: "BOM Excel导入", path: "/bom-excel-import" },
      { icon: ClipboardCheck, label: "薪酬审批流程", path: "/salary-approval" },
    ]
  },
  
  // BU事业部管理
  {
    icon: Building2,
    label: "BU事业部",
    children: [
      { icon: Building2, label: "BU人员管理", path: "/bu-team-management" },
      { icon: BarChart3, label: "BU绩效看板", path: "/bu-performance" },
      { icon: Users, label: "员工管理", path: "/employee-management" },
      { icon: UserCog, label: "离职管理", path: "/offboarding" },
    ]
  },
  
  // 系统管理
  { 
    icon: Settings, 
    label: "系统管理",
    adminOnly: true,
    children: [
      { icon: Rocket, label: "系统部署", path: "/system-deployment" },
      { icon: Shield, label: "安全监控", path: "/security" },
      { icon: FileText, label: "培训管理", path: "/training" },
      { icon: Database, label: "ERP配置", path: "/admin/erp-configuration" },
      { icon: Webhook, label: "Webhook管理", path: "/admin/webhooks" },
      { icon: Award, label: "证书模板", path: "/admin/certificates" },
      { icon: CloudCog, label: "简道云集成", path: "/jiandaoyun-integration" },
      { icon: Timer, label: "定时任务管理", path: "/scheduler-management" },
      { icon: UserCog, label: "用户状态管理", path: "/user-status-management" },
      { icon: UserCheck, label: "用户配置设置", path: "/user-profile" },
    ]
  },
  
  // 文档与指南
  { icon: BookOpen, label: "使用指南", path: "/guide" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = import.meta.env.VITE_LOCAL_AUTH === "true" ? "/login" : getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    Navigation
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              <MenuItemRenderer 
                items={menuItems} 
                location={location} 
                setLocation={setLocation} 
                userRole={user?.role} 
                isCollapsed={isCollapsed}
              />
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {(user?.name && !/\uFFFD/.test(user.name) ? [...user.name][0] : 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name && !/\uFFFD/.test(user.name) ? user.name : (user?.openId || '-')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}


// 菜单项渲染组件 - 支持子菜单折叠展开
function MenuItemRenderer({ 
  items, 
  location, 
  setLocation, 
  userRole,
  isCollapsed,
  depth = 0 
}: { 
  items: MenuItem[]; 
  location: string; 
  setLocation: (path: string) => void; 
  userRole?: string;
  isCollapsed: boolean;
  depth?: number;
}) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    // 默认展开包含当前路径的菜单组
    const expanded: Record<string, boolean> = {};
    items.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => child.path === location);
        if (hasActiveChild) {
          expanded[item.label] = true;
        }
      }
    });
    return expanded;
  });

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {items
        .filter(item => !item.adminOnly || userRole === 'admin')
        .map(item => {
          // 有子菜单的情况
          if (item.children && item.children.length > 0) {
            const isExpanded = expandedItems[item.label] || false;
            const hasActiveChild = item.children.some(child => child.path === location);
            
            return (
              <div key={item.label}>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => !isCollapsed && toggleExpand(item.label)}
                    tooltip={item.label}
                    className={`h-10 transition-all font-normal ${hasActiveChild ? 'bg-accent/50' : ''}`}
                  >
                    <item.icon className={`h-4 w-4 ${hasActiveChild ? 'text-primary' : ''}`} />
                    <span className="flex-1">{item.label}</span>
                    {!isCollapsed && (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                {/* 子菜单 */}
                {isExpanded && !isCollapsed && (
                  <div className="ml-4 border-l border-border/50 pl-2 space-y-0.5">
                    {item.children
                      .filter(child => !child.adminOnly || userRole === 'admin')
                      .map(child => {
                        const isActive = location === child.path;
                        return (
                          <SidebarMenuItem key={child.path}>
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() => child.path && setLocation(child.path)}
                              tooltip={child.label}
                              className="h-9 transition-all font-normal text-sm"
                            >
                              <child.icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : ''}`} />
                              <span>{child.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          }
          
          // 无子菜单的普通菜单项
          const isActive = location === item.path;
          return (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton
                isActive={isActive}
                onClick={() => item.path && setLocation(item.path)}
                tooltip={item.label}
                className="h-10 transition-all font-normal"
              >
                <item.icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
    </>
  );
}
