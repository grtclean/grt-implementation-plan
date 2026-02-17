import Layout from "@/components/Layout";
import { PageHeader } from "@/components/grt";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Brain, 
  Target, 
  Shield, 
  BookOpen, 
  Users, 
  Briefcase, 
  Factory, 
  HeartHandshake,
  ArrowRight,
  CheckCircle2,
  Zap,
  Award,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Swords
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function CapabilityOS() {
  const { language } = useLanguage();

  // TSDCKL 六大能力域
  const capabilityDomains = [
    {
      code: "T",
      title: language === 'zh' ? "技术能力" : "Technical Capability",
      titleEn: "Technical",
      description: language === 'zh' 
        ? "设备原理、故障诊断、调试优化、技术创新"
        : "Equipment principles, fault diagnosis, debugging optimization, technical innovation",
      examples: language === 'zh'
        ? ["超声波清洗原理", "真空干燥技术", "PLC编程", "故障诊断"]
        : ["Ultrasonic cleaning", "Vacuum drying", "PLC programming", "Fault diagnosis"],
      color: "from-blue-500 to-cyan-500",
      icon: Zap
    },
    {
      code: "S",
      title: language === 'zh' ? "系统理解" : "System Understanding",
      titleEn: "System",
      description: language === 'zh'
        ? "整体架构、模块关联、系统集成、全局优化"
        : "Overall architecture, module relationships, system integration, global optimization",
      examples: language === 'zh'
        ? ["清洗线整体设计", "工艺流程优化", "系统集成", "产能规划"]
        : ["Cleaning line design", "Process optimization", "System integration", "Capacity planning"],
      color: "from-purple-500 to-pink-500",
      icon: Brain
    },
    {
      code: "D",
      title: language === 'zh' ? "交付能力" : "Delivery Capability",
      titleEn: "Delivery",
      description: language === 'zh'
        ? "项目管理、进度控制、质量保障、风险管理"
        : "Project management, schedule control, quality assurance, risk management",
      examples: language === 'zh'
        ? ["项目计划制定", "进度跟踪", "质量检查", "风险预警"]
        : ["Project planning", "Progress tracking", "Quality inspection", "Risk warning"],
      color: "from-green-500 to-emerald-500",
      icon: Target
    },
    {
      code: "C",
      title: language === 'zh' ? "客户价值" : "Customer Value",
      titleEn: "Customer",
      description: language === 'zh'
        ? "需求理解、方案设计、价值交付、客户满意"
        : "Requirement understanding, solution design, value delivery, customer satisfaction",
      examples: language === 'zh'
        ? ["需求分析", "方案定制", "客户培训", "售后服务"]
        : ["Requirement analysis", "Solution customization", "Customer training", "After-sales service"],
      color: "from-orange-500 to-amber-500",
      icon: HeartHandshake
    },
    {
      code: "K",
      title: language === 'zh' ? "知识沉淀" : "Knowledge Accumulation",
      titleEn: "Knowledge",
      description: language === 'zh'
        ? "经验总结、文档编写、知识传承、最佳实践"
        : "Experience summary, documentation, knowledge transfer, best practices",
      examples: language === 'zh'
        ? ["技术文档", "案例总结", "培训材料", "标准制定"]
        : ["Technical docs", "Case summary", "Training materials", "Standard setting"],
      color: "from-indigo-500 to-violet-500",
      icon: BookOpen
    },
    {
      code: "L",
      title: language === 'zh' ? "领导与影响" : "Leadership & Influence",
      titleEn: "Leadership",
      description: language === 'zh'
        ? "团队带领、人才培养、跨部门协作、组织影响"
        : "Team leadership, talent development, cross-department collaboration, organizational influence",
      examples: language === 'zh'
        ? ["团队管理", "新人指导", "跨部门协调", "文化建设"]
        : ["Team management", "Mentoring", "Cross-dept coordination", "Culture building"],
      color: "from-rose-500 to-red-500",
      icon: Users
    }
  ];

  // L1-L5 能力等级定义
  const capabilityLevels = [
    {
      level: "L1",
      title: language === 'zh' ? "学习者" : "Learner",
      description: language === 'zh' ? "在指导下执行标准任务" : "Execute standard tasks under guidance",
      color: "bg-slate-500"
    },
    {
      level: "L2",
      title: language === 'zh' ? "执行者" : "Executor",
      description: language === 'zh' ? "独立执行标准任务" : "Execute standard tasks independently",
      color: "bg-blue-500"
    },
    {
      level: "L3",
      title: language === 'zh' ? "熟练者" : "Proficient",
      description: language === 'zh' ? "处理复杂场景，指导L1-L2" : "Handle complex scenarios, guide L1-L2",
      color: "bg-green-500"
    },
    {
      level: "L4",
      title: language === 'zh' ? "专家" : "Expert",
      description: language === 'zh' ? "解决疑难问题，定义标准" : "Solve difficult problems, define standards",
      color: "bg-purple-500"
    },
    {
      level: "L5",
      title: language === 'zh' ? "大师" : "Master",
      description: language === 'zh' ? "引领技术方向，培养专家" : "Lead technical direction, develop experts",
      color: "bg-orange-500"
    }
  ];

  // 红蓝对抗机制
  const redBlueSystem = {
    redTeam: {
      title: language === 'zh' ? "红队" : "Red Team",
      role: language === 'zh' ? "模拟客户与不确定性" : "Simulate customer & uncertainty",
      description: language === 'zh'
        ? "站在客户角度，制造真实的挑战场景，暴露系统薄弱点"
        : "Stand from customer perspective, create real challenge scenarios, expose system weaknesses",
      color: "from-red-500 to-rose-500"
    },
    blueTeam: {
      title: language === 'zh' ? "蓝队" : "Blue Team",
      role: language === 'zh' ? "只能依赖系统响应" : "Only rely on system response",
      description: language === 'zh'
        ? "不能临时救火，只能用系统已有的能力和流程应对"
        : "Cannot improvise, can only respond with existing system capabilities and processes",
      color: "from-blue-500 to-cyan-500"
    },
    triggers: language === 'zh'
      ? ["Tier1客户（如ZF、Linamar）", "高复杂度非标项目", "跨区域交付"]
      : ["Tier1 customers (e.g., ZF, Linamar)", "High-complexity non-standard projects", "Cross-regional delivery"],
    purpose: language === 'zh'
      ? "在真实交付前暴露系统与组织的薄弱点，而不是在客户现场救火"
      : "Expose system and organizational weaknesses before actual delivery, not firefighting at customer site"
  };

  // 系统域架构
  const systemDomains = [
    {
      icon: Brain,
      title: language === 'zh' ? "能力管理域" : "Capability Domain",
      subtitle: language === 'zh' ? "核心域" : "Core Domain",
      description: language === 'zh' 
        ? "TSDCKL能力定义、L1-L5等级计算、证据采集、发展路径"
        : "TSDCKL capability definition, L1-L5 level calculation, evidence collection, development path",
      features: language === 'zh' 
        ? ["六大能力域管理", "自动等级计算", "证据驱动升级", "能力画像"]
        : ["Six capability domains", "Auto level calculation", "Evidence-driven upgrade", "Capability profile"],
      color: "from-orange-500 to-amber-500"
    },
    {
      icon: HeartHandshake,
      title: language === 'zh' ? "现场服务能力域" : "Field Service Domain",
      subtitle: language === 'zh' ? "能力验证场" : "Capability Validation",
      description: language === 'zh'
        ? "基于能力匹配的服务派遣、现场执行支持、服务证据采集"
        : "Capability-based dispatch, field execution support, service evidence collection",
      features: language === 'zh'
        ? ["能力匹配派遣", "现场任务指引", "问题解决支持", "服务证据采集"]
        : ["Capability matching", "Task guidance", "Problem solving", "Evidence collection"],
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Briefcase,
      title: language === 'zh' ? "项目交付能力域" : "Project Delivery Domain",
      subtitle: language === 'zh' ? "能力训练场" : "Capability Training",
      description: language === 'zh'
        ? "M0-M12 Gate管控、Tier1红蓝对抗、项目交付验收"
        : "M0-M12 Gate control, Tier1 Red-Blue confrontation, project delivery acceptance",
      features: language === 'zh'
        ? ["Gate阶段管控", "红蓝对抗审查", "能力门槛校验", "项目复盘沉淀"]
        : ["Gate control", "Red-Blue review", "Capability threshold", "Project retrospective"],
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Factory,
      title: language === 'zh' ? "制造调试能力域" : "Manufacturing Domain",
      subtitle: language === 'zh' ? "专业训练场" : "Professional Training",
      description: language === 'zh'
        ? "生产制造、设备调试、FAT/SAT验收、质量检测"
        : "Production, equipment debugging, FAT/SAT acceptance, quality inspection",
      features: language === 'zh'
        ? ["调试任务管理", "能力认证体系", "FAT一次通过率", "质量问题闭环"]
        : ["Debug task mgmt", "Certification system", "FAT pass rate", "Quality closure"],
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Users,
      title: language === 'zh' ? "客户智能服务域" : "Customer Intelligence Domain",
      subtitle: language === 'zh' ? "能力价值体现" : "Capability Value",
      description: language === 'zh'
        ? "客户分级、服务协议、同核裁剪版、智能推荐"
        : "Customer tiering, SLA management, tailored version, intelligent recommendations",
      features: language === 'zh'
        ? ["Tier1/2/3分级", "SLA监控", "同核裁剪版", "预防性维护推荐"]
        : ["Tier1/2/3 tiering", "SLA monitoring", "Tailored version", "Preventive maintenance"],
      color: "from-rose-500 to-red-500"
    },
    {
      icon: BookOpen,
      title: language === 'zh' ? "知识与学习域" : "Knowledge & Learning Domain",
      subtitle: language === 'zh' ? "能力积累基础" : "Capability Foundation",
      description: language === 'zh'
        ? "知识库、培训管理、问题闭环、最佳实践"
        : "Knowledge base, training management, problem closure, best practices",
      features: language === 'zh'
        ? ["知识库检索", "培训与能力挂钩", "问题只发生一次", "最佳实践推广"]
        : ["Knowledge search", "Training-capability link", "One-time problem", "Best practice sharing"],
      color: "from-indigo-500 to-violet-500"
    }
  ];

  // 核心设计原则
  const principles = [
    {
      icon: Target,
      title: language === 'zh' ? "能力为核心" : "Capability-Centric",
      description: language === 'zh'
        ? "GRT的核心不是岗位，而是能力。能力是一级主数据，项目、服务、客户是能力的训练与验证场景"
        : "GRT's core is capability, not position. Capability is primary master data; projects, services, customers are training and validation scenarios"
    },
    {
      icon: Award,
      title: language === 'zh' ? "证据驱动" : "Evidence-Driven",
      description: language === 'zh'
        ? "能力来源不是培训或评价，而是来自真实的项目、服务与结果证据。能力升级必须由系统证据自动触发"
        : "Capability comes from real projects, services and results evidence, not training or evaluation. Upgrades must be auto-triggered by system evidence"
    },
    {
      icon: Shield,
      title: language === 'zh' ? "系统约束" : "System Constraints",
      description: language === 'zh'
        ? "关键业务规则内嵌到系统中，不靠人的自觉。不允许人工主观升级能力等级"
        : "Critical business rules are embedded in the system, not relying on individual discipline. Manual subjective upgrades are not allowed"
    },
    {
      icon: Lightbulb,
      title: language === 'zh' ? "问题只发生一次" : "One-Time Problem",
      description: language === 'zh'
        ? "同一个问题在组织内只允许发生一次，通过系统性学习机制固化为组织能力"
        : "The same problem is only allowed to occur once in the organization through systematic learning mechanism"
    }
  ];

  // 技术架构
  const techStack = [
    {
      name: "NocoBase",
      role: language === 'zh' ? "核心业务平台（主系统）" : "Core Business Platform (Main System)",
      description: language === 'zh'
        ? "主数据管理、业务流程、数据存储、能力计算"
        : "Master data management, business processes, data storage, capability calculation"
    },
    {
      name: "Manus",
      role: language === 'zh' ? "规划与表达层" : "Planning & Expression Layer",
      description: language === 'zh'
        ? "系统规划、蓝图维护、对内/对外展示"
        : "System planning, blueprint maintenance, internal/external presentation"
    },
    {
      name: "AI Engine",
      role: language === 'zh' ? "建议与分析引擎" : "Suggestion & Analysis Engine",
      description: language === 'zh'
        ? "智能推荐、数据分析、辅助决策（仅建议，无决策权）"
        : "Intelligent recommendations, data analysis, decision support (suggestions only, no decision authority)"
    }
  ];

  return (
    <Layout>
      <div className="relative z-10 space-y-10">
        <PageHeader
          icon={Brain}
          title={language === 'zh' ? "GRT 能力操作系统" : "GRT Capability OS"}
          description={language === 'zh' ? "能力驱动型系统架构 · TSDCKL六大能力域 · L1-L5证据驱动升级" : "Capability-Driven Architecture · TSDCKL Domains · L1-L5 Evidence-Driven Upgrades"}
        />

        {/* Hero Section */}
        <section className="relative rounded-lg overflow-hidden border border-border shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-background to-purple-500/20"></div>
          <div className="relative p-8 md:p-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono tracking-wider uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {language === 'zh' ? "能力驱动型系统架构升级 V2.1" : "Capability-Driven System Architecture V2.1"}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight text-foreground leading-tight">
              GRT {language === 'zh' ? "能力操作系统" : "Capability OS"}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed">
              {language === 'zh' 
                ? "GRT的核心不是岗位，而是能力。能力按L1-L5分级，来源于真实的项目、服务与结果证据，而非培训或评价。能力升级必须由系统证据自动触发，不允许人工主观升级。"
                : "GRT's core is capability, not position. Capabilities are graded L1-L5, sourced from real projects, services and results evidence, not training or evaluation. Upgrades must be auto-triggered by system evidence, manual subjective upgrades are not allowed."}
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/evidence-submission">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wide rounded-sm h-12 px-8 shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-primary/50">
                  {language === 'zh' ? "提交能力证据" : "Submit Evidence"} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/red-blue-board">
                <Button variant="outline" size="lg" className="bg-background/50 backdrop-blur-sm border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary font-medium tracking-wide rounded-sm h-12 px-8">
                  {language === 'zh' ? "红蓝对抗看板" : "Red-Blue Board"}
                </Button>
              </Link>
              <Link href="/capability-dashboard">
                <Button variant="outline" size="lg" className="bg-background/50 backdrop-blur-sm border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary font-medium tracking-wide rounded-sm h-12 px-8">
                  {language === 'zh' ? "能力仪表盘" : "Capability Dashboard"}
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" size="lg" className="bg-background/50 backdrop-blur-sm border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary font-medium tracking-wide rounded-sm h-12 px-8">
                  {language === 'zh' ? "查看文档" : "View Docs"}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* TSDCKL 六大能力域 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {language === 'zh' ? "TSDCKL 六大能力域" : "TSDCKL Six Capability Domains"}
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              {language === 'zh' ? "能力是一级主数据" : "Capability is Primary Master Data"}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilityDomains.map((domain, index) => (
              <Card key={index} className="bg-card border-border hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${domain.color}`}></div>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className={`px-3 py-1.5 rounded-sm bg-gradient-to-r ${domain.color} text-white text-lg font-bold font-mono`}>
                      {domain.code}
                    </div>
                    <domain.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-heading text-xl tracking-wide">{domain.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{domain.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {domain.examples.map((example, j) => (
                      <span key={j} className="px-2 py-1 text-xs bg-muted rounded-sm text-muted-foreground">
                        {example}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* L1-L5 能力等级 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {language === 'zh' ? "L1-L5 能力等级体系" : "L1-L5 Capability Level System"}
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              {language === 'zh' ? "证据驱动，系统自动计算" : "Evidence-driven, Auto-calculated"}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {capabilityLevels.map((level, index) => (
              <Card key={index} className="bg-card/50 border-border hover:border-primary/50 transition-colors text-center">
                <CardContent className="p-6 space-y-3">
                  <div className={`w-12 h-12 mx-auto rounded-full ${level.color} flex items-center justify-center text-white font-bold text-lg`}>
                    {level.level}
                  </div>
                  <h3 className="font-heading font-bold text-lg">{level.title}</h3>
                  <p className="text-xs text-muted-foreground">{level.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card className="bg-card/30 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-foreground mb-2">
                    {language === 'zh' ? "核心原则：不允许人工主观升级" : "Core Principle: No Manual Subjective Upgrades"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {language === 'zh'
                      ? "能力等级的升降完全由系统根据证据自动计算。任何人工干预都会被系统记录并标记为异常。能力来源于真实的项目、服务与结果证据，而非培训或主观评价。"
                      : "Capability level changes are fully auto-calculated by the system based on evidence. Any manual intervention is logged and flagged as anomaly. Capabilities come from real projects, services and results evidence, not training or subjective evaluation."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 红蓝对抗机制 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {language === 'zh' ? "Tier1 红蓝对抗交付机制" : "Tier1 Red-Blue Confrontation Delivery"}
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              {language === 'zh' ? "系统级约束" : "System-level Constraint"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 红队 */}
            <Card className="bg-card border-border overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${redBlueSystem.redTeam.color}`}></div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-sm bg-gradient-to-r ${redBlueSystem.redTeam.color} text-white`}>
                    <Swords className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{redBlueSystem.redTeam.title}</CardTitle>
                    <CardDescription className="font-medium text-red-400">{redBlueSystem.redTeam.role}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{redBlueSystem.redTeam.description}</p>
              </CardContent>
            </Card>

            {/* 蓝队 */}
            <Card className="bg-card border-border overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${redBlueSystem.blueTeam.color}`}></div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-sm bg-gradient-to-r ${redBlueSystem.blueTeam.color} text-white`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{redBlueSystem.blueTeam.title}</CardTitle>
                    <CardDescription className="font-medium text-blue-400">{redBlueSystem.blueTeam.role}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{redBlueSystem.blueTeam.description}</p>
              </CardContent>
            </Card>
          </div>

          {/* 触发条件和目的 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  {language === 'zh' ? "触发条件" : "Trigger Conditions"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {redBlueSystem.triggers.map((trigger, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      {trigger}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {language === 'zh' ? "核心目的" : "Core Purpose"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{redBlueSystem.purpose}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 核心设计原则 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {language === 'zh' ? "核心设计原则" : "Core Design Principles"}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {principles.map((principle, index) => (
              <Card key={index} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6 space-y-3">
                  <div className="p-3 rounded-sm bg-primary/10 text-primary w-fit">
                    <principle.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading font-bold text-lg">{principle.title}</h3>
                  <p className="text-sm text-muted-foreground">{principle.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 系统域架构 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {language === 'zh' ? "系统域架构" : "System Domain Architecture"}
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              {language === 'zh' ? "6大系统域" : "6 System Domains"}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemDomains.map((domain, index) => (
              <Card key={index} className="bg-card border-border hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${domain.color}`}></div>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className={`px-2 py-1 rounded-sm bg-gradient-to-r ${domain.color} text-white text-[10px] font-mono uppercase`}>
                      {domain.subtitle}
                    </div>
                    <domain.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-heading text-xl tracking-wide">{domain.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{domain.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {domain.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 技术架构 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {language === 'zh' ? "技术实现架构" : "Technical Implementation Architecture"}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {techStack.map((tech, index) => (
              <Card key={index} className="bg-card/50 border-border">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-sm bg-primary/10">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg">{tech.name}</h3>
                      <p className="text-xs text-primary">{tech.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{tech.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Tier1实践案例 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-sm"></span>
              {language === 'zh' ? "Tier1 客户系统能力实践" : "Tier1 Customer System Capability Practice"}
            </h2>
            <span className="text-xs font-mono text-muted-foreground">ZF / Linamar</span>
          </div>
          
          <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
            <CardContent className="p-6">
              <blockquote className="text-lg font-medium text-foreground border-l-4 border-primary pl-4 mb-6">
                {language === 'zh' 
                  ? "这不是个别工程师能力，而是系统能力。"
                  : "This is not individual engineer capability, but system capability."}
              </blockquote>
              <p className="text-sm text-muted-foreground mb-6">
                {language === 'zh'
                  ? "在ZF与Linamar项目中，GRT能力操作系统实现了四个关键突破，证明了组织的竞争力不来自于某个优秀的工程师，而来自于系统化的能力管理。"
                  : "In ZF and Linamar projects, GRT Capability OS achieved four key breakthroughs, proving that organizational competitiveness comes from systematic capability management, not individual excellent engineers."}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: language === 'zh' ? "服务行为自动生成能力证据" : "Service Actions Auto-Generate Capability Evidence",
                description: language === 'zh'
                  ? "工程师在现场服务时，系统自动记录服务行为，自动提取能力证据，关联到对应能力域。"
                  : "When engineers perform on-site service, the system automatically records service behaviors, extracts capability evidence, and links to corresponding capability domains.",
                icon: Zap,
                color: "from-blue-500 to-cyan-500"
              },
              {
                title: language === 'zh' ? "能力等级自动升级" : "Capability Levels Auto-Upgrade",
                description: language === 'zh'
                  ? "系统实时计算能力积分，达到阈值自动触发升级，无需主管提名，完全基于证据计算。"
                  : "System calculates capability scores in real-time, auto-triggers upgrades when thresholds are met, no manager nomination needed, fully evidence-based.",
                icon: TrendingUp,
                color: "from-green-500 to-emerald-500"
              },
              {
                title: language === 'zh' ? "设计规范被反向更新" : "Design Standards Reverse-Updated",
                description: language === 'zh'
                  ? "问题解决后，系统自动分析是否涉及设计规范缺陷，自动触发规范审查和更新流程。"
                  : "After problem resolution, system auto-analyzes if design standard defects are involved, auto-triggers standard review and update process.",
                icon: BookOpen,
                color: "from-purple-500 to-pink-500"
              },
              {
                title: language === 'zh' ? "问题在全球范围内被预防" : "Problems Prevented Globally",
                description: language === 'zh'
                  ? "问题闭环后，预防措施自动推送到全球所有相关项目，确保同样问题不会重复发生。"
                  : "After problem closure, prevention measures auto-push to all related projects globally, ensuring the same problem never recurs.",
                icon: Shield,
                color: "from-orange-500 to-amber-500"
              }
            ].map((item, index) => (
              <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${item.color}`}></div>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-sm bg-gradient-to-r ${item.color} text-white flex-shrink-0`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card/30 border-primary/20">
            <CardContent className="p-6">
              <p className="text-center text-lg font-medium text-foreground">
                {language === 'zh'
                  ? "GRT的竞争力不在于拥有几个优秀的工程师，而在于拥有一个能够持续产生优秀工程师的系统。"
                  : "GRT's competitiveness lies not in having a few excellent engineers, but in having a system that continuously produces excellent engineers."}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 文档链接 */}
        <section className="space-y-6">
          <Card className="bg-card/30 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-bold text-lg mb-2">
                    {language === 'zh' ? "详细文档" : "Detailed Documentation"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'zh'
                      ? "查看完整的能力操作系统蓝图文档，包括能力等级体系、红蓝对抗机制、系统性学习机制等详细设计。"
                      : "View complete Capability OS blueprint documentation, including capability level system, red-blue confrontation mechanism, systematic learning mechanism and detailed designs."}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href="/docs">
                    <Button variant="outline" className="border-primary/30 hover:bg-primary/10 hover:text-primary">
                      {language === 'zh' ? "查看文档" : "View Docs"} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
