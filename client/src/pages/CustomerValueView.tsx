import { PageHeader } from "@/components/grt";
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

export default function CustomerValueView() {
  const { t } = useLanguage();
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);

  // 客户场景数据
  const CUSTOMER_SCENARIOS = [
    {
      id: 1,
      name: t("crm.value.scenarioNewFactory"),
      description: t("crm.value.scenarioNewFactoryDesc"),
      criticalRequirements: [t("crm.value.reqDeliveryTime"), t("crm.value.reqSystemIntegration"), t("crm.value.reqTrainingSupport")],
      icon: Factory,
      color: 'bg-blue-500',
    },
    {
      id: 2,
      name: t("crm.value.scenarioCapExpand"),
      description: t("crm.value.scenarioCapExpandDesc"),
      criticalRequirements: [t("crm.value.reqCompatibility"), t("crm.value.reqQuickInstall"), t("crm.value.reqMinDowntime")],
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      id: 3,
      name: t("crm.value.scenarioReplacement"),
      description: t("crm.value.scenarioReplacementDesc"),
      criticalRequirements: [t("crm.value.reqPerfImprove"), t("crm.value.reqCostEfficiency"), t("crm.value.reqOldDisposal")],
      icon: Settings,
      color: 'bg-orange-500',
    },
    {
      id: 4,
      name: t("crm.value.scenarioPrecision"),
      description: t("crm.value.scenarioPrecisionDesc"),
      criticalRequirements: [t("crm.value.reqZeroLeak"), t("crm.value.reqParticleCtrl"), t("crm.value.reqValidation")],
      icon: Target,
      color: 'bg-purple-500',
    },
    {
      id: 5,
      name: t("crm.value.scenarioProcessOpt"),
      description: t("crm.value.scenarioProcessOptDesc"),
      criticalRequirements: [t("crm.value.reqCycleOpt"), t("crm.value.reqEnergyReduction"), t("crm.value.reqQualityImprove")],
      icon: Wrench,
      color: 'bg-cyan-500',
    },
    {
      id: 6,
      name: t("crm.value.scenarioAutomation"),
      description: t("crm.value.scenarioAutomationDesc"),
      criticalRequirements: [t("crm.value.reqRobotIntegration"), t("crm.value.reqSmartMonitor"), t("crm.value.reqRemoteControl")],
      icon: Layers,
      color: 'bg-indigo-500',
    },
    {
      id: 7,
      name: t("crm.value.scenarioEnvCompliance"),
      description: t("crm.value.scenarioEnvComplianceDesc"),
      criticalRequirements: [t("crm.value.reqWastewater"), t("crm.value.reqChemMgmt"), t("crm.value.reqEnergyCert")],
      icon: CheckCircle2,
      color: 'bg-emerald-500',
    },
  ];

  // M0-M12 项目阶段
  const PROJECT_PHASES = [
    { id: 'M0', name: t("crm.value.phaseM0"), roles: ['PM', 'Sales'] },
    { id: 'M1', name: t("crm.value.phaseM1"), roles: ['PM', 'Engineer'] },
    { id: 'M2', name: t("crm.value.phaseM2"), roles: ['Engineer', 'R&D'] },
    { id: 'M3', name: t("crm.value.phaseM3"), roles: ['Engineer', 'QA'] },
    { id: 'M4', name: t("crm.value.phaseM4"), roles: ['Procurement', 'Engineer'] },
    { id: 'M5', name: t("crm.value.phaseM5"), roles: ['Production', 'QA'] },
    { id: 'M6', name: t("crm.value.phaseM6"), roles: ['Assembly', 'Engineer'] },
    { id: 'M7', name: t("crm.value.phaseM7"), roles: ['Engineer', 'QA'] },
    { id: 'M8', name: t("crm.value.phaseM8"), roles: ['QA', 'Customer'] },
    { id: 'M9', name: t("crm.value.phaseM9"), roles: ['Logistics', 'PM'] },
    { id: 'M10', name: t("crm.value.phaseM10"), roles: ['Service', 'Engineer'] },
    { id: 'M11', name: t("crm.value.phaseM11"), roles: ['Service', 'Customer'] },
    { id: 'M12', name: t("crm.value.phaseM12"), roles: ['PM', 'Customer'] },
  ];

  // 技能等级定义
  const SKILL_LEVELS = [
    { level: 1, name: t("crm.value.skillL1"), description: t("crm.value.skillL1Desc") },
    { level: 2, name: t("crm.value.skillL2"), description: t("crm.value.skillL2Desc") },
    { level: 3, name: t("crm.value.skillL3"), description: t("crm.value.skillL3Desc") },
    { level: 4, name: t("crm.value.skillL4"), description: t("crm.value.skillL4Desc") },
    { level: 5, name: t("crm.value.skillL5"), description: t("crm.value.skillL5Desc") },
  ];

  // 示例用户数据
  const SAMPLE_USER = {
    name: t("crm.value.sampleUserName"),
    role: t("crm.value.sampleUserRole"),
    department: 'Production',
    level: 3,
    m0m12Roles: ['M6_Lead', 'M7_Support'],
    currentProject: 'Project X - BMW',
    currentPhase: 'M6',
    customerScenario: 4,
    mission: t("crm.value.sampleMission"),
    actionItem: t("crm.value.sampleActionItem"),
    nextLevelRequirement: t("crm.value.sampleNextLevelReq"),
  };

  // 能力域
  const CAPABILITY_DOMAINS = [
    { code: 'T', name: t("crm.value.domainTech") },
    { code: 'S', name: t("crm.value.domainSystem") },
    { code: 'D', name: t("crm.value.domainDelivery") },
    { code: 'C', name: t("crm.value.domainCustomerValue") },
    { code: 'K', name: t("crm.value.domainKnowledge") },
    { code: 'L', name: t("crm.value.domainLeadership") },
  ];

  return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader
          icon={Users}
          title={t("crm.value.title")}
          description={t("crm.value.description")}
        />

        {/* 当前用户任务卡片 */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{SAMPLE_USER.name}</CardTitle>
                  <CardDescription>{SAMPLE_USER.role}</CardDescription>
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
                  {t("crm.value.myMission")}
                </div>
                <p className="font-semibold text-lg">
                  {SAMPLE_USER.mission}
                </p>
                <Badge variant="secondary">
                  {t("crm.value.scenario4Label")}
                </Badge>
              </div>

              {/* 当前任务 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  {t("crm.value.currentTask")}
                </div>
                <p className="font-semibold">{SAMPLE_USER.currentProject}</p>
                <div className="flex items-center gap-2">
                  <Badge>{SAMPLE_USER.currentPhase}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {t("crm.value.assemblyPhase")}
                  </span>
                </div>
              </div>

              {/* 待办事项 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardCheck className="w-4 h-4" />
                  {t("crm.value.actionItem")}
                </div>
                <p className="font-semibold">
                  {SAMPLE_USER.actionItem}
                </p>
                <Button size="sm" variant="outline">
                  {t("crm.value.markComplete")}
                </Button>
              </div>
            </div>

            {/* 晋升要求 */}
            <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  {t("crm.value.promotionReq").replace("{level}", String(SAMPLE_USER.level + 1))}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {SAMPLE_USER.nextLevelRequirement}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="scenarios" className="space-y-4">
          <TabsList>
            <TabsTrigger value="scenarios">
              <Target className="w-4 h-4 mr-2" />
              {t("crm.value.tabScenarios")}
            </TabsTrigger>
            <TabsTrigger value="phases">
              <Layers className="w-4 h-4 mr-2" />
              {t("crm.value.tabPhases")}
            </TabsTrigger>
            <TabsTrigger value="skills">
              <Award className="w-4 h-4 mr-2" />
              {t("crm.value.tabSkills")}
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
                            {scenario.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Scenario {scenario.id}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {scenario.description}
                      </p>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("crm.value.criticalRequirements")}:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {scenario.criticalRequirements.map((req, idx) => (
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
                <CardTitle>{t("crm.value.lifecycleTitle")}</CardTitle>
                <CardDescription>
                  {t("crm.value.lifecycleDesc")}
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
                      <TableHead>{t("crm.value.colPhase")}</TableHead>
                      <TableHead>{t("crm.value.colName")}</TableHead>
                      <TableHead>{t("crm.value.colRoles")}</TableHead>
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
                          {phase.name}
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
                      {skill.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {skill.description}
                    </p>
                    {skill.level === SAMPLE_USER.level && (
                      <Badge className="mt-2 bg-primary">
                        {t("crm.value.currentLevel")}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>{t("crm.value.capabilityDomains")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {CAPABILITY_DOMAINS.map((domain) => (
                    <div key={domain.code} className="p-3 rounded-lg bg-muted/50 text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mx-auto mb-2">
                        {domain.code}
                      </div>
                      <p className="text-sm font-medium">{domain.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
