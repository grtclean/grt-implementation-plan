/**
 * 财务快捷中枢 (Finance Quick Hub)
 *
 * 根据角色显示不同内容：
 *  - finance_specialist (财务专员): 待审报销 · 待审盘点 · 凭证录入
 *  - finance_manager (财务经理): KPI概览 · 待审批 · 预算预警 · 期末状态
 *  - cashier (出纳=黄晓兰): 待付款队列 · 银行余额 · 今日付款
 *  - employee/其他: 我的报销 · 提交报销 · 进度查询
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import {
  Receipt, Wallet, ClipboardCheck, Landmark, DollarSign,
  FileText, ArrowRight, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, Calculator, Package, BarChart3, CreditCard,
  Send, Eye, Users, Calendar, Building2, Banknote,
  ChevronRight, RefreshCw, Shield,
} from "lucide-react";

// ═══════════════════════════════════════
// 快捷卡片定义
// ═══════════════════════════════════════
interface QuickCard {
  id: string;
  labelZh: string;
  labelEn: string;
  icon: typeof Receipt;
  path: string;
  color: string;
  bgColor: string;
  descZh: string;
  descEn: string;
}

const SPECIALIST_CARDS: QuickCard[] = [
  { id: "review-reimburse", labelZh: "待审报销", labelEn: "Review Expense", icon: Receipt, path: "/finance", color: "#2563eb", bgColor: "#dbeafe", descZh: "初审员工报销单", descEn: "Review expense claims" },
  { id: "gl-entry", labelZh: "凭证录入", labelEn: "GL Entry", icon: FileText, path: "/gl-accounting", color: "#9333ea", bgColor: "#f3e8ff", descZh: "记账凭证管理", descEn: "Journal entries" },
  { id: "inv-count", labelZh: "物料盘点", labelEn: "Inventory Count", icon: ClipboardCheck, path: "/inventory-count-flow", color: "#ea580c", bgColor: "#ffedd5", descZh: "创建/复核盘点单", descEn: "Create/review counts" },
  { id: "supplier-pay", labelZh: "供应商付款", labelEn: "Supplier Pay", icon: Banknote, path: "/finance", color: "#16a34a", bgColor: "#dcfce7", descZh: "跟踪供应商账期", descEn: "Track supplier payments" },
  { id: "tax-invoice", labelZh: "发票管理", labelEn: "Tax Invoice", icon: CreditCard, path: "/gl-accounting", color: "#dc2626", bgColor: "#fee2e2", descZh: "进项/销项发票认证", descEn: "Input/output invoices" },
  { id: "period-close", labelZh: "期末结账", labelEn: "Period Close", icon: Calendar, path: "/gl-accounting", color: "#0891b2", bgColor: "#cffafe", descZh: "月末结账checklist", descEn: "Month-end close" },
];

const MANAGER_CARDS: QuickCard[] = [
  { id: "approve", labelZh: "待审批", labelEn: "Approvals", icon: Shield, path: "/finance", color: "#dc2626", bgColor: "#fee2e2", descZh: "报销/预算/付款审批", descEn: "Expense/budget approvals" },
  { id: "budget", labelZh: "预算管理", labelEn: "Budget", icon: BarChart3, path: "/budget-management", color: "#2563eb", bgColor: "#dbeafe", descZh: "预算编制与监控", descEn: "Budget tracking" },
  { id: "cost", labelZh: "成本分析", labelEn: "Cost Analysis", icon: TrendingUp, path: "/cost", color: "#9333ea", bgColor: "#f3e8ff", descZh: "项目/部门成本", descEn: "Project/dept costs" },
  { id: "bank-recon", labelZh: "银行对账", labelEn: "Bank Recon", icon: Landmark, path: "/finance-advanced", color: "#16a34a", bgColor: "#dcfce7", descZh: "银行流水vs账面", descEn: "Bank reconciliation" },
  { id: "report", labelZh: "财务报表", labelEn: "Reports", icon: FileText, path: "/finance-advanced", color: "#ea580c", bgColor: "#ffedd5", descZh: "BS/PL/现金流", descEn: "BS/PL/Cash Flow" },
  { id: "depreciation", labelZh: "固定资产", labelEn: "Fixed Assets", icon: Building2, path: "/gl-accounting", color: "#0891b2", bgColor: "#cffafe", descZh: "折旧计提与处置", descEn: "Depreciation & disposal" },
];

const CASHIER_CARDS: QuickCard[] = [
  { id: "cashier-desk", labelZh: "出纳工作台", labelEn: "Cashier Desk", icon: Wallet, path: "/cashier-workstation", color: "#16a34a", bgColor: "#dcfce7", descZh: "待付款队列一站式", descEn: "Payment queue" },
  { id: "pay-reimburse", labelZh: "报销付款", labelEn: "Pay Expense", icon: Banknote, path: "/finance", color: "#2563eb", bgColor: "#dbeafe", descZh: "执行已审批报销", descEn: "Execute approved claims" },
  { id: "pay-supplier", labelZh: "供应商付款", labelEn: "Supplier Pay", icon: Send, path: "/finance", color: "#9333ea", bgColor: "#f3e8ff", descZh: "合同款支付", descEn: "Contract payments" },
  { id: "pay-payroll", labelZh: "工资发放", labelEn: "Payroll", icon: DollarSign, path: "/payroll", color: "#ea580c", bgColor: "#ffedd5", descZh: "月度工资执行", descEn: "Monthly payroll" },
  { id: "bank-account", labelZh: "银行账户", labelEn: "Bank Accounts", icon: Landmark, path: "/finance", color: "#0891b2", bgColor: "#cffafe", descZh: "账户余额与流水", descEn: "Account balances" },
  { id: "receipt", labelZh: "客户收款", labelEn: "Collections", icon: CreditCard, path: "/finance", color: "#dc2626", bgColor: "#fee2e2", descZh: "确认客户到账", descEn: "Customer receipts" },
];

const EMPLOYEE_CARDS: QuickCard[] = [
  { id: "submit-expense", labelZh: "提交报销", labelEn: "Submit Expense", icon: Receipt, path: "/expense-report", color: "#2563eb", bgColor: "#dbeafe", descZh: "差旅·招待·办公费用", descEn: "Travel, meals, office" },
  { id: "my-progress", labelZh: "报销进度", labelEn: "My Claims", icon: Eye, path: "/finance", color: "#16a34a", bgColor: "#dcfce7", descZh: "查看审批进度", descEn: "Track approval status" },
  { id: "trip-request", labelZh: "出差申请", labelEn: "Trip Request", icon: Send, path: "/trip-request", color: "#9333ea", bgColor: "#f3e8ff", descZh: "提交出差审批", descEn: "Submit trip approval" },
  { id: "my-payslip", labelZh: "我的工资条", labelEn: "My Payslip", icon: DollarSign, path: "/payroll", color: "#ea580c", bgColor: "#ffedd5", descZh: "查看薪资明细", descEn: "View salary details" },
];

export default function FinanceQuickHub() {
  const { user } = useAuth();
  const { currentUserRole } = useUserProfile();
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const isZh = language === "zh";

  // 决定角色视图
  const isCashier = user?.name === "黄晓兰" || user?.username === "xiaolan";
  const isSpecialist = currentUserRole === "finance_specialist" || user?.name === "王汝月";
  const isManager = currentUserRole === "finance_manager" || currentUserRole === "cfo" || user?.name === "倪微薇" || user?.name === "王秀萍";

  let cards: QuickCard[];
  let roleLabel: string;
  if (isCashier) {
    cards = CASHIER_CARDS;
    roleLabel = isZh ? "出纳" : "Cashier";
  } else if (isManager) {
    cards = MANAGER_CARDS;
    roleLabel = isZh ? "财务经理" : "Finance Manager";
  } else if (isSpecialist) {
    cards = SPECIALIST_CARDS;
    roleLabel = isZh ? "财务专员" : "Finance Specialist";
  } else {
    cards = EMPLOYEE_CARDS;
    roleLabel = isZh ? "员工" : "Employee";
  }

  // 拉取待办统计
  const overviewQ = trpc.financeWorkflow.dashboard.getOverview.useQuery(undefined, { retry: false });
  const overview = overviewQ.data as any;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 顶部 */}
      <header>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{isZh ? "财务中枢" : "Finance Hub"}</h1>
            <p className="text-sm text-muted-foreground">
              {user?.name || (isZh ? "用户" : "User")} · <Badge variant="outline" className="text-[10px]">{roleLabel}</Badge>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => overviewQ.refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />{isZh ? "刷新" : "Refresh"}
          </Button>
        </div>

        {/* 概览数字条 */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
            {isCashier && (
              <>
                <MiniStat icon={<Banknote className="w-4 h-4" />} label={isZh ? "待付款" : "To Pay"} value={overview.pendingPayments ?? "—"} color="red" />
                <MiniStat icon={<CheckCircle2 className="w-4 h-4" />} label={isZh ? "今日已付" : "Paid Today"} value={overview.paidToday ?? "—"} color="green" />
                <MiniStat icon={<Landmark className="w-4 h-4" />} label={isZh ? "账户数" : "Accounts"} value={overview.bankAccountCount ?? "—"} color="blue" />
                <MiniStat icon={<CreditCard className="w-4 h-4" />} label={isZh ? "待收款" : "To Collect"} value={overview.pendingCollections ?? "—"} color="amber" />
              </>
            )}
            {isSpecialist && (
              <>
                <MiniStat icon={<Receipt className="w-4 h-4" />} label={isZh ? "待审报销" : "To Review"} value={overview.pendingReimbursements ?? "—"} color="red" />
                <MiniStat icon={<ClipboardCheck className="w-4 h-4" />} label={isZh ? "待审盘点" : "Counts"} value={overview.pendingCounts ?? "—"} color="amber" />
                <MiniStat icon={<FileText className="w-4 h-4" />} label={isZh ? "本月凭证" : "Entries"} value={overview.monthEntries ?? "—"} color="blue" />
                <MiniStat icon={<CheckCircle2 className="w-4 h-4" />} label={isZh ? "已完成" : "Done"} value={overview.completedThisMonth ?? "—"} color="green" />
              </>
            )}
            {isManager && (
              <>
                <MiniStat icon={<Shield className="w-4 h-4" />} label={isZh ? "待审批" : "Approvals"} value={overview.pendingApprovals ?? "—"} color="red" />
                <MiniStat icon={<AlertTriangle className="w-4 h-4" />} label={isZh ? "预算预警" : "Alerts"} value={overview.budgetAlerts ?? "—"} color="amber" />
                <MiniStat icon={<TrendingUp className="w-4 h-4" />} label={isZh ? "本月支出" : "Spending"} value={overview.monthSpending ? `¥${(overview.monthSpending / 10000).toFixed(0)}万` : "—"} color="blue" />
                <MiniStat icon={<BarChart3 className="w-4 h-4" />} label={isZh ? "预算执行" : "Budget %"} value={overview.budgetExecution ? `${overview.budgetExecution}%` : "—"} color="green" />
              </>
            )}
            {!isCashier && !isSpecialist && !isManager && (
              <>
                <MiniStat icon={<Receipt className="w-4 h-4" />} label={isZh ? "我的报销" : "My Claims"} value={overview.myReimbursements ?? "—"} color="blue" />
                <MiniStat icon={<Clock className="w-4 h-4" />} label={isZh ? "审批中" : "Pending"} value={overview.myPending ?? "—"} color="amber" />
                <MiniStat icon={<CheckCircle2 className="w-4 h-4" />} label={isZh ? "已报销" : "Paid"} value={overview.myPaid ?? "—"} color="green" />
                <MiniStat icon={<DollarSign className="w-4 h-4" />} label={isZh ? "本月金额" : "Amount"} value={overview.myMonthAmount ? `¥${overview.myMonthAmount}` : "—"} color="blue" />
              </>
            )}
          </div>
        )}
      </header>

      {/* 快捷卡片网格 */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-wider uppercase">
          {isZh ? "快捷操作" : "Quick Actions"}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => navigate(card.path)}
                className="touch-feedback active:scale-[0.97] transition-transform text-left"
              >
                <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col gap-3 min-h-[100px]">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: card.bgColor, color: card.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{isZh ? card.labelZh : card.labelEn}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{isZh ? card.descZh : card.descEn}</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      {/* 常用操作提示 — 仅员工角色 */}
      {!isCashier && !isSpecialist && !isManager && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              {isZh ? "报销小贴士" : "Expense Tips"}
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• {isZh ? "差旅费请附行程单，招待费需注明事由和人数" : "Attach itinerary for travel, specify reason and headcount for meals"}</li>
              <li>• {isZh ? "单笔超过¥10,000需总监审批，处理时间约多1-2天" : "Claims over ¥10,000 require director approval (1-2 extra days)"}</li>
              <li>• {isZh ? "每月25日前提交当月报销，逾期归入下月" : "Submit by 25th for same-month processing"}</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    red: "border-red-200 bg-red-50 dark:bg-red-950/20",
    green: "border-green-200 bg-green-50 dark:bg-green-950/20",
    amber: "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
    blue: "border-blue-200 bg-blue-50 dark:bg-blue-950/20",
  };
  const textMap: Record<string, string> = { red: "text-red-700", green: "text-green-700", amber: "text-amber-700", blue: "text-blue-700" };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${textMap[color]}`}>
        {icon}
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-bold tabular-nums ${textMap[color]}`}>{value}</p>
    </div>
  );
}
