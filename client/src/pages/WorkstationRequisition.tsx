/**
 * 智能工位领料 (Workstation Requisition) — US-011
 * BOM自动解析 · 最优拣货路线 · 缺料预警
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Package, Loader2, Sparkles, CheckCircle, AlertTriangle, MapPin, Clock,
} from "lucide-react";

interface RequisitionResult {
  requisitionNumber: string;
  workstation: string;
  items: Array<{
    material: string;
    requiredQty: number;
    availableStock: number;
    allocatedQty: number;
    status: string;
    location: string;
  }>;
  pickingRoute: string[];
  estimatedPickTime: string;
  shortfalls: Array<{
    material: string;
    deficit: number;
    suggestion: string;
  }>;
  recommendations: string[];
}

export default function WorkstationRequisition() {
  const { t } = useLanguage();
  const [workstation, setWorkstation] = useState("");
  const [productionOrder, setProductionOrder] = useState("");
  const [bomMaterials, setBomMaterials] = useState("");
  const [warehouseInventory, setWarehouseInventory] = useState("");
  const [result, setResult] = useState<RequisitionResult | null>(null);

  const mutation = trpc.productionAdvanced.optimizeRequisition.useMutation({
    onSuccess: (data) => setResult(data as RequisitionResult),
    onError: () => setResult(null),
  });

  const handleSubmit = () => {
    if (!workstation.trim() || !productionOrder.trim() || !bomMaterials.trim() || !warehouseInventory.trim() || mutation.isPending) return;
    mutation.mutate({
      workstation,
      productionOrder,
      bomMaterials,
      warehouseInventory,
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "partial": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "shortage": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "ready": return t("manufacturing.requisition.statusReady");
      case "partial": return t("manufacturing.requisition.statusPartial");
      case "shortage": return t("manufacturing.requisition.statusShortage");
      default: return status;
    }
  };

  return (
      <div className="space-y-6 p-6">
        <PageHeader
          icon={Package}
          title={t("manufacturing.requisition.title")}
          description={t("manufacturing.requisition.description")}
          actions={
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {t("manufacturing.requisition.aiRequisition")}
            </Badge>
          }
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" />
              {t("manufacturing.requisition.requisitionInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.requisition.workstation")} *</label>
                <Input
                  placeholder="如: A3-组装工位"
                  value={workstation}
                  onChange={(e) => setWorkstation(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">{t("manufacturing.requisition.productionOrder")} *</label>
                <Input
                  placeholder={t("manufacturing.requisition.productionOrder")}
                  value={productionOrder}
                  onChange={(e) => setProductionOrder(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("manufacturing.requisition.bomMaterials")} *</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                placeholder={t("manufacturing.requisition.bomMaterials")}
                value={bomMaterials}
                onChange={(e) => setBomMaterials(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">{t("manufacturing.requisition.warehouseInventory")} *</label>
              <textarea
                className="w-full bg-background border rounded px-3 py-2 text-sm min-h-[80px]"
                placeholder={t("manufacturing.requisition.warehouseInventory")}
                value={warehouseInventory}
                onChange={(e) => setWarehouseInventory(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!workstation.trim() || !productionOrder.trim() || !bomMaterials.trim() || !warehouseInventory.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {t("manufacturing.requisition.smartRequisition")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Requisition Number + Workstation */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("manufacturing.requisition.requisitionNumber")}</p>
                    <Badge className="text-lg px-3 py-1 mt-1 bg-primary/20 text-primary border-primary/30">
                      {result.requisitionNumber}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{t("manufacturing.requisition.targetWorkstation")}</p>
                    <p className="text-xl font-bold">{result.workstation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            {result.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5 text-primary" />
                    {t("manufacturing.requisition.itemDetail")} ({result.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">{t("manufacturing.requisition.material")}</th>
                          <th className="text-right py-2 pr-4">{t("manufacturing.requisition.requiredQty")}</th>
                          <th className="text-right py-2 pr-4">{t("manufacturing.requisition.availableStock")}</th>
                          <th className="text-right py-2 pr-4">{t("manufacturing.requisition.allocatedQty")}</th>
                          <th className="text-left py-2 pr-4">{t("manufacturing.requisition.status")}</th>
                          <th className="text-left py-2">{t("manufacturing.requisition.location")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.material}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.requiredQty}</td>
                            <td className="py-2 pr-4 text-right font-mono">{item.availableStock}</td>
                            <td className="py-2 pr-4 text-right font-mono text-primary">{item.allocatedQty}</td>
                            <td className="py-2 pr-4">
                              <Badge className={statusColor(item.status)}>{statusLabel(item.status)}</Badge>
                            </td>
                            <td className="py-2 font-mono text-xs">{item.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Picking Route + Estimated Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-5 w-5 text-primary" />
                    {t("manufacturing.requisition.optimalRoute")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {result.pickingRoute.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t("manufacturing.requisition.estPickTime")}</p>
                      <p className="text-3xl font-bold text-primary">{result.estimatedPickTime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Shortfalls Warning */}
            {result.shortfalls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    {t("manufacturing.requisition.shortfallAlert")} ({result.shortfalls.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-4">{t("manufacturing.requisition.material")}</th>
                          <th className="text-right py-2 pr-4">{t("manufacturing.requisition.deficit")}</th>
                          <th className="text-left py-2">{t("manufacturing.requisition.suggestion")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.shortfalls.map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50">
                            <td className="py-2 pr-4 font-medium">{item.material}</td>
                            <td className="py-2 pr-4 text-right font-mono text-red-400">{item.deficit}</td>
                            <td className="py-2 text-muted-foreground">{item.suggestion}</td>
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
                    {t("manufacturing.common.aiSuggestions")}
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
