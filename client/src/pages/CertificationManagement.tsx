import Layout from "@/components/Layout";
import { PageHeader, StatCard } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useState } from "react";
import { 
  Award, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  Globe,
  Target,
  TrendingUp,
  Users,
  Shield,
  Leaf,
  Factory,
  Bell,
  Download,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  BarChart3,
  FileSpreadsheet
} from "lucide-react";

// GRT现有资质数据
const grtCertifications = [
  { id: 1, name: "ISO 9001:2015", nameEn: "Quality Management System", status: "valid", expiry: "2026-08-15", type: "quality" },
  { id: 2, name: "ISO 14001:2015", nameEn: "Environmental Management System", status: "valid", expiry: "2026-08-15", type: "environment" },
  { id: 3, name: "CE认证", nameEn: "CE Marking", status: "valid", expiry: "2027-03-20", type: "safety" },
  { id: 4, name: "高新技术企业", nameEn: "High-Tech Enterprise", status: "valid", expiry: "2026-12-31", type: "other" },
];

// 计划中的资质（带里程碑）
const plannedCertifications = [
  { 
    id: 1, 
    name: "IATF 16949:2016", 
    nameEn: "Automotive QMS", 
    targetDate: "2026-06-30", 
    progress: 25, 
    priority: "high", 
    budget: 50,
    milestones: [
      { id: 1, name: "差距分析完成", date: "2026-02-15", status: "completed" },
      { id: 2, name: "文件体系建立", date: "2026-03-15", status: "in_progress" },
      { id: 3, name: "内部审核", date: "2026-04-30", status: "pending" },
      { id: 4, name: "管理评审", date: "2026-05-15", status: "pending" },
      { id: 5, name: "认证审核", date: "2026-06-15", status: "pending" },
    ],
    responsible: "质量部 - 张经理",
    notes: "核心门槛资质，需优先推进"
  },
  { 
    id: 2, 
    name: "ISO 45001:2018", 
    nameEn: "Occupational Health & Safety", 
    targetDate: "2026-06-30", 
    progress: 15, 
    priority: "high", 
    budget: 30,
    milestones: [
      { id: 1, name: "现状评估", date: "2026-02-28", status: "completed" },
      { id: 2, name: "风险识别", date: "2026-03-31", status: "in_progress" },
      { id: 3, name: "体系文件编制", date: "2026-04-30", status: "pending" },
      { id: 4, name: "认证审核", date: "2026-06-15", status: "pending" },
    ],
    responsible: "安全部 - 李主管",
    notes: "德系OEM必要要求"
  },
  { 
    id: 3, 
    name: "ISO 27001:2022", 
    nameEn: "Information Security", 
    targetDate: "2026-06-30", 
    progress: 10, 
    priority: "medium", 
    budget: 35,
    milestones: [
      { id: 1, name: "范围确定", date: "2026-03-15", status: "in_progress" },
      { id: 2, name: "风险评估", date: "2026-04-15", status: "pending" },
      { id: 3, name: "控制措施实施", date: "2026-05-15", status: "pending" },
      { id: 4, name: "认证审核", date: "2026-06-20", status: "pending" },
    ],
    responsible: "IT部 - 王工程师",
    notes: "博世等Tier1要求"
  },
  { 
    id: 4, 
    name: "VDA 6.3", 
    nameEn: "Process Audit", 
    targetDate: "2026-06-30", 
    progress: 5, 
    priority: "high", 
    budget: 20,
    milestones: [
      { id: 1, name: "审核员培训", date: "2026-03-01", status: "in_progress" },
      { id: 2, name: "过程审核准备", date: "2026-04-15", status: "pending" },
      { id: 3, name: "模拟审核", date: "2026-05-15", status: "pending" },
      { id: 4, name: "正式审核", date: "2026-06-10", status: "pending" },
    ],
    responsible: "质量部 - 张经理",
    notes: "德系OEM必要过程审核"
  },
  { 
    id: 5, 
    name: "ISO 50001:2018", 
    nameEn: "Energy Management", 
    targetDate: "2026-06-30", 
    progress: 0, 
    priority: "medium", 
    budget: 25,
    milestones: [
      { id: 1, name: "能源基线建立", date: "2026-03-31", status: "pending" },
      { id: 2, name: "能源目标设定", date: "2026-04-30", status: "pending" },
      { id: 3, name: "体系运行", date: "2026-05-31", status: "pending" },
      { id: 4, name: "认证审核", date: "2026-06-25", status: "pending" },
    ],
    responsible: "设备部 - 陈主管",
    notes: "宝马等OEM环保要求"
  },
];

// OEM客户要求数据
const oemRequirements = [
  {
    customer: "大众集团",
    customerEn: "Volkswagen Group",
    country: "德国",
    type: "OEM",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001", "VDA 6.3", "ISO 45001"],
    grtStatus: { met: 2, planned: 3, gap: 0 }
  },
  {
    customer: "宝马集团",
    customerEn: "BMW Group",
    country: "德国",
    type: "OEM",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001", "VDA 6.3", "ISO 45001", "ISO 50001"],
    grtStatus: { met: 2, planned: 4, gap: 0 }
  },
  {
    customer: "戴姆勒/奔驰",
    customerEn: "Mercedes-Benz",
    country: "德国",
    type: "OEM",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001", "VDA 6.3", "ISO 45001"],
    grtStatus: { met: 2, planned: 3, gap: 0 }
  },
  {
    customer: "通用汽车",
    customerEn: "General Motors",
    country: "美国",
    type: "OEM",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001", "CQI-9/11/12"],
    grtStatus: { met: 2, planned: 1, gap: 1 }
  },
  {
    customer: "福特汽车",
    customerEn: "Ford Motor",
    country: "美国",
    type: "OEM",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001", "Q1 Certification"],
    grtStatus: { met: 2, planned: 1, gap: 1 }
  },
  {
    customer: "丰田汽车",
    customerEn: "Toyota Motor",
    country: "日本",
    type: "OEM",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001", "ISO 45001"],
    grtStatus: { met: 2, planned: 2, gap: 0 }
  },
];

// Tier1供应商要求
const tier1Requirements = [
  {
    customer: "博世",
    customerEn: "Bosch",
    country: "德国",
    type: "Tier1",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001", "VDA 6.3", "ISO 27001"],
    grtStatus: { met: 2, planned: 3, gap: 0 }
  },
  {
    customer: "大陆集团",
    customerEn: "Continental",
    country: "德国",
    type: "Tier1",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001", "VDA 6.3"],
    grtStatus: { met: 2, planned: 2, gap: 0 }
  },
  {
    customer: "采埃孚",
    customerEn: "ZF Friedrichshafen",
    country: "德国",
    type: "Tier1",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001", "ISO 45001"],
    grtStatus: { met: 2, planned: 2, gap: 0 }
  },
  {
    customer: "麦格纳",
    customerEn: "Magna International",
    country: "加拿大",
    type: "Tier1",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001"],
    grtStatus: { met: 2, planned: 1, gap: 0 }
  },
  {
    customer: "电装",
    customerEn: "Denso",
    country: "日本",
    type: "Tier1",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001", "ISO 45001"],
    grtStatus: { met: 2, planned: 2, gap: 0 }
  },
];

// Tier2供应商要求
const tier2Requirements = [
  {
    customer: "舍弗勒",
    customerEn: "Schaeffler",
    country: "德国",
    type: "Tier2",
    requirements: ["ISO 9001", "IATF 16949", "ISO 14001"],
    grtStatus: { met: 2, planned: 1, gap: 0 }
  },
  {
    customer: "SKF",
    customerEn: "SKF Group",
    country: "瑞典",
    type: "Tier2",
    requirements: ["ISO 9001", "ISO 14001", "ISO 45001"],
    grtStatus: { met: 2, planned: 1, gap: 0 }
  },
  {
    customer: "蒂森克虏伯",
    customerEn: "ThyssenKrupp",
    country: "德国",
    type: "Tier2",
    requirements: ["ISO 9001", "ISO 14001", "VDA 6.3"],
    grtStatus: { met: 2, planned: 1, gap: 0 }
  },
];

// 提醒配置
const reminderConfig = [
  { id: 1, certId: 1, type: "expiry", daysBefore: 90, enabled: true, recipients: ["quality@grt.com"] },
  { id: 2, certId: 1, type: "expiry", daysBefore: 30, enabled: true, recipients: ["quality@grt.com", "management@grt.com"] },
  { id: 3, certId: 2, type: "expiry", daysBefore: 90, enabled: true, recipients: ["quality@grt.com"] },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "valid":
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">有效</Badge>;
    case "expired":
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">已过期</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">审核中</Badge>;
    case "planned":
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">计划中</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getMilestoneStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">已完成</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">进行中</Badge>;
    case "pending":
      return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">待开始</Badge>;
    case "delayed":
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">已延期</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "high":
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">高优先级</Badge>;
    case "medium":
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">中优先级</Badge>;
    case "low":
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">低优先级</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "quality":
      return <Shield className="w-4 h-4 text-blue-500" />;
    case "environment":
      return <Leaf className="w-4 h-4 text-green-500" />;
    case "safety":
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case "process":
      return <Factory className="w-4 h-4 text-purple-500" />;
    default:
      return <Award className="w-4 h-4 text-gray-500" />;
  }
}

function CustomerRequirementsTable({ data }: { data: typeof oemRequirements }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>客户名称</TableHead>
          <TableHead>国家</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>资质要求</TableHead>
          <TableHead>GRT状态</TableHead>
          <TableHead>覆盖率</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => {
          const total = item.requirements.length;
          const coverage = ((item.grtStatus.met + item.grtStatus.planned) / total * 100).toFixed(0);
          return (
            <TableRow key={index}>
              <TableCell>
                <div>
                  <div className="font-medium">{item.customer}</div>
                  <div className="text-xs text-muted-foreground">{item.customerEn}</div>
                </div>
              </TableCell>
              <TableCell>{item.country}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.type}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {item.requirements.map((req, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{req}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-500">✓ {item.grtStatus.met}</span>
                  <span className="text-blue-500">◐ {item.grtStatus.planned}</span>
                  {item.grtStatus.gap > 0 && (
                    <span className="text-red-500">✗ {item.grtStatus.gap}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={Number(coverage)} className="w-16 h-2" />
                  <span className="text-xs text-muted-foreground">{coverage}%</span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// 里程碑进度跟踪组件
function MilestoneTracker({ cert }: { cert: typeof plannedCertifications[0] }) {
  const completedCount = cert.milestones.filter(m => m.status === 'completed').length;
  const totalCount = cert.milestones.length;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Target className="w-4 h-4 mr-2" />
          里程碑 ({completedCount}/{totalCount})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            {cert.name} - 里程碑进度
          </DialogTitle>
          <DialogDescription>
            目标日期: {cert.targetDate} | 负责人: {cert.responsible}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>整体进度</span>
              <span className="font-medium">{cert.progress}%</span>
            </div>
            <Progress value={cert.progress} className="h-3" />
          </div>
          
          {/* 里程碑列表 */}
          <div className="space-y-3">
            {cert.milestones.map((milestone, idx) => (
              <div key={milestone.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  milestone.status === 'completed' ? 'bg-green-500 text-white' :
                  milestone.status === 'in_progress' ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {milestone.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{milestone.name}</span>
                    {getMilestoneStatusBadge(milestone.status)}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3" />
                    {milestone.date}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {/* 备注 */}
          {cert.notes && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-600">
                <AlertTriangle className="w-4 h-4" />
                备注
              </div>
              <p className="text-sm text-muted-foreground mt-1">{cert.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 提醒设置组件
function ReminderSettings() {
  const [reminders, setReminders] = useState(reminderConfig);
  
  const handleToggleReminder = (id: number) => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
    toast.success("提醒设置已更新");
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Bell className="w-4 h-4 mr-2" />
          提醒设置
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            资质到期提醒设置
          </DialogTitle>
          <DialogDescription>
            配置资质到期前的自动提醒通知
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* 现有资质提醒 */}
          <div className="space-y-3">
            <h4 className="font-medium">现有资质到期提醒</h4>
            {grtCertifications.map(cert => (
              <div key={cert.id} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{cert.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">到期: {cert.expiry}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">90天前</Badge>
                    <Badge variant="outline">30天前</Badge>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 建设计划提醒 */}
          <div className="space-y-3">
            <h4 className="font-medium">建设计划里程碑提醒</h4>
            {plannedCertifications.slice(0, 3).map(cert => (
              <div key={cert.id} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{cert.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">目标: {cert.targetDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">里程碑前7天</Badge>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 添加新提醒 */}
          <Button variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            添加新提醒规则
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 差距分析报告导出组件
function GapAnalysisReport() {
  const [exporting, setExporting] = useState(false);
  
  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(true);
    
    // 模拟导出过程
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success(`差距分析报告已导出为${format.toUpperCase()}格式`);
    setExporting(false);
  };
  
  // 计算差距分析数据
  const allCustomers = [...oemRequirements, ...tier1Requirements, ...tier2Requirements];
  const totalGaps = allCustomers.reduce((sum, c) => sum + c.grtStatus.gap, 0);
  const totalPlanned = allCustomers.reduce((sum, c) => sum + c.grtStatus.planned, 0);
  const totalMet = allCustomers.reduce((sum, c) => sum + c.grtStatus.met, 0);
  const avgCoverage = Math.round((totalMet + totalPlanned) / (totalMet + totalPlanned + totalGaps) * 100);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          导出报告
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            差距分析报告
          </DialogTitle>
          <DialogDescription>
            GRT资质与客户要求差距分析摘要
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {/* 摘要统计 */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{totalMet}</p>
                <p className="text-sm text-muted-foreground">已满足</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-500">{totalPlanned}</p>
                <p className="text-sm text-muted-foreground">计划中</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{totalGaps}</p>
                <p className="text-sm text-muted-foreground">差距</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{avgCoverage}%</p>
                <p className="text-sm text-muted-foreground">平均覆盖率</p>
              </CardContent>
            </Card>
          </div>
          
          {/* 差距详情 */}
          <div className="space-y-3">
            <h4 className="font-medium">存在差距的客户</h4>
            {allCustomers.filter(c => c.grtStatus.gap > 0).map((customer, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{customer.customer}</span>
                    <Badge variant="outline" className="ml-2">{customer.type}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="text-red-500 font-medium">差距: {customer.grtStatus.gap}项</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  缺失资质: {customer.requirements.filter((_, i) => 
                    i >= customer.grtStatus.met + customer.grtStatus.planned
                  ).join(', ')}
                </div>
              </div>
            ))}
            {allCustomers.filter(c => c.grtStatus.gap > 0).length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                所有客户要求均已满足或在计划中
              </div>
            )}
          </div>
          
          {/* 建设计划进度 */}
          <div className="space-y-3">
            <h4 className="font-medium">建设计划进度</h4>
            {plannedCertifications.map(cert => (
              <div key={cert.id} className="flex items-center gap-4">
                <span className="w-32 text-sm truncate">{cert.name}</span>
                <Progress value={cert.progress} className="flex-1 h-2" />
                <span className="text-sm text-muted-foreground w-12">{cert.progress}%</span>
              </div>
            ))}
          </div>
          
          {/* 导出按钮 */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => handleExport('excel')} 
              disabled={exporting}
              className="flex-1"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              导出Excel
            </Button>
            <Button 
              onClick={() => handleExport('pdf')} 
              disabled={exporting}
              variant="outline"
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              导出PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CertificationManagement() {
  const { t } = useLanguage();

  // 统计数据
  const totalPlanned = plannedCertifications.length;
  const totalBudget = plannedCertifications.reduce((sum, c) => sum + c.budget, 0);
  const avgProgress = Math.round(plannedCertifications.reduce((sum, c) => sum + c.progress, 0) / totalPlanned);

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          icon={Award}
          title="资质管理中心"
          description="全球OEM/Tier1/Tier2客户门户资格要求与GRT资质建设计划"
          actions={
            <>
              <ReminderSettings />
              <GapAnalysisReport />
            </>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={CheckCircle2} label="现有资质" value={grtCertifications.length} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Target} label="计划认证" value={totalPlanned} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={TrendingUp} label="平均进度" value={`${avgProgress}%`} iconColor="text-yellow-500" iconBg="bg-yellow-500/10" />
          <StatCard icon={Clock} label="总预算" value={`¥${totalBudget}万`} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        </div>

        {/* 标签页 */}
        <Tabs defaultValue="current" className="space-y-4">
          <TabsList>
            <TabsTrigger value="current">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              现有资质
            </TabsTrigger>
            <TabsTrigger value="planned">
              <Target className="w-4 h-4 mr-2" />
              建设计划
            </TabsTrigger>
            <TabsTrigger value="oem">
              <Globe className="w-4 h-4 mr-2" />
              OEM要求
            </TabsTrigger>
            <TabsTrigger value="tier1">
              <Building2 className="w-4 h-4 mr-2" />
              Tier1要求
            </TabsTrigger>
            <TabsTrigger value="tier2">
              <Users className="w-4 h-4 mr-2" />
              Tier2要求
            </TabsTrigger>
          </TabsList>

          {/* 现有资质 */}
          <TabsContent value="current">
            <Card>
              <CardHeader>
                <CardTitle>GRT现有资质证书</CardTitle>
                <CardDescription>当前有效的资质认证列表</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>资质名称</TableHead>
                      <TableHead>英文名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>到期日期</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grtCertifications.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">{cert.name}</TableCell>
                        <TableCell className="text-muted-foreground">{cert.nameEn}</TableCell>
                        <TableCell>{getTypeIcon(cert.type)}</TableCell>
                        <TableCell>{getStatusBadge(cert.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {cert.expiry}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 建设计划 */}
          <TabsContent value="planned">
            <Card>
              <CardHeader>
                <CardTitle>资质建设计划</CardTitle>
                <CardDescription>目标日期：2026年6月30日前完成所有计划资质认证</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>资质名称</TableHead>
                      <TableHead>英文名称</TableHead>
                      <TableHead>优先级</TableHead>
                      <TableHead>目标日期</TableHead>
                      <TableHead>预算（万元）</TableHead>
                      <TableHead>进度</TableHead>
                      <TableHead>里程碑</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plannedCertifications.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">{cert.name}</TableCell>
                        <TableCell className="text-muted-foreground">{cert.nameEn}</TableCell>
                        <TableCell>{getPriorityBadge(cert.priority)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {cert.targetDate}
                          </div>
                        </TableCell>
                        <TableCell>¥{cert.budget}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={cert.progress} className="w-20 h-2" />
                            <span className="text-xs text-muted-foreground">{cert.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <MilestoneTracker cert={cert} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OEM要求 */}
          <TabsContent value="oem">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  全球主要OEM客户资质要求
                </CardTitle>
                <CardDescription>大众、宝马、奔驰、通用、福特、丰田等OEM供应商门户资格要求</CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerRequirementsTable data={oemRequirements} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tier1要求 */}
          <TabsContent value="tier1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  全球主要Tier1供应商资质要求
                </CardTitle>
                <CardDescription>博世、大陆、采埃孚、麦格纳、电装等Tier1供应商门户资格要求</CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerRequirementsTable data={tier1Requirements} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tier2要求 */}
          <TabsContent value="tier2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  全球主要Tier2供应商资质要求
                </CardTitle>
                <CardDescription>舍弗勒、SKF、蒂森克虏伯等Tier2供应商门户资格要求</CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerRequirementsTable data={tier2Requirements} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 说明卡片 */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium">资质建设说明</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  根据GRT 2026-2030战略规划，所有计划中的资质认证目标日期为2026年6月30日。
                  IATF 16949是进入汽车行业供应链的核心门槛，建议优先推进。
                  VDA 6.3过程审核是德系OEM的必要要求，需同步准备。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
