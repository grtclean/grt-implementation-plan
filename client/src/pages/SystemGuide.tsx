/**
 * 系统使用规范与工作指导书页面
 * 
 * 功能：
 * 1. 系统使用规范文档
 * 2. 各角色工作指导书
 * 3. 操作流程指南
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  FileText,
  Search,
  Settings,
  Shield,
  User,
  Users,
  Wrench,
  DollarSign,
  ClipboardList,
  Target,
  AlertTriangle
} from "lucide-react";
import { PageHeader } from "@/components/grt";

// 系统使用规范
const systemGuidelines = [
  {
    id: "SG-001",
    title: "系统登录与安全规范",
    category: "安全",
    icon: Shield,
    content: [
      "使用企业邮箱账号登录系统",
      "首次登录需修改初始密码",
      "密码需包含大小写字母、数字和特殊字符",
      "连续3次登录失败将锁定账号30分钟",
      "离开工位时需锁定屏幕或退出系统",
      "禁止共享账号或将密码告知他人",
    ],
  },
  {
    id: "SG-002",
    title: "数据录入规范",
    category: "操作",
    icon: FileText,
    content: [
      "所有必填字段必须完整填写",
      "金额类数据保留2位小数",
      "日期格式统一为YYYY-MM-DD",
      "客户名称使用全称，不使用简称",
      "附件命名规范：项目编号_文档类型_版本号",
      "敏感数据需进行脱敏处理",
    ],
  },
  {
    id: "SG-003",
    title: "审批流程规范",
    category: "流程",
    icon: ClipboardList,
    content: [
      "所有审批需在24小时内完成",
      "驳回时必须填写驳回原因",
      "紧急审批需电话通知审批人",
      "审批人不在时需设置代理人",
      "重大事项需多级审批",
      "审批记录需完整保存",
    ],
  },
  {
    id: "SG-004",
    title: "文档管理规范",
    category: "文档",
    icon: BookOpen,
    content: [
      "文档版本号从V1.0开始",
      "重大修改版本号+1.0，小修改+0.1",
      "修改需填写变更记录",
      "归档文档不可修改",
      "机密文档需设置访问权限",
      "定期备份重要文档",
    ],
  },
];

// 角色工作指导书
const roleGuides = [
  {
    id: "RG-PM",
    role: "项目经理",
    icon: Target,
    color: "bg-blue-500",
    description: "负责项目全生命周期管理，确保项目按时按质交付",
    modules: ["项目管理", "成本管理", "进度管理", "风险管理"],
    dailyTasks: [
      "查看项目仪表盘，了解项目整体状态",
      "处理待审批事项（变更、采购、付款等）",
      "更新项目进度和里程碑状态",
      "召开项目例会并记录会议纪要",
      "跟进风险和问题的解决进展",
    ],
    keyOperations: [
      { name: "创建项目", path: "/projects", description: "新项目立项时创建项目档案" },
      { name: "项目阶段推进", path: "/projects", description: "完成阶段门禁检查后推进项目阶段" },
      { name: "变更管理", path: "/projects", description: "处理项目范围、进度、成本变更" },
      { name: "风险管理", path: "/risks", description: "识别、评估和跟踪项目风险" },
    ],
  },
  {
    id: "RG-DE",
    role: "设计工程师",
    icon: Wrench,
    color: "bg-green-500",
    description: "负责设备技术方案设计和技术文档编制",
    modules: ["技术方案", "BOM管理", "图纸管理", "设计评审"],
    dailyTasks: [
      "查看分配的设计任务",
      "编制和更新技术文档",
      "参与设计评审会议",
      "处理技术问题和变更",
      "更新BOM清单和图纸",
    ],
    keyOperations: [
      { name: "技术方案编制", path: "/docs", description: "编写项目技术方案书" },
      { name: "BOM管理", path: "/docs", description: "创建和维护设备BOM清单" },
      { name: "设计评审", path: "/projects", description: "参与和记录设计评审" },
      { name: "图纸管理", path: "/live-documents", description: "上传和管理设计图纸" },
    ],
  },
  {
    id: "RG-SE",
    role: "销售工程师",
    icon: DollarSign,
    color: "bg-orange-500",
    description: "负责客户开发、商机跟进和合同签订",
    modules: ["CRM", "商机管理", "报价管理", "合同管理"],
    dailyTasks: [
      "跟进客户和商机状态",
      "更新销售漏斗信息",
      "准备和发送报价单",
      "安排客户拜访和会议",
      "处理客户反馈和需求",
    ],
    keyOperations: [
      { name: "客户管理", path: "/crm/customers", description: "维护客户信息和联系人" },
      { name: "商机跟进", path: "/crm/opportunities", description: "跟进商机进展和阶段推进" },
      { name: "报价管理", path: "/crm/opportunities", description: "创建和发送报价单" },
      { name: "合同管理", path: "/docs", description: "管理销售合同和技术协议" },
    ],
  },
  {
    id: "RG-HR",
    role: "人事经理",
    icon: Users,
    color: "bg-purple-500",
    description: "负责人力资源管理和员工发展",
    modules: ["招聘管理", "培训管理", "绩效管理", "考勤管理"],
    dailyTasks: [
      "处理招聘流程和面试安排",
      "管理员工培训计划",
      "处理员工入离职手续",
      "更新员工档案信息",
      "处理考勤异常和请假审批",
    ],
    keyOperations: [
      { name: "招聘管理", path: "/hrm-intelligent", description: "发布职位和管理招聘流程" },
      { name: "培训管理", path: "/training", description: "安排和跟踪员工培训" },
      { name: "员工档案", path: "/hrm-intelligent", description: "维护员工基本信息" },
      { name: "考勤管理", path: "/hrm-intelligent", description: "处理考勤和请假" },
    ],
  },
  {
    id: "RG-FM",
    role: "财务经理",
    icon: Briefcase,
    color: "bg-red-500",
    description: "负责财务管理和成本控制",
    modules: ["成本管理", "付款管理", "发票管理", "预算管理"],
    dailyTasks: [
      "审核付款申请",
      "处理发票开具和核销",
      "监控项目成本执行",
      "编制财务报表",
      "处理报销审批",
    ],
    keyOperations: [
      { name: "成本管理", path: "/cost", description: "监控和分析项目成本" },
      { name: "付款审批", path: "/cost", description: "审核和处理付款申请" },
      { name: "发票管理", path: "/cost", description: "管理发票开具和核销" },
      { name: "预算管理", path: "/annual-planning", description: "编制和监控预算执行" },
    ],
  },
];

export default function SystemGuide() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("guidelines");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <PageHeader
          icon={BookOpen}
          title="系统使用规范"
          description="系统操作规范和各角色工作指导书"
          actions={
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索指南..."
                className="pl-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guidelines" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              系统规范
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              角色指导书
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              常见问题
            </TabsTrigger>
          </TabsList>

          {/* 系统规范 Tab */}
          <TabsContent value="guidelines" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {systemGuidelines.map(guide => (
                <Card key={guide.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <guide.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{guide.title}</CardTitle>
                        <Badge variant="outline" className="mt-1">{guide.category}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {guide.content.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 角色指导书 Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 角色列表 */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">选择角色</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {roleGuides.map(role => (
                    <div
                      key={role.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3 ${
                        selectedRole === role.id 
                          ? "bg-primary/10 border border-primary/30" 
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedRole(role.id)}
                    >
                      <div className={`p-2 rounded-lg ${role.color}`}>
                        <role.icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{role.role}</p>
                        <p className="text-xs text-muted-foreground">
                          {role.modules.length} 个模块
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 角色详情 */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedRole 
                      ? roleGuides.find(r => r.id === selectedRole)?.role + " 工作指导书"
                      : "请选择角色"
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRole ? (
                    <ScrollArea className="h-[500px] pr-4">
                      {(() => {
                        const role = roleGuides.find(r => r.id === selectedRole);
                        if (!role) return null;
                        return (
                          <div className="space-y-6">
                            {/* 角色描述 */}
                            <div>
                              <h4 className="font-medium mb-2">角色职责</h4>
                              <p className="text-sm text-muted-foreground">{role.description}</p>
                            </div>

                            {/* 负责模块 */}
                            <div>
                              <h4 className="font-medium mb-2">负责模块</h4>
                              <div className="flex flex-wrap gap-2">
                                {role.modules.map((module, idx) => (
                                  <Badge key={idx} variant="secondary">{module}</Badge>
                                ))}
                              </div>
                            </div>

                            {/* 日常工作 */}
                            <div>
                              <h4 className="font-medium mb-2">日常工作</h4>
                              <ul className="space-y-2">
                                {role.dailyTasks.map((task, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="text-muted-foreground">{idx + 1}.</span>
                                    <span>{task}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* 关键操作 */}
                            <div>
                              <h4 className="font-medium mb-2">关键操作指南</h4>
                              <Accordion type="single" collapsible className="w-full">
                                {role.keyOperations.map((op, idx) => (
                                  <AccordionItem key={idx} value={`op-${idx}`}>
                                    <AccordionTrigger className="text-sm">
                                      {op.name}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <p className="text-sm text-muted-foreground mb-2">
                                        {op.description}
                                      </p>
                                      <Button variant="outline" size="sm" asChild>
                                        <a href={op.path}>前往操作</a>
                                      </Button>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </div>
                          </div>
                        );
                      })()}
                    </ScrollArea>
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      请从左侧选择角色查看工作指导书
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 常见问题 Tab */}
          <TabsContent value="faq" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>常见问题解答</CardTitle>
                <CardDescription>系统使用中的常见问题和解决方案</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="faq-1">
                    <AccordionTrigger>如何重置密码？</AccordionTrigger>
                    <AccordionContent>
                      点击登录页面的"忘记密码"链接，输入您的企业邮箱，系统将发送密码重置链接到您的邮箱。
                      如果无法收到邮件，请联系IT管理员。
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="faq-2">
                    <AccordionTrigger>如何申请系统权限？</AccordionTrigger>
                    <AccordionContent>
                      请联系您的部门主管或系统管理员，填写权限申请表，说明需要的模块和权限级别。
                      审批通过后，系统管理员将为您开通相应权限。
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="faq-3">
                    <AccordionTrigger>数据导出有什么限制？</AccordionTrigger>
                    <AccordionContent>
                      单次导出数据量不超过10000条。如需导出更多数据，请分批导出或联系系统管理员。
                      导出的数据仅供内部使用，禁止外传。
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="faq-4">
                    <AccordionTrigger>审批流程卡住怎么办？</AccordionTrigger>
                    <AccordionContent>
                      首先检查审批人是否在系统中设置了代理人。如果没有，请联系审批人处理。
                      紧急情况下，可以联系系统管理员进行流程干预。
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="faq-5">
                    <AccordionTrigger>如何反馈系统问题？</AccordionTrigger>
                    <AccordionContent>
                      您可以通过以下方式反馈问题：
                      1. 点击页面右下角的"帮助"按钮提交问题
                      2. 发送邮件至 it-support@company.com
                      3. 联系IT部门热线
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
