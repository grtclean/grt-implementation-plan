/**
 * GRT德美跨国合规仪表板页面
 * 展示员工工时合规状态、违规预警和主管审批队列
 */

import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import SchedulerStatusPanel from "@/components/SchedulerStatusPanel";
import ReportHistoryPanel from "@/components/ReportHistoryPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PageHeader } from "@/components/grt";
import { Database, Loader2 } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Globe,
  TrendingUp,
  Bell,
  FileText,
  Shield,
  Calendar,
  MapPin,
  Timer,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Download,
  Filter,
  ExternalLink,
  Settings
} from "lucide-react";
import { useLocation } from "wouter";

// 类型定义
interface ComplianceAlert {
  id: string;
  employeeId: string;
  employeeName: string;
  alertType: string;
  jurisdiction: "DE" | "US";
  severity: "critical" | "warning" | "info";
  description: string;
  legalReference: string;
  recommendedAction: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
}

interface EmployeeComplianceStatus {
  id: string;
  name: string;
  department: string;
  jurisdiction: "DE" | "US";
  weeklyHours: number;
  weeklyLimit: number;
  overtimeHours: number;
  complianceStatus: "compliant" | "warning" | "violation";
  lastCheckTime: string;
}

interface ApprovalItem {
  id: string;
  type: "overtime" | "exemption_review" | "rest_period_exception";
  employeeId: string;
  employeeName: string;
  description: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
}

export default function ComplianceDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<"all" | "DE" | "US">("all");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel" | "csv">("pdf");

  // tRPC查询hooks
  const { data: dashboardStats, isLoading: statsLoading, refetch: refetchStats } = (trpc.compliance.getDashboardStats as any).useQuery(
    selectedJurisdiction !== "all" ? { jurisdiction: selectedJurisdiction } : undefined
  );
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = (trpc.compliance.getAlerts as any).useQuery(
    selectedJurisdiction !== "all" ? { jurisdiction: selectedJurisdiction } : undefined
  );
  const { data: employeesData, isLoading: employeesLoading } = trpc.compliance.getEmployeeStatus.useQuery(
    selectedJurisdiction !== "all" ? { jurisdiction: selectedJurisdiction } : undefined
  );
  const { data: approvalsData, isLoading: approvalsLoading } = trpc.compliance.getApprovalQueue.useQuery();
  const { data: geminiAnalysis, isLoading: analysisLoading } = trpc.compliance.getGeminiAnalysis.useQuery({});

  // 合规检查mutation
  const triggerCheckMutation = trpc.compliance.triggerComplianceCheck.useMutation({
    onSuccess: (data) => {
      toast.success(`合规检查完成: 检查了${(data as any).employeesChecked}名员工，生成${(data as any).alertsGenerated}个预警`);
      refetchStats();
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(`合规检查失败: ${error.message}`);
    }
  });

  // 报告导出mutation
  const exportReportMutation = trpc.compliance.exportReport.useMutation({
    onSuccess: (data) => {
      toast.success(`报告生成成功`);
      // 自动触发下载
      if ((data as any).downloadUrl) {
        window.open((data as any).downloadUrl, '_blank');
      }
    },
    onError: (error) => {
      toast.error(`报告生成失败: ${error.message}`);
    }
  });

  // 生成测试数据mutation
  const seedDataMutation = trpc.compliance.seedTestData.useMutation({
    onSuccess: (data) => {
      toast.success(`测试数据生成成功！创建了${(data as any).employeesCreated}名员工、${(data as any).timeEntriesCreated}条工时记录、${(data as any).alertsCreated}个预警`);
      refetchStats();
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(`测试数据生成失败: ${error.message}`);
    }
  });

  // 使用API数据或默认值
  const complianceStats = (dashboardStats as any) || {
    totalEmployees: 156,
    compliantEmployees: 142,
    atRiskEmployees: 14,
    complianceRate: 91.0,
    activeAlerts: 8,
    pendingApprovals: 5,
    byJurisdiction: {
      DE: { total: 45, compliant: 41, atRisk: 4, complianceRate: 91.1 },
      US: { total: 78, compliant: 72, atRisk: 6, complianceRate: 92.3 }
    }
  };

  const alerts: ComplianceAlert[] = [
    {
      id: "ALT001",
      employeeId: "DE001",
      employeeName: "张三",
      alertType: "DAILY_10H_LIMIT",
      jurisdiction: "DE",
      severity: "critical",
      description: "每日工时超过10小时限制",
      legalReference: "ArbZG §3",
      recommendedAction: "立即停止工作，安排休息",
      status: "open",
      createdAt: "2026-01-24T08:30:00Z"
    },
    {
      id: "ALT002",
      employeeId: "DE002",
      employeeName: "李四",
      alertType: "REST_PERIOD_11H",
      jurisdiction: "DE",
      severity: "warning",
      description: "休息时间不足11小时",
      legalReference: "ArbZG §5",
      recommendedAction: "调整次日上班时间",
      status: "acknowledged",
      createdAt: "2026-01-24T06:00:00Z"
    },
    {
      id: "ALT003",
      employeeId: "US001",
      employeeName: "John Smith",
      alertType: "FLSA_EXEMPTION_REVIEW",
      jurisdiction: "US",
      severity: "warning",
      description: "外勤工作占比低于50%，需审核豁免资格",
      legalReference: "FLSA §13(a)(1)",
      recommendedAction: "审核员工工作分类",
      status: "open",
      createdAt: "2026-01-23T14:00:00Z"
    },
    {
      id: "ALT004",
      employeeId: "US002",
      employeeName: "Jane Doe",
      alertType: "OVERTIME_THRESHOLD",
      jurisdiction: "US",
      severity: "info",
      description: "周度加班超过10小时，需主管审批",
      legalReference: "FLSA Overtime Rules",
      recommendedAction: "提交加班审批",
      status: "open",
      createdAt: "2026-01-24T09:00:00Z"
    }
  ];

  const employeeStatuses: EmployeeComplianceStatus[] = [
    {
      id: "DE001",
      name: "张三",
      department: "服务部",
      jurisdiction: "DE",
      weeklyHours: 42,
      weeklyLimit: 48,
      overtimeHours: 2,
      complianceStatus: "violation",
      lastCheckTime: "2026-01-24T08:30:00Z"
    },
    {
      id: "DE002",
      name: "李四",
      department: "技术部",
      jurisdiction: "DE",
      weeklyHours: 38,
      weeklyLimit: 48,
      overtimeHours: 0,
      complianceStatus: "warning",
      lastCheckTime: "2026-01-24T08:00:00Z"
    },
    {
      id: "US001",
      name: "John Smith",
      department: "Sales",
      jurisdiction: "US",
      weeklyHours: 45,
      weeklyLimit: 40,
      overtimeHours: 5,
      complianceStatus: "warning",
      lastCheckTime: "2026-01-24T07:00:00Z"
    },
    {
      id: "US002",
      name: "Jane Doe",
      department: "Support",
      jurisdiction: "US",
      weeklyHours: 52,
      weeklyLimit: 40,
      overtimeHours: 12,
      complianceStatus: "compliant",
      lastCheckTime: "2026-01-24T09:00:00Z"
    }
  ];

  const approvalQueue: ApprovalItem[] = [
    {
      id: "APR001",
      type: "overtime",
      employeeId: "US002",
      employeeName: "Jane Doe",
      description: "申请12小时加班审批",
      requestedAt: "2026-01-24T09:00:00Z",
      status: "pending"
    },
    {
      id: "APR002",
      type: "exemption_review",
      employeeId: "US001",
      employeeName: "John Smith",
      description: "外部销售豁免资格审核",
      requestedAt: "2026-01-23T14:00:00Z",
      status: "pending"
    },
    {
      id: "APR003",
      type: "rest_period_exception",
      employeeId: "DE002",
      employeeName: "李四",
      description: "休息期例外申请（紧急维修）",
      requestedAt: "2026-01-24T06:00:00Z",
      status: "pending"
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500";
      case "warning": return "bg-yellow-500";
      case "info": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive">严重</Badge>;
      case "warning": return <Badge className="bg-yellow-500">警告</Badge>;
      case "info": return <Badge variant="secondary">提示</Badge>;
      default: return <Badge>未知</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "compliant": return <Badge className="bg-green-500">合规</Badge>;
      case "warning": return <Badge className="bg-yellow-500">警告</Badge>;
      case "violation": return <Badge variant="destructive">违规</Badge>;
      default: return <Badge>未知</Badge>;
    }
  };

  const getJurisdictionFlag = (jurisdiction: string) => {
    return jurisdiction === "DE" ? "🇩🇪" : "🇺🇸";
  };

  const filteredAlerts = selectedJurisdiction === "all" 
    ? alerts 
    : alerts.filter(a => a.jurisdiction === selectedJurisdiction);

  const filteredEmployees = selectedJurisdiction === "all"
    ? employeeStatuses
    : employeeStatuses.filter(e => e.jurisdiction === selectedJurisdiction);

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Shield}
          title="德美跨国合规仪表板"
          description="实时监控员工工时合规状态、违规预警和审批队列"
          actions={
            <>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                筛选
              </Button>
              {user?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/compliance/rules-config')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  规则配置
                </Button>
              )}
              <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    导出报告
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>导出合规报告</DialogTitle>
                    <DialogDescription>
                      选择报告格式并下载合规状态报告
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>报告格式</Label>
                      <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "pdf" | "excel" | "csv")}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择格式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-red-500" />
                              PDF 报告
                            </div>
                          </SelectItem>
                          <SelectItem value="excel">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-green-500" />
                              Excel 表格
                            </div>
                          </SelectItem>
                          <SelectItem value="csv">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-500" />
                              CSV 数据
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>PDF:</strong> 专业报告格式，包含统计图表和分析建议</p>
                      <p><strong>Excel:</strong> 详细数据表格，便于进一步分析</p>
                      <p><strong>CSV:</strong> 纯数据格式，适合导入其他系统</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                      取消
                    </Button>
                    <Button
                      onClick={() => {
                        exportReportMutation.mutate({ format: exportFormat });
                        setExportDialogOpen(false);
                      }}
                      disabled={exportReportMutation.isPending}
                    >
                      {exportReportMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      下载报告
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {/* 仅管理员可见的测试数据按钮 */}
              {user?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedDataMutation.mutate()}
                  disabled={seedDataMutation.isPending}
                  className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                >
                  {seedDataMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4 mr-2" />
                  )}
                  生成测试数据
                </Button>
              )}
              <Button size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新数据
              </Button>
            </>
          }
        />

        {/* 管辖区选择 */}
        <div className="flex gap-2">
          <Button
            variant={selectedJurisdiction === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedJurisdiction("all")}
          >
            <Globe className="w-4 h-4 mr-2" />
            全部
          </Button>
          <Button
            variant={selectedJurisdiction === "DE" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedJurisdiction("DE")}
          >
            🇩🇪 德国
          </Button>
          <Button
            variant={selectedJurisdiction === "US" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedJurisdiction("US")}
          >
            🇺🇸 美国
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">员工总数</p>
                  <p className="text-3xl font-bold">{complianceStats.totalEmployees}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    🇩🇪 {complianceStats.germanEmployees} | 🇺🇸 {complianceStats.usEmployees}
                  </p>
                </div>
                <Users className="w-10 h-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">合规状态</p>
                  <p className="text-3xl font-bold text-green-500">{complianceStats.compliantCount}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-yellow-500">{complianceStats.warningCount} 警告</span>
                    <span className="text-xs text-red-500">{complianceStats.violationCount} 违规</span>
                  </div>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待审批</p>
                  <p className="text-3xl font-bold text-orange-500">{complianceStats.pendingApprovals}</p>
                  <p className="text-xs text-muted-foreground mt-1">需要主管处理</p>
                </div>
                <Bell className="w-10 h-10 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">本周加班</p>
                  <p className="text-3xl font-bold">{complianceStats.weeklyOvertimeHours}h</p>
                  <p className="text-xs text-muted-foreground mt-1">累计加班工时</p>
                </div>
                <Clock className="w-10 h-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="overview">
              <TrendingUp className="w-4 h-4 mr-2" />
              概览
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <AlertTriangle className="w-4 h-4 mr-2" />
              预警中心 ({filteredAlerts.filter(a => a.status === "open").length})
            </TabsTrigger>
            <TabsTrigger value="employees">
              <Users className="w-4 h-4 mr-2" />
              员工状态
            </TabsTrigger>
            <TabsTrigger value="approvals">
              <FileText className="w-4 h-4 mr-2" />
              审批队列 ({approvalQueue.filter(a => a.status === "pending").length})
            </TabsTrigger>
          </TabsList>

          {/* 概览标签页 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 德国合规概览 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🇩🇪 德国合规概览
                  </CardTitle>
                  <CardDescription>ArbZG工时法合规监控</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>每日10小时限制合规率</span>
                      <span className="font-medium">96.6%</span>
                    </div>
                    <Progress value={96.6} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>11小时休息期合规率</span>
                      <span className="font-medium">98.9%</span>
                    </div>
                    <Progress value={98.9} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>周度48小时限制合规率</span>
                      <span className="font-medium">100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      3名员工本周触发工时预警
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 美国合规概览 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🇺🇸 美国合规概览
                  </CardTitle>
                  <CardDescription>FLSA公平劳动标准法合规监控</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>外部销售豁免资格合规率</span>
                      <span className="font-medium">94.0%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>加班工资计算准确率</span>
                      <span className="font-medium">100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>工时记录完整率</span>
                      <span className="font-medium">99.2%</span>
                    </div>
                    <Progress value={99.2} className="h-2" />
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      4名员工需要豁免资格审核
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 最近预警 */}
            <Card>
              <CardHeader>
                <CardTitle>最近预警</CardTitle>
                <CardDescription>需要关注的合规问题</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)}`} />
                        <div>
                          <p className="font-medium">
                            {getJurisdictionFlag(alert.jurisdiction)} {alert.employeeName}
                          </p>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(alert.severity)}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 预警中心标签页 */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>合规预警列表</CardTitle>
                <CardDescription>所有需要处理的合规预警</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(alert.severity)}
                            <Badge variant="outline">
                              {getJurisdictionFlag(alert.jurisdiction)} {alert.jurisdiction}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {alert.alertType}
                            </span>
                          </div>
                          <h4 className="font-medium">
                            {alert.employeeName} ({alert.employeeId})
                          </h4>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {alert.legalReference}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(alert.createdAt).toLocaleString("zh-CN")}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" variant="outline">
                            查看详情
                          </Button>
                          {alert.status === "open" && (
                            <Button size="sm">
                              处理
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 p-2 rounded bg-muted/50">
                        <p className="text-sm">
                          <strong>建议操作：</strong>{alert.recommendedAction}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 员工状态标签页 */}
          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>员工合规状态</CardTitle>
                <CardDescription>实时监控所有员工的工时合规情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">员工</th>
                        <th className="text-left p-3 font-medium">部门</th>
                        <th className="text-left p-3 font-medium">管辖区</th>
                        <th className="text-left p-3 font-medium">本周工时</th>
                        <th className="text-left p-3 font-medium">加班</th>
                        <th className="text-left p-3 font-medium">状态</th>
                        <th className="text-left p-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-sm text-muted-foreground">{employee.id}</p>
                            </div>
                          </td>
                          <td className="p-3">{employee.department}</td>
                          <td className="p-3">
                            {getJurisdictionFlag(employee.jurisdiction)} {employee.jurisdiction}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <p>{employee.weeklyHours}h / {employee.weeklyLimit}h</p>
                              <Progress 
                                value={(employee.weeklyHours / employee.weeklyLimit) * 100} 
                                className="h-1.5 w-20"
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            {employee.overtimeHours > 0 ? (
                              <span className="text-orange-500">+{employee.overtimeHours}h</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            {getStatusBadge(employee.complianceStatus)}
                          </td>
                          <td className="p-3">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                // 尝试解析员工ID为数字
                                const numericId = parseInt(employee.id.replace(/\D/g, ''), 10);
                                if (numericId > 0) {
                                  window.location.href = `/compliance/employee/${numericId}`;
                                } else {
                                  toast.info('该员工详情页面即将上线');
                                }
                              }}
                            >
                              详情 <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 审批队列标签页 */}
          <TabsContent value="approvals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>待审批队列</CardTitle>
                <CardDescription>需要主管审批的合规相关申请</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvalQueue.filter(a => a.status === "pending").map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {item.type === "overtime" && "加班审批"}
                              {item.type === "exemption_review" && "豁免审核"}
                              {item.type === "rest_period_exception" && "休息期例外"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {item.id}
                            </span>
                          </div>
                          <h4 className="font-medium">
                            {item.employeeName} ({item.employeeId})
                          </h4>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            申请时间：{new Date(item.requestedAt).toLocaleString("zh-CN")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            拒绝
                          </Button>
                          <Button size="sm">
                            批准
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {approvalQueue.filter(a => a.status === "pending").length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>没有待审批的项目</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 定时任务调度器状态面板 - 仅管理员可见 */}
        {user?.role === 'admin' && (
          <SchedulerStatusPanel />
        )}

        {/* 报告历史记录面板 */}
        <ReportHistoryPanel />

        {/* Gemini AI 分析面板 */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Gemini AI 合规分析
            </CardTitle>
            <CardDescription>
              基于当前数据的智能合规风险分析和建议
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">风险评估摘要</h4>
                <p className="text-sm text-muted-foreground">
                  当前检测到 <strong className="text-red-500">3个严重违规</strong> 和 
                  <strong className="text-yellow-500"> 11个警告</strong>。
                  建议优先处理德国员工张三的每日工时超限问题，该违规可能导致ArbZG合规风险。
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border">
                  <h5 className="font-medium text-sm mb-1">🇩🇪 德国合规建议</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 加强每日工时监控，设置8小时预警</li>
                    <li>• 优化排班系统确保11小时休息期</li>
                    <li>• 建议为高负荷岗位增加人员配置</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border">
                  <h5 className="font-medium text-sm mb-1">🇺🇸 美国合规建议</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 审核4名外勤人员的豁免资格</li>
                    <li>• 确保加班工资按1.5倍计算</li>
                    <li>• 完善工时记录系统避免遗漏</li>
                  </ul>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                重新生成AI分析
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
