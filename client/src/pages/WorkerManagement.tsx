/**
 * v2.5.29 工人管理页面
 * 工人信息管理、效率统计、绩效分析 - 对接真实tRPC API
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  CheckCircle,
  Clock,
  Download,
  Edit,
  FileSpreadsheet,
  Medal,
  Plus,
  RefreshCw,
  Search,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  User,
  Users,
  Zap
} from "lucide-react";
import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import FeatureGuide from "@/components/FeatureGuide";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// 类型定义
interface Worker {
  id: number;
  name: string;
  employeeCode?: string;
  department: string;
  position: string;
  skillLevel: string;
  status: "Active" | "Inactive" | "OnLeave";
  joinDate?: string;
  efficiency?: number;
  tasksCompleted?: number;
  qualityRate?: number;
}

// 技能等级颜色
const skillLevelColors: Record<string, string> = {
  L1: "bg-gray-500", L2: "bg-blue-500", L3: "bg-green-500", L4: "bg-purple-500", L5: "bg-yellow-500"
};
const skillLevelLabels: Record<string, string> = {
  L1: "实习级", L2: "初级", L3: "中级", L4: "高级", L5: "专家级"
};
const statusColors: Record<string, string> = {
  Active: "bg-green-500", Inactive: "bg-gray-500", OnLeave: "bg-yellow-500"
};
const statusLabels: Record<string, string> = {
  Active: "在职", Inactive: "停用", OnLeave: "休假"
};

export default function WorkerManagement() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [newWorker, setNewWorker] = useState({
    name: "",
    department: "生产部",
    position: "生产工人",
    skillLevel: "L2",
    phone: "",
    email: "",
  });
  
  // 批量导入状态
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // tRPC查询 - 获取工人列表
  const { data: workersData, isLoading: isLoadingWorkers, refetch: refetchWorkers } = trpc.worker.getWorkers.useQuery({
    status: statusFilter !== "all" ? statusFilter as "Active" | "Inactive" | "OnLeave" : undefined,
    search: searchTerm || undefined,
  });

  // tRPC查询 - 获取工人效率排名
  const { data: rankingData, isLoading: isLoadingRanking } = trpc.worker.getWorkerRanking.useQuery({
    period: "week",
    limit: 10,
  });

  // tRPC查询 - 获取工时预警
  const { data: alertsData } = trpc.worker.getWorkHourAlerts.useQuery({
    status: "Pending",
    limit: 10,
  });

  // tRPC mutations
  const createWorkerMutation = trpc.worker.createWorker.useMutation({
    onSuccess: () => {
      toast.success("工人添加成功");
      setIsAddDialogOpen(false);
      setNewWorker({ name: "", department: "生产部", position: "生产工人", skillLevel: "L2", phone: "", email: "" });
      refetchWorkers();
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });

  const updateWorkerMutation = trpc.worker.updateWorker.useMutation({
    onSuccess: () => {
      toast.success("工人信息已更新");
      setIsEditDialogOpen(false);
      setSelectedWorker(null);
      refetchWorkers();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const deleteWorkerMutation = trpc.worker.deleteWorker.useMutation({
    onSuccess: () => {
      toast.success("工人已标记为离职");
      refetchWorkers();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  const acknowledgeAlertMutation = trpc.worker.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast.success("预警已处理");
    },
  });

  // 处理的工人列表
  const workers = useMemo(() => {
    const list = workersData?.workers || [];
    // 应用技能等级筛选
    if (skillFilter !== "all") {
      return list.filter(w => w.skillLevel === skillFilter);
    }
    return list;
  }, [workersData, skillFilter]);

  // 统计数据
  const stats = useMemo(() => {
    const allWorkers = workersData?.workers || [];
    const activeWorkers = allWorkers.filter(w => w.status === "Active");
    return {
      totalWorkers: workersData?.total || 0,
      activeWorkers: activeWorkers.length,
      avgEfficiency: 0, // 从效率统计中获取
      topPerformer: rankingData?.[0]?.workerName || "-",
      totalTasksCompleted: 0,
      avgQualityRate: 0,
    };
  }, [workersData, rankingData]);

  // 效率分布（从排名数据计算）
  const efficiencyDistribution = useMemo(() => {
    const ranking = rankingData || [];
    return {
      excellent: ranking.filter(w => Number(w.avgEfficiency) >= 110).length,
      good: ranking.filter(w => Number(w.avgEfficiency) >= 100 && Number(w.avgEfficiency) < 110).length,
      average: ranking.filter(w => Number(w.avgEfficiency) >= 90 && Number(w.avgEfficiency) < 100).length,
      needsImprovement: ranking.filter(w => Number(w.avgEfficiency) < 90).length,
    };
  }, [rankingData]);

  // 处理添加工人
  const handleAddWorker = () => {
    if (!newWorker.name.trim()) {
      toast.error("请输入工人姓名");
      return;
    }
    createWorkerMutation.mutate({
      name: newWorker.name,
      department: newWorker.department,
      position: newWorker.position,
      skillLevel: newWorker.skillLevel as "L1" | "L2" | "L3" | "L4" | "L5",
      phone: newWorker.phone || undefined,
      email: newWorker.email || undefined,
    });
  };

  // 处理更新工人
  const handleUpdateWorker = () => {
    if (!selectedWorker) return;
    updateWorkerMutation.mutate({
      id: selectedWorker.id,
      name: selectedWorker.name,
      department: selectedWorker.department,
      position: selectedWorker.position,
      skillLevel: selectedWorker.skillLevel as "L1" | "L2" | "L3" | "L4" | "L5",
      status: selectedWorker.status as "Active" | "Inactive" | "OnLeave",
    });
  };

  // 处理删除工人
  const handleDeleteWorker = (workerId: number) => {
    if (confirm("确定要将该工人标记为离职吗？")) {
      deleteWorkerMutation.mutate({ id: workerId });
    }
  };

  // 处理预警确认
  const handleAcknowledgeAlert = (alertId: number, action: "acknowledge" | "resolve" | "ignore") => {
    acknowledgeAlertMutation.mutate({ alertId, action });
  };

  // 下载导入模板
  const handleDownloadTemplate = (format: "csv" | "xlsx" = "xlsx") => {
    const headers = ["姓名", "部门", "职位", "技能等级(L1-L5)", "电话", "邮箱"];
    const sampleData = [
      ["张三", "生产部", "生产工人", "L2", "13800138001", "zhangsan@example.com"],
      ["李四", "质检部", "质检员", "L3", "13800138002", "lisi@example.com"],
      ["王五", "装配部", "装配工", "L4", "13800138003", "wangwu@example.com"],
    ];
    
    if (format === "xlsx") {
      // 生成Excel文件
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      // 设置列宽
      ws["!cols"] = [
        { wch: 10 }, // 姓名
        { wch: 12 }, // 部门
        { wch: 12 }, // 职位
        { wch: 15 }, // 技能等级
        { wch: 15 }, // 电话
        { wch: 25 }, // 邮箱
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "工人导入模板");
      XLSX.writeFile(wb, "工人导入模板.xlsx");
    } else {
      // 生成CSV文件
      const csvContent = [headers.join(","), ...sampleData.map(row => row.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "工人导入模板.csv";
      link.click();
    }
    toast.success("模板已下载");
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("请上传CSV或Excel文件");
      return;
    }
    
    setImportFile(file);
    setImportErrors([]);
    
    // 解析文件
    const parseFile = async () => {
      const preview: any[] = [];
      const errors: string[] = [];
      let totalRows = 0;
      
      if (file.name.endsWith(".csv")) {
        // CSV解析
        const text = await file.text();
        const lines = text.split("\n").filter(line => line.trim());
        totalRows = lines.length - 1;
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          const row = {
            name: values[0] || "",
            department: values[1] || "生产部",
            position: values[2] || "生产工人",
            skillLevel: values[3] || "L2",
            phone: values[4] || "",
            email: values[5] || "",
          };
          
          if (!row.name) {
            errors.push(`第${i + 1}行: 姓名不能为空`);
          }
          if (row.skillLevel && !["L1", "L2", "L3", "L4", "L5"].includes(row.skillLevel)) {
            errors.push(`第${i + 1}行: 技能等级无效，应为L1-L5`);
          }
          
          preview.push(row);
        }
      } else {
        // Excel解析
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        totalRows = jsonData.length - 1;
        
        for (let i = 1; i < jsonData.length; i++) {
          const values = jsonData[i];
          if (!values || values.length === 0) continue;
          
          const row = {
            name: String(values[0] || "").trim(),
            department: String(values[1] || "生产部").trim(),
            position: String(values[2] || "生产工人").trim(),
            skillLevel: String(values[3] || "L2").trim().toUpperCase(),
            phone: String(values[4] || "").trim(),
            email: String(values[5] || "").trim(),
          };
          
          if (!row.name) {
            errors.push(`第${i + 1}行: 姓名不能为空`);
          }
          if (row.skillLevel && !["L1", "L2", "L3", "L4", "L5"].includes(row.skillLevel)) {
            errors.push(`第${i + 1}行: 技能等级无效，应为L1-L5`);
          }
          
          preview.push(row);
        }
      }
      
      setImportPreview(preview);
      setImportErrors(errors);
      
      if (totalRows > 10) {
        toast.info(`共${totalRows}条数据`);
      }
    };
    
    parseFile();
  };

  // 执行批量导入
  const handleBatchImport = async () => {
    if (importErrors.length > 0) {
      toast.error("请先修正数据错误");
      return;
    }
    if (importPreview.length === 0) {
      toast.error("没有可导入的数据");
      return;
    }
    
    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const worker of importPreview) {
      try {
        await createWorkerMutation.mutateAsync({
          name: worker.name,
          department: worker.department,
          position: worker.position,
          skillLevel: worker.skillLevel as "L1" | "L2" | "L3" | "L4" | "L5",
          phone: worker.phone,
          email: worker.email,
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }
    
    setIsImporting(false);
    setIsImportDialogOpen(false);
    setImportFile(null);
    setImportPreview([]);
    refetchWorkers();
    
    if (failCount === 0) {
      toast.success(`成功导入${successCount}名工人`);
    } else {
      toast.warning(`导入完成: 成功${successCount}名, 失败${failCount}名`);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              工人管理
            </h1>
            <p className="text-muted-foreground mt-1">生产工人信息管理、效率统计与绩效分析</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => { refetchWorkers(); toast.success("数据已刷新"); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />添加工人</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加新工人</DialogTitle>
                  <DialogDescription>填写工人基本信息</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>姓名 *</Label>
                      <Input 
                        placeholder="输入姓名" 
                        value={newWorker.name}
                        onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>部门</Label>
                      <Select value={newWorker.department} onValueChange={(v) => setNewWorker({ ...newWorker, department: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="生产部">生产部</SelectItem>
                          <SelectItem value="质检部">质检部</SelectItem>
                          <SelectItem value="装配部">装配部</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>职位</Label>
                      <Input 
                        placeholder="输入职位" 
                        value={newWorker.position}
                        onChange={(e) => setNewWorker({ ...newWorker, position: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>技能等级</Label>
                      <Select value={newWorker.skillLevel} onValueChange={(v) => setNewWorker({ ...newWorker, skillLevel: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L1">L1 实习级</SelectItem>
                          <SelectItem value="L2">L2 初级</SelectItem>
                          <SelectItem value="L3">L3 中级</SelectItem>
                          <SelectItem value="L4">L4 高级</SelectItem>
                          <SelectItem value="L5">L5 专家级</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>电话</Label>
                      <Input 
                        placeholder="输入电话" 
                        value={newWorker.phone}
                        onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>邮箱</Label>
                      <Input 
                        type="email"
                        placeholder="输入邮箱" 
                        value={newWorker.email}
                        onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
                  <Button onClick={handleAddWorker} disabled={createWorkerMutation.isPending}>
                    {createWorkerMutation.isPending ? "添加中..." : "添加"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* 批量导入对话框 */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Upload className="w-4 h-4 mr-2" />批量导入</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    批量导入工人
                  </DialogTitle>
                  <DialogDescription>上传CSV文件批量添加工人信息</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* 下载模板 */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">下载导入模板</p>
                      <p className="text-sm text-muted-foreground">请按模板格式填写工人信息</p>
                    </div>
                    <Button variant="outline" onClick={() => handleDownloadTemplate()}>
                      <Download className="w-4 h-4 mr-2" />下载模板
                    </Button>
                  </div>
                  
                  {/* 文件上传 */}
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="import-file"
                    />
                    <label htmlFor="import-file" className="cursor-pointer">
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {importFile ? importFile.name : "点击或拖拽CSV文件到此处"}
                      </p>
                    </label>
                  </div>
                  
                  {/* 错误提示 */}
                  {importErrors.length > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm font-medium text-destructive mb-2">数据校验错误:</p>
                      <ul className="text-sm text-destructive space-y-1">
                        {importErrors.map((err, i) => <li key={i}>• {err}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {/* 预览表格 */}
                  {importPreview.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-2 text-sm font-medium">
                        数据预览 ({importPreview.length}条)
                      </div>
                      <div className="max-h-48 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-3 py-2 text-left">姓名</th>
                              <th className="px-3 py-2 text-left">部门</th>
                              <th className="px-3 py-2 text-left">职位</th>
                              <th className="px-3 py-2 text-left">等级</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.map((row, i) => (
                              <tr key={i} className="border-t">
                                <td className="px-3 py-2">{row.name}</td>
                                <td className="px-3 py-2">{row.department}</td>
                                <td className="px-3 py-2">{row.position}</td>
                                <td className="px-3 py-2">{row.skillLevel}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsImportDialogOpen(false);
                    setImportFile(null);
                    setImportPreview([]);
                    setImportErrors([]);
                  }}>取消</Button>
                  <Button 
                    onClick={handleBatchImport} 
                    disabled={isImporting || importPreview.length === 0 || importErrors.length > 0}
                  >
                    {isImporting ? "导入中..." : `导入 ${importPreview.length} 条数据`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">总工人数</p><p className="text-2xl font-bold">{stats.totalWorkers}</p></div><Users className="w-8 h-8 text-blue-500/50" /></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">在职人数</p><p className="text-2xl font-bold text-green-500">{stats.activeWorkers}</p></div><User className="w-8 h-8 text-green-500/50" /></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">待处理预警</p><p className="text-2xl font-bold text-orange-500">{(alertsData as any)?.total || 0}</p></div><Bell className="w-8 h-8 text-orange-500/50" /></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">效率排名人数</p><p className="text-2xl font-bold text-purple-500">{rankingData?.length || 0}</p></div><Target className="w-8 h-8 text-purple-500/50" /></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">优秀工人</p><p className="text-2xl font-bold text-cyan-500">{efficiencyDistribution.excellent}</p></div><Star className="w-8 h-8 text-cyan-500/50" /></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">最佳员工</p><p className="text-2xl font-bold text-yellow-500 truncate">{stats.topPerformer}</p></div><Trophy className="w-8 h-8 text-yellow-500/50" /></div></CardContent></Card>
        </div>

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2"><Users className="w-4 h-4" />工人列表</TabsTrigger>
            <TabsTrigger value="efficiency" className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />效率分析</TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2"><Award className="w-4 h-4" />绩效排名</TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" />工时预警</TabsTrigger>
          </TabsList>

          {/* 工人列表Tab */}
          <TabsContent value="list" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索工人姓名..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="状态筛选" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="Active">在职</SelectItem>
                  <SelectItem value="OnLeave">休假</SelectItem>
                  <SelectItem value="Inactive">停用</SelectItem>
                </SelectContent>
              </Select>
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="技能等级" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部等级</SelectItem>
                  <SelectItem value="L1">L1 实习级</SelectItem>
                  <SelectItem value="L2">L2 初级</SelectItem>
                  <SelectItem value="L3">L3 中级</SelectItem>
                  <SelectItem value="L4">L4 高级</SelectItem>
                  <SelectItem value="L5">L5 专家级</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoadingWorkers ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">加载中...</span>
              </div>
            ) : workers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无工人数据</p>
                <p className="text-sm mt-2">点击"添加工人"按钮添加第一个工人</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map((worker) => (
                  <Card key={worker.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{worker.name}</CardTitle>
                            <CardDescription>ID: {worker.id}</CardDescription>
                          </div>
                        </div>
                        <Badge className={`${statusColors[worker.status] || 'bg-gray-500'} text-white`}>
                          {statusLabels[worker.status] || worker.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">部门/职位</span>
                          <span>{worker.department} · {worker.position}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">技能等级</span>
                          <Badge className={`${skillLevelColors[worker.skillLevel] || 'bg-gray-500'} text-white`}>
                            {worker.skillLevel} {skillLevelLabels[worker.skillLevel] || ''}
                          </Badge>
                        </div>
                        {worker.joinDate && (
                          <div className="pt-2 border-t text-xs text-muted-foreground">
                            入职日期: {worker.joinDate}
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => { setSelectedWorker(worker as Worker); setIsEditDialogOpen(true); }}
                          >
                            <Edit className="w-3 h-3 mr-1" />编辑
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteWorker(worker.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 效率分析Tab */}
          <TabsContent value="efficiency" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />效率分布</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span>优秀 (≥110%)</span></div>
                        <span className="font-medium">{efficiencyDistribution.excellent}人</span>
                      </div>
                      <Progress value={rankingData?.length ? (efficiencyDistribution.excellent / rankingData.length) * 100 : 0} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>良好 (100-109%)</span></div>
                        <span className="font-medium">{efficiencyDistribution.good}人</span>
                      </div>
                      <Progress value={rankingData?.length ? (efficiencyDistribution.good / rankingData.length) * 100 : 0} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500" /><span>一般 (90-99%)</span></div>
                        <span className="font-medium">{efficiencyDistribution.average}人</span>
                      </div>
                      <Progress value={rankingData?.length ? (efficiencyDistribution.average / rankingData.length) * 100 : 0} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span>待提升 (&lt;90%)</span></div>
                        <span className="font-medium">{efficiencyDistribution.needsImprovement}人</span>
                      </div>
                      <Progress value={rankingData?.length ? (efficiencyDistribution.needsImprovement / rankingData.length) * 100 : 0} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />工时统计</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">工人总数</p>
                          <p className="text-2xl font-bold">{stats.totalWorkers}</p>
                        </div>
                        <Users className="w-8 h-8 text-blue-500/50" />
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">在职工人</p>
                          <p className="text-2xl font-bold">{stats.activeWorkers}</p>
                        </div>
                        <User className="w-8 h-8 text-green-500/50" />
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">待处理预警</p>
                          <p className="text-2xl font-bold">{(alertsData as any)?.total || 0}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-orange-500/50" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 绩效排名Tab */}
          <TabsContent value="ranking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5" />综合绩效排行榜</CardTitle>
                <CardDescription>基于效率、任务完成数、质量通过率综合评定（本周数据）</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRanking ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !rankingData || rankingData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无排名数据</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rankingData.map((worker, index) => (
                      <div 
                        key={worker.workerId} 
                        className={`flex items-center gap-4 p-4 rounded-lg ${
                          index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 
                          index === 1 ? 'bg-gray-400/10 border border-gray-400/30' : 
                          index === 2 ? 'bg-orange-600/10 border border-orange-600/30' : 
                          'bg-muted/50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                          index === 0 ? 'bg-yellow-500 text-yellow-950' : 
                          index === 1 ? 'bg-gray-400 text-gray-950' : 
                          index === 2 ? 'bg-orange-600 text-orange-950' : 
                          'bg-muted-foreground/20 text-muted-foreground'
                        }`}>
                          {worker.rank || index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-lg">{worker.workerName || `工人${worker.workerId}`}</span>
                            {index < 3 && (
                              <Badge variant="secondary" className="text-xs">
                                {index === 0 ? '🥇 冠军' : index === 1 ? '🥈 亚军' : '🥉 季军'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="w-4 h-4" />完成任务: {worker.totalTasks || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4" />质量率: {Number(worker.avgQualityPassRate || 0).toFixed(1)}%
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />返工: {worker.totalReworkCount || 0}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Zap className={`w-5 h-5 ${Number(worker.avgEfficiency) >= 100 ? 'text-green-500' : 'text-orange-500'}`} />
                            <span className={`text-2xl font-bold ${Number(worker.avgEfficiency) >= 100 ? 'text-green-500' : 'text-orange-500'}`}>
                              {Number(worker.avgEfficiency || 0).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">综合效率</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 工时预警Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" />工时预警记录</CardTitle>
                <CardDescription>工时超预估预警，需要及时处理</CardDescription>
              </CardHeader>
              <CardContent>
                {!alertsData || (alertsData as any)?.alerts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                    <p>暂无待处理预警</p>
                    <p className="text-sm mt-2">所有工时预警已处理完毕</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(alertsData as any)?.alerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`flex items-center gap-4 p-4 rounded-lg border ${
                          alert.alertLevel === 'Critical' ? 'border-red-500/50 bg-red-500/10' :
                          alert.alertLevel === 'Warning' ? 'border-yellow-500/50 bg-yellow-500/10' :
                          'border-blue-500/50 bg-blue-500/10'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          alert.alertLevel === 'Critical' ? 'bg-red-500' :
                          alert.alertLevel === 'Warning' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}>
                          <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alert.workerName || `工人${alert.workerId}`}</span>
                            <Badge variant={alert.alertLevel === 'Critical' ? 'destructive' : 'secondary'}>
                              {alert.alertLevel}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            预估: {alert.estimatedHours}h / 实际: {alert.actualHours}h / 超出: {Number(alert.overrunPercent || 0).toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            预警时间: {alert.alertTime ? new Date(alert.alertTime).toLocaleString() : '-'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id, 'acknowledge')}
                          >
                            确认
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id, 'resolve')}
                          >
                            解决
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id, 'ignore')}
                          >
                            忽略
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 编辑工人对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑工人信息</DialogTitle>
              <DialogDescription>修改工人基本信息</DialogDescription>
            </DialogHeader>
            {selectedWorker && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>姓名</Label>
                    <Input 
                      value={selectedWorker.name}
                      onChange={(e) => setSelectedWorker({ ...selectedWorker, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>部门</Label>
                    <Select 
                      value={selectedWorker.department} 
                      onValueChange={(v) => setSelectedWorker({ ...selectedWorker, department: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="生产部">生产部</SelectItem>
                        <SelectItem value="质检部">质检部</SelectItem>
                        <SelectItem value="装配部">装配部</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>职位</Label>
                    <Input 
                      value={selectedWorker.position}
                      onChange={(e) => setSelectedWorker({ ...selectedWorker, position: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>技能等级</Label>
                    <Select 
                      value={selectedWorker.skillLevel} 
                      onValueChange={(v) => setSelectedWorker({ ...selectedWorker, skillLevel: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L1">L1 实习级</SelectItem>
                        <SelectItem value="L2">L2 初级</SelectItem>
                        <SelectItem value="L3">L3 中级</SelectItem>
                        <SelectItem value="L4">L4 高级</SelectItem>
                        <SelectItem value="L5">L5 专家级</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select 
                    value={selectedWorker.status} 
                    onValueChange={(v) => setSelectedWorker({ ...selectedWorker, status: v as Worker['status'] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">在职</SelectItem>
                      <SelectItem value="OnLeave">休假</SelectItem>
                      <SelectItem value="Inactive">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>取消</Button>
              <Button onClick={handleUpdateWorker} disabled={updateWorkerMutation.isPending}>
                {updateWorkerMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FeatureGuide 
          title="工人管理功能说明" 
          features={[
            "工人信息管理：查看和管理所有生产工人的基本信息，支持添加、编辑、删除",
            "效率分析：统计工人效率分布和工时数据，实时监控生产效率",
            "绩效排名：基于效率、任务完成数、质量通过率综合排名",
            "工时预警：自动检测工时超预估情况，支持确认、解决、忽略操作",
            "技能等级：L1-L5五级技能等级分类管理"
          ]} 
        />
      </div>
    </Layout>
  );
}
