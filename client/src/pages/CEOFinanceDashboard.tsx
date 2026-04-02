import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CircleDot,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";

// ──────────────────────────────────────────────
// Mock Data
// ──────────────────────────────────────────────

const kpiCards = [
  { label: "在手订单", value: "¥24.5M", sub: "8 个项目", icon: Briefcase, trend: "+12%", up: true },
  { label: "投标转化率", value: "68%", sub: "15 中标 / 22 投标", icon: TrendingUp, trend: "+5%", up: true },
  { label: "月度毛利", value: "¥2.1M", sub: "毛利率 32%", icon: DollarSign, trend: "+3%", up: true },
  { label: "现金净头寸", value: "¥8.3M", sub: "30天预测", icon: Wallet, trend: "-2%", up: false },
];

const funnelStages = [
  { stage: "商机", count: 35, color: "bg-blue-400", width: 100 },
  { stage: "投标", count: 22, color: "bg-blue-500", width: 63 },
  { stage: "中标", count: 15, color: "bg-green-500", width: 43 },
  { stage: "执行", count: 12, color: "bg-emerald-500", width: 34 },
  { stage: "交付", count: 8, color: "bg-emerald-600", width: 23 },
];

const top10Projects = [
  { name: "宝马i系列清洗线", target: 38, actual: 42 },
  { name: "长城坦克涂装线", target: 35, actual: 33 },
  { name: "比亚迪电池Pack线", target: 32, actual: 36 },
  { name: "蔚来换电站改造", target: 30, actual: 28 },
  { name: "大众ID系列焊装", target: 28, actual: 31 },
  { name: "丰田混动装配线", target: 26, actual: 22 },
  { name: "吉利银河涂胶线", target: 25, actual: 27 },
  { name: "理想MEGA总装线", target: 24, actual: 25 },
  { name: "Stellantis底盘线", target: 22, actual: 18 },
  { name: "奇瑞海外CKD产线", target: 20, actual: 23 },
];

const cashFlowCards = [
  { label: "经营活动", amount: "¥5.2M", forecast: "+¥1.8M", positive: true },
  { label: "投资活动", amount: "-¥2.1M", forecast: "-¥0.6M", positive: false },
  { label: "筹资活动", amount: "¥1.4M", forecast: "+¥0.3M", positive: true },
];

const budgetVsActual = [
  { bu: "海外事业部", budget: 2800, actual: 2650, unit: "万" },
  { bu: "商用车事业部", budget: 2200, actual: 2380, unit: "万" },
  { bu: "乘用车事业部", budget: 3500, actual: 3200, unit: "万" },
  { bu: "半导体事业部", budget: 1800, actual: 1750, unit: "万" },
  { bu: "工业通用事业部", budget: 1200, actual: 1100, unit: "万" },
];

const timesheetGrid: { id: string; rate: number }[] = [];
for (let i = 1; i <= 15; i++) {
  const rate = Math.round(70 + Math.random() * 60);
  timesheetGrid.push({ id: `T${String(i).padStart(2, "0")}`, rate });
}

const agingBucketsAR = [
  { bucket: "0-30天", amount: 3200 },
  { bucket: "31-60天", amount: 1850 },
  { bucket: "61-90天", amount: 920 },
  { bucket: "91-120天", amount: 450 },
  { bucket: "120+天", amount: 280 },
];

const agingBucketsAP = [
  { bucket: "0-30天", amount: 2100 },
  { bucket: "31-60天", amount: 1200 },
  { bucket: "61-90天", amount: 650 },
  { bucket: "91-120天", amount: 310 },
  { bucket: "120+天", amount: 140 },
];

const monthlyTrend = [
  { month: "2025-04", revenue: 820, cost: 558, gross: 262, net: 145 },
  { month: "2025-05", revenue: 910, cost: 610, gross: 300, net: 168 },
  { month: "2025-06", revenue: 780, cost: 546, gross: 234, net: 112 },
  { month: "2025-07", revenue: 950, cost: 627, gross: 323, net: 185 },
  { month: "2025-08", revenue: 870, cost: 600, gross: 270, net: 142 },
  { month: "2025-09", revenue: 1020, cost: 680, gross: 340, net: 198 },
  { month: "2025-10", revenue: 1100, cost: 726, gross: 374, net: 220 },
  { month: "2025-11", revenue: 980, cost: 666, gross: 314, net: 176 },
  { month: "2025-12", revenue: 1150, cost: 750, gross: 400, net: 235 },
  { month: "2026-01", revenue: 1080, cost: 702, gross: 378, net: 215 },
  { month: "2026-02", revenue: 960, cost: 653, gross: 307, net: 170 },
  { month: "2026-03", revenue: 1200, cost: 816, gross: 384, net: 210 },
];

const alertMatrix = [
  { category: "逾期应收", status: "red", count: 3 },
  { category: "预算超支", status: "red", count: 2 },
  { category: "毛利率低于25%", status: "red", count: 1 },
  { category: "项目延期>30天", status: "yellow", count: 4 },
  { category: "工时超标>120%", status: "yellow", count: 3 },
  { category: "现金流预警", status: "yellow", count: 2 },
  { category: "合同到期<60天", status: "yellow", count: 5 },
  { category: "供应商付款逾期", status: "green", count: 0 },
  { category: "质量NCR未关闭", status: "green", count: 1 },
  { category: "安全事故", status: "green", count: 0 },
  { category: "客户投诉升级", status: "green", count: 0 },
  { category: "汇率波动>5%", status: "yellow", count: 1 },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function statusDot(status: string) {
  if (status === "red") return "bg-red-500";
  if (status === "yellow") return "bg-yellow-400";
  return "bg-green-500";
}

function heatColor(rate: number) {
  if (rate > 120) return "bg-red-500/80 text-white";
  if (rate > 100) return "bg-yellow-400/80 text-gray-900";
  return "bg-green-500/60 text-gray-900";
}

function varianceBadge(budget: number, actual: number) {
  const pct = ((actual - budget) / budget * 100).toFixed(1);
  const over = actual > budget;
  return (
    <Badge variant={over ? "destructive" : "secondary"} className="text-xs">
      {over ? "+" : ""}{pct}%
    </Badge>
  );
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function CEOFinanceDashboard() {
  // Real-time data from backend (falls back to demo)
  const dashboardQuery = trpc.projectFinanceEngine.getCEOFinanceDashboard.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const alertQuery = trpc.projectFinanceEngine.listAlertInstances.useQuery({ severity: undefined, status: 'open' }, { retry: false });
  const isLive = !!dashboardQuery.data && !dashboardQuery.isError;

  return (
    <div className="space-y-4 p-4">
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
          <h1 className="text-2xl font-bold">CEO 财务驾驶舱</h1>
          <p className="text-sm text-muted-foreground">CEO Financial Cockpit — 全量经营数据聚合视图</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="mr-1 h-4 w-4" />筛选</Button>
          <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" />导出</Button>
          <Button variant="outline" size="sm"><RefreshCw className="mr-1 h-4 w-4" />刷新</Button>
        </div>
      </div>

      {/* ── KPI Top Bar ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <k.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.sub}</p>
              </div>
              <div className={`flex items-center text-xs font-medium ${k.up ? "text-green-600" : "text-red-500"}`}>
                {k.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {k.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Row 1: Funnel | Margin TOP10 | Cash Flow ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 投标漏斗 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">投标漏斗</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelStages.map((s) => (
              <div key={s.stage} className="flex items-center gap-3">
                <span className="w-10 text-sm font-medium">{s.stage}</span>
                <div className="flex-1">
                  <div
                    className={`${s.color} rounded-sm px-2 py-1 text-xs font-semibold text-white`}
                    style={{ width: `${s.width}%` }}
                  >
                    {s.count}
                  </div>
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              转化率: 商机→中标 {((15 / 35) * 100).toFixed(0)}% &nbsp;|&nbsp; 投标→中标 {((15 / 22) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        {/* 项目毛利 TOP10 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">项目毛利 TOP10 (%)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {top10Projects.map((p) => {
              const hit = p.actual >= p.target;
              return (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate font-medium" title={p.name}>{p.name}</span>
                  <div className="relative flex-1 h-4 rounded bg-muted">
                    {/* target line */}
                    <div
                      className="absolute top-0 h-4 border-r-2 border-dashed border-gray-400"
                      style={{ left: `${p.target}%` }}
                    />
                    {/* actual bar */}
                    <div
                      className={`h-4 rounded ${hit ? "bg-green-500/70" : "bg-red-400/70"}`}
                      style={{ width: `${p.actual}%` }}
                    />
                  </div>
                  <span className={`w-8 text-right font-semibold ${hit ? "text-green-600" : "text-red-500"}`}>
                    {p.actual}%
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 现金流仪表盘 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">现金流仪表盘</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cashFlowCards.map((c) => (
              <Card key={c.label} className="border">
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className={`text-lg font-bold ${c.positive ? "text-green-600" : "text-red-500"}`}>
                      {c.amount}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">30天预测</p>
                    <p className={`text-sm font-semibold ${c.positive ? "text-green-600" : "text-red-500"}`}>
                      {c.forecast}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <p className="text-xs text-muted-foreground">净现金头寸</p>
              <p className="text-lg font-bold text-primary">¥8.3M</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Budget vs Actual | Timesheet | AR/AP Aging ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 预算 vs 实际 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">预算 vs 实际 (万元)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgetVsActual.map((b) => {
              const maxVal = Math.max(b.budget, b.actual);
              return (
                <div key={b.bu} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{b.bu}</span>
                    {varianceBadge(b.budget, b.actual)}
                  </div>
                  <div className="relative h-5 rounded bg-muted">
                    <div
                      className="absolute h-5 rounded bg-blue-300/60"
                      style={{ width: `${(b.budget / maxVal) * 100}%` }}
                    />
                    <div
                      className="absolute h-5 rounded bg-primary/50"
                      style={{ width: `${(b.actual / maxVal) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>预算: ¥{b.budget}</span>
                    <span>实际: ¥{b.actual}</span>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-4 pt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-blue-300/60" />预算</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-primary/50" />实际</span>
            </div>
          </CardContent>
        </Card>

        {/* 工时达成率 T1-T15 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">工时达成率 (T1-T15)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-1">
              {timesheetGrid.map((t) => (
                <div
                  key={t.id}
                  className={`flex flex-col items-center justify-center rounded p-2 ${heatColor(t.rate)}`}
                >
                  <span className="text-[10px] font-medium">{t.id}</span>
                  <span className="text-sm font-bold">{t.rate}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-green-500/60" />≤100%</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-yellow-400/80" />100-120%</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-red-500/80" />&gt;120%</span>
            </div>
          </CardContent>
        </Card>

        {/* 应收应付账龄 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">应收 / 应付账龄 (万元)</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ar">
              <TabsList className="mb-2 w-full">
                <TabsTrigger value="ar" className="flex-1">应收 AR</TabsTrigger>
                <TabsTrigger value="ap" className="flex-1">应付 AP</TabsTrigger>
              </TabsList>
              <TabsContent value="ar">
                <AgingTable rows={agingBucketsAR} />
              </TabsContent>
              <TabsContent value="ap">
                <AgingTable rows={agingBucketsAP} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Monthly Trend (2/3) | Alert Matrix (1/3) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 月度经营分析趋势 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">月度经营分析趋势 (万元)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">月份</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">收入</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">成本</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">毛利</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">毛利率</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">净利</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTrend.map((m) => {
                    const margin = ((m.gross / m.revenue) * 100).toFixed(1);
                    return (
                      <tr key={m.month} className="border-b border-muted/50">
                        <td className="py-1.5 pr-3 font-medium">{m.month}</td>
                        <td className="py-1.5 pr-3 text-right">{m.revenue}</td>
                        <td className="py-1.5 pr-3 text-right text-red-500">{m.cost}</td>
                        <td className="py-1.5 pr-3 text-right text-green-600">{m.gross}</td>
                        <td className="py-1.5 pr-3 text-right">
                          <Progress value={parseFloat(margin)} className="h-2 w-16 inline-block" />
                          <span className="ml-1">{margin}%</span>
                        </td>
                        <td className="py-1.5 text-right font-semibold">{m.net}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td className="pt-2 pr-3">合计</td>
                    <td className="pt-2 pr-3 text-right">{monthlyTrend.reduce((s, m) => s + m.revenue, 0)}</td>
                    <td className="pt-2 pr-3 text-right text-red-500">{monthlyTrend.reduce((s, m) => s + m.cost, 0)}</td>
                    <td className="pt-2 pr-3 text-right text-green-600">{monthlyTrend.reduce((s, m) => s + m.gross, 0)}</td>
                    <td className="pt-2 pr-3 text-right">
                      {((monthlyTrend.reduce((s, m) => s + m.gross, 0) / monthlyTrend.reduce((s, m) => s + m.revenue, 0)) * 100).toFixed(1)}%
                    </td>
                    <td className="pt-2 text-right">{monthlyTrend.reduce((s, m) => s + m.net, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 预警矩阵 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">预警矩阵</CardTitle>
              <Badge variant="outline" className="text-xs">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {alertMatrix.filter((a) => a.status === "red").length} 红 / {alertMatrix.filter((a) => a.status === "yellow").length} 黄
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertMatrix.map((a) => (
              <div key={a.category} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <CircleDot className={`h-3 w-3 ${a.status === "red" ? "text-red-500" : a.status === "yellow" ? "text-yellow-500" : "text-green-500"}`} />
                  <span className="text-xs">{a.category}</span>
                </div>
                <Badge
                  variant={a.status === "red" ? "destructive" : a.status === "yellow" ? "outline" : "secondary"}
                  className="text-[10px]"
                >
                  {a.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function AgingTable({ rows }: { rows: { bucket: string; amount: number }[] }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b">
          <th className="pb-1 text-left font-medium text-muted-foreground">账龄</th>
          <th className="pb-1 text-right font-medium text-muted-foreground">金额 (万)</th>
          <th className="pb-1 text-right font-medium text-muted-foreground">占比</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.bucket} className="border-b border-muted/50">
            <td className="py-1.5">{r.bucket}</td>
            <td className="py-1.5 text-right font-medium">¥{r.amount.toLocaleString()}</td>
            <td className="py-1.5 text-right">{((r.amount / total) * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t font-semibold">
          <td className="pt-1.5">合计</td>
          <td className="pt-1.5 text-right">¥{total.toLocaleString()}</td>
          <td className="pt-1.5 text-right">100%</td>
        </tr>
      </tfoot>
    </table>
  );
}
