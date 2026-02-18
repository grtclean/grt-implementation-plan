import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart, Search, Loader2, Star, TrendingUp, Package,
  DollarSign, Clock, CheckCircle, BarChart3, Sparkles,
  ArrowRight, Building2, CalendarDays, Layers,
} from "lucide-react";

// ============================================================
// Types & Mock Data
// ============================================================

interface Supplier { id: number; name: string; score: number; rating: string; deliveryDays: number; qualityRate: number; location: string; }
interface PriceComparison { material: string; unit: string; suppliers: { name: string; price: number; moq: number; leadTime: string; }[]; }
interface Strategy { id: string; title: string; type: "JIT" | "bulk" | "framework"; description: string; saving: string; risk: string; }
interface PlanItem { id: number; material: string; qty: number; supplier: string; orderDate: string; deliveryDate: string; status: string; }

const MOCK_SUPPLIERS: Supplier[] = [
  { id: 1, name: "精密轴承(苏州)有限公司", score: 95, rating: "A+", deliveryDays: 7, qualityRate: 99.8, location: "苏州" },
  { id: 2, name: "宁波永力电机制造", score: 91, rating: "A", deliveryDays: 10, qualityRate: 99.5, location: "宁波" },
  { id: 3, name: "上海汇通不锈钢材料", score: 88, rating: "A", deliveryDays: 5, qualityRate: 99.2, location: "上海" },
  { id: 4, name: "深圳鑫达传感器科技", score: 85, rating: "B+", deliveryDays: 14, qualityRate: 98.8, location: "深圳" },
  { id: 5, name: "东莞锐丰密封件厂", score: 82, rating: "B+", deliveryDays: 8, qualityRate: 98.5, location: "东莞" },
];

const MOCK_PRICES: PriceComparison[] = [
  { material: "不锈钢304板材 2mm", unit: "kg", suppliers: [
    { name: "上海汇通", price: 28.5, moq: 500, leadTime: "3天" },
    { name: "无锡宝钢", price: 29.8, moq: 1000, leadTime: "5天" },
    { name: "佛山联众", price: 27.2, moq: 2000, leadTime: "7天" },
    { name: "太原太钢", price: 30.1, moq: 500, leadTime: "10天" },
  ]},
  { material: "超声波换能器 40kHz", unit: "个", suppliers: [
    { name: "深圳新超声", price: 680, moq: 10, leadTime: "14天" },
    { name: "北京声科", price: 720, moq: 5, leadTime: "10天" },
    { name: "济南超声", price: 650, moq: 20, leadTime: "21天" },
    { name: "杭州声辰", price: 710, moq: 10, leadTime: "7天" },
  ]},
  { material: "西门子PLC S7-1200", unit: "台", suppliers: [
    { name: "上海西门子", price: 3800, moq: 1, leadTime: "3天" },
    { name: "北京天拓", price: 3650, moq: 1, leadTime: "5天" },
    { name: "广州正通", price: 3720, moq: 1, leadTime: "3天" },
  ]},
];

const MOCK_STRATEGIES: Strategy[] = [
  { id: "s1", title: "JIT准时制采购 - 标准件", type: "JIT", description: "对螺栓、垫圈等标准件采用JIT模式，与供应商签订VMI协议，由供应商管理库存，按需配送。", saving: "库存成本降低30%", risk: "低" },
  { id: "s2", title: "批量采购 - 不锈钢板材", type: "bulk", description: "不锈钢板材按季度集中采购，利用批量折扣。建议Q2集中下单，预计节省8-12%。", saving: "采购成本降低10%", risk: "中（库存占用）" },
  { id: "s3", title: "框架协议 - 电气元件", type: "framework", description: "与西门子、施耐德签订年度框架协议，锁定价格和交期。适用于PLC、变频器等高价值电气件。", saving: "价格锁定，交期保障", risk: "低" },
  { id: "s4", title: "国产替代 - 传感器类", type: "bulk", description: "对非关键传感器推进国产替代，建议试用深圳鑫达产品，已通过3个月可靠性测试。", saving: "单件成本降低40%", risk: "中（需验证）" },
];

const MOCK_PLAN: PlanItem[] = [
  { id: 1, material: "不锈钢304板材", qty: 2000, supplier: "上海汇通", orderDate: "2026-01-15", deliveryDate: "2026-01-20", status: "已下单" },
  { id: 2, material: "超声波换能器", qty: 24, supplier: "深圳新超声", orderDate: "2026-01-10", deliveryDate: "2026-01-24", status: "生产中" },
  { id: 3, material: "西门子PLC", qty: 2, supplier: "北京天拓", orderDate: "2026-01-20", deliveryDate: "2026-01-25", status: "待下单" },
  { id: 4, material: "高压泵组", qty: 1, supplier: "格兰富(上海)", orderDate: "2026-01-05", deliveryDate: "2026-02-15", status: "已下单" },
  { id: 5, material: "不锈钢管路组件", qty: 50, supplier: "无锡管业", orderDate: "2026-01-18", deliveryDate: "2026-01-28", status: "待下单" },
];

const strategyColor: Record<string, string> = { JIT: "bg-blue-500/20 text-blue-400", bulk: "bg-green-500/20 text-green-400", framework: "bg-purple-500/20 text-purple-400" };
const strategyLabel: Record<string, string> = { JIT: "准时制", bulk: "批量采购", framework: "框架协议" };

// ============================================================
// Component
// ============================================================

export default function AIPurchaseAssistant() {
  const [materialQuery, setMaterialQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = () => {
    setSearching(true);
    setTimeout(() => { setSearching(false); setShowResults(true); }, 1500);
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader icon={ShoppingCart} title="AI采购助手" description="智能供应商推荐、价格对比与采购策略优化" />

        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suppliers"><Building2 className="w-4 h-4 mr-1" />供应商推荐</TabsTrigger>
            <TabsTrigger value="prices"><DollarSign className="w-4 h-4 mr-1" />价格对比</TabsTrigger>
            <TabsTrigger value="strategy"><Sparkles className="w-4 h-4 mr-1" />采购策略</TabsTrigger>
            <TabsTrigger value="plan"><CalendarDays className="w-4 h-4 mr-1" />采购计划</TabsTrigger>
          </TabsList>

          {/* Supplier Recommendations */}
          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="输入物料名称搜索推荐供应商..." value={materialQuery} onChange={e => setMaterialQuery(e.target.value)} className="pl-9" />
              </div>
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />搜索中</> : <><Sparkles className="w-4 h-4 mr-1" />智能推荐</>}
              </Button>
            </div>
            <div className="space-y-3">
              {MOCK_SUPPLIERS.map((s, idx) => (
                <Card key={s.id} className={idx === 0 ? "border-primary" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{s.name}</span>
                          <Badge className={s.rating.startsWith("A") ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}>{s.rating}</Badge>
                          {idx === 0 && <Badge className="bg-primary text-primary-foreground">最佳推荐</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{s.location}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />交期 {s.deliveryDays}天</span>
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />合格率 {s.qualityRate}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{s.score}</div>
                        <div className="text-xs text-muted-foreground">综合评分</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Price Comparison */}
          <TabsContent value="prices" className="space-y-4">
            {MOCK_PRICES.map(item => (
              <Card key={item.material}>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" />{item.material}<span className="text-sm text-muted-foreground">({item.unit})</span></CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b">
                        <th className="text-left py-2 px-3">供应商</th><th className="text-right py-2 px-3">单价</th><th className="text-right py-2 px-3">MOQ</th><th className="text-right py-2 px-3">交期</th><th className="text-right py-2 px-3"></th>
                      </tr></thead>
                      <tbody>{item.suppliers.map((sp, idx) => {
                        const isLowest = sp.price === Math.min(...item.suppliers.map(x => x.price));
                        return (
                          <tr key={sp.name} className={`border-b last:border-0 ${isLowest ? "bg-green-500/5" : ""}`}>
                            <td className="py-2 px-3 font-medium">{sp.name}{isLowest && <Badge className="ml-2 bg-green-500/20 text-green-400 text-xs">最低</Badge>}</td>
                            <td className="text-right py-2 px-3 font-mono">{sp.price.toLocaleString()}</td>
                            <td className="text-right py-2 px-3">{sp.moq}</td>
                            <td className="text-right py-2 px-3">{sp.leadTime}</td>
                            <td className="text-right py-2 px-3"><Button size="sm" variant="ghost"><ArrowRight className="w-3 h-3" /></Button></td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Procurement Strategy */}
          <TabsContent value="strategy" className="space-y-4">
            <p className="text-sm text-muted-foreground">AI基于历史采购数据和供应链分析生成的采购策略建议</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_STRATEGIES.map(s => (
                <Card key={s.id} className="hover:border-primary/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={strategyColor[s.type]}>{strategyLabel[s.type]}</Badge>
                      <CardTitle className="text-base">{s.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1 text-green-400"><TrendingUp className="w-3 h-3" />{s.saving}</span>
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" />风险: {s.risk}</span>
                    </div>
                    <Button size="sm" variant="outline" className="mt-2">应用策略<ArrowRight className="w-3 h-3 ml-1" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Procurement Plan */}
          <TabsContent value="plan" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">基于BOM清单自动生成的采购计划</p>
              <Button size="sm"><Sparkles className="w-4 h-4 mr-1" />从BOM生成计划</Button>
            </div>
            <Card>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b">
                      <th className="text-left py-2 px-3">物料</th><th className="text-right py-2 px-3">数量</th><th className="text-left py-2 px-3">供应商</th><th className="text-left py-2 px-3">下单日期</th><th className="text-left py-2 px-3">交货日期</th><th className="text-left py-2 px-3">状态</th>
                    </tr></thead>
                    <tbody>{MOCK_PLAN.map(item => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{item.material}</td>
                        <td className="text-right py-2 px-3">{item.qty}</td>
                        <td className="py-2 px-3">{item.supplier}</td>
                        <td className="py-2 px-3 font-mono text-xs">{item.orderDate}</td>
                        <td className="py-2 px-3 font-mono text-xs">{item.deliveryDate}</td>
                        <td className="py-2 px-3">
                          <Badge className={item.status === "已下单" ? "bg-green-500/20 text-green-400" : item.status === "生产中" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}>{item.status}</Badge>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
