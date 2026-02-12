import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Users,
  Target,
  Briefcase,
  Award,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Layers,
  Settings,
  Wrench,
  Factory,
  Truck,
  ClipboardCheck,
  Star
} from "lucide-react";
import { useState } from "react";

// 客户场景数据
const CUSTOMER_SCENARIOS = [
  {
    id: 1,
    name: '新工厂建设',
    nameEn: 'New Factory Setup',
    description: '客户正在建设新工厂，需要全套清洗设备',
    descriptionEn: 'Customer building new factory, needs complete cleaning equipment',
    criticalRequirements: ['交付时间', '系统集成', '培训支持'],
    criticalRequirementsEn: ['Delivery Time', 'System Integration', 'Training Support'],
    icon: Factory,
    color: 'bg-blue-500',
  },
  {
    id: 2,
    name: '产能扩张',
    nameEn: 'Capacity Expansion',
    description: '客户需要增加产能，添加新的清洗线',
    descriptionEn: 'Customer needs to increase capacity, add new cleaning lines',
    criticalRequirements: ['兼容性', '快速安装', '最小停机'],
    criticalRequirementsEn: ['Compatibility', 'Quick Installation', 'Minimal Downtime'],
    icon: TrendingUp,
    color: 'bg-green-500',
  },
  {
    id: 3,
    name: '设备更换',
    nameEn: 'Equipment Replacement',
    description: '客户需要更换老旧设备',
    descriptionEn: 'Customer needs to replace aging equipment',
    criticalRequirements: ['性能提升', '成本效益', '旧设备处理'],
    criticalRequirementsEn: ['Performance Improvement', 'Cost Efficiency', 'Old Equipment Disposal'],
    icon: Settings,
    color: 'bg-orange-500',
  },
  {
    id: 4,
    name: '精密清洗升级',
    nameEn: 'Precision Cleaning Upgrade',
    description: '客户需要更高的清洁度标准（<50微米颗粒）',
    descriptionEn: 'Customer needs higher cleanliness standards (<50 micron particles)',
    criticalRequirements: ['零泄漏', '颗粒控制', '验证测试'],
    criticalRequirementsEn: ['Zero Leakage', 'Particle Control', 'Validation Testing'],
    icon: Target,
    color: 'bg-purple-500',
  },
  {
    id: 5,
    name: '工艺优化',
    nameEn: 'Process Optimization',
    description: '客户需要优化现有清洗工艺',
    descriptionEn: 'Customer needs to optimize existing cleaning process',
    criticalRequirements: ['节拍优化', '能耗降低', '质量提升'],
    criticalRequirementsEn: ['Cycle Time Optimization', 'Energy Reduction', 'Quality Improvement'],
    icon: Wrench,
    color: 'bg-cyan-500',
  },
  {
    id: 6,
    name: '自动化升级',
    nameEn: 'Automation Upgrade',
    description: '客户需要提升自动化水平',
    descriptionEn: 'Customer needs to improve automation level',
    criticalRequirements: ['机器人集成', '智能监控', '远程控制'],
    criticalRequirementsEn: ['Robot Integration', 'Smart Monitoring', 'Remote Control'],
    icon: Layers,
    color: 'bg-indigo-500',
  },
  {
    id: 7,
    name: '环保合规',
    nameEn: 'Environmental Compliance',
    description: '客户需要满足环保法规要求',
    descriptionEn: 'Customer needs to meet environmental regulations',
    criticalRequirements: ['废水处理', '化学品管理', '能效认证'],
    criticalRequirementsEn: ['Wastewater Treatment', 'Chemical Management', 'Energy Certification'],
    icon: CheckCircle2,
    color: 'bg-emerald-500',
  },
];

// M0-M12 项目阶段
const PROJECT_PHASES = [
  { id: 'M0', name: '立项', nameEn: 'Project Initiation', roles: ['PM', 'Sales'] },
  { id: 'M1', name: '需求确认', nameEn: 'Requirements Confirmation', roles: ['PM', 'Engineer'] },
  { id: 'M2', name: '方案设计', nameEn: 'Solution Design', roles: ['Engineer', 'R&D'] },
  { id: 'M3', name: '设计评审', nameEn: 'Design Review', roles: ['Engineer', 'QA'] },
  { id: 'M4', name: '采购', nameEn: 'Procurement', roles: ['Procurement', 'Engineer'] },
  { id: 'M5', name: '生产', nameEn: 'Production', roles: ['Production', 'QA'] },
  { id: 'M6', name: '装配', nameEn: 'Assembly', roles: ['Assembly', 'Engineer'] },
  { id: 'M7', name: '调试', nameEn: 'Debugging', roles: ['Engineer', 'QA'] },
  { id: 'M8', name: 'FAT', nameEn: 'Factory Acceptance Test', roles: ['QA', 'Customer'] },
  { id: 'M9', name: '发货', nameEn: 'Shipping', roles: ['Logistics', 'PM'] },
  { id: 'M10', name: '安装', nameEn: 'Installation', roles: ['Service', 'Engineer'] },
  { id: 'M11', name: 'SAT', nameEn: 'Site Acceptance Test', roles: ['Service', 'Customer'] },
  { id: 'M12', name: '验收', nameEn: 'Final Acceptance', roles: ['PM', 'Customer'] },
];

// 技能等级定义
const SKILL_LEVELS = [
  { level: 1, name: 'L1 - 初级', nameEn: 'L1 - Junior', description: '基础操作能力', descriptionEn: 'Basic operational skills' },
  { level: 2, name: 'L2 - 中级', nameEn: 'L2 - Intermediate', description: '独立执行能力', descriptionEn: 'Independent execution' },
  { level: 3, name: 'L3 - 高级', nameEn: 'L3 - Senior', description: '复杂问题处理', descriptionEn: 'Complex problem solving' },
  { level: 4, name: 'L4 - 专家', nameEn: 'L4 - Expert', description: '技术创新与指导', descriptionEn: 'Technical innovation & guidance' },
  { level: 5, name: 'L5 - 大师', nameEn: 'L5 - Master', description: '战略决策与标准制定', descriptionEn: 'Strategic decisions & standards' },
];

// 示例用户数据
const SAMPLE_USER = {
  name: '张工',
  nameEn: 'Zhang',
  role: '装配工程师 L3',
  roleEn: 'Assembly Engineer L3',
  department: 'Production',
  level: 3,
  m0m12Roles: ['M6_Lead', 'M7_Support'],
  currentProject: 'Project X - BMW清洗线',
  currentPhase: 'M6',
  customerScenario: 4,
  mission: '确保真空腔体零泄漏',
  missionEn: 'Ensure Zero-Leakage in Vacuum Chambers',
  actionItem: '验证密封完整性 - 使用氦检漏仪',
  actionItemEn: 'Verify seal integrity - Using Helium Leak Detector',
  nextLevelRequirement: '提出1项工艺优化建议，将M6周期时间缩短10%',
  nextLevelRequirementEn: 'Propose 1 process optimization to reduce M6 cycle time by 10%',
};

export default function CustomerValueView() {
  const { language } = useLanguage();
  const isZh = language === 'zh';
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              {isZh ? '客户价值视图' : 'Customer Value View'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isZh 
                ? '基于角色的客户场景映射与任务驱动视图' 
                : 'Role-based customer scenario mapping and task-driven view'}
            </p>
          </div>
        </div>

        {/* 当前用户任务卡片 */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{isZh ? SAMPLE_USER.name : SAMPLE_USER.nameEn}</CardTitle>
                  <CardDescription>{isZh ? SAMPLE_USER.role : SAMPLE_USER.roleEn}</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-1">
                L{SAMPLE_USER.level}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 使命 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="w-4 h-4" />
                  {isZh ? '我的使命' : 'My Mission'}
                </div>
                <p className="font-semibold text-lg">
                  {isZh ? SAMPLE_USER.mission : SAMPLE_USER.missionEn}
                </p>
                <Badge variant="secondary">
                  {isZh ? '场景4: 精密清洗升级' : 'Scenario 4: Precision Cleaning'}
                </Badge>
              </div>

              {/* 当前任务 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  {isZh ? '当前任务' : 'Current Task'}
                </div>
                <p className="font-semibold">{SAMPLE_USER.currentProject}</p>
                <div className="flex items-center gap-2">
                  <Badge>{SAMPLE_USER.currentPhase}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {isZh ? '装配阶段' : 'Assembly Phase'}
                  </span>
                </div>
              </div>

              {/* 待办事项 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardCheck className="w-4 h-4" />
                  {isZh ? '待办事项' : 'Action Item'}
                </div>
                <p className="font-semibold">
                  {isZh ? SAMPLE_USER.actionItem : SAMPLE_USER.actionItemEn}
                </p>
                <Button size="sm" variant="outline">
                  {isZh ? '标记完成' : 'Mark Complete'}
                </Button>
              </div>
            </div>

            {/* 晋升要求 */}
            <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  {isZh ? `晋升到 L${SAMPLE_USER.level + 1} 的要求` : `Requirement for L${SAMPLE_USER.level + 1}`}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isZh ? SAMPLE_USER.nextLevelRequirement : SAMPLE_USER.nextLevelRequirementEn}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="scenarios" className="space-y-4">
          <TabsList>
            <TabsTrigger value="scenarios">
              <Target className="w-4 h-4 mr-2" />
              {isZh ? '客户场景' : 'Customer Scenarios'}
            </TabsTrigger>
            <TabsTrigger value="phases">
              <Layers className="w-4 h-4 mr-2" />
              {isZh ? 'M0-M12阶段' : 'M0-M12 Phases'}
            </TabsTrigger>
            <TabsTrigger value="skills">
              <Award className="w-4 h-4 mr-2" />
              {isZh ? '技能等级' : 'Skill Levels'}
            </TabsTrigger>
          </TabsList>

          {/* 客户场景 */}
          <TabsContent value="scenarios" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {CUSTOMER_SCENARIOS.map((scenario) => {
                const Icon = scenario.icon;
                const isSelected = selectedScenario === scenario.id;
                return (
                  <Card 
                    key={scenario.id} 
                    className={`bg-card border-border cursor-pointer transition-all hover:shadow-lg ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedScenario(isSelected ? null : scenario.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${scenario.color} text-white`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {isZh ? scenario.name : scenario.nameEn}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Scenario {scenario.id}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {isZh ? scenario.description : scenario.descriptionEn}
                      </p>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {isZh ? '关键需求:' : 'Critical Requirements:'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(isZh ? scenario.criticalRequirements : scenario.criticalRequirementsEn).map((req, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* M0-M12阶段 */}
          <TabsContent value="phases" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{isZh ? '项目全生命周期阶段' : 'Project Lifecycle Phases'}</CardTitle>
                <CardDescription>
                  {isZh ? 'M0-M12阶段门禁管控流程' : 'M0-M12 Stage Gate Control Process'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {PROJECT_PHASES.map((phase, idx) => (
                    <div key={phase.id} className="flex items-center">
                      <div className={`px-3 py-2 rounded-lg border ${
                        phase.id === SAMPLE_USER.currentPhase 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-muted border-border'
                      }`}>
                        <span className="font-mono font-bold">{phase.id}</span>
                      </div>
                      {idx < PROJECT_PHASES.length - 1 && (
                        <ArrowRight className="w-4 h-4 mx-1 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isZh ? '阶段' : 'Phase'}</TableHead>
                      <TableHead>{isZh ? '名称' : 'Name'}</TableHead>
                      <TableHead>{isZh ? '参与角色' : 'Involved Roles'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PROJECT_PHASES.map((phase) => (
                      <TableRow key={phase.id} className={
                        phase.id === SAMPLE_USER.currentPhase ? 'bg-primary/5' : ''
                      }>
                        <TableCell>
                          <Badge variant={phase.id === SAMPLE_USER.currentPhase ? 'default' : 'outline'}>
                            {phase.id}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {isZh ? phase.name : phase.nameEn}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {phase.roles.map((role, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 技能等级 */}
          <TabsContent value="skills" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {SKILL_LEVELS.map((skill) => (
                <Card 
                  key={skill.level} 
                  className={`bg-card border-border ${
                    skill.level === SAMPLE_USER.level ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        skill.level <= SAMPLE_USER.level ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {skill.level}
                      </div>
                      {isZh ? skill.name.split(' - ')[1] : skill.nameEn.split(' - ')[1]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {isZh ? skill.description : skill.descriptionEn}
                    </p>
                    {skill.level === SAMPLE_USER.level && (
                      <Badge className="mt-2 bg-primary">
                        {isZh ? '当前等级' : 'Current Level'}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{isZh ? '能力域说明' : 'Capability Domains'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { code: 'T', name: '技术', nameEn: 'Technology' },
                    { code: 'S', name: '系统理解', nameEn: 'System Understanding' },
                    { code: 'D', name: '交付', nameEn: 'Delivery' },
                    { code: 'C', name: '客户价值', nameEn: 'Customer Value' },
                    { code: 'K', name: '知识沉淀', nameEn: 'Knowledge Precipitation' },
                    { code: 'L', name: '领导力', nameEn: 'Leadership' },
                  ].map((domain) => (
                    <div key={domain.code} className="p-3 rounded-lg bg-muted/50 text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mx-auto mb-2">
                        {domain.code}
                      </div>
                      <p className="text-sm font-medium">{isZh ? domain.name : domain.nameEn}</p>
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
