/**
 * 系统使用指南页面
 * 提供GRT智能系统的完整使用指南和操作手册
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen, Search, Target, GitBranch, Users, MessageSquare,
  Briefcase, TrendingUp, Brain, Shield, FileText, Rocket,
  Database, Webhook, Award, ChevronRight, ExternalLink,
  Lightbulb, AlertCircle, CheckCircle2, Info
} from "lucide-react";
import { PageHeader } from "@/components/grt";

// 指南内容数据
const guideCategories = [
  {
    id: "getting-started",
    title: "快速入门",
    icon: Rocket,
    description: "系统基础操作和初始配置",
    articles: [
      {
        title: "系统登录与权限",
        content: `
## 系统登录

GRT智能系统采用OAuth统一认证，支持以下登录方式：
- 企业微信扫码登录
- 飞书账号登录
- 邮箱密码登录

### 权限等级

| 角色 | 权限范围 |
|------|----------|
| 管理员 | 全部功能 + 系统配置 |
| 主管 | 部门数据 + 审批权限 |
| 员工 | 个人数据 + 基础功能 |
| 访客 | 只读访问 |

### 首次登录配置

1. 完善个人信息（姓名、部门、职位）
2. 绑定手机号（用于消息通知）
3. 设置默认语言偏好
        `,
        tags: ["登录", "权限", "配置"]
      },
      {
        title: "导航与界面布局",
        content: `
## 界面布局说明

### 左侧导航栏

导航栏采用分组折叠设计：

- **控制台**：系统首页，显示关键指标
- **核心业务**：项目管理、门径管理、CRM客户
- **GRT 5.0 智能**：社群管理、液态用工、AI销售、个人智能体
- **系统管理**：部署、安全、培训、ERP配置等（管理员可见）
- **使用指南**：本页面

### 快捷操作

- **Ctrl + K**：全局搜索
- **Ctrl + /**：显示快捷键帮助
- **点击头像**：个人设置和退出登录
        `,
        tags: ["导航", "界面", "快捷键"]
      }
    ]
  },
  {
    id: "core-business",
    title: "核心业务",
    icon: Target,
    description: "项目管理、门径管理、CRM客户",
    articles: [
      {
        title: "项目管理 (M0-M12)",
        content: `
## 项目全生命周期管理

GRT项目管理遵循M0-M12阶段门禁模型：

### 阶段说明

| 阶段 | 名称 | 关键交付物 |
|------|------|------------|
| M0 | 商机确认 | 客户需求确认书 |
| M1 | 立项启动 | 项目章程、团队组建 |
| M2 | 概念设计 | 技术方案、初步报价 |
| M3 | 详细设计 | 3D模型、BOM清单 |
| M4 | 设计评审 | 评审报告、变更记录 |
| M5 | 生产制造 | 生产工单、质检报告 |
| M6 | 内部调试 | 调试记录、参数表 |
| M7 | 出厂验收 | FAT报告、发货单 |
| M8 | 现场安装 | 安装记录、调试日志 |
| M9 | 客户验收 | SAT报告、签收单 |
| M10 | 质保服务 | 服务记录、维护计划 |
| M11 | 知识沉淀 | 项目总结、经验库 |
| M12 | 项目关闭 | 结项报告、财务结算 |

### 操作指南

1. **创建项目**：点击"新建项目"，填写基本信息
2. **阶段推进**：完成当前阶段检查项后，点击"推进到下一阶段"
3. **文档上传**：在每个阶段上传对应的交付物文档
4. **风险管理**：记录和跟踪项目风险，设置预警阈值
        `,
        tags: ["项目", "M0-M12", "阶段门禁"]
      },
      {
        title: "门径管理 (Stage-Gate)",
        content: `
## 门径检查与自动验证

### 检查项配置

每个Gate阶段包含多个检查项，分为：
- **强制项**：必须通过才能推进（一票否决）
- **建议项**：可选完成，影响评分

### 自动验证源

系统支持从以下数据源自动验证检查项：
- **ERP系统**：PO状态、库存数据
- **PLM系统**：图纸状态、BOM审批
- **MES系统**：生产进度、质检结果

### 配置步骤

1. 进入"系统管理 > Gate检查清单配置"
2. 选择目标阶段（M3/M4/M5/M7/M12）
3. 添加检查项，设置验证源和触发条件
4. 保存并测试验证逻辑
        `,
        tags: ["门径", "检查项", "自动验证"]
      },
      {
        title: "CRM客户管理",
        content: `
## 客户关系管理

### 客户分级

| 等级 | 标准 | 服务响应 |
|------|------|----------|
| VIP | 年采购>500万 | 2小时 |
| A级 | 年采购100-500万 | 4小时 |
| B级 | 年采购50-100万 | 8小时 |
| C级 | 年采购<50万 | 24小时 |

### 商机管理

商机阶段：线索 → 初步接触 → 需求确认 → 方案报价 → 商务谈判 → 签约成交

### BANT评分

- **Budget（预算）**：客户预算是否充足
- **Authority（决策权）**：联系人是否有决策权
- **Need（需求）**：需求是否明确且紧迫
- **Timeline（时间线）**：采购时间是否确定

每项0-25分，总分100分，>70分为高质量商机。
        `,
        tags: ["CRM", "客户分级", "商机"]
      }
    ]
  },
  {
    id: "grt-5-smart",
    title: "GRT 5.0 智能",
    icon: Brain,
    description: "社群管理、液态用工、AI销售、个人智能体",
    articles: [
      {
        title: "社群管理",
        content: `
## 社群消息管理流程

### 消息处理流程

\`\`\`
外部群消息 → Social Bridge监听 → 脱敏过滤 → 录入系统 
    → AI草拟回复 → 人工审核 → 发布到群
\`\`\`

### 脱敏规则配置

1. 进入"社群管理 > 设置"
2. 添加脱敏规则：
   - **关键词匹配**：直接替换敏感词
   - **正则表达式**：匹配复杂模式（手机号、身份证等）
   - **AI检测**：智能识别敏感内容

### AI回复模板

支持按分类管理回复模板：
- 客服类：常见问题解答
- 技术类：技术支持回复
- 销售类：产品咨询回复

模板支持变量：\`{{customer_name}}\`、\`{{product_name}}\`等
        `,
        tags: ["社群", "脱敏", "AI回复"]
      },
      {
        title: "液态用工",
        content: `
## 技能胶囊与任务竞标

### 技能胶囊 (Skill Capsules)

技能胶囊是员工能力的原子化封装：
- **技能名称**：如"高压喷嘴流体仿真 Level 5"
- **ZKP证明**：零知识证明的能力验证哈希
- **版税率**：技能被调用时的收益分成
- **调用次数**：技能使用统计

### 任务竞标流程

1. 发布任务需求（技能要求、预算、SLA）
2. 符合条件的Agent自动竞标
3. AI裁决评估竞标方案
4. 选定执行者，锁定智能合约
5. 任务完成后自动结算

### 智能合约支付

支持三种支付方式：
- e-CNY（数字人民币）
- USDT（稳定币）
- G-Token（内部积分）
        `,
        tags: ["液态用工", "技能胶囊", "智能合约"]
      },
      {
        title: "AI销售系统",
        content: `
## AI-to-AI自主谈判

### ZOPA计算引擎

ZOPA（Zone of Possible Agreement）是谈判成功的关键：
- **底价**：我方可接受的最低价格
- **目标价**：期望达成的价格
- **客户预算**：AI推断的客户预算范围

当ZOPA区间存在时，谈判有成功可能。

### 情绪分析

Listener Agent实时分析客户情绪：
- 积极：继续当前策略
- 中性：提供更多价值点
- 消极：调整报价或让步

### 谈判策略

| 策略 | 适用场景 |
|------|----------|
| 锚定策略 | 首次报价，设定高锚点 |
| 互惠策略 | 客户有让步时，适度回应 |
| 稀缺策略 | 强调限时优惠或库存紧张 |
| 权威策略 | 引用行业标准或认证 |

### ZKP证明

向客户证明能力而不泄露核心数据：
- 产能证明：证明月产能>X台
- 合规证明：证明通过VDA认证
- 绿色能源证明：证明使用可再生能源
        `,
        tags: ["AI销售", "ZOPA", "谈判"]
      },
      {
        title: "个人智能体",
        content: `
## YDW数据映射与技能推断

### 行为探针

系统自动采集以下行为数据：
- **IDE操作**：代码提交、文件编辑
- **CAD操作**：图纸保存、模型修改
- **文档操作**：报告编写、方案设计

### 技能推断引擎

AI根据行为数据推断技能标签：
\`\`\`
行为: "提交PLC程序，包含高速计数器配置"
推断: "PLC编程 - 高速计数器应用 - L3级"
\`\`\`

### 过程笔记

记录项目中的问题和解决方案：
1. 问题描述：遇到的具体问题
2. 解决方案：采取的解决措施
3. AI提取：自动提取结构化知识

### 能力成长曲线

系统自动绘制个人能力成长曲线，包括：
- 技能等级变化趋势
- 项目参与度统计
- 知识贡献排名
        `,
        tags: ["个人智能体", "行为探针", "技能推断"]
      }
    ]
  },
  {
    id: "system-admin",
    title: "系统管理",
    icon: Shield,
    description: "部署、安全、培训、配置管理",
    articles: [
      {
        title: "ERP配置",
        content: `
## ERP系统对接配置

### 支持的ERP系统

| 系统 | 对接方式 | 数据范围 |
|------|----------|----------|
| SAP | RFC/BAPI | 订单、库存、财务 |
| Oracle | REST API | 采购、生产、质量 |
| 金蝶 | Web Service | 财务、进销存 |
| 用友 | API | 财务、人事 |

### 配置步骤

1. 进入"系统管理 > ERP配置"
2. 选择ERP类型
3. 填写连接参数（服务器地址、端口、凭证）
4. 测试连接
5. 配置数据同步规则

### 数据同步

- **实时同步**：关键数据（订单状态）
- **定时同步**：批量数据（库存、财务）
- **手动同步**：按需触发
        `,
        tags: ["ERP", "SAP", "数据同步"]
      },
      {
        title: "Webhook管理",
        content: `
## Webhook配置与监控

### 支持的事件类型

- **项目事件**：阶段变更、风险预警
- **审批事件**：提交、通过、驳回
- **安全事件**：异常登录、权限变更
- **业务事件**：订单创建、客户新增

### 配置Webhook

1. 进入「系统管理 > Webhook管理」
2. 点击"添加Webhook"
3. 填写目标URL
4. 选择触发事件
5. 配置认证方式（Bearer Token / Basic Auth）
6. 设置重试策略

### 调试与监控

- 查看发送历史
- 重试失败请求
- 查看响应日志
        `,
        tags: ["Webhook", "事件", "集成"]
      },
      {
        title: "证书模板管理",
        content: `
## 培训证书与能力认证

### 证书类型

- **能力认证**：技能等级证书（L1-L5）
- **培训证书**：培训完成证书

### 模板设计

模板支持以下变量：
- \`{{name}}\`：获得者姓名
- \`{{date}}\`：颁发日期
- \`{{cert_no}}\`：证书编号
- \`{{skill_level}}\`：技能等级
- \`{{valid_until}}\`：有效期

### 颁发流程

1. 选择证书模板
2. 填写获得者信息
3. 系统自动生成证书编号
4. 颁发并记录到区块链（可选）
5. 发送通知给获得者
        `,
        tags: ["证书", "培训", "认证"]
      },
      {
        title: "安全监控",
        content: `
## 系统安全与审计

### 安全告警

系统自动检测以下安全事件：
- 异常登录（异地、异常时间）
- 权限越权访问
- 敏感数据导出
- API调用异常

### 告警通知

支持多渠道通知：
- 企业微信机器人
- 飞书机器人
- 邮件通知
- 短信通知

### 日志归档

- **保留策略**：默认90天
- **归档位置**：S3/OSS
- **压缩格式**：gzip
- **加密方式**：AES-256
        `,
        tags: ["安全", "告警", "审计"]
      }
    ]
  }
];

// FAQ数据
const faqItems = [
  {
    question: "如何重置密码？",
    answer: "点击登录页面的「忘记密码」，通过绑定的手机号或邮箱验证后重置。如果无法自助重置，请联系管理员。"
  },
  {
    question: "项目阶段无法推进怎么办？",
    answer: "请检查当前阶段的所有强制检查项是否已完成。如果有检查项显示「失败」，需要先解决对应问题。可以点击检查项查看详细的验证结果和解决建议。"
  },
  {
    question: "如何配置企业微信通知？",
    answer: "进入「系统管理 > Webhook管理」，添加企业微信机器人的Webhook地址，选择需要通知的事件类型即可。"
  },
  {
    question: "AI回复不准确怎么调整？",
    answer: "可以通过以下方式优化AI回复：1) 添加更多回复模板；2) 调整脱敏规则避免关键信息丢失；3) 在审核时修正AI回复，系统会学习改进。"
  },
  {
    question: "如何导出项目数据？",
    answer: "在项目详情页点击「导出」按钮，选择导出格式（Excel/PDF）和数据范围。大批量导出会生成下载链接发送到邮箱。"
  }
];

export default function SystemGuideBook() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(guideCategories[0].id);
  const [selectedArticle, setSelectedArticle] = useState(guideCategories[0].articles[0]);

  // 搜索过滤
  const filteredCategories = guideCategories.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(category => category.articles.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="GRT智能系统使用指南"
        description="完整的系统操作手册和最佳实践指南"
      />

      {/* 搜索框 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索指南内容..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="guide" className="space-y-4">
        <TabsList>
          <TabsTrigger value="guide">操作指南</TabsTrigger>
          <TabsTrigger value="faq">常见问题</TabsTrigger>
          <TabsTrigger value="changelog">更新日志</TabsTrigger>
        </TabsList>

        <TabsContent value="guide">
          <div className="grid grid-cols-12 gap-6">
            {/* 左侧目录 */}
            <div className="col-span-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">目录</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-2">
                      {(searchQuery ? filteredCategories : guideCategories).map((category) => (
                        <div key={category.id}>
                          <button
                            onClick={() => {
                              setSelectedCategory(category.id);
                              if (category.articles.length > 0) {
                                setSelectedArticle(category.articles[0]);
                              }
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors ${
                              selectedCategory === category.id
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-accent"
                            }`}
                          >
                            <category.icon className="w-4 h-4" />
                            {category.title}
                          </button>
                          {selectedCategory === category.id && (
                            <div className="ml-6 mt-1 space-y-1">
                              {category.articles.map((article, index) => (
                                <button
                                  key={index}
                                  onClick={() => setSelectedArticle(article)}
                                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-left text-sm transition-colors ${
                                    selectedArticle.title === article.title
                                      ? "bg-accent text-accent-foreground"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                  {article.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* 右侧内容 */}
            <div className="col-span-9">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{selectedArticle.title}</CardTitle>
                    <div className="flex gap-2">
                      {selectedArticle.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {/* 简单的Markdown渲染 */}
                      {selectedArticle.content.split('\n').map((line, index) => {
                        if (line.startsWith('## ')) {
                          return <h2 key={index} className="text-xl font-bold mt-6 mb-3">{line.replace('## ', '')}</h2>;
                        }
                        if (line.startsWith('### ')) {
                          return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.replace('### ', '')}</h3>;
                        }
                        if (line.startsWith('| ')) {
                          return <p key={index} className="font-mono text-sm bg-muted p-1 rounded">{line}</p>;
                        }
                        if (line.startsWith('- ')) {
                          return <li key={index} className="ml-4">{line.replace('- ', '')}</li>;
                        }
                        if (line.startsWith('```')) {
                          return null;
                        }
                        if (line.trim() === '') {
                          return <br key={index} />;
                        }
                        return <p key={index} className="my-2">{line}</p>;
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                常见问题解答
              </CardTitle>
              <CardDescription>快速解决常见使用问题</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-500" />
                        {item.question}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex items-start gap-2 pl-6">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <p className="text-muted-foreground">{item.answer}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changelog">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                系统更新日志
              </CardTitle>
              <CardDescription>了解最新功能和改进</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-l-2 border-primary pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>v4.8.3</Badge>
                    <span className="text-sm text-muted-foreground">2025-01-31</span>
                  </div>
                  <h4 className="font-semibold">Gemini代码整合与管理界面</h4>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• 新增ERP配置管理界面（SAP/Oracle/金蝶/用友）</li>
                    <li>• 新增Webhook管理界面（事件订阅、调试监控）</li>
                    <li>• 新增证书模板管理（能力认证、培训证书）</li>
                    <li>• 完善左侧导航栏（分组折叠、子菜单支持）</li>
                    <li>• 新增系统使用指南页面</li>
                  </ul>
                </div>

                <div className="border-l-2 border-muted pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">v4.8.2</Badge>
                    <span className="text-sm text-muted-foreground">2025-01-30</span>
                  </div>
                  <h4 className="font-semibold">后续12条建议功能实施</h4>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• 液态用工：ZKP技能证明、技能市场匹配</li>
                    <li>• AI销售：ZOPA计算、情绪分析谈判策略</li>
                    <li>• 门径管理：项目导入向导、ERP对接</li>
                    <li>• 个人智能体：行为探针、技能推断引擎</li>
                    <li>• 安全系统：告警Webhook、日志归档</li>
                    <li>• 培训管理：证书生成、效果评估</li>
                  </ul>
                </div>

                <div className="border-l-2 border-muted pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">v4.8.1</Badge>
                    <span className="text-sm text-muted-foreground">2025-01-30</span>
                  </div>
                  <h4 className="font-semibold">社群管理模块增强</h4>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• 脱敏规则配置（关键词/正则/AI检测）</li>
                    <li>• AI回复模板管理（多分类、变量支持）</li>
                    <li>• 消息统计仪表盘（趋势图、活跃时段）</li>
                    <li>• 群成员画像（活跃度、影响力排行）</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
