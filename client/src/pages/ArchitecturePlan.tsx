import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Layers, 
  Database, 
  Code2, 
  GitBranch, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  FileCode,
  Server,
  Smartphone,
  BarChart3,
  Users,
  Package,
  Brain,
  Radio,
  Download,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";

// 系统模块定义
const systemModules = [
  {
    code: "crm",
    name: "客户关系管理",
    nameEn: "CRM",
    icon: Users,
    color: "bg-blue-500",
    tables: ["crm_customers", "crm_contacts", "crm_opportunities"],
    entities: ["Customer", "Contact", "Opportunity"],
    jiandaoyunMapping: "M0客户管理、商机管理",
    version: "v1.1",
    status: "planned"
  },
  {
    code: "project",
    name: "项目管理",
    nameEn: "Project",
    icon: Package,
    color: "bg-green-500",
    tables: ["pm_projects", "pm_tasks", "pm_milestones"],
    entities: ["Project", "Task", "Milestone"],
    jiandaoyunMapping: "M0-M12全生命周期",
    version: "v1.2",
    status: "planned"
  },
  {
    code: "cost",
    name: "成本管理",
    nameEn: "Cost",
    icon: BarChart3,
    color: "bg-yellow-500",
    tables: ["cost_budgets", "cost_expenses", "cost_invoices"],
    entities: ["Budget", "Expense", "Invoice"],
    jiandaoyunMapping: "项目收支、财务管理",
    version: "v1.3",
    status: "planned"
  },
  {
    code: "hr",
    name: "人事管理",
    nameEn: "HR",
    icon: Users,
    color: "bg-purple-500",
    tables: ["hr_employees", "hr_attendance", "hr_performance"],
    entities: ["Employee", "Attendance", "Performance"],
    jiandaoyunMapping: "人事OA系统",
    version: "v2.2",
    status: "planned"
  },
  {
    code: "scm",
    name: "供应链管理",
    nameEn: "SCM",
    icon: Package,
    color: "bg-orange-500",
    tables: ["scm_suppliers", "scm_purchase_orders", "scm_inventory"],
    entities: ["Supplier", "PurchaseOrder", "Inventory"],
    jiandaoyunMapping: "采购、库存管理",
    version: "v3.0",
    status: "planned"
  },
  {
    code: "ai",
    name: "AI智能服务",
    nameEn: "AI",
    icon: Brain,
    color: "bg-pink-500",
    tables: ["ai_chat_sessions", "ai_chat_messages", "ai_bant_scores"],
    entities: ["ChatSession", "Message", "BANTScore"],
    jiandaoyunMapping: "AI销售助手",
    version: "v2.0",
    status: "planned"
  },
  {
    code: "iot",
    name: "IoT设备管理",
    nameEn: "IoT",
    icon: Radio,
    color: "bg-cyan-500",
    tables: ["iot_devices", "iot_uwb_locations", "iot_work_hours"],
    entities: ["Device", "Location", "WorkHour"],
    jiandaoyunMapping: "UWB定位、CCD检测",
    version: "v2.1",
    status: "planned"
  }
];

// 版本路线图
const versionRoadmap = [
  {
    version: "v1.0",
    name: "基础架构",
    status: "completed",
    progress: 100,
    features: ["实施方案网站", "文档中心", "迁移管理", "系统分析"],
    timeline: "当前"
  },
  {
    version: "v1.1",
    name: "CRM基础",
    status: "next",
    progress: 0,
    features: ["客户管理", "联系人管理", "商机管理", "BANT评分"],
    timeline: "Week 1-2"
  },
  {
    version: "v1.2",
    name: "项目管理",
    status: "planned",
    progress: 0,
    features: ["项目CRUD", "任务管理", "甘特图", "M0-M12阶段"],
    timeline: "Week 3-4"
  },
  {
    version: "v1.3",
    name: "成本管理",
    status: "planned",
    progress: 0,
    features: ["预算管理", "费用记录", "发票管理", "成本报表"],
    timeline: "Week 5-6"
  },
  {
    version: "v2.0",
    name: "AI集成",
    status: "planned",
    progress: 0,
    features: ["Gemini集成", "销售助手", "智能推荐", "BANT自动评分"],
    timeline: "Week 7-8"
  },
  {
    version: "v2.1",
    name: "IoT集成",
    status: "planned",
    progress: 0,
    features: ["UWB定位", "工时采集", "设备管理", "实时监控"],
    timeline: "Week 9-10"
  },
  {
    version: "v2.2",
    name: "人事OA",
    status: "planned",
    progress: 0,
    features: ["员工管理", "考勤管理", "绩效管理", "薪酬管理"],
    timeline: "Week 11-12"
  },
  {
    version: "v3.0",
    name: "供应链",
    status: "planned",
    progress: 0,
    features: ["供应商管理", "采购管理", "库存管理", "物流跟踪"],
    timeline: "Week 13-14"
  }
];

// 技术栈
const techStack = {
  frontend: [
    { name: "React 19", desc: "前端框架" },
    { name: "Tailwind CSS 4", desc: "样式框架" },
    { name: "shadcn/ui", desc: "UI组件库" },
    { name: "Wouter", desc: "路由管理" },
    { name: "TanStack Query", desc: "数据请求" }
  ],
  backend: [
    { name: "Express 4", desc: "Web框架" },
    { name: "tRPC 11", desc: "类型安全API" },
    { name: "Drizzle ORM", desc: "数据库ORM" },
    { name: "Zod", desc: "数据验证" },
    { name: "Vitest", desc: "测试框架" }
  ],
  database: [
    { name: "MySQL/TiDB", desc: "关系型数据库" },
    { name: "Redis", desc: "缓存（规划中）" },
    { name: "InfluxDB", desc: "时序数据（规划中）" },
    { name: "S3", desc: "文件存储" }
  ],
  ai: [
    { name: "Gemini API", desc: "LLM服务" },
    { name: "Whisper API", desc: "语音转文字" },
    { name: "DALL-E", desc: "图像生成" }
  ]
};

export default function ArchitecturePlan() {
  const { t, language } = useLanguage();

  return (
    <Layout>
      <div className="space-y-8">
        {/* 页面标题 */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
              <Layers className="w-8 h-8 text-primary" />
              {language === 'zh' ? '系统架构规划' : 'Architecture Plan'}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {language === 'zh' 
                ? '基于localhost:3000的科学化系统架构，整合简道云数据结构，便于Claude Code实施'
                : 'Scientific system architecture based on localhost:3000, integrating Jiandaoyun data structure for Claude Code implementation'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/docs/guide">
              <Button variant="outline">
                <FileCode className="w-4 h-4 mr-2" />
                {language === 'zh' ? '开发指南' : 'Dev Guide'}
              </Button>
            </Link>
            <a href="/docs/GRT_Architecture_Upgrade_Plan.md" download>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                {language === 'zh' ? '下载规划文档' : 'Download Plan'}
              </Button>
            </a>
          </div>
        </div>

        {/* 标签页 */}
        <Tabs defaultValue="architecture" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="architecture">
              <Layers className="w-4 h-4 mr-2" />
              {language === 'zh' ? '系统架构' : 'Architecture'}
            </TabsTrigger>
            <TabsTrigger value="modules">
              <Database className="w-4 h-4 mr-2" />
              {language === 'zh' ? '模块设计' : 'Modules'}
            </TabsTrigger>
            <TabsTrigger value="roadmap">
              <GitBranch className="w-4 h-4 mr-2" />
              {language === 'zh' ? '版本路线' : 'Roadmap'}
            </TabsTrigger>
            <TabsTrigger value="techstack">
              <Code2 className="w-4 h-4 mr-2" />
              {language === 'zh' ? '技术栈' : 'Tech Stack'}
            </TabsTrigger>
          </TabsList>

          {/* 系统架构 */}
          <TabsContent value="architecture" className="space-y-6">
            {/* 三层架构图 */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'zh' ? '三层架构设计' : 'Three-Tier Architecture'}</CardTitle>
                <CardDescription>
                  {language === 'zh' 
                    ? '表现层、业务层、数据层分离，实现业务功能与技术实现的解耦'
                    : 'Separation of presentation, business, and data layers for decoupling'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 表现层 */}
                  <div className="border rounded-lg p-4 bg-blue-500/5 border-blue-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold text-blue-500">
                        {language === 'zh' ? '表现层 (Presentation Layer)' : 'Presentation Layer'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { name: language === 'zh' ? '管理后台' : 'Admin Panel', tech: 'React' },
                        { name: language === 'zh' ? '移动端APP' : 'Mobile App', tech: 'React Native' },
                        { name: language === 'zh' ? '大屏看板' : 'Dashboard', tech: 'ECharts' },
                        { name: language === 'zh' ? 'API网关' : 'API Gateway', tech: 'tRPC' }
                      ].map((item, i) => (
                        <div key={i} className="bg-background border rounded p-3 text-center">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.tech}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 业务层 */}
                  <div className="border rounded-lg p-4 bg-green-500/5 border-green-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Server className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold text-green-500">
                        {language === 'zh' ? '业务层 (Business Layer)' : 'Business Layer'}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {language === 'zh' ? '核心业务模块' : 'Core Business Modules'}
                        </p>
                        <div className="grid grid-cols-5 gap-2">
                          {['CRM', language === 'zh' ? '项目' : 'Project', language === 'zh' ? '成本' : 'Cost', language === 'zh' ? '人事' : 'HR', language === 'zh' ? '供应链' : 'SCM'].map((m, i) => (
                            <div key={i} className="bg-background border rounded p-2 text-center text-sm">
                              {m}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {language === 'zh' ? '智能服务模块' : 'Smart Service Modules'}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { name: language === 'zh' ? 'AI销售助手' : 'AI Assistant', tech: 'Gemini' },
                            { name: language === 'zh' ? 'UWB工时采集' : 'UWB Tracking', tech: 'IoT' },
                            { name: language === 'zh' ? 'CCD质量检测' : 'CCD Inspection', tech: 'Vision' }
                          ].map((item, i) => (
                            <div key={i} className="bg-background border rounded p-2 text-center">
                              <p className="text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.tech}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 数据层 */}
                  <div className="border rounded-lg p-4 bg-purple-500/5 border-purple-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="w-5 h-5 text-purple-500" />
                      <h3 className="font-semibold text-purple-500">
                        {language === 'zh' ? '数据层 (Data Layer)' : 'Data Layer'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { name: 'MySQL/TiDB', desc: language === 'zh' ? '关系数据' : 'Relational' },
                        { name: 'Redis', desc: language === 'zh' ? '缓存' : 'Cache' },
                        { name: 'InfluxDB', desc: language === 'zh' ? '时序数据' : 'Time Series' },
                        { name: 'S3', desc: language === 'zh' ? '文件存储' : 'File Storage' }
                      ].map((item, i) => (
                        <div key={i} className="bg-background border rounded p-3 text-center">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 项目结构 */}
            <Card>
              <CardHeader>
                <CardTitle>{language === 'zh' ? '项目目录结构' : 'Project Structure'}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto font-mono">
{`grt-system/
├── client/                      # 前端代码
│   ├── src/
│   │   ├── components/          # 通用组件
│   │   │   ├── ui/              # shadcn/ui组件
│   │   │   └── business/        # 业务组件
│   │   ├── pages/               # 页面组件
│   │   │   ├── crm/             # CRM模块页面
│   │   │   ├── project/         # 项目管理页面
│   │   │   └── ...              # 其他模块
│   │   ├── hooks/               # 自定义Hooks
│   │   └── lib/                 # 工具函数
├── server/                      # 后端代码
│   ├── routers/                 # tRPC路由
│   ├── db/                      # 数据库操作
│   └── _core/                   # 核心框架
├── drizzle/                     # 数据库Schema
│   ├── schema/                  # 分模块Schema
│   └── migrations/              # 数据库迁移
├── shared/                      # 前后端共享
├── docs/                        # 文档
└── tests/                       # 测试代码`}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 模块设计 */}
          <TabsContent value="modules" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemModules.map((module) => (
                <Card key={module.code} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${module.color} text-white`}>
                        <module.icon className="w-5 h-5" />
                      </div>
                      <Badge variant="outline">{module.version}</Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{module.name}</CardTitle>
                    <CardDescription>{module.nameEn} Module</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {language === 'zh' ? '数据库表' : 'Database Tables'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {module.tables.map((table, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-mono">
                            {table}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {language === 'zh' ? '核心实体' : 'Core Entities'}
                      </p>
                      <p className="text-sm">{module.entities.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {language === 'zh' ? '简道云映射' : 'Jiandaoyun Mapping'}
                      </p>
                      <p className="text-sm text-primary">{module.jiandaoyunMapping}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 版本路线 */}
          <TabsContent value="roadmap" className="space-y-6">
            <div className="space-y-4">
              {versionRoadmap.map((version, index) => (
                <Card 
                  key={version.version}
                  className={`${
                    version.status === 'completed' 
                      ? 'border-green-500/50 bg-green-500/5' 
                      : version.status === 'next'
                      ? 'border-primary/50 bg-primary/5'
                      : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* 版本标识 */}
                      <div className={`
                        w-16 h-16 rounded-lg flex flex-col items-center justify-center
                        ${version.status === 'completed' 
                          ? 'bg-green-500 text-white' 
                          : version.status === 'next'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'}
                      `}>
                        <span className="text-lg font-bold">{version.version}</span>
                      </div>

                      {/* 版本信息 */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{version.name}</h3>
                          {version.status === 'completed' && (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {language === 'zh' ? '已完成' : 'Completed'}
                            </Badge>
                          )}
                          {version.status === 'next' && (
                            <Badge>
                              <ArrowRight className="w-3 h-3 mr-1" />
                              {language === 'zh' ? '下一版本' : 'Next'}
                            </Badge>
                          )}
                          {version.status === 'planned' && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {language === 'zh' ? '规划中' : 'Planned'}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {language === 'zh' ? '时间：' : 'Timeline: '}{version.timeline}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {version.features.map((feature, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>

                        <Progress value={version.progress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 技术栈 */}
          <TabsContent value="techstack" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 前端技术 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-blue-500" />
                    {language === 'zh' ? '前端技术' : 'Frontend'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {techStack.frontend.map((tech, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="font-medium">{tech.name}</span>
                        <span className="text-sm text-muted-foreground">{tech.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 后端技术 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-green-500" />
                    {language === 'zh' ? '后端技术' : 'Backend'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {techStack.backend.map((tech, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="font-medium">{tech.name}</span>
                        <span className="text-sm text-muted-foreground">{tech.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 数据库 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-500" />
                    {language === 'zh' ? '数据存储' : 'Database'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {techStack.database.map((tech, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="font-medium">{tech.name}</span>
                        <span className="text-sm text-muted-foreground">{tech.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI服务 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-pink-500" />
                    {language === 'zh' ? 'AI服务' : 'AI Services'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {techStack.ai.map((tech, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="font-medium">{tech.name}</span>
                        <span className="text-sm text-muted-foreground">{tech.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Claude Code实施指南入口 */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary text-primary-foreground">
                  <Code2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {language === 'zh' ? 'Claude Code 实施手册' : 'Claude Code Implementation Manual'}
                  </h3>
                  <p className="text-muted-foreground">
                    {language === 'zh' 
                      ? '标准化开发流程、代码模板、版本迭代任务清单'
                      : 'Standardized development process, code templates, and version iteration task list'}
                  </p>
                </div>
              </div>
              <Link href="/docs/guide">
                <Button>
                  {language === 'zh' ? '查看手册' : 'View Manual'}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
