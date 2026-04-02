import { useLocation } from "wouter";
import { Bot, ClipboardList, AlertTriangle, FileText, HardHat, LayoutDashboard, MessageSquare, Receipt, Search, Star, Target, User, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  language: string;
  alertCount: number;
  onNavigate: (path: string) => void;
  /** 当前用户角色 — production_worker 显示专属底部导航 */
  userRole?: string;
}

interface TabDef {
  id: string;
  icon: typeof MessageSquare;
  labelZh: string;
  labelEn: string;
  path: string;
  match: (loc: string) => boolean;
  showBadge: boolean;
}

/** 默认底部导航 — 消息/工作台/搜索/AI/我的 */
const DEFAULT_TABS: TabDef[] = [
  {
    id: "messages",
    icon: MessageSquare,
    labelZh: "消息",
    labelEn: "Messages",
    path: "/notifications",
    match: (loc) => loc.startsWith("/notification"),
    showBadge: true,
  },
  {
    id: "workspace",
    icon: LayoutDashboard,
    labelZh: "工作台",
    labelEn: "Workspace",
    path: "/me",
    match: (loc) =>
      loc === "/" || loc === "/me" || loc === "/my-workspace" || loc === "/dashboard" || loc === "/shopfloor-worker-home",
    showBadge: false,
  },
  {
    id: "search",
    icon: Search,
    labelZh: "搜索",
    labelEn: "Search",
    path: "__search__",
    match: () => false,
    showBadge: false,
  },
  {
    id: "ai",
    icon: Bot,
    labelZh: "AI助手",
    labelEn: "AI",
    path: "/ai-hub",
    match: (loc) => loc.startsWith("/ai"),
    showBadge: false,
  },
  {
    id: "me",
    icon: User,
    labelZh: "我的",
    labelEn: "Me",
    path: "/user-profile",
    match: (loc) => loc.startsWith("/user-profile"),
    showBadge: false,
  },
];

/** 产线员工专属底部导航 — 工单/报工/SOP/异常/我的 */
const WORKER_TABS: TabDef[] = [
  {
    id: "orders",
    icon: ClipboardList,
    labelZh: "工单",
    labelEn: "Orders",
    path: "/worker-mobile",
    match: (loc) => loc === "/worker-mobile" || loc.startsWith("/worker-mobile"),
    showBadge: true,
  },
  {
    id: "clock",
    icon: HardHat,
    labelZh: "报工",
    labelEn: "Clock",
    path: "/kiosk",
    match: (loc) => loc.startsWith("/kiosk"),
    showBadge: false,
  },
  {
    id: "sop",
    icon: FileText,
    labelZh: "SOP",
    labelEn: "SOP",
    path: "/sop-process-card",
    match: (loc) => loc.startsWith("/sop"),
    showBadge: false,
  },
  {
    id: "exception",
    icon: AlertTriangle,
    labelZh: "异常",
    labelEn: "Issue",
    path: "/production-exception-report",
    match: (loc) => loc.startsWith("/production-exception"),
    showBadge: false,
  },
  {
    id: "me",
    icon: User,
    labelZh: "我的",
    labelEn: "Me",
    path: "/shopfloor-worker-home",
    match: (loc) => loc === "/shopfloor-worker-home" || loc === "/" || loc.startsWith("/user-profile"),
    showBadge: false,
  },
];

/** 财务人员专属底部导航 — 财务中枢/报销/盘点/凭证/我的 */
const FINANCE_TABS: TabDef[] = [
  {
    id: "hub",
    icon: Wallet,
    labelZh: "财务中枢",
    labelEn: "Hub",
    path: "/finance-quick-hub",
    match: (loc) => loc === "/finance-quick-hub" || loc === "/cashier-workstation",
    showBadge: false,
  },
  {
    id: "expense",
    icon: Receipt,
    labelZh: "报销",
    labelEn: "Expense",
    path: "/expense-report",
    match: (loc) => loc.startsWith("/expense"),
    showBadge: true,
  },
  {
    id: "count",
    icon: ClipboardList,
    labelZh: "盘点",
    labelEn: "Count",
    path: "/inventory-count-flow",
    match: (loc) => loc.startsWith("/inventory-count"),
    showBadge: false,
  },
  {
    id: "finance",
    icon: LayoutDashboard,
    labelZh: "工作台",
    labelEn: "Workbench",
    path: "/finance",
    match: (loc) => loc === "/finance" || loc.startsWith("/gl-"),
    showBadge: false,
  },
  {
    id: "me",
    icon: User,
    labelZh: "我的",
    labelEn: "Me",
    path: "/user-profile",
    match: (loc) => loc.startsWith("/user-profile"),
    showBadge: false,
  },
];

const FINANCE_ROLES = new Set(["finance_manager", "finance_specialist", "cfo"]);
const HR_ROLES = new Set(["hr_manager", "hr_specialist", "hr_director"]);

/** HR人员专属底部导航 — 人事中枢/招聘/员工/绩效/我的 */
const HR_TABS: TabDef[] = [
  {
    id: "hub",
    icon: Users,
    labelZh: "人事中枢",
    labelEn: "HR Hub",
    path: "/hr-quick-hub",
    match: (loc) => loc === "/hr-quick-hub",
    showBadge: true,
  },
  {
    id: "recruit",
    icon: ClipboardList,
    labelZh: "招聘",
    labelEn: "Recruit",
    path: "/recruitment",
    match: (loc) => loc.startsWith("/recruit") || loc.startsWith("/hr-lifecycle"),
    showBadge: false,
  },
  {
    id: "employees",
    icon: LayoutDashboard,
    labelZh: "员工",
    labelEn: "Staff",
    path: "/employee-management",
    match: (loc) => loc.startsWith("/employee-management"),
    showBadge: false,
  },
  {
    id: "performance",
    icon: Target,
    labelZh: "绩效",
    labelEn: "Perf",
    path: "/employee-performance",
    match: (loc) => loc.startsWith("/employee-perf") || loc.startsWith("/perf-"),
    showBadge: false,
  },
  {
    id: "me",
    icon: User,
    labelZh: "我的",
    labelEn: "Me",
    path: "/user-profile",
    match: (loc) => loc.startsWith("/user-profile"),
    showBadge: false,
  },
];

export default function MobileBottomNav({
  language,
  alertCount,
  onNavigate,
  userRole,
}: MobileBottomNavProps) {
  const [location] = useLocation();
  const tabs = userRole === "production_worker"
    ? WORKER_TABS
    : FINANCE_ROLES.has(userRole || "")
      ? FINANCE_TABS
      : HR_ROLES.has(userRole || "")
        ? HR_TABS
        : DEFAULT_TABS;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-[#edebe9] dark:border-slate-700 safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match(location);
          const label = language === "zh" ? tab.labelZh : tab.labelEn;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.path === "__search__") {
                  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
                } else {
                  onNavigate(tab.path);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative touch-feedback",
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
