import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { 
  ClipboardCheck, Plus, Edit, Trash2, Copy, 
  CheckCircle2, XCircle, AlertTriangle, Settings2,
  Droplets, Gauge, Timer, Shield, Wrench, Zap,
  FileCheck, BarChart3, Target, Factory
} from "lucide-react";
import { toast } from "sonner";

// 工业清洗设备专用检查类别
const CLEANING_EQUIPMENT_CATEGORIES = [
  { 
    value: "cleaning_performance", 
    label: "清洗性能", 
    icon: Droplets, 
    color: "text-blue-500",
    desc: "清洗效果、清洁度、残留物检测"
  },
  { 
    value: "mechanical_system", 
    label: "机械系统", 
    icon: Wrench, 
    color: "text-gray-500",
    desc: "传动系统、密封性、机械精度"
  },
  { 
    value: "electrical_control", 
    label: "电气控制", 
    icon: Zap, 
    color: "text-yellow-500",
    desc: "PLC程序、传感器、安全联锁"
  },
  { 
    value: "process_parameters", 
    label: "工艺参数", 
    icon: Gauge, 
    color: "text-green-500",
    desc: "温度、压力、流量、浓度"
  },
  { 
    value: "cycle_time", 
    label: "节拍效率", 
    icon: Timer, 
    color: "text-purple-500",
    desc: "生产节拍、上下料时间、等待时间"
  },
  { 
    value: "safety_compliance", 
    label: "安全合规", 
    icon: Shield, 
    color: "text-red-500",
    desc: "CE认证、安全防护、环保要求"
  },
  { 
    value: "documentation", 
    label: "文档资料", 
    icon: FileCheck, 
    color: "text-indigo-500",
    desc: "操作手册、维护指南、培训记录"
  },
];

// Gate阶段定义
const GATE_STAGES = [
  { value: "M7", label: "M7 - 预验收FAT", desc: "Factory Acceptance Test，厂内预验收" },
  { value: "M8", label: "M8 - 终验收SAT", desc: "Site Acceptance Test，现场终验收" },
  { value: "M9", label: "M9 - 质保期", desc: "质保期内服务与问题跟踪" },
];

// 预置的工业清洗设备检查项模板
const CLEANING_CHECKLIST_TEMPLATES = {
  M7: [
    // 清洗性能
    { category: "cleaning_performance", item: "清洗效果目视检查", weight: 10, required: true, criteria: "工件表面无可见油污、碎屑、水渍" },
    { category: "cleaning_performance", item: "清洁度测试（重量法）", weight: 15, required: true, criteria: "残留物重量≤客户规定标准" },
    { category: "cleaning_performance", item: "清洁度测试（颗粒计数）", weight: 15, required: true, criteria: "颗粒数量和尺寸符合ISO 16232标准" },
    { category: "cleaning_performance", item: "干燥效果检查", weight: 8, required: true, criteria: "工件表面完全干燥，无水渍残留" },
    { category: "cleaning_performance", item: "防锈处理验证", weight: 5, required: false, criteria: "防锈液均匀覆盖，48小时盐雾测试通过" },
    
    // 机械系统
    { category: "mechanical_system", item: "传送带/链条运行", weight: 8, required: true, criteria: "运行平稳，无异响，张紧度合适" },
    { category: "mechanical_system", item: "喷淋系统检查", weight: 10, required: true, criteria: "喷嘴无堵塞，覆盖均匀，压力稳定" },
    { category: "mechanical_system", item: "泵组运行状态", weight: 8, required: true, criteria: "流量、压力达标，无泄漏" },
    { category: "mechanical_system", item: "密封性检查", weight: 6, required: true, criteria: "各密封点无泄漏，门封完好" },
    { category: "mechanical_system", item: "过滤系统检查", weight: 5, required: true, criteria: "滤芯清洁，压差正常" },
    
    // 电气控制
    { category: "electrical_control", item: "PLC程序功能测试", weight: 10, required: true, criteria: "所有程序功能正常，逻辑正确" },
    { category: "electrical_control", item: "HMI界面操作", weight: 5, required: true, criteria: "界面显示正常，操作响应及时" },
    { category: "electrical_control", item: "传感器校准", weight: 8, required: true, criteria: "温度、压力、液位传感器精度达标" },
    { category: "electrical_control", item: "安全联锁测试", weight: 10, required: true, criteria: "急停、门锁、液位保护等联锁功能正常" },
    { category: "electrical_control", item: "报警系统测试", weight: 5, required: true, criteria: "各类报警触发和显示正常" },
    
    // 工艺参数
    { category: "process_parameters", item: "清洗液温度控制", weight: 8, required: true, criteria: "温度控制精度±2°C" },
    { category: "process_parameters", item: "清洗液浓度检测", weight: 8, required: true, criteria: "浓度在规定范围内，自动补液功能正常" },
    { category: "process_parameters", item: "喷淋压力检测", weight: 6, required: true, criteria: "压力稳定，波动≤5%" },
    { category: "process_parameters", item: "干燥温度/风速", weight: 5, required: true, criteria: "干燥参数符合工艺要求" },
    
    // 节拍效率
    { category: "cycle_time", item: "单件节拍测试", weight: 10, required: true, criteria: "实际节拍≤设计节拍" },
    { category: "cycle_time", item: "上下料时间", weight: 5, required: true, criteria: "上下料时间符合设计要求" },
    { category: "cycle_time", item: "连续运行测试", weight: 8, required: true, criteria: "连续运行4小时无故障" },
    
    // 安全合规
    { category: "safety_compliance", item: "CE标识检查", weight: 5, required: true, criteria: "CE标识完整，文档齐全" },
    { category: "safety_compliance", item: "防护装置检查", weight: 8, required: true, criteria: "安全防护罩、光栅等完好有效" },
    { category: "safety_compliance", item: "接地检测", weight: 5, required: true, criteria: "接地电阻≤4Ω" },
    { category: "safety_compliance", item: "噪音检测", weight: 3, required: false, criteria: "噪音≤85dB" },
    
    // 文档资料
    { category: "documentation", item: "操作手册", weight: 5, required: true, criteria: "中英文操作手册完整" },
    { category: "documentation", item: "维护保养指南", weight: 5, required: true, criteria: "维护周期、备件清单完整" },
    { category: "documentation", item: "电气原理图", weight: 5, required: true, criteria: "图纸与实际一致" },
    { category: "documentation", item: "PLC程序备份", weight: 5, required: true, criteria: "程序已备份并交付" },
  ],
  M8: [
    // M8在M7基础上增加现场特定检查项
    { category: "cleaning_performance", item: "实际工件清洗测试", weight: 15, required: true, criteria: "使用客户实际工件测试，清洁度达标" },
    { category: "cleaning_performance", item: "批量清洗一致性", weight: 10, required: true, criteria: "连续清洗10件，清洁度一致" },
    
    { category: "mechanical_system", item: "现场安装检查", weight: 8, required: true, criteria: "设备水平、固定牢固" },
    { category: "mechanical_system", item: "管路连接检查", weight: 8, required: true, criteria: "进出水、排水、气路连接正确无泄漏" },
    
    { category: "electrical_control", item: "现场电源适配", weight: 8, required: true, criteria: "电压、频率、接地符合要求" },
    { category: "electrical_control", item: "与客户系统对接", weight: 10, required: true, criteria: "MES/SCADA通讯正常" },
    
    { category: "process_parameters", item: "客户工艺参数验证", weight: 10, required: true, criteria: "按客户工艺参数运行，效果达标" },
    
    { category: "cycle_time", item: "产线节拍匹配", weight: 12, required: true, criteria: "与产线节拍匹配，无瓶颈" },
    { category: "cycle_time", item: "8小时连续运行", weight: 10, required: true, criteria: "连续运行8小时无故障" },
    
    { category: "safety_compliance", item: "现场安全培训", weight: 8, required: true, criteria: "操作人员培训完成并签字确认" },
    { category: "safety_compliance", item: "环保排放检测", weight: 5, required: true, criteria: "废水、废气排放符合当地标准" },
    
    { category: "documentation", item: "验收报告签署", weight: 10, required: true, criteria: "双方签署验收报告" },
    { category: "documentation", item: "培训记录", weight: 5, required: true, criteria: "培训记录完整，学员签字" },
  ],
  M9: [
    // M9质保期检查项
    { category: "cleaning_performance", item: "定期清洁度抽检", weight: 15, required: true, criteria: "每月抽检，清洁度持续达标" },
    { category: "cleaning_performance", item: "清洗液更换记录", weight: 5, required: true, criteria: "按周期更换，记录完整" },
    
    { category: "mechanical_system", item: "易损件更换", weight: 10, required: true, criteria: "按周期更换密封件、滤芯等" },
    { category: "mechanical_system", item: "润滑保养", weight: 8, required: true, criteria: "按周期润滑，记录完整" },
    
    { category: "electrical_control", item: "传感器校准", weight: 8, required: true, criteria: "每季度校准一次" },
    { category: "electrical_control", item: "PLC程序备份", weight: 5, required: true, criteria: "每次修改后备份" },
    
    { category: "process_parameters", item: "工艺参数监控", weight: 10, required: true, criteria: "参数在控制范围内" },
    
    { category: "cycle_time", item: "OEE监控", weight: 10, required: true, criteria: "设备综合效率≥85%" },
    { category: "cycle_time", item: "故障停机记录", weight: 8, required: true, criteria: "故障记录完整，MTBF达标" },
    
    { category: "safety_compliance", item: "安全检查", weight: 8, required: true, criteria: "每月安全检查，问题及时整改" },
    
    { category: "documentation", item: "维护记录", weight: 8, required: true, criteria: "维护记录完整可追溯" },
    { category: "documentation", item: "问题处理记录", weight: 5, required: true, criteria: "问题处理及时，记录完整" },
  ],
};

export default function GateChecklistSettings() {
  const { t } = useLanguage();
  const [selectedGate, setSelectedGate] = useState<string>("M7");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("checklist");

  // 表单状态
  const [formData, setFormData] = useState({
    gateStage: "M7",
    category: "cleaning_performance",
    item: "",
    criteria: "",
    weight: 5,
    required: true,
    sortOrder: 0,
    isActive: true,
  });

  // 获取检查项列表
  const { data: checklistItems, isLoading, refetch } = (trpc.m7m9.gateCheck as any).getChecklistItems.useQuery(
    { gateStage: selectedGate },
    { enabled: !!selectedGate }
  );

  // 创建检查项
  const createMutation = (trpc.m7m9.gateCheck as any).createChecklistItem.useMutation({
    onSuccess: () => {
      toast.success("检查项创建成功");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 更新检查项
  const updateMutation = (trpc.m7m9.gateCheck as any).updateChecklistItem.useMutation({
    onSuccess: () => {
      toast.success("检查项更新成功");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 删除检查项
  const deleteMutation = (trpc.m7m9.gateCheck as any).deleteChecklistItem.useMutation({
    onSuccess: () => {
      toast.success("检查项删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 批量导入模板
  const importTemplateMutation = (trpc.m7m9.gateCheck as any).importTemplate.useMutation({
    onSuccess: (result) => {
      toast.success(`成功导入 ${result.imported} 个检查项`);
      refetch();
    },
    onError: (error) => {
      toast.error(`导入失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      gateStage: selectedGate,
      category: "cleaning_performance",
      item: "",
      criteria: "",
      weight: 5,
      required: true,
      sortOrder: 0,
      isActive: true,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      gateStage: formData.gateStage,
      category: formData.category,
      item: formData.item,
      criteria: formData.criteria,
      weight: formData.weight,
      required: formData.required,
      sortOrder: formData.sortOrder,
      isActive: formData.isActive,
    });
  };

  const handleUpdate = () => {
    if (!selectedItem) return;
    updateMutation.mutate({
      id: selectedItem.id,
      category: formData.category,
      item: formData.item,
      criteria: formData.criteria,
      weight: formData.weight,
      required: formData.required,
      sortOrder: formData.sortOrder,
      isActive: formData.isActive,
    });
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      gateStage: item.gateStage,
      category: item.category,
      item: item.item,
      criteria: item.criteria || "",
      weight: item.weight,
      required: item.required === 1,
      sortOrder: item.sortOrder || 0,
      isActive: item.isActive === 1,
    });
    setIsEditDialogOpen(true);
  };

  const handleImportTemplate = () => {
    const template = CLEANING_CHECKLIST_TEMPLATES[selectedGate as keyof typeof CLEANING_CHECKLIST_TEMPLATES];
    if (!template) {
      toast.error("未找到该阶段的模板");
      return;
    }
    
    if (confirm(`确定要导入 ${selectedGate} 阶段的 ${template.length} 个检查项模板吗？\n注意：这将添加新的检查项，不会覆盖现有项。`)) {
      importTemplateMutation.mutate({
        gateStage: selectedGate,
        items: template,
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CLEANING_EQUIPMENT_CATEGORIES.find(c => c.value === category);
    if (!cat) return null;
    const Icon = cat.icon;
    return <Icon className={`w-4 h-4 ${cat.color}`} />;
  };

  const getCategoryLabel = (category: string) => {
    return CLEANING_EQUIPMENT_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  // 按类别分组检查项
  const groupedItems = checklistItems?.reduce((acc: any, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {}) || {};

  // 计算统计信息
  const totalWeight = checklistItems?.reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || 0;
  const requiredCount = checklistItems?.filter((item: any) => item.required === 1).length || 0;
  const totalCount = checklistItems?.length || 0;

  // Tier1客户权重预设（更严格的清洁度和安全要求）
  const TIER1_WEIGHT_PRESETS = {
    cleaning_performance: { multiplier: 1.5, minWeight: 12 },
    safety_compliance: { multiplier: 1.3, minWeight: 10 },
    documentation: { multiplier: 1.2, minWeight: 8 },
    process_parameters: { multiplier: 1.2, minWeight: 8 },
    mechanical_system: { multiplier: 1.0, minWeight: 6 },
    electrical_control: { multiplier: 1.0, minWeight: 6 },
    cycle_time: { multiplier: 1.0, minWeight: 5 },
  };

  // 应用Tier1权重预设
  const applyTier1Weights = () => {
    if (!checklistItems || checklistItems.length === 0) {
      toast.error("暂无检查项可调整");
      return;
    }
    
    if (!confirm("Tier1客户权重预设将提高清洗性能和安全合规类检查项的权重。\n确定要应用吗？")) {
      return;
    }

    let updatedCount = 0;
    checklistItems.forEach((item: any) => {
      const preset = TIER1_WEIGHT_PRESETS[item.category as keyof typeof TIER1_WEIGHT_PRESETS];
      if (preset) {
        const newWeight = Math.max(
          Math.round(item.weight * preset.multiplier),
          preset.minWeight
        );
        if (newWeight !== item.weight) {
          updateMutation.mutate({
            id: item.id,
            category: item.category,
            item: item.item,
            criteria: item.criteria,
            weight: Math.min(newWeight, 20), // 最大权重20
            required: item.required === 1,
            sortOrder: item.sortOrder || 0,
            isActive: item.isActive === 1,
          });
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      toast.success(`已调整 ${updatedCount} 个检查项的权重`);
    } else {
      toast.info("所有检查项权重已是Tier1标准");
    }
  };

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={ClipboardCheck}
          title="Gate检查清单配置"
          description="配置M7-M9各阶段的检查项，支持工业清洗设备行业专用检查标准"
          actions={
            <>
              <Button variant="outline" onClick={applyTier1Weights} disabled={updateMutation.isPending}>
                <Target className="w-4 h-4 mr-2" />
                Tier1权重预设
              </Button>
              <Button variant="outline" onClick={handleImportTemplate} disabled={importTemplateMutation.isPending}>
                <Copy className="w-4 h-4 mr-2" />
                导入行业模板
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    新增检查项
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>新增检查项</DialogTitle>
                    <DialogDescription>
                      为 {GATE_STAGES.find(g => g.value === selectedGate)?.label} 添加检查项
                    </DialogDescription>
                  </DialogHeader>
                  <ChecklistItemForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleCreate}
                    isLoading={createMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </>
          }
        />

        {/* 工业清洗设备行业提示 */}
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Factory className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium">零部件工业清洗设备专用检查清单</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  已预置清洗性能、机械系统、电气控制、工艺参数、节拍效率、安全合规、文档资料等7大类检查项，
                  符合ISO 16232清洁度标准和CE认证要求
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gate阶段选择 */}
        <Tabs value={selectedGate} onValueChange={setSelectedGate}>
          <TabsList className="grid w-full grid-cols-3">
            {GATE_STAGES.map((gate) => (
              <TabsTrigger key={gate.value} value={gate.value} className="gap-2">
                <Target className="w-4 h-4" />
                {gate.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {GATE_STAGES.map((gate) => (
            <TabsContent key={gate.value} value={gate.value} className="space-y-4">
              {/* 统计卡片 */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{totalCount}</p>
                        <p className="text-sm text-muted-foreground">检查项总数</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold">{requiredCount}</p>
                        <p className="text-sm text-muted-foreground">必检项</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{totalWeight}</p>
                        <p className="text-sm text-muted-foreground">权重总分</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{Object.keys(groupedItems).length}</p>
                        <p className="text-sm text-muted-foreground">检查类别</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 检查项列表 */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : totalCount > 0 ? (
                <Accordion type="multiple" defaultValue={Object.keys(groupedItems)} className="space-y-2">
                  {CLEANING_EQUIPMENT_CATEGORIES.map((category) => {
                    const items = groupedItems[category.value] || [];
                    if (items.length === 0) return null;
                    
                    const categoryWeight = items.reduce((sum: number, item: any) => sum + (item.weight || 0), 0);
                    const categoryRequired = items.filter((item: any) => item.required === 1).length;
                    
                    return (
                      <AccordionItem key={category.value} value={category.value} className="border rounded-lg">
                        <AccordionTrigger className="px-4 hover:no-underline">
                          <div className="flex items-center gap-3 w-full">
                            <div className={`p-2 rounded-lg bg-muted`}>
                              <category.icon className={`w-5 h-5 ${category.color}`} />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium">{category.label}</p>
                              <p className="text-sm text-muted-foreground">{category.desc}</p>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <Badge variant="outline">{items.length} 项</Badge>
                              <Badge variant="secondary">权重 {categoryWeight}</Badge>
                              {categoryRequired > 0 && (
                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                                  {categoryRequired} 必检
                                </Badge>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[40%]">检查项</TableHead>
                                <TableHead className="w-[30%]">判定标准</TableHead>
                                <TableHead className="w-[10%]">权重</TableHead>
                                <TableHead className="w-[10%]">必检</TableHead>
                                <TableHead className="w-[10%]">操作</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.item}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{item.criteria}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{item.weight}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {item.required === 1 ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-muted-foreground" />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-red-500"
                                        onClick={() => {
                                          if (confirm("确定要删除此检查项吗？")) {
                                            deleteMutation.mutate({ id: item.id });
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ClipboardCheck className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">暂无检查项</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      点击"导入行业模板"快速添加工业清洗设备专用检查项
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleImportTemplate}>
                        <Copy className="w-4 h-4 mr-2" />
                        导入行业模板
                      </Button>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        手动添加
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* 编辑对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑检查项</DialogTitle>
              <DialogDescription>
                修改检查项配置
              </DialogDescription>
            </DialogHeader>
            <ChecklistItemForm 
              formData={formData} 
              setFormData={setFormData}
              onSubmit={handleUpdate}
              isLoading={updateMutation.isPending}
              isEdit
            />
          </DialogContent>
        </Dialog>
      </div>
  );
}

// 检查项表单组件
function ChecklistItemForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  isLoading,
  isEdit = false
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isEdit?: boolean;
}) {
  return (
    <div className="space-y-4">
      {!isEdit && (
        <div className="space-y-2">
          <Label>Gate阶段</Label>
          <Select
            value={formData.gateStage}
            onValueChange={(value) => setFormData({ ...formData, gateStage: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GATE_STAGES.map((gate) => (
                <SelectItem key={gate.value} value={gate.value}>
                  {gate.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>检查类别</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLEANING_EQUIPMENT_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <span className="flex items-center gap-2">
                  <cat.icon className={`w-4 h-4 ${cat.color}`} />
                  {cat.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>检查项名称 *</Label>
        <Input
          value={formData.item}
          onChange={(e) => setFormData({ ...formData, item: e.target.value })}
          placeholder="例如：清洗效果目视检查"
        />
      </div>

      <div className="space-y-2">
        <Label>判定标准</Label>
        <Textarea
          value={formData.criteria}
          onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
          placeholder="例如：工件表面无可见油污、碎屑、水渍"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>权重（1-20）</Label>
          <Input
            type="number"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
            min={1}
            max={20}
          />
        </div>
        <div className="space-y-2">
          <Label>排序</Label>
          <Input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
            min={0}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.required}
            onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
          />
          <Label>必检项（不通过则Gate不能通过）</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
          <Label>启用此检查项</Label>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onSubmit} disabled={isLoading || !formData.item}>
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </div>
  );
}
