/**
 * 事业部管理系统 - 前端页面
 * Business Unit Management System - Frontend Page
 */

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/grt";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Plus, Edit2, Trash2, TrendingUp, AlertCircle } from "lucide-react";

const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F"];

export default function BusinessUnits() {
  const { t } = useLanguage();
  const [selectedBu, setSelectedBu] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    managerId: "",
    status: "active",
  });

  // 查询事业部列表
  const { data: buList, isLoading: isLoadingBuList } = trpc.bu.list.useQuery();

  // 查询选中事业部的绩效数据
  const { data: performance } = trpc.bu.getPerformance.useQuery(
    (selectedBu ? { buId: selectedBu, fiscalYear: 2026 } : undefined) as any,
    { enabled: !!selectedBu }
  );

  // 查询KPI
  const { data: kpis } = trpc.bu.getKpis.useQuery(
    (selectedBu ? { buId: selectedBu, fiscalYear: 2026 } : undefined) as any,
    { enabled: !!selectedBu }
  );

  // 查询统计信息
  const { data: statistics } = trpc.bu.getStatistics.useQuery(
    (selectedBu ? { buId: selectedBu, fiscalYear: 2026 } : undefined) as any,
    { enabled: !!selectedBu }
  );

  // 创建事业部
  const createBuMutation = trpc.bu.create.useMutation({
    onSuccess: () => {
      setFormData({ code: "", name: "", description: "", managerId: "", status: "active" });
      setIsCreateDialogOpen(false);
    },
  });

  // 删除事业部
  const deleteBuMutation = trpc.bu.delete.useMutation();

  const handleCreateBu = async () => {
    await createBuMutation.mutateAsync({
      code: formData.code,
      name: formData.name,
      description: formData.description,
      managerId: formData.managerId ? parseInt(formData.managerId) : undefined,
      status: formData.status as "active" | "inactive" | "planning",
    });
  };

  const handleDeleteBu = async (id: number) => {
    if (confirm(t("admin.bu.confirmDelete"))) {
      await deleteBuMutation.mutateAsync({ id });
    }
  };

  // 准备绩效数据用于图表
  const perfData = performance && (performance as any).data && (performance as any).data.length > 0 ? (performance as any).data[0] : null;
  const performanceData = perfData ? [
    {
      name: t("admin.bu.operation"),
      value: Math.round(
        (Number(perfData.revenue || 0) / Number(perfData.revenueTarget || 1)) * 100
      ),
    },
    {
      name: t("admin.bu.delivery"),
      value: Number(perfData.deliveryOnTimeRate || 0),
    },
    {
      name: t("admin.bu.costDim"),
      value: 100 - Math.abs(Number(perfData.costVarianceRate || 0)),
    },
    {
      name: t("admin.bu.qualityDim"),
      value: Number(perfData.qualityScore || 0),
    },
    {
      name: t("admin.bu.customerDim"),
      value: Number(perfData.customerSatisfaction || 0),
    },
  ] : [];

  return (
      <>
      <div className="space-y-6">
        <PageHeader
          icon={TrendingUp}
          title={t("admin.bu.title")}
          description={t("admin.bu.description")}
          actions={
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("admin.bu.createBU")}
            </Button>
          }
        />

        {/* 事业部列表 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.bu.buList")}</CardTitle>
            <CardDescription>
              {t("admin.bu.buCount").replace("{count}", String(buList?.data?.length || 0))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBuList ? (
              <div className="text-center py-8 text-muted-foreground">{t("admin.bu.loading")}</div>
            ) : buList?.data && buList.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {buList.data.map((bu: any) => (
                  <Card
                    key={bu.id}
                    className={`cursor-pointer transition-colors ${
                      selectedBu === bu.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedBu(bu.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{bu.name}</CardTitle>
                          <CardDescription>{bu.code}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBu(bu.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {bu.description || t("admin.bu.noDescription")}
                      </p>
                      <div className="mt-3 inline-block px-2 py-1 rounded-full text-xs font-medium bg-secondary">
                        {bu.status === "active" ? t("admin.bu.statusActive") : bu.status === "inactive" ? t("admin.bu.statusInactive") : t("admin.bu.statusPlanning")}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t("admin.bu.noBU")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 绩效详情 */}
        {selectedBu && (
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="performance">{t("admin.bu.perfMetrics")}</TabsTrigger>
              <TabsTrigger value="kpis">{t("admin.bu.kpiManagement")}</TabsTrigger>
              <TabsTrigger value="statistics">{t("admin.bu.statistics")}</TabsTrigger>
            </TabsList>

            {/* 绩效指标标签页 */}
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.bu.perfOverview")}</CardTitle>
                  <CardDescription>
                    {t("admin.bu.perfYear")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {performance && performance.data && performance.data.length > 0 ? (
                    <div className="space-y-6">
                      {/* 绩效图表 */}
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* 关键指标卡片 */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">{t("admin.bu.revenueAchievement")}</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data?.[0]?.revenueAchievementRate ?? 0}%
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-50 to-green-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">{t("admin.bu.onTimeDelivery")}</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data?.[0]?.deliveryOnTimeRate ?? 0}%
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">{t("admin.bu.qualityScore")}</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data?.[0]?.qualityScore ?? 0}分
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">{t("admin.bu.custSatisfaction")}</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data?.[0]?.customerSatisfaction ?? 0}分
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-red-50 to-red-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">{t("admin.bu.costVariance")}</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data?.[0]?.costVarianceRate ?? 0}%
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">{t("admin.bu.overallScore")}</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data?.[0]?.overallScore ?? 0}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Button
                        onClick={() => setIsPerformanceDialogOpen(true)}
                        className="w-full"
                      >
                        {t("admin.bu.editPerf")}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">{t("admin.bu.noPerfData")}</p>
                      <Button
                        onClick={() => setIsPerformanceDialogOpen(true)}
                        className="mt-4"
                      >
                        {t("admin.bu.createPerfData")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* KPI管理标签页 */}
            <TabsContent value="kpis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.bu.kpiTitle")}</CardTitle>
                  <CardDescription>
                    {t("admin.bu.kpiCount").replace("{count}", String(kpis?.data?.length || 0))}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {kpis?.data && kpis.data.length > 0 ? (
                    <div className="space-y-4">
                      {kpis.data.map((kpi: any) => (
                        <Card key={kpi.id} className="border-l-4 border-l-primary">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">{kpi.kpiName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {t("admin.bu.kpiCode")} {kpi.kpiCode} | {t("admin.bu.kpiDimension")} {kpi.dimension}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold">
                                  {kpi.targetValue}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {kpi.unit || t("admin.bu.kpiUnit")}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground">{t("admin.bu.kpiWeight")}</span>
                                <div className="font-semibold">{kpi.weight}%</div>
                              </div>
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground">{t("admin.bu.kpiStatus")}</span>
                                <div className="font-semibold">
                                  {kpi.status === "active" ? t("admin.bu.kpiActive") : t("admin.bu.kpiInactive")}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("admin.bu.noKpiData")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 统计分析标签页 */}
            <TabsContent value="statistics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.bu.statsTitle")}</CardTitle>
                  <CardDescription>
                    {t("admin.bu.statsDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statistics?.data ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">{t("admin.bu.employeeCount")}</div>
                          <div className="text-3xl font-bold mt-2">
                            {statistics.data.employeeCount}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">{t("admin.bu.projectCount")}</div>
                          <div className="text-3xl font-bold mt-2">
                            {statistics.data.projectCount}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-green-50 to-green-100">
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">{t("admin.bu.avgProjectScore")}</div>
                          <div className="text-3xl font-bold mt-2">
                            {statistics.data.averageProjectScore.toFixed(1)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">{t("admin.bu.kpiCountLabel")}</div>
                          <div className="text-3xl font-bold mt-2">
                            {statistics.data.kpis.length}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("admin.bu.noStatsData")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* 创建事业部对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.bu.createDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.bu.createDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">{t("admin.bu.buCode")}</Label>
              <Input
                id="code"
                placeholder={t("admin.bu.buCodePlaceholder")}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="name">{t("admin.bu.buName")}</Label>
              <Input
                id="name"
                placeholder={t("admin.bu.buNamePlaceholder")}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">{t("admin.bu.buDescriptionLabel")}</Label>
              <Input
                id="description"
                placeholder={t("admin.bu.buDescPlaceholder")}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">{t("admin.bu.statusLabel")}</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("admin.bu.statusActive")}</SelectItem>
                  <SelectItem value="inactive">{t("admin.bu.statusInactive")}</SelectItem>
                  <SelectItem value="planning">{t("admin.bu.statusPlanning")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreateBu}
              disabled={!formData.code || !formData.name}
              className="w-full"
            >
              {t("admin.bu.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </>
  );
}
