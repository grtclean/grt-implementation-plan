/**
 * 员工离职管理页面
 * 管理从离职申请到交接完成的完整流程
 */

import { useState } from "react";
import Layout from "@/components/Layout";
import FeatureGuide from "@/components/FeatureGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LogOut,
  UserPlus,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  DollarSign,
  Settings,
  Briefcase,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  Download,
  Printer,
  Bot,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// 类型定义
// ============================================================================

interface OffboardingRequest {
  id: number;
  employeeCode: string;
  employeeName: string;
  department: string;
  position: string;
  requestDate: string;
  lastWorkingDay: string;
  reason: string;
  status: "pending" | "approved" | "in_progress" | "completed" | "cancelled";
  exitInterview: boolean;
  handoverStatus: number; // 0-100
  exitSurveyScore?: number;
}

interface HandoverItem {
  id: number;
  category: string;
  items: string[];
  assignee: string;
  status: "pending" | "in_progress" | "completed";
  dueDate: string;
}

// ============================================================================
// 模拟数据
// ============================================================================

const mockOffboardingRequests: OffboardingRequest[] = [
  {
    id: 1,
    employeeCode: "EMP-001",
    employeeName: "张三",
    department: "技术部",
    position: "高级工程师",
    requestDate: "2024-02-01",
    lastWorkingDay: "2024-02-29",
    reason: "个人发展",
    status: "in_progress",
    exitInterview: false,
    handoverStatus: 65,
  },
  {
    id: 2,
    employeeCode: "EMP-002",
    employeeName: "李四",
    department: "销售部",
    position: "销售经理",
    requestDate: "2024-02-05",
    lastWorkingDay: "2024-03-10",
    reason: "家庭原因",
    status: "pending",
    exitInterview: false,
    handoverStatus: 0,
  },
  {
    id: 3,
    employeeCode: "EMP-003",
    employeeName: "王五",
    department: "人力资源部",
    position: "HR专员",
    requestDate: "2024-01-20",
    lastWorkingDay: "2024-02-15",
    reason: "职业转换",
    status: "approved",
    exitInterview: true,
    handoverStatus: 100,
    exitSurveyScore: 4,
  },
];

const mockHandoverItems: HandoverItem[] = [
  {
    id: 1,
    category: "项目文档",
    items: ["项目需求文档", "设计文档", "测试报告"],
    assignee: "赵六",
    status: "completed",
    dueDate: "2024-02-20",
  },
  {
    id: 2,
    category: "系统权限",
    items: ["ERP系统", "CRM系统", "内部系统"],
    assignee: "系统管理员",
    status: "in_progress",
    dueDate: "2024-02-25",
  },
  {
    id: 3,
    category: "设备资产",
    items: ["笔记本电脑", "显示器", "外设"],
    assignee: "IT部门",
    status: "pending",
    dueDate: "2024-02-28",
  },
  {
    id: 4,
    category: "知识库",
    items: ["工作总结", "操作手册", "联系人列表"],
    assignee: "部门主管",
    status: "in_progress",
    dueDate: "2024-02-25",
  },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-purple-500/20 text-purple-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-gray-500/20 text-gray-400",
};

const statusLabels: Record<string, string> = {
  pending: "待审批",
  approved: "已批准",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

const handoverStatusColors: Record<string, string> = {
  pending: "bg-red-500/20 text-red-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-green-500/20 text-green-400",
};

// ============================================================================
// 主组件
// ============================================================================

export default function HROffboarding() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("requests");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isExitInterviewDialogOpen, setIsExitInterviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OffboardingRequest | null>(null);

  // 表单状态
  const [newRequest, setNewRequest] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    position: "",
    lastWorkingDay: "",
    reason: "",
  });

  const [exitInterviewData, setExitInterviewData] = useState({
    requestId: 0,
    reasonDetail: "",
    satisfaction: "",
    suggestion: "",
    recommendToFriend: "",
  });

  // 统计数据
  const stats = {
    total: mockOffboardingRequests.length,
    pending: mockOffboardingRequests.filter(r => r.status === "pending").length,
    inProgress: mockOffboardingRequests.filter(r => r.status === "in_progress").length,
    completed: mockOffboardingRequests.filter(r => r.status === "completed").length,
    avgHandoverProgress: Math.round(
      mockOffboardingRequests.reduce((sum, r) => sum + r.handoverStatus, 0) / mockOffboardingRequests.length
    ),
  };

  const handleCreateRequest = () => {
    if (!newRequest.employeeName) {
      toast.error("请输入员工姓名");
      return;
    }
    toast.success("离职申请已提交");
    setIsCreateDialogOpen(false);
  };

  const handleApproveRequest = (id: number) => {
    toast.success(`已批准离职申请 #${id}`);
  };

  const handleStartHandover = (id: number) => {
    toast.success(`已启动交接流程 #${id}`);
  };

  const handleSubmitExitInterview = () => {
    toast.success("离职面谈记录已保存");
    setIsExitInterviewDialogOpen(false);
  };

  const getHandoverStatus = (status: string) => {
    if (status === "completed") return "completed";
    if (status === "in_progress") return "in_progress";
    return "pending";
  };

  return (
    <Layout>
      <FeatureGuide
        featureId="hr-offboarding"
        title="员工离职管理"
        description="管理从离职申请到交接完成的完整离职流程"
        steps={[
          { title: "离职申请", description: "员工提交离职申请，注明离职原因和最后工作日" },
          { title: "审批流程", description: "部门主管和 HR 审批离职申请" },
          { title: "交接管理", description: "管理文档、权限、资产的交接" },
          { title: "离职面谈", description: "进行离职面谈，了解离职原因" },
          { title: "办理离职", description: "完成所有离职手续" },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <LogOut className="w-6 h-6 text-primary" />
              员工离职管理
            </h1>
            <p className="text-muted-foreground mt-1">
              管理从离职申请到交接完成的完整离职流程
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              导出报告
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <UserPlus className="w-4 h-4 mr-2" />
                  新建离职申请
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>新建离职申请</DialogTitle>
                  <DialogDescription>
                    填写离职申请信息，系统将自动启动审批流程
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="employeeCode">员工编号 *</Label>
                      <Input
                        id="employeeCode"
                        value={newRequest.employeeId}
                        onChange={(e) => setNewRequest({ ...newRequest, employeeId: e.target.value })}
                        placeholder="EMP-XXX"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="employeeName">员工姓名 *</Label>
                      <Input
                        id="employeeName"
                        value={newRequest.employeeName}
                        onChange={(e) => setNewRequest({ ...newRequest, employeeName: e.target.value })}
                        placeholder="员工姓名"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="department">部门 *</Label>
                      <Input
                        id="department"
                        value={newRequest.department}
                        onChange={(e) => setNewRequest({ ...newRequest, department: e.target.value })}
                        placeholder="所属部门"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="position">职位 *</Label>
                      <Input
                        id="position"
                        value={newRequest.position}
                        onChange={(e) => setNewRequest({ ...newRequest, position: e.target.value })}
                        placeholder="当前职位"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="lastWorkingDay">最后工作日 *</Label>
                    <Input
                      id="lastWorkingDay"
                      type="date"
                      value={newRequest.lastWorkingDay}
                      onChange={(e) => setNewRequest({ ...newRequest, lastWorkingDay: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="reason">离职原因 *</Label>
                    <Select
                      value={newRequest.reason}
                      onValueChange={(value) => setNewRequest({ ...newRequest, reason: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择离职原因" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="个人发展">个人发展</SelectItem>
                        <SelectItem value="家庭原因">家庭原因</SelectItem>
                        <SelectItem value="薪资待遇">薪资待遇</SelectItem>
                        <SelectItem value="工作环境">工作环境</SelectItem>
                        <SelectItem value="职业转换">职业转换</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 p-3 bg-blue-500/10 rounded-lg">
                    <Bot className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-blue-400">
                      AI 建议：根据员工信息，预估离职补偿金额
                    </span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateRequest}>
                    提交申请
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总申请数</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待审批</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">进行中</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.inProgress}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <ArrowRight className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已完成</p>
                  <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">平均交接进度</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.avgHandoverProgress}%</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <FileText className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-card/50 border border-border">
            <TabsTrigger value="requests">
              <FileText className="w-4 h-4 mr-2" />
              离职申请
            </TabsTrigger>
            <TabsTrigger value="handover">
              <Briefcase className="w-4 h-4 mr-2" />
              交接管理
            </TabsTrigger>
            <TabsTrigger value="exit-interview">
              <Users className="w-4 h-4 mr-2" />
              离职面谈
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              离职分析
            </TabsTrigger>
          </TabsList>

          {/* 离职申请 Tab */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索员工姓名或编号..." className="pl-10" />
              </div>
              <Select>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="筛选状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待审批</SelectItem>
                  <SelectItem value="approved">已批准</SelectItem>
                  <SelectItem value="in_progress">进行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {mockOffboardingRequests.map((request) => (
                <Card key={request.id} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{request.employeeName}</h3>
                          <Badge className={statusColors[request.status]}>
                            {statusLabels[request.status]}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            <span>{request.employeeCode}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            <span>{request.department} · {request.position}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>最后工作日: {request.lastWorkingDay}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>{request.reason}</span>
                          </div>
                        </div>

                        {/* 交接进度 */}
                        {request.status !== "pending" && request.status !== "cancelled" && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>交接进度</span>
                              <span>{request.handoverStatus}%</span>
                            </div>
                            <Progress value={request.handoverStatus} className="h-2" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {request.status === "pending" && (
                          <Button size="sm" onClick={() => handleApproveRequest(request.id)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            批准申请
                          </Button>
                        )}
                        {request.status === "approved" && (
                          <Button size="sm" onClick={() => handleStartHandover(request.id)}>
                            <ArrowRight className="w-3 h-3 mr-1" />
                            启动交接
                          </Button>
                        )}
                        {request.status === "in_progress" && (
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedRequest(request);
                            setIsExitInterviewDialogOpen(true);
                          }}>
                            <Users className="w-3 h-3 mr-1" />
                            离职面谈
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          查看详情
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 交接管理 Tab */}
          <TabsContent value="handover" className="space-y-4">
            <div className="grid gap-4">
              {mockHandoverItems.map((item) => (
                <Card key={item.id} className="bg-card/50 border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{item.category}</h3>
                          <Badge className={handoverStatusColors[item.status]}>
                            {item.status === "pending" ? "待交接" :
                             item.status === "in_progress" ? "交接中" : "已完成"}
                          </Badge>
                        </div>
                        <div className="mb-3">
                          <div className="text-sm text-muted-foreground mb-1">交接内容:</div>
                          <div className="flex flex-wrap gap-2">
                            {item.items.map((subItem, idx) => (
                              <Badge key={idx} variant="outline">{subItem}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            <span>接收人: {item.assignee}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>截止日期: {item.dueDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {item.status === "completed" ? (
                          <Button size="sm" variant="outline">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            查看记录
                          </Button>
                        ) : (
                          <Button size="sm">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI 生成交接文档
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 离职面谈 Tab */}
          <TabsContent value="exit-interview" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle>离职面谈记录</CardTitle>
                <CardDescription>记录和分析离职面谈内容</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无离职面谈记录</p>
                  <p className="text-sm">员工离职时，系统将自动创建面谈记录</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 离职分析 Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle>离职原因分析</CardTitle>
                  <CardDescription>按离职原因统计</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { reason: "个人发展", count: 5, percentage: 35 },
                      { reason: "薪资待遇", count: 4, percentage: 28 },
                      { reason: "家庭原因", count: 3, percentage: 21 },
                      { reason: "职业转换", count: 2, percentage: 14 },
                    ].map((item) => (
                      <div key={item.reason}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{item.reason}</span>
                          <span>{item.count}人 ({item.percentage}%)</span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    AI 离职分析
                  </CardTitle>
                  <CardDescription>基于离职数据的智能分析</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <div className="font-medium text-blue-400 mb-1">建议优化薪酬结构</div>
                      <p className="text-sm text-muted-foreground">
                        离职原因中"薪资待遇"占比28%，建议定期评估市场薪酬水平
                      </p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <div className="font-medium text-purple-400 mb-1">加强员工发展规划</div>
                      <p className="text-sm text-muted-foreground">
                        35%员工因"个人发展"离职，建议完善职业发展通道
                      </p>
                    </div>
                    <div className="p-3 bg-orange-500/10 rounded-lg">
                      <div className="font-medium text-orange-400 mb-1">优化工作环境</div>
                      <p className="text-sm text-muted-foreground">
                        关注员工工作满意度，提升团队凝聚力
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 离职面谈对话框 */}
      <Dialog open={isExitInterviewDialogOpen} onOpenChange={setIsExitInterviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>离职面谈记录</DialogTitle>
            <DialogDescription>
              记录离职面谈内容，分析离职原因
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>详细离职原因</Label>
              <Textarea
                value={exitInterviewData.reasonDetail}
                onChange={(e) => setExitInterviewData({ ...exitInterviewData, reasonDetail: e.target.value })}
                placeholder="请详细说明离职原因"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>对公司/部门的满意度</Label>
              <Select
                value={exitInterviewData.satisfaction}
                onValueChange={(value) => setExitInterviewData({ ...exitInterviewData, satisfaction: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">非常满意 (5分)</SelectItem>
                  <SelectItem value="4">满意 (4分)</SelectItem>
                  <SelectItem value="3">一般 (3分)</SelectItem>
                  <SelectItem value="2">不满意 (2分)</SelectItem>
                  <SelectItem value="1">非常不满意 (1分)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>改进建议</Label>
              <Textarea
                value={exitInterviewData.suggestion}
                onChange={(e) => setExitInterviewData({ ...exitInterviewData, suggestion: e.target.value })}
                placeholder="对公司/部门有什么改进建议"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>是否愿意推荐公司给朋友</Label>
              <Select
                value={exitInterviewData.recommendToFriend}
                onValueChange={(value) => setExitInterviewData({ ...exitInterviewData, recommendToFriend: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">愿意</SelectItem>
                  <SelectItem value="no">不愿意</SelectItem>
                  <SelectItem value="unsure">不确定</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExitInterviewDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitExitInterview}>
              保存记录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
