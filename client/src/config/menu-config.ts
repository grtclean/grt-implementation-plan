/**
 * 菜单配置 - GRT 智能管理系统
 * 按照业务流程导向重组，支持 AI 赋能
 */

import {
  LayoutDashboard,
  Users,
  Lock,
  FileText,
  Settings,
  BarChart3,
  ShoppingCart,
  Package,
  Zap,
  Award,
  Clock,
  AlertCircle,
  Briefcase,
  TrendingUp,
  MessageSquare,
  LucideIcon,
  Timer,
  UserCog,
  Building2,
  Video,
  Crown,
  ListTodo,
  FileCheck,
  UserPlus,
  GraduationCap,
  LogOut,
  Truck,
  Factory,
  Lightbulb,
  Target,
  DollarSign,
  Handshake,
  Bell,
  Bot,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  GitBranch,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";

export interface MenuItem {
  id: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  children?: MenuItem[];
  badge?: string;
  requiresAuth?: boolean;
  requiredPermission?: string;
  aiEnabled?: boolean;
  description?: string;
}

// ============================================================================
// 主菜单配置
// ============================================================================

export const menuConfig: MenuItem[] = [
  // ==================== 工作台 ====================
  {
    id: "workspace",
    label: "工作台",
    icon: LayoutDashboard,
    requiresAuth: false,
    children: [
      {
        id: "dashboard",
        label: "总览仪表板",
        path: "/",
        icon: BarChart3,
        requiresAuth: false,
        description: "系统总览和关键指标",
      },
      {
        id: "my-tasks",
        label: "我的任务",
        path: "/my-tasks",
        icon: ListTodo,
        requiresAuth: true,
        description: "个人任务和待办事项",
      },
      {
        id: "notifications",
        label: "通知中心",
        path: "/notifications",
        icon: Bell,
        requiresAuth: true,
        badge: "3",
        description: "系统通知和提醒",
      },
    ],
  },

  // ==================== 人力资源 ====================
  {
    id: "hr",
    label: "人力资源",
    icon: Users,
    requiresAuth: true,
    children: [
      {
        id: "hr-lifecycle",
        label: "人员生命周期",
        path: "/hr-lifecycle",
        icon: UserPlus,
        requiresAuth: true,
        description: "从招聘到离职全流程管理",
        aiEnabled: true,
      },
      {
        id: "hr-recruitment",
        label: "招聘管理",
        path: "/recruitment",
        icon: Search,
        requiresAuth: true,
        description: "招聘漏斗和候选人管理",
        aiEnabled: true,
      },
      {
        id: "hr-onboarding",
        label: "入职培训",
        path: "/training",
        icon: GraduationCap,
        requiresAuth: true,
        description: "30/60/90天入职计划",
        aiEnabled: true,
      },
      {
        id: "hr-probation",
        label: "转正评估",
        path: "/employee-management",
        icon: Award,
        requiresAuth: true,
        description: "试用期评估和转正审批",
        aiEnabled: true,
      },
      {
        id: "hr-employment",
        label: "在职管理",
        path: "/employee-management",
        icon: Briefcase,
        requiresAuth: true,
        description: "在职员工管理和发展",
        aiEnabled: true,
      },
      {
        id: "hr-offboarding",
        label: "离职管理",
        path: "/offboarding",
        icon: LogOut,
        requiresAuth: true,
        description: "员工离职流程管理",
        aiEnabled: true,
      },
      {
        id: "hr-profiles",
        label: "员工档案",
        path: "/employee-management",
        icon: FileText,
        requiresAuth: true,
        description: "员工信息档案",
      },
    ],
  },

  // ==================== 供应链管理 ====================
  {
    id: "supply-chain",
    label: "供应链管理",
    icon: ShoppingCart,
    requiresAuth: true,
    children: [
      {
        id: "procurement",
        label: "采购管理",
        path: "/pos/procurement",
        icon: ShoppingCart,
        requiresAuth: true,
        children: [
          {
            id: "procurement-requests",
            label: "采购申请",
            path: "/pos/procurement",
            icon: FileText,
            requiresAuth: true,
            aiEnabled: true,
          },
          {
            id: "procurement-orders",
            label: "采购订单",
            path: "/pos/procurement",
            icon: Package,
            requiresAuth: true,
            aiEnabled: true,
          },
          {
            id: "procurement-suppliers",
            label: "供应商管理",
            path: "/supplier-assessment",
            icon: Building2,
            requiresAuth: true,
            aiEnabled: true,
          },
          {
            id: "procurement-receipts",
            label: "收货质检",
            path: "/warehouse-management",
            icon: CheckCircle2,
            requiresAuth: true,
            aiEnabled: true,
          },
        ],
      },
      {
        id: "materials",
        label: "物料管理",
        path: "/material-tracking",
        icon: Package,
        requiresAuth: true,
        children: [
          {
            id: "materials-inventory",
            label: "物料库存",
            path: "/inventory-dashboard",
            icon: Package,
            requiresAuth: true,
          },
          {
            id: "materials-bom",
            label: "BOM管理",
            path: "/bom-management",
            icon: GitBranch,
            requiresAuth: true,
            aiEnabled: true,
          },
          {
            id: "materials-alerts",
            label: "库存预警",
            path: "/material-shortage-alert",
            icon: AlertCircle,
            requiresAuth: true,
            aiEnabled: true,
          },
        ],
      },
    ],
  },

  // ==================== 交付管理 ====================
  {
    id: "delivery",
    label: "交付管理",
    icon: Truck,
    requiresAuth: true,
    children: [
      {
        id: "delivery-tasks",
        label: "交付任务",
        path: "/delivery-management",
        icon: ListTodo,
        requiresAuth: true,
        description: "M7-M9交付任务列表",
        aiEnabled: true,
      },
      {
        id: "delivery-gate",
        label: "Gate检查",
        path: "/stage-gate",
        icon: CheckCircle2,
        requiresAuth: true,
        description: "预验收到终验收Gate检查",
        aiEnabled: true,
      },
      {
        id: "delivery-issues",
        label: "现场问题",
        path: "/after-sales",
        icon: AlertCircle,
        requiresAuth: true,
        description: "现场问题记录和追踪",
        aiEnabled: true,
      },
      {
        id: "delivery-acceptance",
        label: "终验收",
        path: "/final-acceptance",
        icon: Award,
        requiresAuth: true,
        description: "客户终验收管理",
        aiEnabled: true,
      },
    ],
  },

  // ==================== 生产管理 ====================
  {
    id: "production",
    label: "生产管理",
    icon: Factory,
    requiresAuth: true,
    children: [
      {
        id: "production-plan",
        label: "生产计划",
        path: "/production-dashboard",
        icon: Clock,
        requiresAuth: true,
        aiEnabled: true,
      },
      {
        id: "production-projects",
        label: "项目管理",
        path: "/projects",
        icon: Briefcase,
        requiresAuth: true,
        description: "M0-M12项目全生命周期",
      },
      {
        id: "production-quality",
        label: "质量控制",
        path: "/qc-management",
        icon: CheckCircle2,
        requiresAuth: true,
        aiEnabled: true,
      },
    ],
  },

  // ==================== AI 赋能中心 ====================
  {
    id: "ai-hub",
    label: "AI 赋能中心",
    icon: Sparkles,
    requiresAuth: true,
    badge: "New",
    children: [
      {
        id: "ai-business-assistants",
        label: "业务助手",
        path: "/ai-hub",
        icon: Bot,
        requiresAuth: true,
        description: "核心业务AI助手",
        children: [
          {
            id: "ai-interview",
            label: "AI 面试助手",
            path: "/ai-hub",
            icon: UserPlus,
            requiresAuth: true,
            aiEnabled: true,
          },
          {
            id: "ai-solution",
            label: "AI 方案助手",
            path: "/ai/solution-assistant",
            icon: Lightbulb,
            requiresAuth: true,
            aiEnabled: true,
          },
          {
            id: "ai-quotation",
            label: "AI 报价助手",
            path: "/ai/quotation-assistant",
            icon: DollarSign,
            requiresAuth: true,
            aiEnabled: true,
          },
          {
            id: "ai-kpi",
            label: "AI 绩效助手",
            path: "/ai/kpi-assistant",
            icon: Target,
            requiresAuth: true,
            aiEnabled: true,
          },
          {
            id: "ai-purchase",
            label: "AI 采购助手",
            path: "/ai-purchase",
            icon: ShoppingCart,
            requiresAuth: true,
            aiEnabled: true,
          },
        ],
      },
      {
        id: "ai-process-optimization",
        label: "流程优化建议",
        path: "/ai/process-optimization",
        icon: TrendingUp,
        requiresAuth: true,
        description: "AI驱动的流程优化",
        children: [
          {
            id: "ai-opt-hr",
            label: "人员流程优化",
            path: "/ai/optimization/hr",
            icon: Users,
            requiresAuth: true,
            aiEnabled: true,
          },
          {
            id: "ai-opt-procurement",
            label: "采购流程优化",
            path: "/ai/optimization/procurement",
            icon: ShoppingCart,
            requiresAuth: true,
            aiEnabled: true,
          },
          {
            id: "ai-opt-delivery",
            label: "交付流程优化",
            path: "/ai/optimization/delivery",
            icon: Truck,
            requiresAuth: true,
            aiEnabled: true,
          },
        ],
      },
      {
        id: "ai-analytics",
        label: "智能分析",
        path: "/ai/analytics",
        icon: BarChart3,
        requiresAuth: true,
        aiEnabled: true,
      },
    ],
  },

  // ==================== 绩效管理 ====================
  {
    id: "performance",
    label: "绩效管理",
    icon: BarChart3,
    requiresAuth: true,
    children: [
      {
        id: "performance-personal",
        label: "个人绩效",
        path: "/my-performance",
        icon: UserCog,
        requiresAuth: true,
        aiEnabled: true,
      },
      {
        id: "performance-department",
        label: "部门绩效",
        path: "/dept-performance",
        icon: Users,
        requiresAuth: true,
        aiEnabled: true,
      },
      {
        id: "performance-bu",
        label: "BU绩效看板",
        path: "/bu-performance",
        icon: Building2,
        requiresAuth: true,
        requiredPermission: "VIEW_BU_PERFORMANCE",
        aiEnabled: true,
      },
    ],
  },

  // ==================== 财务管理 ====================
  {
    id: "finance",
    label: "财务管理",
    icon: DollarSign,
    requiresAuth: true,
    children: [
      {
        id: "finance-cost",
        label: "成本管理",
        path: "/cost",
        icon: BarChart3,
        requiresAuth: true,
        aiEnabled: true,
      },
      {
        id: "finance-budget",
        label: "预算管理",
        path: "/budget-management",
        icon: Package,
        requiresAuth: true,
        aiEnabled: true,
      },
    ],
  },

  // ==================== 客户关系 ====================
  {
    id: "crm",
    label: "客户关系",
    icon: Handshake,
    requiresAuth: true,
    children: [
      {
        id: "crm-customers",
        label: "客户管理",
        path: "/crm/customers",
        icon: Users,
        requiresAuth: true,
      },
      {
        id: "crm-opportunities",
        label: "商机管理",
        path: "/crm/opportunities",
        icon: TrendingUp,
        requiresAuth: true,
      },
      {
        id: "crm-contacts",
        label: "联系人管理",
        path: "/crm/contacts",
        icon: MessageSquare,
        requiresAuth: true,
      },
    ],
  },

  // ==================== 智能会议 ====================
  {
    id: "meeting",
    label: "智能会议",
    icon: Video,
    requiresAuth: true,
    badge: "New",
    children: [
      {
        id: "meeting-workspace",
        label: "会议工作台",
        path: "/meeting-intelligence",
        icon: Video,
        requiresAuth: true,
        aiEnabled: true,
      },
      {
        id: "meeting-owner",
        label: "MO管理",
        path: "/meeting-owner-management",
        icon: Crown,
        requiresAuth: true,
      },
      {
        id: "meeting-minutes",
        label: "会议纪要",
        path: "/meeting-intelligence",
        icon: FileCheck,
        requiresAuth: true,
        aiEnabled: true,
      },
    ],
  },

  // ==================== 能力管理 ====================
  {
    id: "capabilities",
    label: "能力管理",
    path: "/capability-management",
    icon: Wrench,
    requiresAuth: true,
    requiredPermission: "MANAGE_CAPABILITIES",
    aiEnabled: true,
  },

  // ==================== 系统设置 ====================
  {
    id: "system",
    label: "系统设置",
    icon: Settings,
    requiresAuth: true,
    children: [
      {
        id: "permissions",
        label: "权限管理",
        path: "/permissions",
        icon: Lock,
        requiresAuth: true,
        requiredPermission: "MANAGE_PERMISSIONS",
      },
      {
        id: "menu-management",
        label: "菜单管理",
        path: "/menu-management",
        icon: FileText,
        requiresAuth: true,
        requiredPermission: "MANAGE_MENUS",
      },
      {
        id: "visitor-request",
        label: "来访申请",
        path: "/visitor-request",
        icon: Users,
        requiresAuth: true,
        requiredPermission: "MANAGE_VISITORS",
      },
      {
        id: "scheduler-management",
        label: "定时任务管理",
        path: "/scheduler-management",
        icon: Timer,
        requiresAuth: true,
        requiredPermission: "MANAGE_SCHEDULER",
      },
      {
        id: "user-status-management",
        label: "用户状态管理",
        path: "/user-status-management",
        icon: UserCog,
        requiresAuth: true,
        requiredPermission: "MANAGE_USERS",
      },
    ],
  },

  // ==================== 帮助与文档 ====================
  {
    id: "docs",
    label: "帮助中心",
    icon: FileText,
    requiresAuth: false,
    children: [
      {
        id: "docs-center",
        label: "文档中心",
        path: "/docs",
        icon: FileText,
        requiresAuth: true,
      },
      {
        id: "help",
        label: "帮助",
        path: "/help",
        icon: AlertCircle,
        requiresAuth: false,
      },
    ],
  },
];

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据权限过滤菜单项
 */
export function filterMenuByPermission(
  menu: MenuItem[],
  userPermissions: string[]
): MenuItem[] {
  return menu
    .filter((item) => {
      if (item.requiredPermission) {
        return userPermissions.includes(item.requiredPermission);
      }
      return true;
    })
    .map((item) => ({
      ...item,
      children: item.children
        ? filterMenuByPermission(item.children, userPermissions)
        : undefined,
    }));
}

/**
 * 根据认证状态过滤菜单项
 */
export function filterMenuByAuth(
  menu: MenuItem[],
  isAuthenticated: boolean
): MenuItem[] {
  return menu
    .filter((item) => {
      if (item.requiresAuth && !isAuthenticated) {
        return false;
      }
      return true;
    })
    .map((item) => ({
      ...item,
      children: item.children
        ? filterMenuByAuth(item.children, isAuthenticated)
        : undefined,
    }));
}

/**
 * 获取菜单项的完整路径
 */
export function getMenuPath(id: string, menu: MenuItem[] = menuConfig): string | undefined {
  for (const item of menu) {
    if (item.id === id) {
      return item.path;
    }
    if (item.children) {
      const path = getMenuPath(id, item.children);
      if (path) return path;
    }
  }
  return undefined;
}

/**
 * 展平菜单结构为一维数组
 */
export function flattenMenu(menu: MenuItem[] = menuConfig): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of menu) {
    result.push(item);
    if (item.children) {
      result.push(...flattenMenu(item.children));
    }
  }
  return result;
}

/**
 * 获取所有启用AI的菜单项
 */
export function getAIEnabledMenuItems(menu: MenuItem[] = menuConfig): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of menu) {
    if (item.aiEnabled) {
      result.push(item);
    }
    if (item.children) {
      result.push(...getAIEnabledMenuItems(item.children));
    }
  }
  return result;
}

/**
 * 获取菜单面包屑
 */
export function getMenuBreadcrumb(id: string, menu: MenuItem[] = menuConfig): MenuItem[] {
  for (const item of menu) {
    if (item.id === id) {
      return [item];
    }
    if (item.children) {
      const breadcrumb = getMenuBreadcrumb(id, item.children);
      if (breadcrumb.length > 0) {
        return [item, ...breadcrumb];
      }
    }
  }
  return [];
}
