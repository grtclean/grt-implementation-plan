/**
 * 采购驾驶舱 — 角色自适应统一入口
 * 采购工程师: PR/PO/交期跟踪
 * 仓库收货员: 待收货/质检/入库
 * 采购经理: KPI/成本分析/供应商绩效
 * 审核副总: 待审批/金额统计
 * 工程师: 物料需求/BOM→PR
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ShoppingCart, Package, Truck, ClipboardCheck, TrendingUp, AlertTriangle,
  Clock, CheckCircle, XCircle, Search, Filter, BarChart3, Warehouse,
  FileText, DollarSign, Users, Gauge, ArrowRight, Eye, ThumbsUp, ThumbsDown,
  RefreshCw, Calendar, Star, Box
} from "lucide-react";

// ── Mock data based on real TianSi import ──
const MOCK_POS = [
  { id: "PO-2025-00001", supplier: "上海宝钢特钢", material: "45#钢棒Φ25x1000", qty: 200, price: 28.50, total: 5700, status: "approved", deliveryDate: "2026-04-15", daysLeft: 16 },
  { id: "PO-2025-00012", supplier: "NSK轴承中国", material: "深沟球轴承6205", qty: 100, price: 45.00, total: 4500, status: "released", deliveryDate: "2026-04-10", daysLeft: 11 },
  { id: "PO-2025-00023", supplier: "施耐德电气", material: "接触器CJX2-32", qty: 50, price: 120.00, total: 6000, status: "partial", deliveryDate: "2026-04-05", daysLeft: 6 },
  { id: "PO-2025-00034", supplier: "力士乐液压", material: "液压缸Φ80x300", qty: 20, price: 2800.00, total: 56000, status: "approved", deliveryDate: "2026-04-20", daysLeft: 21 },
  { id: "PO-2025-00045", supplier: "西门子电机", material: "三相异步电机7.5kW", qty: 10, price: 3500.00, total: 35000, status: "draft", deliveryDate: "2026-05-01", daysLeft: 32 },
  { id: "PO-2025-00056", supplier: "无锡精密铸造", material: "齿轮轴毛坯", qty: 30, price: 850.00, total: 25500, status: "completed", deliveryDate: "2026-03-25", daysLeft: -5 },
  { id: "PO-2025-00067", supplier: "陶氏化学品", material: "清洗剂SC-100", qty: 500, price: 35.00, total: 17500, status: "approved", deliveryDate: "2026-04-08", daysLeft: 9 },
  { id: "PO-2025-00078", supplier: "米思米标准件", material: "M10x40六角螺栓", qty: 2000, price: 0.85, total: 1700, status: "released", deliveryDate: "2026-04-03", daysLeft: 4 },
];

const MOCK_PENDING_RECEIVE = [
  { po: "PO-2025-00023", supplier: "施耐德电气", material: "接触器CJX2-32", ordered: 50, received: 30, pending: 20, eta: "2026-04-05" },
  { po: "PO-2025-00012", supplier: "NSK轴承中国", material: "深沟球轴承6205", ordered: 100, received: 0, pending: 100, eta: "2026-04-10" },
  { po: "PO-2025-00001", supplier: "上海宝钢特钢", material: "45#钢棒Φ25x1000", ordered: 200, received: 0, pending: 200, eta: "2026-04-15" },
  { po: "PO-2025-00067", supplier: "陶氏化学品", material: "清洗剂SC-100", ordered: 500, received: 0, pending: 500, eta: "2026-04-08" },
];

const MOCK_APPROVALS = [
  { id: "PR-2026-001", type: "采购申请", title: "GRT-S3项目清洗篮框架原材料", amount: 45000, requester: "沈迎凤", date: "2026-03-28", urgency: "high" },
  { id: "PR-2026-002", type: "采购申请", title: "电气柜标准件补货", amount: 8500, requester: "孙坚", date: "2026-03-29", urgency: "medium" },
  { id: "PC-2026-001", type: "价格比对", title: "液压缸三家比价", amount: 168000, requester: "沈迎凤", date: "2026-03-27", urgency: "high" },
  { id: "SQ-2026-001", type: "供应商准入", title: "常熟理工精密 — 新供应商审批", amount: 0, requester: "戴晓燕", date: "2026-03-26", urgency: "low" },
  { id: "PR-2026-003", type: "采购申请", title: "化学品仓库防爆设备采购", amount: 32000, requester: "刘安全", date: "2026-03-30", urgency: "critical" },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-700", icon: FileText },
  approved: { label: "已审批", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  released: { label: "已下达", color: "bg-green-100 text-green-700", icon: ArrowRight },
  partial: { label: "部分收货", color: "bg-yellow-100 text-yellow-700", icon: Package },
  completed: { label: "已完成", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  closed: { label: "已关闭", color: "bg-gray-100 text-gray-500", icon: XCircle },
};

const URGENCY_MAP: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-600",
};

export default function ProcurementCockpit() {
  const { language } = useLanguage();
  const { currentUserRole: role } = useUserProfile();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isEngineer = ["mechanical_eng", "electrical_eng", "rnd_engineer"].includes(role);
  const isWarehouse = ["warehouse_mgr", "warehouse_staff"].includes(role);
  const isManager = ["procurement_mgr", "dept_manager", "director"].includes(role);
  const isVP = ["ceo", "cto", "cfo", "vp"].includes(role);

  // KPI calculations
  const kpis = useMemo(() => {
    const activePOs = MOCK_POS.filter(p => !["completed", "closed"].includes(p.status));
    const totalValue = MOCK_POS.reduce((s, p) => s + p.total, 0);
    const onTimeRate = Math.round(MOCK_POS.filter(p => p.daysLeft >= 0 || p.status === "completed").length / MOCK_POS.length * 100);
    const pendingApprovals = MOCK_APPROVALS.length;
    const pendingReceive = MOCK_PENDING_RECEIVE.reduce((s, r) => s + r.pending, 0);
    return { activePOs: activePOs.length, totalValue, onTimeRate, pendingApprovals, pendingReceive };
  }, []);

  const filteredPOs = MOCK_POS.filter(po => {
    if (statusFilter !== "all" && po.status !== statusFilter) return false;
    if (searchTerm && !`${po.id} ${po.supplier} ${po.material}`.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="h-7 w-7 text-blue-600" />
            {language === "zh" ? "采购驾驶舱" : "Procurement Cockpit"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === "zh" ? "统一采购全流程监控 · PR→PO→收货→质检→入库→付款" : "Unified procurement lifecycle monitoring"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" /> {language === "zh" ? "刷新" : "Refresh"}</Button>
          <Button size="sm"><ShoppingCart className="h-4 w-4 mr-1" /> {language === "zh" ? "新建采购申请" : "New PR"}</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{language === "zh" ? "活跃PO" : "Active POs"}</p>
                <p className="text-2xl font-bold">{kpis.activePOs}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{language === "zh" ? "采购总额" : "Total Value"}</p>
                <p className="text-2xl font-bold">¥{(kpis.totalValue / 10000).toFixed(1)}万</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{language === "zh" ? "准时交付率" : "On-time Rate"}</p>
                <p className="text-2xl font-bold">{kpis.onTimeRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{language === "zh" ? "待审批" : "Pending Approval"}</p>
                <p className="text-2xl font-bold text-orange-600">{kpis.pendingApprovals}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{language === "zh" ? "待收货数量" : "Pending Receive"}</p>
                <p className="text-2xl font-bold text-purple-600">{kpis.pendingReceive}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {language === "zh" ? "总览" : "Overview"}</TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-1"><ShoppingCart className="h-3.5 w-3.5" /> {language === "zh" ? "采购订单" : "Orders"}</TabsTrigger>
          <TabsTrigger value="receiving" className="flex items-center gap-1"><Warehouse className="h-3.5 w-3.5" /> {language === "zh" ? "收货质检" : "Receiving"}</TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-1">
            <ClipboardCheck className="h-3.5 w-3.5" /> {language === "zh" ? "审批中心" : "Approvals"}
            {kpis.pendingApprovals > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{kpis.pendingApprovals}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {language === "zh" ? "供应商" : "Suppliers"}</TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery Timeline */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> {language === "zh" ? "交期看板 (近30天)" : "Delivery Timeline"}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {MOCK_POS.filter(p => p.daysLeft > 0 && p.daysLeft <= 30 && p.status !== "completed").sort((a, b) => a.daysLeft - b.daysLeft).map(po => (
                  <div key={po.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      {po.daysLeft <= 7 ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium">{po.material.substring(0, 16)}</p>
                        <p className="text-xs text-muted-foreground">{po.supplier}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={po.daysLeft <= 7 ? "destructive" : "outline"} className="text-xs">{po.daysLeft}{language === "zh" ? "天" : "d"}</Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">{po.deliveryDate}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pending Approvals Quick View */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> {language === "zh" ? "待审批 (快速处理)" : "Pending Approvals"}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {MOCK_APPROVALS.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${URGENCY_MAP[a.urgency]}`}>{a.urgency === "critical" ? "紧急" : a.urgency === "high" ? "高" : a.urgency === "medium" ? "中" : "低"}</Badge>
                      <div>
                        <p className="text-sm font-medium">{a.title.substring(0, 20)}</p>
                        <p className="text-xs text-muted-foreground">{a.type} · {a.requester} · {a.id}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {a.amount > 0 && <span className="text-sm font-medium text-orange-600">¥{a.amount.toLocaleString()}</span>}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600"><ThumbsUp className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600"><ThumbsDown className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Supplier Performance */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4" /> {language === "zh" ? "供应商交付排名 (TOP 5)" : "Supplier Delivery Ranking"}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "米思米标准件", score: 98, orders: 45, grade: "A" },
                  { name: "上海宝钢特钢", score: 95, orders: 32, grade: "A" },
                  { name: "NSK轴承中国", score: 92, orders: 28, grade: "A" },
                  { name: "施耐德电气", score: 88, orders: 22, grade: "B" },
                  { name: "无锡精密铸造", score: 82, orders: 18, grade: "B" },
                ].map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className={`text-sm font-bold w-5 ${i < 3 ? "text-yellow-600" : "text-muted-foreground"}`}>#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground">{s.orders} {language === "zh" ? "单" : "orders"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={s.score} className="h-1.5 flex-1" />
                        <Badge variant={s.grade === "A" ? "default" : "secondary"} className="text-[10px] h-4">{s.score}% {s.grade}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Inventory Alerts */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> {language === "zh" ? "库存预警" : "Stock Alerts"}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { material: "清洗剂SC-100", code: "AX-00001", stock: 12, min: 50, unit: "桶", severity: "critical" },
                  { material: "M8x30内六角螺栓", code: "ST-00001", stock: 150, min: 500, unit: "个", severity: "high" },
                  { material: "O型圈25x3", code: "ST-00005", stock: 80, min: 200, unit: "个", severity: "high" },
                  { material: "骨架油封30x50x10", code: "ST-00009", stock: 25, min: 50, unit: "个", severity: "medium" },
                  { material: "防锈油RP-50", code: "AX-00002", stock: 8, min: 20, unit: "桶", severity: "critical" },
                ].map(a => (
                  <div key={a.code} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Box className={`h-4 w-4 ${a.severity === "critical" ? "text-red-500" : a.severity === "high" ? "text-orange-500" : "text-yellow-500"}`} />
                      <div>
                        <p className="text-sm font-medium">{a.material}</p>
                        <p className="text-xs text-muted-foreground">{a.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm"><span className={a.severity === "critical" ? "text-red-600 font-bold" : "text-orange-600 font-medium"}>{a.stock}</span>/{a.min} {a.unit}</p>
                      <Button size="sm" variant="link" className="h-5 p-0 text-xs text-blue-600">{language === "zh" ? "一键补货" : "Reorder"}</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Orders ── */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder={language === "zh" ? "搜索PO编号/供应商/物料..." : "Search PO/supplier/material..."} className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "zh" ? "全部状态" : "All"}</SelectItem>
                {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "PO编号" : "PO#"}</TableHead>
                  <TableHead>{language === "zh" ? "供应商" : "Supplier"}</TableHead>
                  <TableHead>{language === "zh" ? "物料" : "Material"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "数量" : "Qty"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "金额" : "Amount"}</TableHead>
                  <TableHead>{language === "zh" ? "交期" : "Delivery"}</TableHead>
                  <TableHead>{language === "zh" ? "状态" : "Status"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map(po => {
                  const st = STATUS_MAP[po.status] || STATUS_MAP.draft;
                  return (
                    <TableRow key={po.id} className={po.daysLeft > 0 && po.daysLeft <= 7 && po.status !== "completed" ? "bg-red-50" : ""}>
                      <TableCell className="font-mono text-sm">{po.id}</TableCell>
                      <TableCell className="font-medium">{po.supplier}</TableCell>
                      <TableCell className="text-sm">{po.material}</TableCell>
                      <TableCell className="text-right">{po.qty.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">¥{po.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {po.daysLeft <= 0 && po.status !== "completed" ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> : null}
                          <span className={po.daysLeft <= 7 && po.status !== "completed" ? "text-red-600 font-medium" : ""}>{po.deliveryDate}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge className={`${st.color} text-xs`}>{st.label}</Badge></TableCell>
                      <TableCell><Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Tab: Receiving ── */}
        <TabsContent value="receiving" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">{MOCK_PENDING_RECEIVE.length}</p>
                <p className="text-sm text-muted-foreground">{language === "zh" ? "待收货批次" : "Pending Batches"}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{MOCK_PENDING_RECEIVE.reduce((s, r) => s + r.pending, 0)}</p>
                <p className="text-sm text-muted-foreground">{language === "zh" ? "待收数量" : "Pending Qty"}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">96%</p>
                <p className="text-sm text-muted-foreground">{language === "zh" ? "IQC合格率" : "IQC Pass Rate"}</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">{language === "zh" ? "待收货明细" : "Pending Receipts"}</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO#</TableHead>
                  <TableHead>{language === "zh" ? "供应商" : "Supplier"}</TableHead>
                  <TableHead>{language === "zh" ? "物料" : "Material"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "订购" : "Ordered"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "已收" : "Received"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "待收" : "Pending"}</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_PENDING_RECEIVE.map(r => (
                  <TableRow key={r.po}>
                    <TableCell className="font-mono text-sm">{r.po}</TableCell>
                    <TableCell>{r.supplier}</TableCell>
                    <TableCell>{r.material}</TableCell>
                    <TableCell className="text-right">{r.ordered}</TableCell>
                    <TableCell className="text-right text-green-600">{r.received}</TableCell>
                    <TableCell className="text-right font-bold text-orange-600">{r.pending}</TableCell>
                    <TableCell>{r.eta}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="default" className="h-7 text-xs"><Package className="h-3 w-3 mr-1" />{language === "zh" ? "确认收货" : "Receive"}</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs"><ClipboardCheck className="h-3 w-3 mr-1" />IQC</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Tab: Approvals ── */}
        <TabsContent value="approval" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{language === "zh" ? "待我审批" : "My Pending Approvals"}</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "zh" ? "紧急" : "Priority"}</TableHead>
                  <TableHead>{language === "zh" ? "编号" : "ID"}</TableHead>
                  <TableHead>{language === "zh" ? "类型" : "Type"}</TableHead>
                  <TableHead>{language === "zh" ? "标题" : "Title"}</TableHead>
                  <TableHead className="text-right">{language === "zh" ? "金额" : "Amount"}</TableHead>
                  <TableHead>{language === "zh" ? "申请人" : "Requester"}</TableHead>
                  <TableHead>{language === "zh" ? "日期" : "Date"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_APPROVALS.map(a => (
                  <TableRow key={a.id} className={a.urgency === "critical" ? "bg-red-50" : ""}>
                    <TableCell><Badge className={`${URGENCY_MAP[a.urgency]} text-[10px]`}>{a.urgency === "critical" ? "紧急" : a.urgency === "high" ? "高" : a.urgency === "medium" ? "中" : "低"}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{a.id}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{a.type}</Badge></TableCell>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell className="text-right font-medium">{a.amount > 0 ? `¥${a.amount.toLocaleString()}` : "-"}</TableCell>
                    <TableCell>{a.requester}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.date}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"><ThumbsUp className="h-3 w-3 mr-1" />{language === "zh" ? "批准" : "Approve"}</Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs"><ThumbsDown className="h-3 w-3 mr-1" />{language === "zh" ? "驳回" : "Reject"}</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs"><Eye className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Tab: Suppliers ── */}
        <TabsContent value="suppliers" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">{language === "zh" ? "供应商绩效排名" : "Supplier Performance"}</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{language === "zh" ? "供应商" : "Supplier"}</TableHead>
                  <TableHead>{language === "zh" ? "类别" : "Category"}</TableHead>
                  <TableHead className="text-center">{language === "zh" ? "质量" : "Quality"}</TableHead>
                  <TableHead className="text-center">{language === "zh" ? "交期" : "Delivery"}</TableHead>
                  <TableHead className="text-center">{language === "zh" ? "价格" : "Price"}</TableHead>
                  <TableHead className="text-center">{language === "zh" ? "综合" : "Overall"}</TableHead>
                  <TableHead>{language === "zh" ? "等级" : "Grade"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "上海宝钢特钢", cat: "钢材", q: 96, d: 95, p: 88, grade: "A" },
                  { name: "NSK轴承中国", cat: "轴承", q: 99, d: 92, p: 75, grade: "A" },
                  { name: "施耐德电气", cat: "电气", q: 98, d: 88, p: 70, grade: "B" },
                  { name: "力士乐液压", cat: "液压件", q: 97, d: 90, p: 65, grade: "B" },
                  { name: "米思米标准件", cat: "标准件", q: 95, d: 98, p: 82, grade: "A" },
                  { name: "无锡精密铸造", cat: "铸件", q: 85, d: 82, p: 90, grade: "B" },
                  { name: "西门子电机", cat: "电机", q: 99, d: 94, p: 60, grade: "B" },
                  { name: "陶氏化学品", cat: "化学品", q: 97, d: 96, p: 78, grade: "A" },
                ].map((s, i) => {
                  const overall = Math.round(s.q * 0.4 + s.d * 0.35 + s.p * 0.25);
                  return (
                    <TableRow key={s.name}>
                      <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{s.cat}</Badge></TableCell>
                      <TableCell className="text-center"><Badge className={`text-xs ${s.q >= 95 ? "bg-green-100 text-green-700" : s.q >= 85 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{s.q}%</Badge></TableCell>
                      <TableCell className="text-center"><Badge className={`text-xs ${s.d >= 95 ? "bg-green-100 text-green-700" : s.d >= 85 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{s.d}%</Badge></TableCell>
                      <TableCell className="text-center"><Badge className={`text-xs ${s.p >= 80 ? "bg-green-100 text-green-700" : s.p >= 70 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{s.p}%</Badge></TableCell>
                      <TableCell className="text-center font-bold">{overall}%</TableCell>
                      <TableCell><Badge variant={s.grade === "A" ? "default" : "secondary"}>{s.grade}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
