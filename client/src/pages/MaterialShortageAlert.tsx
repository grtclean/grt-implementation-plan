/**
 * AI缺料预警 (Material Shortage Alert) — US-010
 * 生产计划 vs 库存智能比对 · 缺料预测 · 采购建议
 */
import { useState } from "react";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle, Loader2, Sparkles, CheckCircle, Package, ShoppingCart, RefreshCw,
} from "lucide-react";

interface ShortageResult {
  alertLevel: string;
  shortageItems: Array<{
    material: string;
    currentStock: number;
    safetyStock: number;
    dailyUsage: number;
    daysRemaining: number;
    suggestedOrderQty: number;
    urgency: string;
  }>;
  schedulingImpact: string;
  purchaseSuggestions: Array<{
    material: string;
    supplier: string;
    quantity: number;
    estimatedLeadTime: string;
    estimatedCost: string;
  }>;
  alternativeMaterials: Array<{
    original: string;
    alternative: string;
    compatibility: string;
  }>;
  recommendations: string[];
}

export default function MaterialShortageAlert() {
  const [productionPlan, setProductionPlan] = useState("");
  const [currentInventory, setCurrentInventory] = useState("");
  const [pendingOrders, setPendingOrders] = useState("");
  const [historicalUsage, setHistoricalUsage] = useState("");
  const [result, setResult] = useState<ShortageResult | null>(null);

  const mutation = trpc.productionAdvanced.analyzeShortage.useMutation({
    onSuccess: (data) => setResult(data as ShortageResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!productionPlan.trim() || !currentInventory.trim() || mutation.isPending) return;
    mutation.mutate({
      productionPlan,
      currentInventory,
      pendingOrders: pendingOrders || undefined,
      historicalUsage: historicalUsage || undefined,
    });
  };

  const alertLevelColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "normal": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const alertLevelLabel = (level: string) => {
    switch (level) {
      case "critical": return "紧急";
      case "warning": return "预警";
      case "normal": return "正常";
      default: return level;
    }
  };

  const urgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const urgencyLabel = (u: string) => {
    switch (u) {
      case "critical": return "紧急";
      case "high": return "高";
      case "medium": return "中";
      case "low": return "低";
      default: return u;
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={AlertTriangle}
          title="AI缺料预警"
          description="生产计划 vs 库存智能比对 · 缺料预测 · 采购建议"
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI预警
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-primary" />
              预警分析输入
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">生产计划 *</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                placeholder="输入生产计划：如 GRT-V100 x 5台, GRT-W200 x 3台, 交期: 2026-03-15"
                value={productionPlan}
                onChange={(e) => setProductionPlan(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">当前库存快照 *</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                placeholder="当前库存快照"
                value={currentInventory}
                onChange={(e) => setCurrentInventory(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">在途订单（可选）</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                  placeholder="在途订单"
                  value={pendingOrders}
                  onChange={(e) => setPendingOrders(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">历史用量参考（可选）</label>
                <textarea
                  className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[60px]"
                  placeholder="历史用量参考"
                  value={historicalUsage}
                  onChange={(e) => setHistoricalUsage(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!productionPlan.trim() || !currentInventory.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                缺料分析
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Alert Level */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">预警级别</p>
                    <Badge className={`text-2xl px-4 py-2 mt-2 ${alertLevelColor(result.alertLevel)}`}>
                      {alertLevelLabel(result.alertLevel)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">缺料物料数</p>
                    <p className="text-4xl font-bold text-primary">{result.shortageItems.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shortage Items Table */}
            {result.shortageItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5 text-yellow-400" />
                    缺料明细 ({result.shortageItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">物料</th>
                          <th className="text-right py-2 pr-4">当前库存</th>
                          <th className="text-right py-2 pr-4">安全库存</th>
                          <th className="text-right py-2 pr-4">日均用量</th>
                          <th className="text-right py-2 pr-4">剩余天数</th>
                          <th className="text-right py-2 pr-4">建议采购量</th>
                          <th className="text-left py-2">紧急度</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.shortageItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.material}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.currentStock}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.safetyStock}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.dailyUsage}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.daysRemaining}</td>
                            <td className="py-2 pr-4 text-right font-mono text-primary">{item.suggestedOrderQty}</td>
                            <td className="py-2">
                              <Badge className={urgencyColor(item.urgency)}>{urgencyLabel(item.urgency)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scheduling Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  排产影响
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{result.schedulingImpact}</p>
              </CardContent>
            </Card>

            {/* Purchase Suggestions Table */}
            {result.purchaseSuggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    采购建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">物料</th>
                          <th className="text-left py-2 pr-4">供应商</th>
                          <th className="text-right py-2 pr-4">数量</th>
                          <th className="text-left py-2 pr-4">预计交期</th>
                          <th className="text-right py-2">预计费用</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.purchaseSuggestions.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.material}</td>
                            <td className="py-2 pr-4">{item.supplier}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.quantity}</td>
                            <td className="py-2 pr-4">{item.estimatedLeadTime}</td>
                            <td className="py-2 text-right font-mono">{item.estimatedCost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Alternative Materials Table */}
            {result.alternativeMaterials.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <RefreshCw className="h-5 w-5 text-blue-400" />
                    替代物料
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">原物料</th>
                          <th className="text-left py-2 pr-4">替代物料</th>
                          <th className="text-left py-2">兼容性</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.alternativeMaterials.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.original}</td>
                            <td className="py-2 pr-4 text-primary">{item.alternative}</td>
                            <td className="py-2">{item.compatibility}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

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
  );
}
