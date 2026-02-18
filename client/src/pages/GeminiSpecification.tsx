import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  FileText, 
  Download, 
  ExternalLink, 
  BookOpen, 
  Server, 
  Brain, 
  Layers, 
  Database,
  Code2,
  Settings,
  Users,
  HelpCircle,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react";
import { useState, useEffect } from "react";
import { Streamdown } from "streamdown";

// 规范文档内容
const specificationContent = `# GRT智能系统 v4.4.0 完整技术规范

## Gemini深度分析与整合专用文档

**版本**: v4.4.0  
**导出时间**: 2026-01-24  
**检查点ID**: aa226ed5  
**用途**: 供Gemini进行深入分析、整合其他内容，并生成Manus专用命令建议

---

## 1. 系统概述

### 1.1 系统定位

GRT智能系统是为工业清洗设备制造企业设计的全生命周期数字化管理平台，采用**Gemini判断 + Claude执行**的双AI引擎架构，支持从销售到交付的端到端业务流程自动化。

### 1.2 技术栈

| 层级 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| 前端 | React + Tailwind | 19 + 4 | 响应式UI框架 |
| 后端 | Express + tRPC | 4 + 11 | 类型安全API |
| 数据库 | MySQL/TiDB | 8.0 | 分布式数据库 |
| ORM | Drizzle ORM | 0.44+ | 类型安全查询 |
| 认证 | Manus OAuth | - | 统一身份认证 |
| AI判断 | Gemini | 2.0 | 业务逻辑判断 |
| AI执行 | Claude Code | - | 代码实现执行 |

---

## 2. 核心架构

### 2.1 AI-AI销售系统架构（RFC-036）

基于五大智能体的协作架构：
- **Listener** (接口智能体): 客户需求采集
- **Estimator** (算力智能体): 方案估算
- **Negotiator** (商业智能体): 商务谈判
- **Guardian** (合规智能体): 合规审查
- **Builder** (构建智能体): 方案构建

### 2.2 四层透明度模型

| 层级 | 名称 | 可见性 | 内容类型 |
|------|------|--------|----------|
| L0 | 公开展示层 | 全网可见 | 能力介绍、案例摘要 |
| L1 | 注册可见层 | 注册用户 | 技术白皮书 |
| L2 | 客户专属层 | 授权客户 | 项目状态、报价 |
| L3 | 核心IP层 | 仅内部 | 工艺参数、成本 |

### 2.3 M0-M12项目阶段门径管理

| 阶段 | 名称 | 关键交付物 |
|------|------|-----------|
| M0 | 商机识别 | 客户需求初评 |
| M1 | 需求确认 | 技术规格书(GTR/CSR) |
| M2 | 方案设计 | 初步方案 |
| M3 | 详细设计 | 详细图纸 |
| M4 | 报价审批 | 正式报价 |
| M5 | 合同签订 | 签约合同 |
| M6 | 采购启动 | 采购订单 |
| M7 | 生产制造 | 生产工单 |
| M8 | 装配测试 | FAT测试报告 |
| M9 | 发货安装 | 发货清单 |
| M10 | 现场调试 | SAT验收 |
| M11 | 培训交付 | 培训记录 |
| M12 | 质保服务 | 服务记录 |

---

## 3. v4.4.0新增功能模块

### 3.1 功能模块清单

| 模块 | 服务文件 | 状态 |
|------|---------|------|
| AI智能诊断 | ai-diagnostic.service.ts | ✅ 完成 |
| 客户门户 | customer-portal.service.ts | ✅ 完成 |
| 协作工作台 | collaboration-workspace.service.ts | ✅ 完成 |
| 活文档管理 | live-document.service.ts | ✅ 完成 |
| 文档解析 | document-parser.service.ts | ✅ 完成 |
| 系统指南 | system-guide.service.ts | ✅ 完成 |
| WebSocket服务 | websocket.service.ts | ✅ 完成 |
| AI训练数据 | ai-training-data.service.ts | ✅ 完成 |

### 3.2 前端页面清单

| 页面 | 路由 | 功能描述 |
|------|------|---------|
| AI智能诊断 | /ai-diagnostic | 设备故障诊断 |
| 客户门户 | /customer-portal | 客户自助服务 |
| 协作工作台 | /collaboration | 多人实时协作 |
| 活文档管理 | /live-documents | GTR/CSR文档管理 |
| 系统指南 | /system-guide | 角色工作指导书 |
| 帮助中心 | /help | 模糊查询帮助 |

---

## 4. AI双引擎架构

### 4.1 Gemini判断引擎

负责业务逻辑判断、需求分析、方案评估：
- 评估业务逻辑
- 分析需求
- 评估方案
- 风险评估

### 4.2 Claude执行引擎

负责代码实现、文档生成、任务执行：
- 执行代码任务
- 生成文档
- 执行工作流
- 处理自然语言命令

### 4.3 双引擎协作流程

\`\`\`
用户请求 → Manus接收 → 任务分析
                ↓
        Gemini判断引擎
        (需求分析/方案评估/风险评估)
                ↓
        Claude执行引擎
        (代码实现/文档生成/任务执行)
                ↓
        Manus验证检查
        (结果验证/质量检查/反馈循环)
                ↓
            交付结果
\`\`\`

---

## 5. Nocobase活文档架构

### 5.1 文档类型体系

| 文档类型 | 编码前缀 | 用途 |
|---------|---------|------|
| GTR | GTR-YYYY-NNN | 通用技术要求 |
| CSR | CSR-CUST-YYYY-NNN | 客户特定要求 |
| TDS | TDS-YYYY-NNN | 技术数据表 |
| SOP | SOP-DEPT-NNN | 标准操作程序 |
| WI | WI-PROC-NNN | 作业指导书 |

### 5.2 图形规范执行

- 命名格式: {DocumentCode}-FIG-{SequenceNumber}
- 示例: GTR-2026-001-FIG-001
- 支持格式: PNG, JPG, SVG, PDF
- 最低分辨率: 300 DPI

---

## 6. 系统使用规范与角色指导

### 6.1 角色权限矩阵

| 角色 | 项目管理 | 文档管理 | AI诊断 | 客户门户 | 协作工作台 |
|------|---------|---------|--------|---------|-----------|
| 系统管理员 | ✅ 完全 | ✅ 完全 | ✅ 完全 | ✅ 完全 | ✅ 完全 |
| 项目经理 | ✅ 完全 | ✅ 编辑 | ✅ 使用 | ✅ 查看 | ✅ 创建 |
| 设计工程师 | ✅ 参与 | ✅ 编辑 | ✅ 使用 | ❌ | ✅ 参与 |
| 销售工程师 | ✅ 查看 | ✅ 查看 | ✅ 使用 | ✅ 管理 | ✅ 参与 |
| 人事经理 | ❌ | ✅ 查看 | ❌ | ❌ | ✅ 参与 |

---

## 7. Manus专用命令格式

### 7.1 常用命令模板

\`\`\`yaml
# 创建活文档
command:
  action: create_live_document
  target: gtr_document
  parameters:
    title: "VDA 19.1清洁度检测技术要求"
    category: quality

# 执行AI诊断
command:
  action: ai_diagnose
  target: equipment
  parameters:
    equipmentId: "EQ-2026-001"
    symptoms:
      - "清洗效果下降"

# 创建协作空间
command:
  action: create_workspace
  target: collaboration
  parameters:
    name: "M3设计评审"
    type: review
\`\`\`

---

## 8. 待优化项清单

### 高优先级
- tRPC路由集成 (2天)
- WebSocket真实连接 (3天)
- 数据库迁移 (1天)

### 中优先级
- AI训练数据导入 (3天)
- 文档解析优化 (5天)
- 性能优化 (3天)

---

**文档版本**: v4.4.0  
**检查点ID**: aa226ed5
`;

const deploymentGuideContent = `# GRT智能系统 v4.4.0 本地部署指南

## 快速开始

### 系统要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 磁盘 | 20GB | 50GB+ |
| 操作系统 | Ubuntu 20.04 | Ubuntu 22.04 |

### 软件依赖

| 软件 | 版本要求 |
|------|---------|
| Node.js | 22.x |
| pnpm | 9.x |
| MySQL | 8.0+ |
| Docker | 24.0+ (可选) |

---

## Docker部署（推荐）

### 1. 安装Docker

\`\`\`bash
# Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
\`\`\`

### 2. 配置环境变量

\`\`\`bash
cp docker/config.env.template docker/config.env
# 编辑 docker/config.env 填写必要配置
\`\`\`

### 3. 启动服务

\`\`\`bash
docker-compose up -d
\`\`\`

### 4. 验证部署

\`\`\`bash
curl http://localhost:3000/api/health
\`\`\`

---

## 源码部署

### 1. 克隆代码

\`\`\`bash
git clone <repository-url>
cd grt-implementation-plan
\`\`\`

### 2. 安装依赖

\`\`\`bash
pnpm install
\`\`\`

### 3. 配置数据库

\`\`\`bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE grt_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行迁移
pnpm db:push
\`\`\`

### 4. 配置环境变量

\`\`\`bash
cp .env.example .env
# 编辑 .env 文件
\`\`\`

### 5. 启动服务

\`\`\`bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start
\`\`\`

---

## 环境变量配置

| 变量名 | 必需 | 描述 |
|-------|-----|------|
| DATABASE_URL | ✅ | MySQL连接字符串 |
| JWT_SECRET | ✅ | JWT签名密钥 |
| GEMINI_API_KEY | ⚠️ | Gemini AI密钥 |
| JIANDAOYUN_API_KEY | ⚠️ | 简道云API密钥 |

---

## 健康检查

| 端点 | 方法 | 描述 |
|-----|------|------|
| /api/health | GET | 应用健康状态 |
| /api/trpc/system.health | GET | tRPC健康检查 |
| /api/trpc/system.dbHealth | GET | 数据库连接状态 |

---

## 常见问题

### Q: 数据库连接失败
A: 检查DATABASE_URL格式和MySQL服务状态

### Q: 端口被占用
A: 修改.env中的PORT配置或停止占用进程

### Q: 内存不足
A: 增加服务器内存或调整Node.js内存限制

---

**文档版本**: v4.4.0
`;

export default function GeminiSpecification() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("specification");

  const documentStats = {
    version: "v4.4.0",
    checkpointId: "aa226ed5",
    exportDate: "2026-01-24",
    totalModules: 8,
    totalPages: 6,
    testsPassed: 1026
  };

  const quickLinks = [
    { 
      title: language === "zh" ? "AI双引擎架构" : "AI Dual-Engine Architecture", 
      icon: Brain, 
      section: "#4-ai双引擎架构" 
    },
    { 
      title: language === "zh" ? "M0-M12阶段管理" : "M0-M12 Phase Management", 
      icon: Layers, 
      section: "#23-m0-m12项目阶段门径管理" 
    },
    { 
      title: language === "zh" ? "Nocobase活文档" : "Nocobase Live Documents", 
      icon: FileText, 
      section: "#5-nocobase活文档架构" 
    },
    { 
      title: language === "zh" ? "角色权限矩阵" : "Role Permission Matrix", 
      icon: Users, 
      section: "#6-系统使用规范与角色指导" 
    },
    { 
      title: language === "zh" ? "Manus命令格式" : "Manus Command Format", 
      icon: Code2, 
      section: "#7-manus专用命令格式" 
    },
    { 
      title: language === "zh" ? "部署指南" : "Deployment Guide", 
      icon: Server, 
      section: "deployment" 
    },
  ];

  return (
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={BookOpen}
          title={language === "zh" ? "Gemini规范文档" : "Gemini Specification"}
          description={language === "zh"
            ? "GRT智能系统完整技术规范，供Gemini深度分析与整合使用"
            : "Complete technical specification for Gemini deep analysis and integration"}
          actions={
            <>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {language === "zh" ? "下载MD" : "Download MD"}
              </Button>
              <Button variant="outline" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                {language === "zh" ? "在新窗口打开" : "Open in New Tab"}
              </Button>
            </>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-card/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{documentStats.version}</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "版本" : "Version"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{documentStats.totalModules}</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "功能模块" : "Modules"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{documentStats.totalPages}</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "前端页面" : "Pages"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-500">{documentStats.testsPassed}</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "测试通过" : "Tests Passed"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 text-center">
              <div className="text-sm font-mono text-orange-500">{documentStats.checkpointId}</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "检查点ID" : "Checkpoint"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-4 text-center">
              <div className="text-sm font-mono text-cyan-500">{documentStats.exportDate}</div>
              <div className="text-xs text-muted-foreground">{language === "zh" ? "导出日期" : "Export Date"}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              {language === "zh" ? "快速导航" : "Quick Navigation"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickLinks.map((link, index) => (
                <Button 
                  key={index} 
                  variant="outline" 
                  className="h-auto py-3 flex-col gap-2"
                  onClick={() => {
                    if (link.section === "deployment") {
                      setActiveTab("deployment");
                    }
                  }}
                >
                  <link.icon className="w-5 h-5 text-primary" />
                  <span className="text-xs text-center">{link.title}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="specification" className="gap-2">
              <FileText className="w-4 h-4" />
              {language === "zh" ? "完整规范文档" : "Full Specification"}
            </TabsTrigger>
            <TabsTrigger value="deployment" className="gap-2">
              <Server className="w-4 h-4" />
              {language === "zh" ? "本地部署指南" : "Deployment Guide"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="specification" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{language === "zh" ? "GRT智能系统 v4.4.0 完整技术规范" : "GRT System v4.4.0 Complete Technical Specification"}</CardTitle>
                <CardDescription>
                  {language === "zh" 
                    ? "供Gemini进行深入分析、整合其他内容，并生成Manus专用命令建议" 
                    : "For Gemini deep analysis, content integration, and Manus command generation"}
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <Streamdown>{specificationContent}</Streamdown>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deployment" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{language === "zh" ? "GRT智能系统 v4.4.0 本地部署指南" : "GRT System v4.4.0 Local Deployment Guide"}</CardTitle>
                <CardDescription>
                  {language === "zh" 
                    ? "详细的本地部署步骤和配置说明" 
                    : "Detailed local deployment steps and configuration instructions"}
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <Streamdown>{deploymentGuideContent}</Streamdown>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{language === "zh" ? "文档已同步到最新版本" : "Document synced to latest version"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>{language === "zh" ? "上次更新: 2026-01-24" : "Last updated: 2026-01-24"}</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {language === "zh" 
                    ? "将此页面链接发送给Gemini进行深度分析" 
                    : "Share this page link with Gemini for deep analysis"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
