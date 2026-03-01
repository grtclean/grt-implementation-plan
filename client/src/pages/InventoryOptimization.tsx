/**
 * AI库存优化分析 (Inventory Optimization)
 * Phase E: 安全库存 · 经济批量 · ABC分类 · 补货策略
 */
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { t } = useLanguage();
  const [materialName, setMaterialName] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [avgDailyUsage, setAvgDailyUsage] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [demandVariability, setDemandVariability] = useState("__none__");
  const [serviceLevel, setServiceLevel] = useState("__none__");
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);

  const mutation = trpc.operationsIntelligence.optimizeInventory.useMutation({
    onSuccess: (data) => setTaskId(data.taskId),
    onError: () => setResult(null),
  });

  const taskQuery = trpc.operationsIntelligence.getTaskResult.useQuery(
    { taskId: taskId! },
    {
      enabled: !!taskId,
      refetchInterval: (query) =>
        query.state.data?.taskStatus === "completed" || query.state.data?.taskStatus === "failed"
          ? false
          : 2000,
    },
  );

  useEffect(() => {
    if (taskQuery.data?.taskStatus === "completed" && taskQuery.data.result) {
      setResult(taskQuery.data.result as unknown as OptimizationResult);
      setTaskId(null);
    } else if (taskQuery.data?.taskStatus === "failed") {
      setResult(null);
      setTaskId(null);
    }
  }, [taskQuery.data]);

  const handleSubmit = () => {
    if (!materialName.trim() || !currentStock || !avgDailyUsage || !leadTimeDays || mutation.isPending || !!taskId) return;
    mutation.mutate({
      materialName,
      currentStock: Number(currentStock),
      avgDailyUsage: Number(avgDailyUsage),
      leadTimeDays: Number(leadTimeDays),
      unitCost: unitCost ? Number(unitCost) : undefined,
      demandVariability: demandVariability === "__none__" ? undefined : demandVariability,
      serviceLevel: serviceLevel === "__none__" ? undefined : serviceLevel,
    });
  };

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    optimal: { label: t("supply.inventoryOpt.optimal"), color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
    overstock: { label: t("supply.inventoryOpt.overstockStatus"), color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Package },
    understock: { label: t("supply.inventoryOpt.understockStatus"), color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: AlertTriangle },
    critical: { label: t("supply.inventoryOpt.criticalStatus"), color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
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
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Package}
          title={t("supply.inventoryOpt.pageTitle")}
          description={t("supply.inventoryOpt.pageDesc")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("supply.inventoryOpt.aiBadge")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" />
              {t("supply.inventoryOpt.materialInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.inventoryOpt.materialNameLabel")}</label>
                <Input value={materialName} onChange={(e) => setMaterialName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.inventoryOpt.currentStockLabel")}</label>
                <Input type="number" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.inventoryOpt.dailyUsageLabel")}</label>
                <Input type="number" value={avgDailyUsage} onChange={(e) => setAvgDailyUsage(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.inventoryOpt.leadTimeDaysLabel")}</label>
                <Input type="number" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.inventoryOpt.unitCostLabel")}</label>
                <Input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.inventoryOpt.demandVariability")}</label>
                <Select value={demandVariability} onValueChange={(v) => setDemandVariability(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("supply.inventoryOpt.unspecified")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("supply.inventoryOpt.unspecified")}</SelectItem>
                    <SelectItem value="low">{t("supply.inventoryOpt.low")}</SelectItem>
                    <SelectItem value="medium">{t("supply.inventoryOpt.medium")}</SelectItem>
                    <SelectItem value="high">{t("supply.inventoryOpt.high")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("supply.inventoryOpt.serviceLevel")}</label>
                <Select value={serviceLevel} onValueChange={(v) => setServiceLevel(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("supply.inventoryOpt.unspecified")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("supply.inventoryOpt.unspecified")}</SelectItem>
                    <SelectItem value="90%">90%</SelectItem>
                    <SelectItem value="95%">95%</SelectItem>
                    <SelectItem value="99%">99%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!materialName.trim() || !currentStock || !avgDailyUsage || !leadTimeDays || mutation.isPending || !!taskId}>
                {mutation.isPending || !!taskId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("supply.inventoryOpt.optimizeBtn")}
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
                      <p className="text-sm text-muted-foreground">{t("supply.inventoryOpt.inventoryStatus")}</p>
                      <Badge className={`text-lg px-3 py-1 mt-1 ${statusConfig[result.currentStatus]?.color || "bg-muted"}`}>
                        {statusConfig[result.currentStatus]?.label || result.currentStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("supply.inventoryOpt.abcClassification")}</p>
                      <Badge className={`text-lg px-3 py-1 mt-1 ${abcColor(result.abcClassification)}`}>
                        {result.abcClassification}{t("supply.inventoryOpt.classLabel")}
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
                      <p className="text-sm text-muted-foreground">{t("supply.inventoryOpt.costOptimization")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("supply.inventoryOpt.reorderPointLabel")}</p>
                  <p className="text-4xl font-bold text-primary mt-1">{result.reorderPoint}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("supply.inventoryOpt.safetyStockLabel")}</p>
                  <p className="text-4xl font-bold text-yellow-400 mt-1">{result.safetyStock}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t("supply.inventoryOpt.eoqLabel")}</p>
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
                    {t("supply.inventoryOpt.aiSuggestions")}
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
