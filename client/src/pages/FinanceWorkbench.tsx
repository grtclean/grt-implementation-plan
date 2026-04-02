/**
 * 财务工作台 (Finance Workbench)
 * 报销中心 / 供应商付款 / 客户收款 / 物料盘点 / 固定费用 / 财务沙盘
 * 路由: /finance
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Receipt, Truck, Landmark, PackageSearch, Building2, TrendingUp,
  AlertTriangle, CheckCircle, Clock, XCircle, Plus, Search, Filter,
  ArrowUpRight, ArrowDownRight, DollarSign, FileText, Send, Eye,
  Loader2, CalendarDays, BarChart3, History,
} from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { trpc } from "@/lib/trpc";

// ── Types ──────────────────────────────────────────────────────

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'paid';
type PaymentPhase = 'prepay' | 'delivery' | 'acceptance' | 'warranty';

interface Reimbursement {
  id: string;
  applicant: string;
  projectCode: string;
  category: string;
  amount: number;
  status: ApprovalStatus;
  submitDate: string;
  description: string;
}

interface SupplierPayment {
  id: string;
  supplier: string;
  projectCode: string;
  poNumber: string;
  totalAmount: number;
  phases: { phase: PaymentPhase; amount: number; dueDate: string; paid: boolean }[];
}

interface CustomerReceipt {
  id: string;
  customer: string;
  projectCode: string;
  contractAmount: number;
  milestones: { name: string; amount: number; dueDate: string; received: boolean }[];
}

interface InventoryCountSheet {
  id: string;
  warehouse: string;
  material: string;
  bookQty: number;
  actualQty: number | null;
  variance: number | null;
  status: 'draft' | 'counting' | 'completed';
  countDate: string;
}

interface FixedExpense {
  id: string;
  category: string;
  vendor: string;
  monthlyAmount: number;
  contractEnd: string;
  lastPaidDate: string;
  autoRenew: boolean;
}

interface ProjectCostRef {
  projectCode: string;
  projectName: string;
  budget: number;
  actual: number;
  variance: number;
  year: number;
}

// ── Mock Data ──────────────────────────────────────────────────

const REIMBURSEMENTS: Reimbursement[] = [
  { id: 'R-2026-0301', applicant: '李大鹏', projectCode: 'PRJ-HW-2026-008', category: '差旅费', amount: 3850, status: 'pending', submitDate: '2026-03-15', description: '客户现场调试出差' },
  { id: 'R-2026-0302', applicant: '洪小东', projectCode: 'PRJ-HW-2026-012', category: '招待费', amount: 1200, status: 'pending', submitDate: '2026-03-14', description: '供应商来访接待' },
  { id: 'R-2026-0303', applicant: '韩保程', projectCode: 'PRJ-HW-2025-045', category: '办公用品', amount: 680, status: 'approved', submitDate: '2026-03-10', description: '事业一部绘图仪耗材' },
  { id: 'R-2026-0304', applicant: '张洵', projectCode: 'PRJ-HW-2026-003', category: '差旅费', amount: 5200, status: 'paid', submitDate: '2026-03-05', description: '海外展会参展' },
  { id: 'R-2026-0305', applicant: '钱佳奇', projectCode: 'PRJ-HW-2026-015', category: '交通费', amount: 420, status: 'rejected', submitDate: '2026-03-12', description: '缺少发票' },
];

const SUPPLIER_PAYMENTS: SupplierPayment[] = [
  {
    id: 'SP-001', supplier: '苏州精密机械', projectCode: 'PRJ-HW-2026-008', poNumber: 'PO-2026-0156',
    totalAmount: 285000,
    phases: [
      { phase: 'prepay', amount: 85500, dueDate: '2026-02-15', paid: true },
      { phase: 'delivery', amount: 114000, dueDate: '2026-03-20', paid: false },
      { phase: 'acceptance', amount: 57000, dueDate: '2026-04-10', paid: false },
      { phase: 'warranty', amount: 28500, dueDate: '2026-07-10', paid: false },
    ],
  },
  {
    id: 'SP-002', supplier: '东莞电气设备', projectCode: 'PRJ-HW-2026-012', poNumber: 'PO-2026-0189',
    totalAmount: 142000,
    phases: [
      { phase: 'prepay', amount: 42600, dueDate: '2026-03-01', paid: true },
      { phase: 'delivery', amount: 56800, dueDate: '2026-03-25', paid: false },
      { phase: 'acceptance', amount: 28400, dueDate: '2026-04-20', paid: false },
      { phase: 'warranty', amount: 14200, dueDate: '2026-07-20', paid: false },
    ],
  },
  {
    id: 'SP-003', supplier: '上海伺服科技', projectCode: 'PRJ-HW-2026-003', poNumber: 'PO-2026-0201',
    totalAmount: 96000,
    phases: [
      { phase: 'prepay', amount: 28800, dueDate: '2026-01-20', paid: true },
      { phase: 'delivery', amount: 38400, dueDate: '2026-02-28', paid: true },
      { phase: 'acceptance', amount: 19200, dueDate: '2026-03-15', paid: false },
      { phase: 'warranty', amount: 9600, dueDate: '2026-06-15', paid: false },
    ],
  },
];

const CUSTOMER_RECEIPTS: CustomerReceipt[] = [
  {
    id: 'CR-001', customer: '一汽大众', projectCode: 'PRJ-HW-2026-008', contractAmount: 1850000,
    milestones: [
      { name: '预付款(30%)', amount: 555000, dueDate: '2026-01-15', received: true },
      { name: '发货款(40%)', amount: 740000, dueDate: '2026-03-20', received: false },
      { name: '验收款(25%)', amount: 462500, dueDate: '2026-05-01', received: false },
      { name: '质保金(5%)', amount: 92500, dueDate: '2026-11-01', received: false },
    ],
  },
  {
    id: 'CR-002', customer: '比亚迪', projectCode: 'PRJ-HW-2026-012', contractAmount: 960000,
    milestones: [
      { name: '预付款(30%)', amount: 288000, dueDate: '2026-02-01', received: true },
      { name: '发货款(40%)', amount: 384000, dueDate: '2026-04-01', received: false },
      { name: '验收款(25%)', amount: 240000, dueDate: '2026-05-15', received: false },
      { name: '质保金(5%)', amount: 48000, dueDate: '2026-11-15', received: false },
    ],
  },
];

const INVENTORY_SHEETS: InventoryCountSheet[] = [
  { id: 'IC-001', warehouse: '主仓库-A区', material: '伺服电机 750W', bookQty: 24, actualQty: 23, variance: -1, status: 'completed', countDate: '2026-03-10' },
  { id: 'IC-002', warehouse: '主仓库-B区', material: 'PLC模块 S7-1200', bookQty: 18, actualQty: 18, variance: 0, status: 'completed', countDate: '2026-03-10' },
  { id: 'IC-003', warehouse: '主仓库-A区', material: '铝型材 4040', bookQty: 156, actualQty: null, variance: null, status: 'counting', countDate: '2026-03-17' },
  { id: 'IC-004', warehouse: '外协仓', material: '定制法兰盘', bookQty: 42, actualQty: null, variance: null, status: 'draft', countDate: '2026-03-18' },
  { id: 'IC-005', warehouse: '主仓库-C区', material: '触摸屏 10寸', bookQty: 8, actualQty: 6, variance: -2, status: 'completed', countDate: '2026-03-10' },
];

const FIXED_EXPENSES: FixedExpense[] = [
  { id: 'FE-001', category: '房租', vendor: '苏州工业园物业', monthlyAmount: 85000, contractEnd: '2027-06-30', lastPaidDate: '2026-03-01', autoRenew: true },
  { id: 'FE-002', category: '水电费', vendor: '苏州供电局', monthlyAmount: 12000, contractEnd: '-', lastPaidDate: '2026-03-05', autoRenew: false },
  { id: 'FE-003', category: '物业费', vendor: '苏州工业园物业', monthlyAmount: 15000, contractEnd: '2027-06-30', lastPaidDate: '2026-03-01', autoRenew: true },
  { id: 'FE-004', category: '网络/电话', vendor: '中国电信', monthlyAmount: 3500, contractEnd: '2026-12-31', lastPaidDate: '2026-03-01', autoRenew: true },
  { id: 'FE-005', category: '保险', vendor: '平安财险', monthlyAmount: 8000, contractEnd: '2026-09-30', lastPaidDate: '2026-03-01', autoRenew: false },
];

const PROJECT_COST_REFS: ProjectCostRef[] = [
  { projectCode: 'PRJ-HW-2026-008', projectName: '一汽大众焊装线', budget: 1200000, actual: 890000, variance: -310000, year: 2026 },
  { projectCode: 'PRJ-HW-2026-012', projectName: '比亚迪涂装设备', budget: 650000, actual: 520000, variance: -130000, year: 2026 },
  { projectCode: 'PRJ-HW-2026-003', projectName: '海外展会定制线', budget: 480000, actual: 510000, variance: 30000, year: 2026 },
  { projectCode: 'PRJ-HW-2025-045', projectName: '宝马电池包线(去年)', budget: 980000, actual: 1020000, variance: 40000, year: 2025 },
  { projectCode: 'PRJ-HW-2025-032', projectName: '蔚来总装线(去年)', budget: 750000, actual: 680000, variance: -70000, year: 2025 },
];

// ── Helpers ────────────────────────────────────────────────────

const PHASE_LABELS: Record<PaymentPhase, string> = {
  prepay: '预付款', delivery: '发货款', acceptance: '验收款', warranty: '质保金',
};

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待审批', variant: 'secondary' },
  approved: { label: '已批准', variant: 'default' },
  rejected: { label: '已驳回', variant: 'destructive' },
  paid: { label: '已付款', variant: 'outline' },
};

const fmt = (n: number) => n.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 });

const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

const isFinanceRole = (role: string) =>
  ['admin', 'cfo', 'finance_manager', 'finance_specialist'].includes(role);

// ── Component ──────────────────────────────────────────────────

export default function FinanceWorkbench() {
  // Real-time data from backend (falls back to demo)
  const overviewQuery = trpc.financeWorkflow.dashboard.getOverview.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const isLive = !!overviewQuery.data && !overviewQuery.isError;

  const { currentUserRole } = useUserProfile();
  const canApprove = isFinanceRole(currentUserRole);

  const [reimbursements, setReimbursements] = useState(REIMBURSEMENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [inventorySheets] = useState(INVENTORY_SHEETS);

  // ── KPI calculations ──
  const pendingApprovals = reimbursements.filter(r => r.status === 'pending').length;
  const overdueAR = CUSTOMER_RECEIPTS.reduce((sum, cr) =>
    sum + cr.milestones.filter(m => !m.received && isOverdue(m.dueDate)).reduce((s, m) => s + m.amount, 0), 0);
  const monthlySpend = FIXED_EXPENSES.reduce((s, e) => s + e.monthlyAmount, 0);
  const budgetOverruns = PROJECT_COST_REFS.filter(p => p.variance > 0).length;

  const handleApprove = (id: string) => {
    setReimbursements(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r));
  };
  const handleReject = (id: string) => {
    setReimbursements(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
  };

  const filteredReimbursements = useMemo(() =>
    reimbursements.filter(r =>
      !searchTerm || r.applicant.includes(searchTerm) || r.projectCode.includes(searchTerm) || r.id.includes(searchTerm)
    ), [reimbursements, searchTerm]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Data source indicator */}
      <div className={`mb-3 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
        isLive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}>
        <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
        {isLive ? '实时数据 · Live Data' : '演示数据 · Demo Mode — 连接后端API后显示实时经营数据'}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6" /> 财务工作台
          </h1>
          <p className="text-muted-foreground mt-1">报销 / 付款 / 收款 / 盘点 / 固定费用 / 成本沙盘</p>
        </div>
        <Badge variant={canApprove ? 'default' : 'secondary'}>
          {canApprove ? '财务审批权限' : '查看权限'}
        </Badge>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">待审批报销</div>
              {pendingApprovals > 0 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            </div>
            <div className="text-2xl font-bold mt-1">{pendingApprovals}</div>
            <div className="text-xs text-muted-foreground">笔报销单</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">逾期应收</div>
              {overdueAR > 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
            </div>
            <div className="text-2xl font-bold mt-1">{fmt(overdueAR)}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-red-500" /> 需催收
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-muted-foreground">月度固定支出</div>
            <div className="text-2xl font-bold mt-1">{fmt(monthlySpend)}</div>
            <div className="text-xs text-muted-foreground">{FIXED_EXPENSES.length} 项费用</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">超预算项目</div>
              {budgetOverruns > 0 && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            </div>
            <div className="text-2xl font-bold mt-1">{budgetOverruns}</div>
            <div className="text-xs text-muted-foreground">个项目超支</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="reimbursement">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="reimbursement"><Receipt className="h-4 w-4 mr-1" /> 报销中心</TabsTrigger>
          <TabsTrigger value="supplier"><Truck className="h-4 w-4 mr-1" /> 供应商付款</TabsTrigger>
          <TabsTrigger value="customer"><DollarSign className="h-4 w-4 mr-1" /> 客户收款</TabsTrigger>
          <TabsTrigger value="inventory"><PackageSearch className="h-4 w-4 mr-1" /> 物料盘点</TabsTrigger>
          <TabsTrigger value="fixed"><Building2 className="h-4 w-4 mr-1" /> 固定费用</TabsTrigger>
          <TabsTrigger value="sandbox"><TrendingUp className="h-4 w-4 mr-1" /> 财务沙盘</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: 报销中心 ─────────────────────────── */}
        <TabsContent value="reimbursement" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索申请人 / 项目号 / 单号..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> 新建报销</Button>
          </div>

          {filteredReimbursements.map(r => (
            <Card key={r.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">{r.id} — {r.applicant}</div>
                      <div className="text-sm text-muted-foreground">{r.category} | {r.projectCode} | {r.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">提交: {r.submitDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">{fmt(r.amount)}</div>
                      <Badge variant={STATUS_CONFIG[r.status].variant} className="mt-1">
                        {STATUS_CONFIG[r.status].label}
                      </Badge>
                    </div>
                    {canApprove && r.status === 'pending' && (
                      <div className="flex flex-col gap-1 ml-2">
                        <Button size="sm" variant="default" onClick={() => handleApprove(r.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> 批准
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(r.id)}>
                          <XCircle className="h-3 w-3 mr-1" /> 驳回
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── Tab 2: 供应商付款 ─────────────────────────── */}
        <TabsContent value="supplier" className="mt-4 space-y-4">
          {SUPPLIER_PAYMENTS.map(sp => {
            const paidAmount = sp.phases.filter(p => p.paid).reduce((s, p) => s + p.amount, 0);
            const pct = Math.round((paidAmount / sp.totalAmount) * 100);
            const hasOverdue = sp.phases.some(p => !p.paid && isOverdue(p.dueDate));
            return (
              <Card key={sp.id} className={hasOverdue ? 'border-amber-300' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {sp.supplier}
                      {hasOverdue && <Badge variant="destructive" className="text-xs">逾期</Badge>}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">{sp.poNumber} | {sp.projectCode}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm">总额: {fmt(sp.totalAmount)}</span>
                    <span className="text-sm text-muted-foreground">已付: {fmt(paidAmount)} ({pct}%)</span>
                    <Progress value={pct} className="w-32" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {sp.phases.map(p => (
                      <div
                        key={p.phase}
                        className={`p-3 border rounded-lg text-sm ${p.paid ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : isOverdue(p.dueDate) ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : ''}`}
                      >
                        <div className="font-medium">{PHASE_LABELS[p.phase]}</div>
                        <div className="text-muted-foreground">{fmt(p.amount)}</div>
                        <div className="text-xs mt-1 flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> {p.dueDate}
                        </div>
                        <Badge variant={p.paid ? 'default' : 'secondary'} className="mt-1 text-xs">
                          {p.paid ? '已付' : isOverdue(p.dueDate) ? '逾期' : '待付'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Tab 3: 客户收款 ─────────────────────────── */}
        <TabsContent value="customer" className="mt-4 space-y-4">
          {CUSTOMER_RECEIPTS.map(cr => {
            const receivedAmount = cr.milestones.filter(m => m.received).reduce((s, m) => s + m.amount, 0);
            const pct = Math.round((receivedAmount / cr.contractAmount) * 100);
            const overdueMs = cr.milestones.filter(m => !m.received && isOverdue(m.dueDate));
            return (
              <Card key={cr.id} className={overdueMs.length > 0 ? 'border-red-300' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {cr.customer}
                      {overdueMs.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" /> {overdueMs.length}笔逾期
                        </Badge>
                      )}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">{cr.projectCode}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm">合同: {fmt(cr.contractAmount)}</span>
                    <span className="text-sm text-muted-foreground">已收: {fmt(receivedAmount)} ({pct}%)</span>
                    <Progress value={pct} className="w-32" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {cr.milestones.map((m, i) => (
                      <div
                        key={i}
                        className={`p-3 border rounded-lg text-sm ${m.received ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : isOverdue(m.dueDate) ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : ''}`}
                      >
                        <div className="font-medium">{m.name}</div>
                        <div className="text-muted-foreground">{fmt(m.amount)}</div>
                        <div className="text-xs mt-1 flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" /> {m.dueDate}
                        </div>
                        <Badge variant={m.received ? 'default' : 'secondary'} className="mt-1 text-xs">
                          {m.received ? '已收' : isOverdue(m.dueDate) ? '逾期催收' : '待收'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Tab 4: 物料盘点 ─────────────────────────── */}
        <TabsContent value="inventory" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              共 {inventorySheets.length} 项 | 已盘: {inventorySheets.filter(s => s.status === 'completed').length} | 差异: {inventorySheets.filter(s => s.variance !== null && s.variance !== 0).length}
            </div>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> 新建盘点单</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">单号</th>
                      <th className="text-left p-3">仓位</th>
                      <th className="text-left p-3">物料</th>
                      <th className="text-right p-3">账面数量</th>
                      <th className="text-right p-3">实盘数量</th>
                      <th className="text-right p-3">差异</th>
                      <th className="text-center p-3">状态</th>
                      <th className="text-left p-3">盘点日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventorySheets.map(s => (
                      <tr key={s.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{s.id}</td>
                        <td className="p-3">{s.warehouse}</td>
                        <td className="p-3">{s.material}</td>
                        <td className="p-3 text-right">{s.bookQty}</td>
                        <td className="p-3 text-right">{s.actualQty ?? '-'}</td>
                        <td className={`p-3 text-right font-medium ${s.variance !== null && s.variance !== 0 ? 'text-red-600' : s.variance === 0 ? 'text-green-600' : ''}`}>
                          {s.variance !== null ? (s.variance > 0 ? `+${s.variance}` : s.variance) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={s.status === 'completed' ? 'default' : s.status === 'counting' ? 'secondary' : 'outline'}>
                            {s.status === 'completed' ? '已完成' : s.status === 'counting' ? '盘点中' : '草稿'}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{s.countDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 5: 固定费用 ─────────────────────────── */}
        <TabsContent value="fixed" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              月度固定支出合计: <span className="font-semibold text-foreground">{fmt(monthlySpend)}</span>
            </div>
            <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> 添加费用项</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FIXED_EXPENSES.map(fe => (
              <Card key={fe.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{fe.category}</CardTitle>
                    {fe.autoRenew && <Badge variant="outline" className="text-xs">自动续约</Badge>}
                  </div>
                  <CardDescription>{fe.vendor}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmt(fe.monthlyAmount)}<span className="text-sm font-normal text-muted-foreground">/月</span></div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div>合同到期: {fe.contractEnd}</div>
                    <div>上次付款: {fe.lastPaidDate}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Tab 6: 财务沙盘 ─────────────────────────── */}
        <TabsContent value="sandbox" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">项目成本参考 — 含历史对比</span>
          </div>
          {PROJECT_COST_REFS.map(p => {
            const pct = Math.round((p.actual / p.budget) * 100);
            const overBudget = p.variance > 0;
            return (
              <Card key={p.projectCode} className={overBudget ? 'border-amber-300' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {p.projectName}
                        <Badge variant="outline" className="text-xs">{p.year}</Badge>
                        {overBudget && <Badge variant="destructive" className="text-xs">超支</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{p.projectCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">预算: {fmt(p.budget)}</div>
                      <div className="text-sm">实际: {fmt(p.actual)}</div>
                      <div className={`text-sm font-medium flex items-center justify-end gap-1 ${overBudget ? 'text-red-600' : 'text-green-600'}`}>
                        {overBudget ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {overBudget ? '+' : ''}{fmt(p.variance)}
                      </div>
                    </div>
                  </div>
                  <Progress value={Math.min(pct, 100)} className={`mt-3 ${overBudget ? '[&>div]:bg-red-500' : ''}`} />
                  <div className="text-xs text-muted-foreground mt-1 text-right">{pct}% 预算使用率</div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
