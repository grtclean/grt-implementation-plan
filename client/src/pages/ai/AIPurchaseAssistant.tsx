/**
 * AI采购助手
 * 智能供应商推荐、价格对比与采购策略优化
 *
 * Data source: trpc.purchaseAssistant.getDashboard (DB-backed)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart, Search, Loader2, TrendingUp, Package,
  DollarSign, Clock, CheckCircle, Sparkles,
  ArrowRight, Building2, CalendarDays, Layers,
} from "lucide-react";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

const strategyColor: Record<string, string> = { JIT: "bg-blue-500/20 text-blue-400", bulk: "bg-green-500/20 text-green-400", framework: "bg-purple-500/20 text-purple-400" };
const strategyLabel: Record<string, string> = { JIT: "准时制", bulk: "批量采购", framework: "框架协议" };

export default function AIPurchaseAssistant() {
  const [materialQuery, setMaterialQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // ─── tRPC ───
  const dashQuery = trpc.purchaseAssistant.getDashboard.useQuery(undefined, QUERY_OPTS);
  const dash = dashQuery.data ?? { suppliers: [], prices: [], strategies: [], plan: [] };
  const suppliers = dash.suppliers as any[];
  const prices = dash.prices as any[];
  const strategies = dash.strategies as any[];
  const plan = dash.plan as any[];

  const handleSearch = () => {
    setSearching(true);
    setTimeout(() => { setSearching(false); setShowResults(true); }, 1500);
  };

  if (dashQuery.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader icon={ShoppingCart} title="AI采购助手" description="..." />
        <Skeleton className="h-10 w-96" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

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
              {suppliers.map((s: any, idx: number) => (
                <Card key={s.id} className={idx === 0 ? "border-primary" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{s.name}</span>
                          <Badge className={String(s.rating).startsWith("A") ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}>{s.rating}</Badge>
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
              {suppliers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">暂无供应商数据</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Price Comparison */}
          <TabsContent value="prices" className="space-y-4">
            {prices.map((item: any) => (
              <Card key={item.material}>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" />{item.material}<span className="text-sm text-muted-foreground">({item.unit})</span></CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b">
                        <th className="text-left py-2 px-3">供应商</th><th className="text-right py-2 px-3">单价</th><th className="text-right py-2 px-3">MOQ</th><th className="text-right py-2 px-3">交期</th><th className="text-right py-2 px-3"></th>
                      </tr></thead>
                      <tbody>{(item.suppliers ?? []).map((sp: any) => {
                        const isLowest = sp.price === Math.min(...(item.suppliers ?? []).map((x: any) => x.price));
                        return (
                          <tr key={sp.name} className={`border-b last:border-0 ${isLowest ? "bg-green-500/5" : ""}`}>
                            <td className="py-2 px-3 font-medium">{sp.name}{isLowest && <Badge className="ml-2 bg-green-500/20 text-green-400 text-xs">最低</Badge>}</td>
                            <td className="text-right py-2 px-3 font-mono">{Number(sp.price).toLocaleString()}</td>
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
              {strategies.map((s: any) => (
                <Card key={s.id} className="hover:border-primary/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={strategyColor[s.type] ?? "bg-gray-500/20 text-gray-400"}>{strategyLabel[s.type] ?? s.type}</Badge>
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
                    <tbody>{plan.map((item: any) => (
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
