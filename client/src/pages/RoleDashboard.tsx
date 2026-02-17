/**
 * GRT 5.0 角色智能工作台 (Role-based Dashboard)
 *
 * 根据当前登录用户角色，展示不同的工作台Widget组合:
 * - admin: 系统概览、监控、用户管理入口
 * - bu_gm: BU业绩、项目看板、团队概览
 * - bu_pm: 项目进度、里程碑、任务分配
 * - bu_sales: 商机pipeline、客户跟进、报价
 * - bu_mech/bu_elec: 设计任务、BOM变更、技术文档
 * - procurement_eng: 采购订单、供应商、库存预警
 * - cs_engineer: 工单、客户反馈、现场服务
 * - hr_manager/hr_specialist: 人事管理、绩效、培训
 * - finance_manager/finance_specialist: 成本、预算、费用审批
 * - production_worker: 工位看板、工序进度
 * - employee: 通用工作台（待办、消息、日程）
 */

import { useState } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUserProfile, ROLE_CONFIGS, type UserRole } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BarChart3, Bell, BookOpen, Calendar, CheckCircle2, Clock, Cog, FileText,
  FolderKanban, Headphones, LayoutDashboard, ListTodo, MessageSquare,
  Package, ShoppingCart, Target, TrendingUp, Users, Wrench, Zap,
  ArrowRight, AlertTriangle, Activity, Building2, Shield,
} from "lucide-react";

// ============================================
// 角色-Widget映射配置
// ============================================

interface DashboardWidget {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  icon: any;
  color: string;
  link?: string;
  renderContent: () => React.ReactNode;
}

// 快捷操作定义
interface QuickAction {
  label: string;
  labelEn: string;
  icon: any;
  link: string;
  color: string;
}

// 角色对应的快捷操作
const roleQuickActions: Record<string, QuickAction[]> = {
  admin: [
    { label: "系统监控", labelEn: "Monitoring", icon: Activity, link: "/monitoring", color: "text-red-500" },
    { label: "用户管理", labelEn: "Users", icon: Users, link: "/permissions", color: "text-blue-500" },
    { label: "ERP集成", labelEn: "ERP", icon: Cog, link: "/admin/erp-configuration", color: "text-purple-500" },
    { label: "开发看板", labelEn: "Dev Tasks", icon: ListTodo, link: "/tasks", color: "text-green-500" },
    { label: "安全面板", labelEn: "Security", icon: Shield, link: "/security", color: "text-orange-500" },
    { label: "定时任务", labelEn: "Scheduler", icon: Clock, link: "/scheduler", color: "text-cyan-500" },
  ],
  bu_gm: [
    { label: "BU业绩", labelEn: "BU Performance", icon: BarChart3, link: "/bu-performance", color: "text-indigo-500" },
    { label: "项目总览", labelEn: "Projects", icon: FolderKanban, link: "/pos", color: "text-blue-500" },
    { label: "团队管理", labelEn: "Team", icon: Users, link: "/bu-team-management", color: "text-green-500" },
    { label: "客户价值", labelEn: "Customer Value", icon: TrendingUp, link: "/customer-value-view", color: "text-orange-500" },
    { label: "年度日程", labelEn: "Annual Agenda", icon: Calendar, link: "/annual-agenda", color: "text-purple-500" },
  ],
  bu_pm: [
    { label: "项目看板", labelEn: "Project Board", icon: FolderKanban, link: "/pos", color: "text-blue-500" },
    { label: "门径管理", labelEn: "Stage Gate", icon: Target, link: "/stage-gate", color: "text-indigo-500" },
    { label: "生产执行", labelEn: "Production", icon: Wrench, link: "/production-execution", color: "text-green-500" },
    { label: "BOM管理", labelEn: "BOM", icon: Package, link: "/bom-management", color: "text-amber-500" },
    { label: "会议纪要", labelEn: "Meetings", icon: MessageSquare, link: "/meeting-intelligence", color: "text-purple-500" },
  ],
  bu_sales: [
    { label: "商机管理", labelEn: "Opportunities", icon: TrendingUp, link: "/crm/opportunities", color: "text-emerald-500" },
    { label: "客户管理", labelEn: "Customers", icon: Users, link: "/crm/customers", color: "text-blue-500" },
    { label: "AI报价", labelEn: "AI Quotation", icon: Zap, link: "/ai/quotation-assistant", color: "text-purple-500" },
    { label: "客户问卷", labelEn: "Questionnaire", icon: FileText, link: "/customer-questionnaire", color: "text-orange-500" },
  ],
  bu_mech: [
    { label: "设计任务", labelEn: "Design Tasks", icon: Cog, link: "/tasks", color: "text-sky-500" },
    { label: "BOM查看", labelEn: "BOM View", icon: Package, link: "/bom-management", color: "text-amber-500" },
    { label: "工程变更", labelEn: "ECN", icon: FileText, link: "/bom-verification", color: "text-orange-500" },
    { label: "知识库", labelEn: "Knowledge", icon: BookOpen, link: "/notebook-search", color: "text-green-500" },
  ],
  bu_elec: [
    { label: "设计任务", labelEn: "Design Tasks", icon: Zap, link: "/tasks", color: "text-cyan-500" },
    { label: "BOM查看", labelEn: "BOM View", icon: Package, link: "/bom-management", color: "text-amber-500" },
    { label: "CCD集成", labelEn: "CCD", icon: Activity, link: "/ccd-integration", color: "text-purple-500" },
    { label: "知识库", labelEn: "Knowledge", icon: BookOpen, link: "/notebook-search", color: "text-green-500" },
  ],
  procurement_eng: [
    { label: "采购订单", labelEn: "PO Orders", icon: ShoppingCart, link: "/pos/procurement", color: "text-amber-500" },
    { label: "仓库管理", labelEn: "Warehouse", icon: Package, link: "/warehouse-management", color: "text-blue-500" },
    { label: "供应商", labelEn: "Suppliers", icon: Building2, link: "/supplier-assessment", color: "text-green-500" },
    { label: "库存预警", labelEn: "Stock Alert", icon: AlertTriangle, link: "/inventory-dashboard", color: "text-red-500" },
  ],
  cs_engineer: [
    { label: "服务工单", labelEn: "Service Orders", icon: Headphones, link: "/after-sales", color: "text-orange-500" },
    { label: "客户签收", labelEn: "Signature", icon: CheckCircle2, link: "/final-acceptance", color: "text-green-500" },
    { label: "现场服务", labelEn: "Field Service", icon: Wrench, link: "/after-sales-advanced", color: "text-blue-500" },
    { label: "知识库", labelEn: "Knowledge", icon: BookOpen, link: "/notebook-search", color: "text-purple-500" },
  ],
  hr_manager: [
    { label: "人事管理", labelEn: "HR Management", icon: Users, link: "/employee-management", color: "text-pink-500" },
    { label: "绩效评估", labelEn: "Performance", icon: Target, link: "/employee-performance", color: "text-indigo-500" },
    { label: "培训管理", labelEn: "Training", icon: BookOpen, link: "/training", color: "text-green-500" },
    { label: "离职管理", labelEn: "Offboarding", icon: FileText, link: "/offboarding", color: "text-orange-500" },
  ],
  finance_manager: [
    { label: "成本管理", labelEn: "Cost", icon: BarChart3, link: "/cost-standards", color: "text-blue-500" },
    { label: "预算管理", labelEn: "Budget", icon: Target, link: "/budget-management", color: "text-indigo-500" },
    { label: "费用报表", labelEn: "Expense", icon: FileText, link: "/expense-report", color: "text-green-500" },
    { label: "审批中心", labelEn: "Approval", icon: CheckCircle2, link: "/budget-overrun-approval", color: "text-orange-500" },
  ],
  production_worker: [
    { label: "工位看板", labelEn: "Station Board", icon: LayoutDashboard, link: "/worker-mobile", color: "text-blue-500" },
    { label: "工序进度", labelEn: "Process", icon: Activity, link: "/process-progress", color: "text-green-500" },
    { label: "质检记录", labelEn: "QC", icon: CheckCircle2, link: "/quality-checkpoints", color: "text-orange-500" },
  ],
  employee: [
    { label: "我的任务", labelEn: "My Tasks", icon: ListTodo, link: "/tasks", color: "text-blue-500" },
    { label: "日程安排", labelEn: "Calendar", icon: Calendar, link: "/annual-agenda", color: "text-green-500" },
    { label: "AI助手", labelEn: "AI Assistant", icon: Zap, link: "/ai-assistant", color: "text-purple-500" },
    { label: "帮助中心", labelEn: "Help", icon: BookOpen, link: "/help", color: "text-orange-500" },
  ],
};

// 默认快捷操作（未配置的角色使用）
const defaultQuickActions: QuickAction[] = roleQuickActions.employee;

// ============================================
// 模拟待办/通知数据
// ============================================

const mockPendingItems = [
  { id: 1, type: "approval", title: "采购申请 PR-20260212-001 待审批", time: "10分钟前", urgent: true },
  { id: 2, type: "task", title: "M3阶段评审资料准备", time: "30分钟前", urgent: false },
  { id: 3, type: "meeting", title: "项目周例会 14:00", time: "1小时后", urgent: false },
  { id: 4, type: "notification", title: "BOM版本 v2.1 已审批通过", time: "2小时前", urgent: false },
  { id: 5, type: "alert", title: "物料 MC-E-01-0023 库存低于安全库存", time: "3小时前", urgent: true },
];

const mockProjectStats = [
  { name: "XZ-2026-001 半导体清洗设备", stage: "M3", progress: 45, status: "on_track" },
  { name: "CV-2026-003 商用车装配线", stage: "M5", progress: 72, status: "on_track" },
  { name: "IC-2025-012 芯片封装设备", stage: "M9", progress: 88, status: "at_risk" },
  { name: "GN-2026-002 通用检测平台", stage: "M1", progress: 15, status: "on_track" },
];

// ============================================
// 组件
// ============================================

export default function RoleDashboard() {
  const { currentUserRole: role, currentBU: buCode } = useUserProfile();
  const name = '';
  const { t, language } = useLanguage();
  const isEn = language === "en";

  const roleConfig = ROLE_CONFIGS[role as UserRole] || ROLE_CONFIGS.employee;
  const quickActions = roleQuickActions[role] || defaultQuickActions;

  // 获取问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return isEn ? "Good morning" : "早上好";
    if (hour < 18) return isEn ? "Good afternoon" : "下午好";
    return isEn ? "Good evening" : "晚上好";
  };

  return (
    <Layout>
    <div className="space-y-6">
      {/* Header: 问候 + 角色信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}，{name || (isEn ? "User" : "用户")}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={`${roleConfig.color} text-white`}>
              {isEn ? roleConfig.labelEn : roleConfig.label}
            </Badge>
            {buCode && (
              <Badge variant="outline">
                {buCode === "BU1" ? "海外" : buCode === "BU2" ? "商用车" : buCode === "BU3" ? "乘用车" : buCode === "BU4" ? "半导体" : "工业通用"}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString(isEn ? "en-US" : "zh-CN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/profile">
              <Cog className="w-4 h-4 mr-1" />
              {isEn ? "Settings" : "设置"}
            </Link>
          </Button>
        </div>
      </div>

      {/* 快捷操作网格 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          {isEn ? "Quick Actions" : "快捷操作"}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {quickActions.map((action, idx) => (
            <Link key={idx} href={action.link}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                  <action.icon className={`w-8 h-8 mb-2 ${action.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-sm font-medium">
                    {isEn ? action.labelEn : action.label}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* 主仪表板区域: 待办 + 项目/业务卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧: 待办事项 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-500" />
                {isEn ? "Pending Items" : "待办事项"}
              </CardTitle>
              <Badge>{mockPendingItems.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockPendingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.urgent && (
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    {!item.urgent && item.type === "approval" && (
                      <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                    )}
                    {!item.urgent && item.type === "task" && (
                      <ListTodo className="w-4 h-4 text-green-500 shrink-0" />
                    )}
                    {!item.urgent && item.type === "meeting" && (
                      <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
                    )}
                    {!item.urgent && item.type === "notification" && (
                      <Bell className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                    <div>
                      <p className={`text-sm ${item.urgent ? "font-semibold text-red-700 dark:text-red-400" : ""}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 右侧: 统计摘要 */}
        <div className="space-y-4">
          {/* 今日统计 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                {isEn ? "Today's Summary" : "今日概况"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                  <p className="text-2xl font-bold text-blue-600">5</p>
                  <p className="text-xs text-muted-foreground">{isEn ? "Pending" : "待处理"}</p>
                </div>
                <div className="text-center p-2 rounded bg-green-50 dark:bg-green-950/30">
                  <p className="text-2xl font-bold text-green-600">12</p>
                  <p className="text-xs text-muted-foreground">{isEn ? "Completed" : "已完成"}</p>
                </div>
                <div className="text-center p-2 rounded bg-orange-50 dark:bg-orange-950/30">
                  <p className="text-2xl font-bold text-orange-600">2</p>
                  <p className="text-xs text-muted-foreground">{isEn ? "Overdue" : "已逾期"}</p>
                </div>
                <div className="text-center p-2 rounded bg-purple-50 dark:bg-purple-950/30">
                  <p className="text-2xl font-bold text-purple-600">3</p>
                  <p className="text-xs text-muted-foreground">{isEn ? "Meetings" : "会议"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 角色专属提示卡 */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {isEn ? "Role Guide" : "角色指引"}
              </CardTitle>
              <CardDescription className="text-xs">
                {roleConfig.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/help">
                  <BookOpen className="w-4 h-4 mr-1" />
                  {isEn ? "View Guide" : "查看操作指南"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 项目进度概览 (BU角色 & PM可见) */}
      {["admin", "bu_gm", "bu_pm", "director"].includes(role) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-indigo-500" />
                {isEn ? "Project Overview" : "项目进度概览"}
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pos">
                  {isEn ? "View All" : "查看全部"} <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockProjectStats.map((proj, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{proj.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{proj.stage}</Badge>
                        {proj.status === "at_risk" && (
                          <Badge variant="destructive" className="text-xs">
                            {isEn ? "At Risk" : "有风险"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress value={proj.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{proj.progress}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 采购/库存概览 (采购工程师可见) */}
      {["admin", "procurement_eng", "bu_gm"].includes(role) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-500" />
                {isEn ? "Pending POs" : "待处理采购"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">8</p>
              <p className="text-xs text-muted-foreground">{isEn ? "orders pending approval" : "单待审批"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                {isEn ? "Low Stock Alerts" : "库存预警"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">3</p>
              <p className="text-xs text-muted-foreground">{isEn ? "items below safety stock" : "项低于安全库存"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                {isEn ? "Expiring Lots" : "即将过期批次"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">5</p>
              <p className="text-xs text-muted-foreground">{isEn ? "lots expiring within 30 days" : "批次30天内过期"}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </Layout>
  );
}
