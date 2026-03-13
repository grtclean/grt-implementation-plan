/**
 * v2.5.34 M1启动会仪表盘
 * 功能：项目启动会风险预警、URS评审、红蓝对抗配置
 */

import { PageHeader, StatCard, StatusBadge, createStatusColorMap } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Shield,
  Target,
  Zap,
  TrendingUp,
  AlertCircle,
  FileCheck,
  UserCheck
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// 模拟数据 - 实际使用时替换为tRPC调用
const mockProjectData = {
  projectNo: "GRT-2024-001",
  customerName: "宁德时代",
  customerTier: "Tier1" as const,
  productType: "电池壳体清洗线",
  contractValue: 2800000,
  targetDeliveryDate: "2024-06-30",
  projectManager: "张工",
  salesOwner: "李经理",
};

const mockRiskAssessment = {
  riskLevel: "High" as const,
  riskScore: 72,
  identifiedRisks: [
    {
      category: "客户等级",
      description: "Tier1客户项目，交付标准要求极高",
      probability: "High" as const,
      impact: "High" as const,
      mitigation: "启用红蓝对抗交付流程，增加内部评审节点",
    },
    {
      category: "技术复杂度",
      description: "包含3项非标定制要求",
      probability: "Medium" as const,
      impact: "High" as const,
      mitigation: "提前与客户确认特殊要求细节，预留设计变更缓冲时间",
    },
    {
      category: "交期压力",
      description: "交期紧张，仅有16周设计生产周期",
      probability: "High" as const,
      impact: "Medium" as const,
      mitigation: "并行推进设计和采购，建立每周进度复盘机制",
    },
  ],
  requiresRedBlueConfrontation: true,
  historicalLessons: [
    "2023年类似项目因清洁度标准理解偏差导致返工",
    "Tier1客户对文档完整性要求高，需提前准备",
  ],
  recommendations: [
    "启用红蓝对抗交付流程，模拟客户验收场景",
    "指派高级工程师(L4+)担任项目负责人",
    "建立每周风险复盘机制",
    "预留10%的项目缓冲时间",
  ],
};

const mockUrsChecklist = [
  { item: "清洁度要求明确", status: "Pass" as const, notes: "NVH ≤ 0.5mg/件" },
  { item: "节拍要求确认", status: "Pass" as const, notes: "60s/件" },
  { item: "工艺流程确认", status: "Warning" as const, notes: "干燥方式待最终确认" },
  { item: "接口标准确认", status: "Pass" as const, notes: "符合客户MES接口规范" },
  { item: "安全标准确认", status: "Pass" as const, notes: "CE认证要求" },
  { item: "环保要求确认", status: "Pending" as const, notes: "废水处理方案待评审" },
];

const mockTeamAllocation = [
  { role: "项目经理", name: "张工", level: "L4", status: "已确认" },
  { role: "机械设计", name: "焦斌", level: "L3", status: "已确认" },
  { role: "电气设计", name: "刘工", level: "L4", status: "已确认" },
  { role: "软件开发", name: "陈工", level: "L3", status: "待确认" },
  { role: "现场调试", name: "待分配", level: "-", status: "待分配" },
];

export default function M1KickoffDashboard() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("risk");
  const [isRedBlueDialogOpen, setIsRedBlueDialogOpen] = useState(false);
  const [redBlueConfig, setRedBlueConfig] = useState({
    redTeamLead: '',
    blueTeamLead: '',
    round1Date: '',
    round2Date: '',
    round3Date: '',
    objectives: '',
  });

  const handleSaveRedBlueConfig = () => {
    // 功能完善中提示
    toast({
      title: '配置已保存',
      description: '红蓝对抗计划配置已保存，完整功能正在开发中',
    });
    setIsRedBlueDialogOpen(false);
  };

  const riskLevelColors = createStatusColorMap({
    Critical: "red",
    High: "orange",
    Medium: "yellow",
    Low: "green",
  });

  const ursStatusColors = createStatusColorMap({
    Pass: "green",
    Warning: "yellow",
    Fail: "red",
    Pending: "gray",
  });

  const ursStatusLabels: Record<string, string> = {
    Pass: "通过",
    Warning: "警告",
    Fail: "失败",
    Pending: "待确认",
  };

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Target}
          title="M1 项目启动会仪表盘"
          description="Risk Radar AI Agent 风险预警 · URS评审 · 红蓝对抗配置"
          actions={
            <>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                导出报告
              </Button>
              <Button>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                确认启动
              </Button>
            </>
          }
        />

        {/* 项目概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="项目编号" value={mockProjectData.projectNo} />
          <StatCard icon={Users} label="客户" value={mockProjectData.customerName} subtitle={mockProjectData.customerTier} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
          <StatCard icon={TrendingUp} label="合同金额" value={`¥${(mockProjectData.contractValue / 10000).toFixed(0)}万`} iconColor="text-green-500" iconBg="bg-green-500/10" />
          <StatCard icon={Clock} label="目标交付" value={mockProjectData.targetDeliveryDate} iconColor="text-orange-500" iconBg="bg-orange-500/10" />
        </div>

        {/* 风险评估总览 */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                AI风险评估结果
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">风险等级:</span>
                <StatusBadge color={riskLevelColors[mockRiskAssessment.riskLevel as keyof typeof riskLevelColors] ?? "gray"}>
                  {mockRiskAssessment.riskLevel}
                </StatusBadge>
                <span className="text-sm text-muted-foreground ml-2">评分:</span>
                <span className="font-bold">{mockRiskAssessment.riskScore}/100</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Progress value={mockRiskAssessment.riskScore} className="h-2" />
            </div>
            {mockRiskAssessment.requiresRedBlueConfrontation && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-medium">
                  ⚠️ 强制要求：本项目需启用红蓝对抗交付流程
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 详细内容Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="risk">
              <AlertTriangle className="w-4 h-4 mr-2" />
              风险分析
            </TabsTrigger>
            <TabsTrigger value="urs">
              <FileCheck className="w-4 h-4 mr-2" />
              URS评审
            </TabsTrigger>
            <TabsTrigger value="team">
              <UserCheck className="w-4 h-4 mr-2" />
              团队配置
            </TabsTrigger>
            <TabsTrigger value="redblue">
              <Shield className="w-4 h-4 mr-2" />
              红蓝对抗
            </TabsTrigger>
          </TabsList>

          {/* 风险分析Tab */}
          <TabsContent value="risk" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 识别的风险 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">识别的风险</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockRiskAssessment.identifiedRisks.map((risk, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{risk.category}</Badge>
                        <div className="flex gap-2">
                          <span className="text-xs">概率: <Badge variant="secondary">{risk.probability}</Badge></span>
                          <span className="text-xs">影响: <Badge variant="secondary">{risk.impact}</Badge></span>
                        </div>
                      </div>
                      <p className="text-sm mb-2">{risk.description}</p>
                      <p className="text-xs text-muted-foreground">
                        <strong>缓解措施:</strong> {risk.mitigation}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 历史教训和建议 */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">历史教训</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {mockRiskAssessment.historicalLessons.map((lesson, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {lesson}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI建议</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {mockRiskAssessment.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* URS评审Tab */}
          <TabsContent value="urs">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">URS评审检查清单</CardTitle>
                <CardDescription>用户需求规格书关键项确认</CardDescription>
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
                      {mockUrsChecklist.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-3">{item.item}</td>
                          <td className="p-3">
                            <StatusBadge color={ursStatusColors[item.status as keyof typeof ursStatusColors] ?? "gray"}>
                              {ursStatusLabels[item.status] ?? item.status}
                            </StatusBadge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{item.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 团队配置Tab */}
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">项目团队配置</CardTitle>
                <CardDescription>基于能力等级的团队分配</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">角色</th>
                        <th className="text-left p-3">人员</th>
                        <th className="text-left p-3">能力等级</th>
                        <th className="text-left p-3">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockTeamAllocation.map((member, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-3">{member.role}</td>
                          <td className="p-3">{member.name}</td>
                          <td className="p-3">
                            {member.level !== "-" ? (
                              <Badge variant="outline">{member.level}</Badge>
                            ) : "-"}
                          </td>
                          <td className="p-3">
                            <Badge 
                              className={
                                member.status === "已确认" ? "bg-green-500" :
                                member.status === "待确认" ? "bg-yellow-500" : "bg-gray-500"
                              }
                            >
                              {member.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 红蓝对抗Tab */}
          <TabsContent value="redblue">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-500" />
                  红蓝对抗交付配置
                </CardTitle>
                <CardDescription>
                  Tier1客户强制要求：模拟客户验收场景，暴露系统和组织弱点
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-red-500/5 border-red-500/30">
                    <h3 className="font-bold text-red-500 mb-2">🔴 红队 (模拟客户)</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• 模拟客户验收标准和挑剔程度</li>
                      <li>• 制造各种异常场景和边界条件</li>
                      <li>• 评估文档完整性和专业性</li>
                      <li>• 检验团队应急响应能力</li>
                    </ul>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">红队负责人:</p>
                      <Badge variant="outline" className="mt-1">待分配 (建议L4+工程师)</Badge>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-blue-500/5 border-blue-500/30">
                    <h3 className="font-bold text-blue-500 mb-2">🔵 蓝队 (交付团队)</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• 按标准流程执行交付</li>
                      <li>• 只能依赖系统和流程响应</li>
                      <li>• 记录所有问题和解决方案</li>
                      <li>• 验证SOP和文档有效性</li>
                    </ul>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">蓝队负责人:</p>
                      <Badge variant="outline" className="mt-1">{mockProjectData.projectManager}</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-bold mb-2">对抗计划时间表</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>M4设计评审后 - 第一轮对抗</span>
                      <Badge variant="outline">计划中</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>M6出厂前 - 第二轮对抗</span>
                      <Badge variant="outline">计划中</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>M7预验收前 - 第三轮对抗</span>
                      <Badge variant="outline">计划中</Badge>
                    </div>
                  </div>
                </div>

                <Dialog open={isRedBlueDialogOpen} onOpenChange={setIsRedBlueDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Shield className="w-4 h-4 mr-2" />
                      配置红蓝对抗计划
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>红蓝对抗计划配置</DialogTitle>
                      <DialogDescription>配置项目的红蓝对抗交付流程</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label>红队负责人</Label>
                        <Select 
                          value={redBlueConfig.redTeamLead} 
                          onValueChange={(v) => setRedBlueConfig({...redBlueConfig, redTeamLead: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择红队负责人" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待分配 (建议L4+工程师)</SelectItem>
                            <SelectItem value="zhang">张工 (L4)</SelectItem>
                            <SelectItem value="li">李工 (L5)</SelectItem>
                            <SelectItem value="wang">焦斌 (L4)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>蓝队负责人</Label>
                        <Select 
                          value={redBlueConfig.blueTeamLead} 
                          onValueChange={(v) => setRedBlueConfig({...redBlueConfig, blueTeamLead: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择蓝队负责人" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="zhang">张工</SelectItem>
                            <SelectItem value="li">李工</SelectItem>
                            <SelectItem value="wang">焦斌</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>第一轮对抗日期 (M4设计评审后)</Label>
                        <Input 
                          type="date" 
                          value={redBlueConfig.round1Date}
                          onChange={(e) => setRedBlueConfig({...redBlueConfig, round1Date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>第二轮对抗日期 (M6出厂前)</Label>
                        <Input 
                          type="date" 
                          value={redBlueConfig.round2Date}
                          onChange={(e) => setRedBlueConfig({...redBlueConfig, round2Date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>第三轮对抗日期 (M7预验收前)</Label>
                        <Input 
                          type="date" 
                          value={redBlueConfig.round3Date}
                          onChange={(e) => setRedBlueConfig({...redBlueConfig, round3Date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>对抗目标</Label>
                        <Select 
                          value={redBlueConfig.objectives} 
                          onValueChange={(v) => setRedBlueConfig({...redBlueConfig, objectives: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择对抗目标" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">标准验收流程</SelectItem>
                            <SelectItem value="strict">严格验收流程 (Tier1)</SelectItem>
                            <SelectItem value="custom">自定义流程</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsRedBlueDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleSaveRedBlueConfig}>
                        保存配置
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
