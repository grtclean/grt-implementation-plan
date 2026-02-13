/**
 * M8 FAT (Factory Acceptance Test) 协调工作台
 * 功能：测试计划管理、实时测试结果、检查项完成度、客户签署流程
 */

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  AlertCircle,
  FileCheck,
  UserCheck,
  Pen,
  ShieldCheck,
  ListChecks,
  FlaskConical,
  BarChart3,
  Wrench,
  Zap,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// ============================================
// 类型定义
// ============================================

type TestStatus = "pending" | "in-progress" | "passed" | "failed";

interface TestItem {
  id: string;
  name: string;
  description: string;
  criteria: string;
  status: TestStatus;
}

interface TestResult {
  id: string;
  testItemId: string;
  testItemName: string;
  resultValue: string;
  passed: boolean;
  testedBy: string;
  testedAt: string;
}

interface ChecklistItem {
  id: string;
  category: "mechanical" | "electrical" | "safety" | "documentation";
  description: string;
  checked: boolean;
  responsiblePerson: string;
  notes: string;
}

type SignoffStep = "internal_qa" | "engineering" | "customer_rep" | "final";
type SignoffStatus = "pending" | "approved" | "rejected";

interface SignoffRecord {
  step: SignoffStep;
  label: string;
  status: SignoffStatus;
  person: string;
  date: string;
  comments: string;
}

// ============================================
// 模拟数据
// ============================================

const initialTestItems: TestItem[] = [
  {
    id: "T001",
    name: "清洗节拍测试",
    description: "验证设备达到合同要求的生产节拍",
    criteria: "节拍 <= 60s/件，连续运行50件无异常",
    status: "passed",
  },
  {
    id: "T002",
    name: "清洁度检测",
    description: "使用颗粒度分析仪检测清洗后工件表面清洁度",
    criteria: "NVH残留物 <= 0.5mg/件，颗粒 >= 200μm 为 0",
    status: "in-progress",
  },
  {
    id: "T003",
    name: "干燥效果验证",
    description: "检测清洗后工件表面水渍残留情况",
    criteria: "目视无水渍，红外热像显示温差 < 2°C",
    status: "pending",
  },
  {
    id: "T004",
    name: "安全联锁测试",
    description: "测试所有安全门、急停按钮、光栅等安全装置",
    criteria: "所有安全装置触发后设备在0.5s内停止运行",
    status: "passed",
  },
  {
    id: "T005",
    name: "PLC程序功能测试",
    description: "验证所有PLC自动程序、手动模式、报警逻辑",
    criteria: "所有功能点测试通过，报警信息准确",
    status: "failed",
  },
  {
    id: "T006",
    name: "噪音测试",
    description: "测量设备运行时噪音水平",
    criteria: "距设备1米处噪音 <= 75dB(A)",
    status: "pending",
  },
];

const initialTestResults: TestResult[] = [
  {
    id: "R001",
    testItemId: "T001",
    testItemName: "清洗节拍测试",
    resultValue: "55s/件 (50件平均)",
    passed: true,
    testedBy: "张工",
    testedAt: "2024-03-15 09:30",
  },
  {
    id: "R002",
    testItemId: "T002",
    testItemName: "清洁度检测",
    resultValue: "0.42mg/件 (样本批次1)",
    passed: true,
    testedBy: "王工",
    testedAt: "2024-03-15 11:00",
  },
  {
    id: "R003",
    testItemId: "T004",
    testItemName: "安全联锁测试",
    resultValue: "所有安全装置响应时间 < 0.3s",
    passed: true,
    testedBy: "刘工",
    testedAt: "2024-03-15 14:00",
  },
  {
    id: "R004",
    testItemId: "T005",
    testItemName: "PLC程序功能测试",
    resultValue: "手动模式切换异常，报警ID-023未触发",
    passed: false,
    testedBy: "陈工",
    testedAt: "2024-03-15 16:00",
  },
];

const initialChecklist: ChecklistItem[] = [
  // 机械类
  { id: "C001", category: "mechanical", description: "传动链条张紧度检查", checked: true, responsiblePerson: "张工", notes: "张力合格" },
  { id: "C002", category: "mechanical", description: "密封圈完好性检查", checked: true, responsiblePerson: "张工", notes: "" },
  { id: "C003", category: "mechanical", description: "喷嘴安装角度确认", checked: false, responsiblePerson: "张工", notes: "待调整3号喷嘴" },
  { id: "C004", category: "mechanical", description: "过滤器安装确认", checked: true, responsiblePerson: "李工", notes: "" },
  { id: "C005", category: "mechanical", description: "水箱液位传感器校准", checked: false, responsiblePerson: "李工", notes: "" },
  // 电气类
  { id: "C006", category: "electrical", description: "接线端子紧固检查", checked: true, responsiblePerson: "刘工", notes: "" },
  { id: "C007", category: "electrical", description: "变频器参数设置确认", checked: true, responsiblePerson: "刘工", notes: "已按工艺要求设置" },
  { id: "C008", category: "electrical", description: "传感器标定", checked: false, responsiblePerson: "刘工", notes: "温度传感器待标定" },
  { id: "C009", category: "electrical", description: "HMI画面功能测试", checked: true, responsiblePerson: "陈工", notes: "" },
  // 安全类
  { id: "C010", category: "safety", description: "安全门联锁功能确认", checked: true, responsiblePerson: "刘工", notes: "" },
  { id: "C011", category: "safety", description: "急停按钮功能测试", checked: true, responsiblePerson: "刘工", notes: "全部6个急停按钮测试通过" },
  { id: "C012", category: "safety", description: "接地电阻测量", checked: true, responsiblePerson: "刘工", notes: "< 4Ω" },
  { id: "C013", category: "safety", description: "CE安全标签张贴", checked: false, responsiblePerson: "张工", notes: "" },
  // 文档类
  { id: "C014", category: "documentation", description: "操作手册(中/英)", checked: true, responsiblePerson: "王工", notes: "V2.0已完成" },
  { id: "C015", category: "documentation", description: "电气图纸交付", checked: true, responsiblePerson: "刘工", notes: "" },
  { id: "C016", category: "documentation", description: "PLC程序备份", checked: false, responsiblePerson: "陈工", notes: "" },
  { id: "C017", category: "documentation", description: "维护保养手册", checked: false, responsiblePerson: "王工", notes: "编写中" },
  { id: "C018", category: "documentation", description: "零件清单及供应商信息", checked: true, responsiblePerson: "李工", notes: "" },
];

const initialSignoffs: SignoffRecord[] = [
  {
    step: "internal_qa",
    label: "内部QA审核",
    status: "approved",
    person: "赵质检",
    date: "2024-03-14",
    comments: "所有内部检查项通过，可进入客户验收阶段",
  },
  {
    step: "engineering",
    label: "工程团队确认",
    status: "approved",
    person: "王总工",
    date: "2024-03-15",
    comments: "PLC手动模式问题已记录，不影响FAT主体流程",
  },
  {
    step: "customer_rep",
    label: "客户代表签署",
    status: "pending",
    person: "客户方-李经理",
    date: "",
    comments: "",
  },
  {
    step: "final",
    label: "最终签署",
    status: "pending",
    person: "待定",
    date: "",
    comments: "",
  },
];

// ============================================
// 辅助函数
// ============================================

const categoryLabels: Record<string, string> = {
  mechanical: "机械系统",
  electrical: "电气控制",
  safety: "安全防护",
  documentation: "技术文档",
};

const categoryColors: Record<string, string> = {
  mechanical: "text-slate-500 dark:text-slate-400",
  electrical: "text-yellow-500 dark:text-yellow-400",
  safety: "text-red-500 dark:text-red-400",
  documentation: "text-blue-500 dark:text-blue-400",
};

const statusBadge = (status: TestStatus) => {
  switch (status) {
    case "passed":
      return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">通过</Badge>;
    case "failed":
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">失败</Badge>;
    case "in-progress":
      return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">测试中</Badge>;
    case "pending":
      return <Badge className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20">待测试</Badge>;
  }
};

const signoffStatusBadge = (status: SignoffStatus) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">已签署</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">驳回</Badge>;
    case "pending":
      return <Badge className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20">待签署</Badge>;
  }
};

// ============================================
// 主组件
// ============================================

// 骨架屏：统计卡片
function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6 text-center">
            <Skeleton className="h-8 w-8 mx-auto mb-2 rounded-full" />
            <Skeleton className="h-8 w-16 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// 骨架屏：表格行
function TableRowsSkeleton({ columns = 5, rows = 4 }: { columns?: number; rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40 mb-1" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* 表头骨架 */}
          <div className="flex gap-4 pb-2 border-b">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {/* 行骨架 */}
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex gap-4 py-2">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <Skeleton key={colIdx} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FATCoordination() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("test-plan");
  const [isLoading, setIsLoading] = useState(true);

  // 模拟数据加载（当接入真实API时替换为实际loading状态）
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Test Plan state
  const [testItems, setTestItems] = useState<TestItem[]>(initialTestItems);
  const [isAddTestDialogOpen, setIsAddTestDialogOpen] = useState(false);
  const [newTestItem, setNewTestItem] = useState({
    name: "",
    description: "",
    criteria: "",
  });

  // Test Results state
  const [testResults] = useState<TestResult[]>(initialTestResults);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist);

  // Signoff state
  const [signoffs, setSignoffs] = useState<SignoffRecord[]>(initialSignoffs);
  const [signoffComment, setSignoffComment] = useState("");

  // ---- Test Plan handlers ----

  const handleAddTestItem = () => {
    if (!newTestItem.name || !newTestItem.criteria) {
      toast.error("请填写测试名称和通过标准");
      return;
    }
    const newItem: TestItem = {
      id: `T${String(testItems.length + 1).padStart(3, "0")}`,
      name: newTestItem.name,
      description: newTestItem.description,
      criteria: newTestItem.criteria,
      status: "pending",
    };
    setTestItems([...testItems, newItem]);
    setNewTestItem({ name: "", description: "", criteria: "" });
    setIsAddTestDialogOpen(false);
    toast.success("测试项已添加");
  };

  const testPlanCompletion = () => {
    const completed = testItems.filter((t) => t.status === "passed" || t.status === "failed").length;
    return testItems.length > 0 ? Math.round((completed / testItems.length) * 100) : 0;
  };

  // ---- Checklist handlers ----

  const handleChecklistToggle = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const getCategoryItems = (category: string) =>
    checklist.filter((item) => item.category === category);

  const getCategoryProgress = (category: string) => {
    const items = getCategoryItems(category);
    if (items.length === 0) return 0;
    const checked = items.filter((item) => item.checked).length;
    return Math.round((checked / items.length) * 100);
  };

  // ---- Signoff handlers ----

  const handleSignoff = (step: SignoffStep) => {
    setSignoffs((prev) =>
      prev.map((s) =>
        s.step === step
          ? {
              ...s,
              status: "approved" as SignoffStatus,
              date: new Date().toISOString().split("T")[0],
              comments: signoffComment || s.comments,
            }
          : s
      )
    );
    setSignoffComment("");
    toast.success("签署成功");
  };

  const signoffProgress = () => {
    const approved = signoffs.filter((s) => s.status === "approved").length;
    return Math.round((approved / signoffs.length) * 100);
  };

  // ---- Statistics for test results ----

  const resultStats = {
    total: testItems.length,
    passed: testItems.filter((t) => t.status === "passed").length,
    failed: testItems.filter((t) => t.status === "failed").length,
    pending: testItems.filter((t) => t.status === "pending" || t.status === "in-progress").length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ClipboardCheck className="h-7 w-7 text-blue-500" />
              {language === "zh" ? "M8 FAT协调工作台" : "M8 FAT Coordination"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {language === "zh"
                ? "出厂验收测试 (Factory Acceptance Test) — 测试计划、实时结果、检查项完成度、客户签署"
                : "Factory Acceptance Test — Test Plan, Live Results, Checklist Completion, Customer Sign-off"}
            </p>
          </div>
        </div>

        {/* 加载骨架屏 */}
        {isLoading && (
          <div className="space-y-4">
            <StatsCardsSkeleton />
            <TableRowsSkeleton columns={5} rows={4} />
          </div>
        )}

        {/* 四个Tab页 */}
        {!isLoading && <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="test-plan" className="flex items-center gap-1.5">
              <ListChecks className="h-4 w-4" />
              <span className="hidden sm:inline">测试计划</span>
            </TabsTrigger>
            <TabsTrigger value="test-results" className="flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">实时测试结果</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-1.5">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">检查项完成度</span>
            </TabsTrigger>
            <TabsTrigger value="signoff" className="flex items-center gap-1.5">
              <Pen className="h-4 w-4" />
              <span className="hidden sm:inline">客户签署</span>
            </TabsTrigger>
          </TabsList>

          {/* ======== Tab 1: 测试计划 ======== */}
          <TabsContent value="test-plan" className="space-y-4">
            {/* 进度概览 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">测试计划总览</CardTitle>
                    <CardDescription>
                      共 {testItems.length} 项测试，已完成 {testItems.filter((t) => t.status === "passed" || t.status === "failed").length} 项
                    </CardDescription>
                  </div>
                  <Dialog open={isAddTestDialogOpen} onOpenChange={setIsAddTestDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        添加测试项
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>添加测试项目</DialogTitle>
                        <DialogDescription>
                          为FAT测试计划添加新的测试条目
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="test-name">测试名称 *</Label>
                          <Input
                            id="test-name"
                            placeholder="例如：清洗节拍测试"
                            value={newTestItem.name}
                            onChange={(e) =>
                              setNewTestItem({ ...newTestItem, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="test-desc">测试描述</Label>
                          <Textarea
                            id="test-desc"
                            placeholder="详细描述测试内容和方法"
                            value={newTestItem.description}
                            onChange={(e) =>
                              setNewTestItem({ ...newTestItem, description: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="test-criteria">通过标准 *</Label>
                          <Textarea
                            id="test-criteria"
                            placeholder="例如：节拍 <= 60s/件，连续运行50件无异常"
                            value={newTestItem.criteria}
                            onChange={(e) =>
                              setNewTestItem({ ...newTestItem, criteria: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddTestDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={handleAddTestItem}>确认添加</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">总体完成进度</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{testPlanCompletion()}%</span>
                  </div>
                  <Progress value={testPlanCompletion()} className="h-2" />
                  <div className="flex gap-4 pt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      通过: {resultStats.passed}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      失败: {resultStats.failed}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      测试中: {testItems.filter((t) => t.status === "in-progress").length}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      待测试: {testItems.filter((t) => t.status === "pending").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 测试项列表 */}
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">编号</TableHead>
                      <TableHead>测试名称</TableHead>
                      <TableHead className="hidden md:table-cell">描述</TableHead>
                      <TableHead>通过标准</TableHead>
                      <TableHead className="w-[100px] text-center">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm text-gray-500 dark:text-gray-400">
                          {item.id}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                          {item.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500 dark:text-gray-400">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                          {item.criteria}
                        </TableCell>
                        <TableCell className="text-center">{statusBadge(item.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======== Tab 2: 实时测试结果 ======== */}
          <TabsContent value="test-results" className="space-y-4">
            {/* 统计摘要 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{resultStats.total}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">总测试项</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{resultStats.passed}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">已通过</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{resultStats.failed}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">未通过</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{resultStats.pending}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">待完成</div>
                </CardContent>
              </Card>
            </div>

            {/* 测试结果表 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">测试结果记录</CardTitle>
                <CardDescription>所有FAT测试结果的详细记录</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>测试项目</TableHead>
                      <TableHead>测试结果</TableHead>
                      <TableHead className="w-[100px] text-center">通过/失败</TableHead>
                      <TableHead>测试人员</TableHead>
                      <TableHead>测试时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                          {result.testItemName}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                          {result.resultValue}
                        </TableCell>
                        <TableCell className="text-center">
                          {result.passed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                          {result.testedBy}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                          {result.testedAt}
                        </TableCell>
                      </TableRow>
                    ))}
                    {testResults.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                          暂无测试结果记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======== Tab 3: 检查项完成度 ======== */}
          <TabsContent value="checklist" className="space-y-4">
            {(["mechanical", "electrical", "safety", "documentation"] as const).map((category) => {
              const items = getCategoryItems(category);
              const progress = getCategoryProgress(category);

              return (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-lg flex items-center gap-2 ${categoryColors[category]}`}>
                        {category === "mechanical" && <Wrench className="h-5 w-5" />}
                        {category === "electrical" && <Zap className="h-5 w-5" />}
                        {category === "safety" && <ShieldCheck className="h-5 w-5" />}
                        {category === "documentation" && <FileText className="h-5 w-5" />}
                        {categoryLabels[category]}
                      </CardTitle>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {items.filter((i) => i.checked).length}/{items.length} 完成
                      </span>
                    </div>
                    <Progress value={progress} className="h-2 mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
                      >
                        <Checkbox
                          id={item.id}
                          checked={item.checked}
                          onCheckedChange={() => handleChecklistToggle(item.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={item.id}
                            className={`text-sm font-medium cursor-pointer ${
                              item.checked
                                ? "line-through text-gray-400 dark:text-gray-500"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            {item.description}
                          </label>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              {item.responsiblePerson}
                            </span>
                            {item.notes && (
                              <span className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.checked ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ======== Tab 4: 客户签署 ======== */}
          <TabsContent value="signoff" className="space-y-4">
            {/* 签署进度总览 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">签署进度</CardTitle>
                <CardDescription>FAT签署流程：内部QA → 工程确认 → 客户代表 → 最终签署</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">总体签署进度</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{signoffProgress()}%</span>
                  </div>
                  <Progress value={signoffProgress()} className="h-3" />
                </div>

                {/* 签署步骤可视化 */}
                <div className="flex items-center justify-between mt-6 px-2">
                  {signoffs.map((s, index) => (
                    <div key={s.step} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                            s.status === "approved"
                              ? "bg-green-500/10 border-green-500 text-green-500"
                              : s.status === "rejected"
                                ? "bg-red-500/10 border-red-500 text-red-500"
                                : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400"
                          }`}
                        >
                          {s.status === "approved" ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : s.status === "rejected" ? (
                            <XCircle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <span className="text-xs mt-1 text-center max-w-[80px] text-gray-600 dark:text-gray-300">
                          {s.label}
                        </span>
                      </div>
                      {index < signoffs.length - 1 && (
                        <div
                          className={`h-0.5 w-8 md:w-16 mx-1 ${
                            s.status === "approved"
                              ? "bg-green-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 各签署节点详情 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signoffs.map((s) => {
                const isNextStep =
                  s.status === "pending" &&
                  (signoffs.findIndex((item) => item.step === s.step) === 0 ||
                    signoffs[signoffs.findIndex((item) => item.step === s.step) - 1]?.status === "approved");

                return (
                  <Card
                    key={s.step}
                    className={
                      isNextStep
                        ? "border-blue-500/50 dark:border-blue-400/50"
                        : ""
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{s.label}</CardTitle>
                        {signoffStatusBadge(s.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">签署人:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">{s.person}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">日期:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">
                            {s.date || "—"}
                          </span>
                        </div>
                      </div>
                      {s.comments && (
                        <div className="text-sm bg-gray-50 dark:bg-gray-800 rounded-md p-2 text-gray-600 dark:text-gray-300">
                          {s.comments}
                        </div>
                      )}
                      {isNextStep && (
                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <Label htmlFor={`comment-${s.step}`} className="text-sm">
                            签署意见
                          </Label>
                          <Textarea
                            id={`comment-${s.step}`}
                            placeholder="输入签署意见..."
                            value={signoffComment}
                            onChange={(e) => setSignoffComment(e.target.value)}
                            rows={2}
                          />
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleSignoff(s.step)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            确认签署
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>}
      </div>
    </Layout>
  );
}
