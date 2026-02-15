/**
 * AI库存优化分析 (Inventory Optimization)
 * Phase E: 安全库存 · 经济批量 · ABC分类 · 补货策略
 */
import { useState } from "react";
import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Package, Loader2, Sparkles, AlertTriangle, CheckCircle, TrendingUp,
} from "lucide-react";

interface OptimizationResult {
  reorderPoint: number;
  safetyStock: number;
  economicOrderQty: number;
  abcClassification: string;
  currentStatus: string;
  costSavingOpportunity: string;
  recommendations: string[];
}

export default function InventoryOptimization() {
  const [materialName, setMaterialName] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [avgDailyUsage, setAvgDailyUsage] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [demandVariability, setDemandVariability] = useState("");
  const [serviceLevel, setServiceLevel] = useState("");
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const mutation = trpc.operationsIntelligence.optimizeInventory.useMutation({
    onSuccess: (data) => setResult(data as OptimizationResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!materialName.trim() || !currentStock || !avgDailyUsage || !leadTimeDays || mutation.isPending) return;
    mutation.mutate({
      materialName,
      currentStock: Number(currentStock),
      avgDailyUsage: Number(avgDailyUsage),
      leadTimeDays: Number(leadTimeDays),
      unitCost: unitCost ? Number(unitCost) : undefined,
      demandVariability: demandVariability || undefined,
      serviceLevel: serviceLevel || undefined,
    });
  };

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    optimal: { label: "库存正常", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
    overstock: { label: "库存过剩", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Package },
    understock: { label: "库存不足", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: AlertTriangle },
    critical: { label: "库存告急", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  };

  const abcColor = (cls: string) => {
    switch (cls) {
      case "A": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "B": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "C": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Package}
          title="AI库存优化分析"
          description="安全库存 · 经济批量 · ABC分类 · 补货策略"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI优化
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" />
              物料信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">物料名称</label>
                <Input placeholder="如: 真空泵VP-100" value={materialName} onChange={(e) => setMaterialName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">当前库存</label>
                <Input type="number" placeholder="如: 50" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">日均消耗量</label>
                <Input type="number" placeholder="如: 2" value={avgDailyUsage} onChange={(e) => setAvgDailyUsage(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">采购交期(天)</label>
                <Input type="number" placeholder="如: 21" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">单价(元)（可选）</label>
                <Input type="number" placeholder="如: 3500" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">需求波动性（可选）</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={demandVariability} onChange={(e) => setDemandVariability(e.target.value)}>
                  <option value="">不指定</option>
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">服务水平（可选）</label>
                <select className="w-full bg-background border rounded px-3 py-2 text-sm" value={serviceLevel} onChange={(e) => setServiceLevel(e.target.value)}>
                  <option value="">不指定</option>
                  <option value="90%">90%</option>
                  <option value="95%">95%</option>
                  <option value="99%">99%</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!materialName.trim() || !currentStock || !avgDailyUsage || !leadTimeDays || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                优化分析
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Status + ABC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">库存状态</p>
                      <Badge className={`text-lg px-3 py-1 mt-1 ${statusConfig[result.currentStatus]?.color || "bg-muted"}`}>
                        {statusConfig[result.currentStatus]?.label || result.currentStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ABC分类</p>
                      <Badge className={`text-lg px-3 py-1 mt-1 ${abcColor(result.abcClassification)}`}>
                        {result.abcClassification}类
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost saving */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-green-400" />
                    <div>
                      <p className="text-sm text-muted-foreground">成本优化机会</p>
                      <p className="font-medium">{result.costSavingOpportunity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">再订货点</p>
                  <p className="text-4xl font-bold text-primary mt-1">{result.reorderPoint}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">安全库存</p>
                  <p className="text-4xl font-bold text-yellow-400 mt-1">{result.safetyStock}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">经济订货量(EOQ)</p>
                  <p className="text-4xl font-bold text-blue-400 mt-1">{result.economicOrderQty}</p>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    AI建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium flex-shrink-0">{idx + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
