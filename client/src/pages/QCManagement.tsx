/**
 * v2.5.27 质检管理页面
 * 质检记录管理、质检审核、返工流程、质检统计
 */

import { useState } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  ClipboardCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FileText,
  BarChart3,
  Clock,
  User,
  Package
} from "lucide-react";
import { toast } from "sonner";

// 质检结果颜色映射
const resultColors: Record<string, string> = {
  Pass: "bg-green-500/10 text-green-500 border-green-500/20",
  Fail: "bg-red-500/10 text-red-500 border-red-500/20",
  Conditional_Pass: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

// 质检类型中文映射
const inspectionTypeLabels: Record<string, string> = {
  First_Article: "首件检验",
  In_Process: "过程检验",
  Final: "最终检验",
  Rework: "返工检验",
};

export default function QCManagement() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("records");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // 新建质检记录表单
  const [newRecord, setNewRecord] = useState({
    inspectionCode: "",
    taskId: 0,
    workOrderId: 0,
    inspectionType: "In_Process" as "First_Article" | "In_Process" | "Final" | "Rework",
    inspectorId: 0,
    inspectorName: "",
    result: "Pass" as "Pass" | "Fail" | "Conditional_Pass",
    defectType: "",
    defectDescription: "",
    qualityScore: 100,
    notes: "",
  });

  // 获取质检记录
  const { data: qcRecordsData, isLoading: recordsLoading, refetch: refetchRecords } = trpc.productionDashboard.getQCRecords.useQuery({
    result: filterResult !== "all" ? filterResult as "pass" | "fail" | "conditional" : undefined,
    checkType: filterType !== "all" ? filterType as "incoming" | "process" | "final" | "patrol" : undefined,
  });
  // 安全访问数据 - 处理后端返回的嵌套对象结构
  const qcRecords = Array.isArray(qcRecordsData) ? qcRecordsData : ((qcRecordsData as any)?.records || []);

  // 获取质检统计
  const { data: qcStatsRaw, isLoading: statsLoading } = trpc.productionDashboard.getQCStats.useQuery();
  const qcStats = qcStatsRaw as any;

  // 创建质检记录
  const createQCMutation = trpc.productionDashboard.createQCRecord.useMutation({
    onSuccess: () => {
      toast.success("质检记录创建成功");
      setIsCreateDialogOpen(false);
      refetchRecords();
      // 重置表单
      setNewRecord({
        inspectionCode: "",
        taskId: 0,
        workOrderId: 0,
        inspectionType: "In_Process",
        inspectorId: 0,
        inspectorName: "",
        result: "Pass",
        defectType: "",
        defectDescription: "",
        qualityScore: 100,
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 生成质检编码
  const generateInspectionCode = () => {
    const prefix = {
      First_Article: "FA",
      In_Process: "IP",
      Final: "FI",
      Rework: "RW",
    }[newRecord.inspectionType];
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `QC-${prefix}-${timestamp}-${random}`.toUpperCase();
  };

  // 处理创建质检记录
  const handleCreateRecord = () => {
    if (!newRecord.taskId || !newRecord.workOrderId || !newRecord.inspectorId) {
      toast.error("请填写必填字段");
      return;
    }
    
    createQCMutation.mutate({
      workOrderId: newRecord.workOrderId,
      checkType: "process" as const,
      checkPoint: newRecord.inspectionType,
      totalItems: 1,
      passItems: newRecord.result === "Pass" ? 1 : 0,
      failItems: newRecord.result === "Fail" ? 1 : 0,
      result: (newRecord.result === "Pass" ? "pass" : newRecord.result === "Fail" ? "fail" : "conditional") as "pass" | "fail" | "conditional",
      inspector: newRecord.inspectorName || `Inspector ${newRecord.inspectorId}`,
      notes: newRecord.notes || undefined,
    });
  };

  // 过滤记录
  const filteredRecords = qcRecords?.filter((record: any) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        record.inspectionCode?.toLowerCase().includes(search) ||
        record.inspectorName?.toLowerCase().includes(search) ||
        record.defectType?.toLowerCase().includes(search)
      );
    }
    return true;
  }) || [];

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={ClipboardCheck}
          title="质检管理"
          description="M5生产阶段质检记录管理、质检审核与返工流程"
          actions={
            <Button onClick={() => refetchRecords()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新数据
            </Button>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ClipboardCheck} label="总检验次数" value={qcStats?.totalInspections || 0} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={CheckCircle2} label="通过数量" value={qcStats?.passCount || 0} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={XCircle} label="不通过数量" value={qcStats?.failCount || 0} iconColor="text-red-500" iconBg="bg-red-500/10" />
          <StatCard icon={BarChart3} label="通过率" value={`${qcStats?.passRate || 0}%`} />
        </div>

        {/* 主内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="records" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              质检记录
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              质检统计
            </TabsTrigger>
            <TabsTrigger value="rework" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              返工管理
            </TabsTrigger>
          </TabsList>

          {/* 质检记录Tab */}
          <TabsContent value="records" className="space-y-4">
            {/* 工具栏 */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索质检编码、检验员..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="检验结果" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部结果</SelectItem>
                  <SelectItem value="Pass">通过</SelectItem>
                  <SelectItem value="Fail">不通过</SelectItem>
                  <SelectItem value="Conditional_Pass">条件通过</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="检验类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="First_Article">首件检验</SelectItem>
                  <SelectItem value="In_Process">过程检验</SelectItem>
                  <SelectItem value="Final">最终检验</SelectItem>
                  <SelectItem value="Rework">返工检验</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    新建质检
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>新建质检记录</DialogTitle>
                    <DialogDescription>
                      创建新的质检记录，记录检验结果和缺陷信息
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label>质检编码</Label>
                      <Input
                        placeholder="自动生成"
                        value={newRecord.inspectionCode}
                        onChange={(e) => setNewRecord({ ...newRecord, inspectionCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>检验类型 *</Label>
                      <Select
                        value={newRecord.inspectionType}
                        onValueChange={(v) => setNewRecord({ ...newRecord, inspectionType: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="First_Article">首件检验</SelectItem>
                          <SelectItem value="In_Process">过程检验</SelectItem>
                          <SelectItem value="Final">最终检验</SelectItem>
                          <SelectItem value="Rework">返工检验</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>工单ID *</Label>
                      <Input
                        type="number"
                        placeholder="输入工单ID"
                        value={newRecord.workOrderId || ""}
                        onChange={(e) => setNewRecord({ ...newRecord, workOrderId: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>任务ID *</Label>
                      <Input
                        type="number"
                        placeholder="输入任务ID"
                        value={newRecord.taskId || ""}
                        onChange={(e) => setNewRecord({ ...newRecord, taskId: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>检验员ID *</Label>
                      <Input
                        type="number"
                        placeholder="输入检验员ID"
                        value={newRecord.inspectorId || ""}
                        onChange={(e) => setNewRecord({ ...newRecord, inspectorId: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>检验员姓名</Label>
                      <Input
                        placeholder="输入检验员姓名"
                        value={newRecord.inspectorName}
                        onChange={(e) => setNewRecord({ ...newRecord, inspectorName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>检验结果 *</Label>
                      <Select
                        value={newRecord.result}
                        onValueChange={(v) => setNewRecord({ ...newRecord, result: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pass">通过</SelectItem>
                          <SelectItem value="Fail">不通过</SelectItem>
                          <SelectItem value="Conditional_Pass">条件通过</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>质量评分</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0-100"
                        value={newRecord.qualityScore}
                        onChange={(e) => setNewRecord({ ...newRecord, qualityScore: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    {newRecord.result !== "Pass" && (
                      <>
                        <div className="space-y-2">
                          <Label>缺陷类型</Label>
                          <Input
                            placeholder="如：尺寸偏差、外观缺陷"
                            value={newRecord.defectType}
                            onChange={(e) => setNewRecord({ ...newRecord, defectType: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>缺陷描述</Label>
                          <Textarea
                            placeholder="详细描述缺陷情况..."
                            value={newRecord.defectDescription}
                            onChange={(e) => setNewRecord({ ...newRecord, defectDescription: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2 col-span-2">
                      <Label>备注</Label>
                      <Textarea
                        placeholder="其他备注信息..."
                        value={newRecord.notes}
                        onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleCreateRecord} disabled={createQCMutation.isPending}>
                      {createQCMutation.isPending ? "创建中..." : "创建"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* 质检记录列表 */}
            <Card>
              <CardContent className="p-0">
                {recordsLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    加载中...
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    暂无质检记录
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-secondary/30">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">质检编码</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">检验类型</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">工单/任务</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">检验员</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">检验结果</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">质量评分</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">检验时间</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredRecords.map((record: any) => (
                          <tr key={record.id} className="hover:bg-secondary/20">
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm">{record.inspectionCode}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">
                                {inspectionTypeLabels[record.inspectionType || ""] || record.inspectionType}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Package className="w-4 h-4 text-muted-foreground" />
                                <span>#{record.workOrderId}</span>
                                <span className="text-muted-foreground">/</span>
                                <span>#{record.taskId}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>{record.inspectorName || `ID: ${record.inspectorId}`}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={resultColors[record.result || "Pass"]}>
                                {record.result === "Pass" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {record.result === "Fail" && <XCircle className="w-3 h-3 mr-1" />}
                                {record.result === "Conditional_Pass" && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {record.result === "Pass" ? "通过" : record.result === "Fail" ? "不通过" : "条件通过"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-medium ${
                                (record.qualityScore || 0) >= 90 ? "text-green-500" :
                                (record.qualityScore || 0) >= 70 ? "text-yellow-500" : "text-red-500"
                              }`}>
                                {record.qualityScore || 0}分
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                {record.inspectionTime ? new Date(record.inspectionTime).toLocaleString() : "-"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Button variant="ghost" size="sm">
                                查看详情
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 质检统计Tab */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 按类型统计 */}
              <Card>
                <CardHeader>
                  <CardTitle>按检验类型统计</CardTitle>
                  <CardDescription>各类型检验的通过率分析</CardDescription>
                </CardHeader>
                <CardContent>
                  {qcStats?.byType && Object.entries(qcStats.byType).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(qcStats.byType).map(([type, rawStats]) => {
                        const stats = rawStats as any;
                        return (
                        <div key={type} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{inspectionTypeLabels[type] || type}</span>
                            <span className="text-sm text-muted-foreground">
                              {stats.total}次检验
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${stats.total > 0 ? (stats.pass / stats.total) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">
                              {stats.total > 0 ? Math.round((stats.pass / stats.total) * 100) : 0}%
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="text-green-500">通过: {stats.pass}</span>
                            <span className="text-red-500">不通过: {stats.fail}</span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      暂无统计数据
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 质量趋势 */}
              <Card>
                <CardHeader>
                  <CardTitle>质量指标概览</CardTitle>
                  <CardDescription>整体质量表现分析</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">
                        {qcStats?.passRate || 0}%
                      </div>
                      <p className="text-muted-foreground mt-2">整体通过率</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 rounded-lg bg-green-500/10">
                        <div className="text-2xl font-bold text-green-500">{qcStats?.passCount || 0}</div>
                        <p className="text-xs text-muted-foreground">通过</p>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-500/10">
                        <div className="text-2xl font-bold text-yellow-500">{qcStats?.conditionalPassCount || 0}</div>
                        <p className="text-xs text-muted-foreground">条件通过</p>
                      </div>
                      <div className="p-4 rounded-lg bg-red-500/10">
                        <div className="text-2xl font-bold text-red-500">{qcStats?.failCount || 0}</div>
                        <p className="text-xs text-muted-foreground">不通过</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 返工管理Tab */}
          <TabsContent value="rework" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  返工任务列表
                </CardTitle>
                <CardDescription>
                  质检不通过需要返工的任务
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 筛选不通过的质检记录 */}
                {filteredRecords.filter((r: any) => r.result === "Fail" || r.result === "Conditional_Pass").length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>暂无需要返工的任务</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRecords
                      .filter((r: any) => r.result === "Fail" || r.result === "Conditional_Pass")
                      .map((record: any) => (
                        <div 
                          key={record.id} 
                          className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{record.inspectionCode}</span>
                                <Badge className={resultColors[record.result || "Fail"]}>
                                  {record.result === "Fail" ? "不通过" : "条件通过"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                工单 #{record.workOrderId} / 任务 #{record.taskId}
                              </p>
                              {record.defectType && (
                                <p className="text-sm">
                                  <span className="text-muted-foreground">缺陷类型：</span>
                                  {record.defectType}
                                </p>
                              )}
                              {record.defectDescription && (
                                <p className="text-sm text-muted-foreground">
                                  {record.defectDescription}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                查看详情
                              </Button>
                              <Button size="sm">
                                创建返工任务
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
