/**
 * 事业部管理系统 - 前端页面
 * Business Unit Management System - Frontend Page
 */

import { useState } from "react";
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
    selectedBu ? { buId: selectedBu, fiscalYear: 2026 } : undefined,
    { enabled: !!selectedBu }
  );

  // 查询KPI
  const { data: kpis } = trpc.bu.getKpis.useQuery(
    selectedBu ? { buId: selectedBu, fiscalYear: 2026 } : undefined,
    { enabled: !!selectedBu }
  );

  // 查询统计信息
  const { data: statistics } = trpc.bu.getStatistics.useQuery(
    selectedBu ? { buId: selectedBu, fiscalYear: 2026 } : undefined,
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
    if (confirm("确定要删除这个事业部吗？")) {
      await deleteBuMutation.mutateAsync({ id });
    }
  };

  // 准备绩效数据用于图表
  const perfData = performance && (performance as any).data && (performance as any).data.length > 0 ? (performance as any).data[0] : null;
  const performanceData = perfData ? [
    {
      name: "经营",
      value: Math.round(
        (Number(perfData.revenue || 0) / Number(perfData.revenueTarget || 1)) * 100
      ),
    },
    {
      name: "交付",
      value: Number(perfData.deliveryOnTimeRate || 0),
    },
    {
      name: "成本",
      value: 100 - Math.abs(Number(perfData.costVarianceRate || 0)),
    },
    {
      name: "质量",
      value: Number(perfData.qualityScore || 0),
    },
    {
      name: "客户",
      value: Number(perfData.customerSatisfaction || 0),
    },
  ] : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">事业部管理</h1>
            <p className="text-muted-foreground mt-2">
              管理事业部、绩效指标和关键业绩指标
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            创建事业部
          </Button>
        </div>

        {/* 事业部列表 */}
        <Card>
          <CardHeader>
            <CardTitle>事业部列表</CardTitle>
            <CardDescription>
              {buList?.data?.length || 0} 个事业部
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBuList ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
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
                        {bu.description || "暂无描述"}
                      </p>
                      <div className="mt-3 inline-block px-2 py-1 rounded-full text-xs font-medium bg-secondary">
                        {bu.status === "active" ? "活跃" : bu.status === "inactive" ? "非活跃" : "规划中"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无事业部，请创建一个新的事业部
              </div>
            )}
          </CardContent>
        </Card>

        {/* 绩效详情 */}
        {selectedBu && (
          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="performance">绩效指标</TabsTrigger>
              <TabsTrigger value="kpis">KPI管理</TabsTrigger>
              <TabsTrigger value="statistics">统计分析</TabsTrigger>
            </TabsList>

            {/* 绩效指标标签页 */}
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>绩效指标概览</CardTitle>
                  <CardDescription>
                    2026年度绩效指标
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
                            <div className="text-sm text-muted-foreground">收入达成率</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data[0].revenueAchievementRate || 0}%
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-50 to-green-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">按时交付率</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data[0].deliveryOnTimeRate || 0}%
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">质量评分</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data[0].qualityScore || 0}分
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">客户满意度</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data[0].customerSatisfaction || 0}分
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-red-50 to-red-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">成本差异率</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data[0].costVarianceRate || 0}%
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100">
                          <CardContent className="pt-6">
                            <div className="text-sm text-muted-foreground">综合评分</div>
                            <div className="text-2xl font-bold mt-2">
                              {performance.data[0].overallScore || 0}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Button
                        onClick={() => setIsPerformanceDialogOpen(true)}
                        className="w-full"
                      >
                        编辑绩效指标
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">暂无绩效数据</p>
                      <Button
                        onClick={() => setIsPerformanceDialogOpen(true)}
                        className="mt-4"
                      >
                        创建绩效数据
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
                  <CardTitle>关键绩效指标 (KPI)</CardTitle>
                  <CardDescription>
                    {kpis?.data?.length || 0} 个KPI
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
                                  代码: {kpi.kpiCode} | 维度: {kpi.dimension}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold">
                                  {kpi.targetValue}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {kpi.unit || "单位"}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground">权重</span>
                                <div className="font-semibold">{kpi.weight}%</div>
                              </div>
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground">状态</span>
                                <div className="font-semibold">
                                  {kpi.status === "active" ? "活跃" : "非活跃"}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无KPI数据
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 统计分析标签页 */}
            <TabsContent value="statistics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>统计分析</CardTitle>
                  <CardDescription>
                    事业部综合统计信息
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statistics?.data ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">员工数</div>
                          <div className="text-3xl font-bold mt-2">
                            {statistics.data.employeeCount}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">项目数</div>
                          <div className="text-3xl font-bold mt-2">
                            {statistics.data.projectCount}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-green-50 to-green-100">
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">平均项目评分</div>
                          <div className="text-3xl font-bold mt-2">
                            {statistics.data.averageProjectScore.toFixed(1)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">KPI数</div>
                          <div className="text-3xl font-bold mt-2">
                            {statistics.data.kpis.length}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无统计数据
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
            <DialogTitle>创建事业部</DialogTitle>
            <DialogDescription>
              创建一个新的事业部并配置基本信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">事业部代码</Label>
              <Input
                id="code"
                placeholder="例如: BU5"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="name">事业部名称</Label>
              <Input
                id="name"
                placeholder="例如: 工业通用事业部"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                placeholder="事业部描述"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">状态</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="inactive">非活跃</SelectItem>
                  <SelectItem value="planning">规划中</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreateBu}
              disabled={!formData.code || !formData.name}
              className="w-full"
            >
              创建
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
