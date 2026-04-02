/**
 * 出纳工作台 (Cashier Workstation)
 *
 * 黄晓兰(GRT002)专属 — 待付款队列 · 付款执行 · 银行账户 · 今日流水 · 工资发放
 * 设计原则：每一笔付款=一个可操作卡片，一键确认付款
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Banknote, CheckCircle2, Clock, CreditCard, DollarSign,
  Landmark, Receipt, Send, Users, Wallet, AlertTriangle,
  ChevronRight, Eye, RefreshCw, Search, FileText,
} from "lucide-react";

export default function CashierWorkstation() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [activeTab, setActiveTab] = useState("queue");

  // 待付款队列 — 从财务工作流获取
  const reimbQ = trpc.financeWorkflow.reimbursement.list.useQuery(
    { status: "cashier_processing", limit: 50 },
    { retry: false },
  );
  const supplierQ = trpc.financeWorkflow.supplierPayment.list.useQuery(
    { status: "approved", limit: 50 },
    { retry: false },
  );
  const bankQ = trpc.financeWorkflow.bankAccount.list.useQuery(undefined, { retry: false });

  const reimbursements = (reimbQ.data as any)?.items || (reimbQ.data as any) || [];
  const supplierPayments = (supplierQ.data as any)?.items || (supplierQ.data as any) || [];
  const bankAccounts = (bankQ.data as any) || [];

  const totalPending = reimbursements.length + supplierPayments.length;

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* 顶部概览 */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-green-600" />
            {isZh ? "出纳工作台" : "Cashier Workstation"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user?.name || "出纳"} · {new Date().toLocaleDateString(isZh ? "zh-CN" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-sm font-medium dark:bg-red-950/20 dark:border-red-800">
            <Clock className="w-4 h-4" />
            {isZh ? "待付" : "Queue"}: <span className="font-bold">{totalPending}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-medium dark:bg-green-950/20 dark:border-green-800">
            <Landmark className="w-4 h-4" />
            {isZh ? "银行" : "Banks"}: <span className="font-bold">{bankAccounts.length}</span>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="queue" className="gap-1.5">
            <Banknote className="w-4 h-4" />{isZh ? "待付款" : "Payment Queue"}
            {totalPending > 0 && <Badge variant="destructive" className="text-[10px] ml-1">{totalPending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="banks" className="gap-1.5"><Landmark className="w-4 h-4" />{isZh ? "银行账户" : "Banks"}</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5"><DollarSign className="w-4 h-4" />{isZh ? "工资发放" : "Payroll"}</TabsTrigger>
          <TabsTrigger value="collections" className="gap-1.5"><CreditCard className="w-4 h-4" />{isZh ? "客户收款" : "Collections"}</TabsTrigger>
        </TabsList>

        {/* Tab 1: 待付款队列 */}
        <TabsContent value="queue" className="mt-4 space-y-4">
          {/* 报销待付 */}
          <section>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 text-blue-600" />
              {isZh ? "报销待付款" : "Expense Claims to Pay"} ({reimbursements.length})
            </h3>
            {reimbursements.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">{isZh ? "暂无待付报销" : "No pending expense payments"}</p>
            )}
            <div className="space-y-2">
              {reimbursements.map((r: any) => (
                <PaymentCard
                  key={r.id}
                  type="reimburse"
                  title={r.applicantName || `${isZh ? "报销单" : "Claim"} #${r.id}`}
                  subtitle={r.expenseType || r.category || "—"}
                  amount={r.totalAmount}
                  date={r.submittedAt || r.createdAt}
                  bankInfo={r.applicantBankAccount}
                  isZh={isZh}
                />
              ))}
            </div>
          </section>

          <Separator />

          {/* 供应商待付 */}
          <section>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Send className="w-4 h-4 text-purple-600" />
              {isZh ? "供应商待付款" : "Supplier Payments"} ({supplierPayments.length})
            </h3>
            {supplierPayments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">{isZh ? "暂无待付供应商款" : "No pending supplier payments"}</p>
            )}
            <div className="space-y-2">
              {supplierPayments.map((sp: any) => (
                <PaymentCard
                  key={sp.id}
                  type="supplier"
                  title={sp.supplierName || `${isZh ? "供应商" : "Supplier"} #${sp.id}`}
                  subtitle={`${sp.paymentPhase || "—"} · ${sp.contractCode || ""}`}
                  amount={sp.phaseAmount || sp.amount}
                  date={sp.dueDate || sp.createdAt}
                  bankInfo={sp.supplierBankAccount}
                  isZh={isZh}
                />
              ))}
            </div>
          </section>
        </TabsContent>

        {/* Tab 2: 银行账户 */}
        <TabsContent value="banks" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bankAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8 md:col-span-2">{isZh ? "暂无银行账户" : "No bank accounts"}</p>
            )}
            {bankAccounts.map((bank: any) => (
              <Card key={bank.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-sm">{bank.bankName || bank.accountName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{bank.accountNumber ? `****${bank.accountNumber.slice(-4)}` : "—"}</p>
                      </div>
                    </div>
                    <Badge variant={bank.accountType === "company" ? "default" : "outline"} className="text-[10px]">
                      {bank.accountType}
                    </Badge>
                  </div>
                  {bank.balance != null && (
                    <div className="mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">{isZh ? "余额" : "Balance"}</span>
                      <p className="text-lg font-bold tabular-nums text-green-700">
                        {bank.currency || "¥"}{Number(bank.balance).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: 工资发放 */}
        <TabsContent value="payroll" className="mt-4">
          <PayrollSection isZh={isZh} />
        </TabsContent>

        {/* Tab 4: 客户收款 */}
        <TabsContent value="collections" className="mt-4">
          <CollectionsSection isZh={isZh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** 单笔待付款卡片 */
function PaymentCard({ type, title, subtitle, amount, date, bankInfo, isZh }: {
  type: "reimburse" | "supplier";
  title: string;
  subtitle: string;
  amount?: string | number;
  date?: string;
  bankInfo?: string;
  isZh: boolean;
}) {
  const iconColor = type === "reimburse" ? "text-blue-600 bg-blue-100" : "text-purple-600 bg-purple-100";
  const Icon = type === "reimburse" ? Receipt : Send;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/30 transition-colors touch-feedback">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        {date && <span className="text-[10px] text-muted-foreground">{new Date(date).toLocaleDateString()}</span>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-sm tabular-nums">
          ¥{amount ? Number(amount).toLocaleString("zh-CN", { minimumFractionDigits: 2 }) : "—"}
        </p>
        <Badge variant="outline" className="text-[10px]">{isZh ? "待付" : "Pending"}</Badge>
      </div>
    </div>
  );
}

/** 工资发放区 */
function PayrollSection({ isZh }: { isZh: boolean }) {
  const payrollQ = trpc.payroll.ledger.list.useQuery(
    { period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`, limit: 10 },
    { retry: false },
  );
  const ledgers = (payrollQ.data as any) || [];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-orange-600" />
        {isZh ? "本月工资" : "This Month Payroll"}
      </h3>
      {ledgers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p>{isZh ? "本月工资尚未计算或提交" : "Payroll not yet calculated"}</p>
          </CardContent>
        </Card>
      )}
      {ledgers.map((l: any) => (
        <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{l.employeeName || `#${l.employeeId}`}</p>
              <p className="text-[10px] text-muted-foreground">{l.department || "—"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm tabular-nums">¥{Number(l.netPay || l.grossPay || 0).toLocaleString()}</p>
            <Badge variant={l.status === "PAID" ? "default" : l.status === "CEO_APPROVED" ? "secondary" : "outline"} className="text-[10px]">
              {l.status || "—"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 客户收款区 */
function CollectionsSection({ isZh }: { isZh: boolean }) {
  const collectQ = trpc.financeWorkflow.customerPayment.list.useQuery(
    { status: "pending", limit: 20 },
    { retry: false },
  );
  const collections = (collectQ.data as any)?.items || (collectQ.data as any) || [];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-red-600" />
        {isZh ? "待确认收款" : "Pending Collections"}
      </h3>
      {collections.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p>{isZh ? "暂无待确认收款" : "No pending collections"}</p>
          </CardContent>
        </Card>
      )}
      {collections.map((c: any) => (
        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <p className="text-sm font-medium">{c.customerName || `#${c.id}`}</p>
            <p className="text-xs text-muted-foreground">{c.milestone || c.contractCode || "—"}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm tabular-nums text-green-700">¥{Number(c.amount || 0).toLocaleString()}</p>
            <Badge variant="outline" className="text-[10px]">{isZh ? "待确认" : "Pending"}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
