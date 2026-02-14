/**
 * v2.5.34 M7-M9交付跟踪仪表盘
 * 功能：预验收Gate检查、现场安装跟踪、最终验收管理
 */

import Layout from "@/components/Layout";
import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Shield,
  Target,
  Truck,
  Wrench,
  Award,
  AlertTriangle,
  Camera,
  MessageSquare,
  Bot
} from "lucide-react";
import { useState } from "react";

// 模拟数据
const mockDeliveryData = {
  projectNo: "GRT-2024-001",
  customerName: "宁德时代",
  currentStage: "M7_Pre_Acceptance" as const,
  stageProgress: 65,
  siteEngineer: "赵工",
  siteLocation: "宁德市蕉城区",
  plannedInstallDate: "2024-06-15",
  actualInstallDate: null,
};

const mockGateCheckResult = {
  decision: "Conditional_Pass" as string,
  riskScore: 35,
  checklistResults: [
    { item: "发货清洁度报告", status: "Pass" as const, notes: "报告已上传，NVH=0.45mg" },
    { item: "节拍验证", status: "Pass" as const, notes: "实际58s，目标60s，偏差-3.3%" },
    { item: "PLC数据日志", status: "Pass" as const, notes: "1200条数据记录，无异常" },
    { item: "开放问题检查", status: "Warning" as const, notes: "开放问题: 4，Critical: 0" },
    { item: "文档完整性", status: "Pass" as const, notes: "所有文档已更新" },
  ],
  blockReasons: [],
  recommendations: [
    "关注1项警告项，建议在交付前优化",
    "确保所有文档已更新至最新版本",
    "与客户确认验收时间和参与人员",
  ],
};

const mockSiteIssues = [
  {
    id: 1,
    category: "Quality_Defect",
    description: "喷淋管路接头处有轻微渗漏",
    status: "In_Progress",
    priority: "Medium",
    createdAt: "2024-06-10 14:30",
    assignee: "赵工",
  },
  {
    id: 2,
    category: "Customer_Change",
    description: "客户要求增加一个手动操作面板",
    status: "Pending_Approval",
    priority: "Low",
    createdAt: "2024-06-11 09:15",
    assignee: "张工",
  },
];

const mockMilestones = [
  { stage: "M7", name: "预验收", status: "In_Progress", date: "2024-06-15", progress: 65 },
  { stage: "M8", name: "现场安装", status: "Pending", date: "2024-06-20", progress: 0 },
  { stage: "M9", name: "最终验收", status: "Pending", date: "2024-06-30", progress: 0 },
];

export default function M7M9DeliveryTrack() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("gate");

  const decisionColors = createStatusColorMap({
    Green_Light: "green",
    Conditional_Pass: "yellow",
    Blocked_Issue: "red",
  });

  const decisionLabels: Record<string, string> = {
    Green_Light: "通过",
    Conditional_Pass: "有条件通过",
    Blocked_Issue: "阻塞",
  };

  const gateStatusColors = createStatusColorMap({
    Pass: "green",
    Warning: "yellow",
    Fail: "red",
  });

  const gateStatusLabels: Record<string, string> = {
    Pass: "通过",
    Warning: "警告",
    Fail: "失败",
  };

  const issueStatusColors = createStatusColorMap({
    Open: "red",
    In_Progress: "blue",
    Pending_Approval: "yellow",
    Resolved: "green",
  });

  const issueStatusLabels: Record<string, string> = {
    Open: "待处理",
    In_Progress: "处理中",
    Pending_Approval: "待审批",
    Resolved: "已解决",
  };

  const getMilestoneStatus = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "In_Progress": return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case "Pending": return <Clock className="w-5 h-5 text-gray-400" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Truck}
          title="M7-M9 交付跟踪仪表盘"
          description="Gatekeeper AI · Site Copilot AI · 预验收/安装/最终验收全流程管理"
          actions={
            <>
              <Button variant="outline">
                <Camera className="w-4 h-4 mr-2" />
                上传现场照片
              </Button>
              <Button>
                <Bot className="w-4 h-4 mr-2" />
                AI助手
              </Button>
            </>
          }
        />

        {/* 项目概览 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard icon={FileText} label="项目编号" value={mockDeliveryData.projectNo} />
          <StatCard icon={Users} label="客户" value={mockDeliveryData.customerName} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={Target} label="当前阶段" value="M7 预验收" iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Wrench} label="现场工程师" value={mockDeliveryData.siteEngineer} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
          <StatCard icon={Clock} label="计划安装" value={mockDeliveryData.plannedInstallDate} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
        </div>

        {/* 里程碑进度 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">交付里程碑</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {mockMilestones.map((milestone, index) => (
                <div key={index} className="flex-1 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      milestone.status === "Completed" ? "border-green-500 bg-green-500/10" :
                      milestone.status === "In_Progress" ? "border-blue-500 bg-blue-500/10" :
                      "border-gray-300 bg-gray-100"
                    }`}>
                      {getMilestoneStatus(milestone.status)}
                    </div>
                    <p className="font-bold mt-2">{milestone.stage}</p>
                    <p className="text-sm text-muted-foreground">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground">{milestone.date}</p>
                    {milestone.status === "In_Progress" && (
                      <div className="w-full mt-2">
                        <Progress value={milestone.progress} className="h-1" />
                        <p className="text-xs text-center mt-1">{milestone.progress}%</p>
                      </div>
                    )}
                  </div>
                  {index < mockMilestones.length - 1 && (
                    <div className={`absolute top-6 left-1/2 w-full h-0.5 ${
                      milestone.status === "Completed" ? "bg-green-500" : "bg-gray-300"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 详细内容Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gate">
              <Shield className="w-4 h-4 mr-2" />
              Gate检查
            </TabsTrigger>
            <TabsTrigger value="issues">
              <AlertTriangle className="w-4 h-4 mr-2" />
              现场问题
            </TabsTrigger>
            <TabsTrigger value="copilot">
              <Bot className="w-4 h-4 mr-2" />
              AI助手
            </TabsTrigger>
            <TabsTrigger value="docs">
              <FileText className="w-4 h-4 mr-2" />
              交付文档
            </TabsTrigger>
          </TabsList>

          {/* Gate检查Tab */}
          <TabsContent value="gate" className="space-y-4">
            <Card className={`border-l-4 ${
              mockGateCheckResult.decision === "Green_Light" ? "border-l-green-500" :
              mockGateCheckResult.decision === "Conditional_Pass" ? "border-l-yellow-500" :
              "border-l-red-500"
            }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Gatekeeper AI 检查结果
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge color={decisionColors[mockGateCheckResult.decision as keyof typeof decisionColors] ?? "gray"}>
                      {decisionLabels[mockGateCheckResult.decision] ?? mockGateCheckResult.decision}
                    </StatusBadge>
                    <span className="text-sm text-muted-foreground ml-2">
                      风险评分: {mockGateCheckResult.riskScore}/100
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">检查项</th>
                        <th className="text-left p-3">状态</th>
                        <th className="text-left p-3">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockGateCheckResult.checklistResults.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-3">{item.item}</td>
                          <td className="p-3">
                            <StatusBadge color={gateStatusColors[item.status as keyof typeof gateStatusColors] ?? "gray"}>
                              {gateStatusLabels[item.status] ?? item.status}
                            </StatusBadge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{item.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {mockGateCheckResult.recommendations.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">AI建议:</h4>
                    <ul className="space-y-1 text-sm">
                      {mockGateCheckResult.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 现场问题Tab */}
          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">现场问题清单</CardTitle>
                  <Button size="sm">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    新建问题
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockSiteIssues.map((issue) => (
                    <div key={issue.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{issue.category.replace("_", " ")}</Badge>
                          <StatusBadge color={issueStatusColors[issue.status as keyof typeof issueStatusColors] ?? "gray"}>
                            {issueStatusLabels[issue.status] ?? issue.status}
                          </StatusBadge>
                          <Badge variant={issue.priority === "High" ? "destructive" : "secondary"}>
                            {issue.priority}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{issue.createdAt}</span>
                      </div>
                      <p className="text-sm mb-2">{issue.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">负责人: {issue.assignee}</span>
                        <Button size="sm" variant="outline">
                          <Bot className="w-4 h-4 mr-2" />
                          AI分析
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI助手Tab */}
          <TabsContent value="copilot">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Site Copilot AI 现场助手
                </CardTitle>
                <CardDescription>
                  智能问题诊断、解决方案推荐、根因分析
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      快速诊断
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      描述现场问题，AI将提供诊断和解决方案
                    </p>
                    <textarea 
                      className="w-full p-2 border rounded-lg text-sm" 
                      rows={3}
                      placeholder="描述您遇到的问题..."
                    />
                    <Button className="w-full mt-2">
                      <Bot className="w-4 h-4 mr-2" />
                      获取AI建议
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      常见问题
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                        📋 如何处理缺件问题？
                      </li>
                      <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                        🔧 设备调试不达标怎么办？
                      </li>
                      <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                        📝 客户临时变更需求如何处理？
                      </li>
                      <li className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80">
                        ⚠️ 质量缺陷现场修复流程
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-bold mb-2">AI能力说明</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-background rounded">
                      <span className="font-medium">问题分类</span>
                      <p className="text-xs text-muted-foreground">自动识别问题类型</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <span className="font-medium">根因分析</span>
                      <p className="text-xs text-muted-foreground">深度分析问题根源</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <span className="font-medium">解决方案</span>
                      <p className="text-xs text-muted-foreground">SOP格式解决步骤</p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <span className="font-medium">相似案例</span>
                      <p className="text-xs text-muted-foreground">历史案例参考</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 交付文档Tab */}
          <TabsContent value="docs">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">交付文档清单</CardTitle>
                <CardDescription>Technical Writer AI 自动生成的交付文档</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "操作手册", status: "已生成", version: "v1.2", date: "2024-06-08" },
                    { name: "维护SOP", status: "已生成", version: "v1.0", date: "2024-06-08" },
                    { name: "故障排除指南", status: "已生成", version: "v1.1", date: "2024-06-10" },
                    { name: "备件清单", status: "已生成", version: "v1.0", date: "2024-06-08" },
                    { name: "培训材料", status: "待生成", version: "-", date: "-" },
                    { name: "验收报告", status: "待生成", version: "-", date: "-" },
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.version !== "-" ? `${doc.version} · ${doc.date}` : "待生成"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={doc.status === "已生成" ? "bg-green-500" : "bg-gray-500"}>
                          {doc.status}
                        </Badge>
                        {doc.status === "已生成" && (
                          <Button size="sm" variant="outline">下载</Button>
                        )}
                        {doc.status === "待生成" && (
                          <Button size="sm">
                            <Bot className="w-4 h-4 mr-2" />
                            AI生成
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
