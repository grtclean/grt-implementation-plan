# GRT智能系统 v2.8.0 完整技术规范
## Gemini深度分析专用导出文档

**版本**: v2.8.0  
**导出时间**: 2026-01-18  
**检查点ID**: a4612592  
**用途**: 供Gemini进行深入细致分析，生成Manus专用命令建议

---

## 目录

1. [系统概述](#1-系统概述)
2. [核心架构](#2-核心架构)
3. [RFC文档索引](#3-rfc文档索引)
4. [数据库Schema](#4-数据库schema)
5. [API接口规范](#5-api接口规范)
6. [Manus专用命令格式](#6-manus专用命令格式)
7. [Rollback操作规范](#7-rollback操作规范)
8. [待优化项清单](#8-待优化项清单)

---

## 1. 系统概述

GRT智能系统是为工业清洗设备制造企业设计的全生命周期数字化管理平台，采用AI-AI交互架构，支持从销售到交付的端到端业务流程自动化。

### 1.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | React 19 + Tailwind 4 | 响应式UI框架 |
| 后端 | Express 4 + tRPC 11 | 类型安全API |
| 数据库 | MySQL/TiDB | 分布式数据库 |
| ORM | Drizzle ORM | 类型安全查询 |
| 认证 | Manus OAuth | 统一身份认证 |
| AI | Gemini/Claude | 多模型协作 |

### 1.2 核心模块

系统包含六大核心子系统：

1. **MES制造执行系统**: 工单管理、工序追踪、质量检测
2. **AI采购系统**: 智能询价、供应商评估、成本优化
3. **3-3-3-1财务管控**: 三级预算、三级审批、三级核算、一体化报表
4. **门径管理系统**: M0-M12项目阶段门禁、评审流程
5. **工作流引擎**: 可视化流程设计、自动触发、异常处理
6. **智能人才网格**: 技能矩阵、培训追踪、绩效评估

---

## 2. 核心架构

### 2.1 AI-AI销售系统架构

基于RFC-036设计的五大智能体架构：

```
┌─────────────────────────────────────────────────────────────┐
│                    AI-AI 销售系统架构                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Listener   │───▶│  Estimator  │───▶│ Negotiator  │     │
│  │ (接口智能体) │    │ (算力智能体) │    │ (商业智能体) │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Guardian   │◀───│  Conobase   │───▶│   Builder   │     │
│  │ (合规智能体) │    │ (知识图谱)  │    │ (构建智能体) │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 四层透明度模型

| 层级 | 名称 | 可见性 | 内容类型 |
|------|------|--------|----------|
| L0 | 公开展示层 | 全网可见 | 能力介绍、案例摘要、SEO内容 |
| L1 | 注册可见层 | 注册用户 | 技术白皮书、行业报告 |
| L2 | 客户专属层 | 授权客户 | 项目状态、报价详情 |
| L3 | 核心IP层 | 仅内部 | 工艺参数、化学配方、成本结构 |

### 2.3 ZKP零知识证明架构

```
┌─────────────────────────────────────────────────────────────┐
│                    ZKP验证流程                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 创建验证请求                                             │
│     zkp.createVerificationRequest({                         │
│       verificationType: 'vda_191_compliance',               │
│       targetStandard: 'VDA_19.1_LEVEL_A',                   │
│       inputParameters: { ... }                              │
│     })                                                      │
│                                                             │
│  2. 执行ZKP验证                                              │
│     zkp.executeVerification(requestId)                      │
│     → 生成证明哈希 (不暴露原始参数)                           │
│                                                             │
│  3. 公开验证结果                                             │
│     zkp.getVerificationResult(requestId)                    │
│     → 返回: { passed: true, proofHash: '0x...', ... }       │
│                                                             │
│  4. 第三方验证                                               │
│     zkp.validateProofHash(proofHash)                        │
│     → 验证证明有效性 (无需访问原始数据)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. RFC文档索引

### 3.1 已完成RFC (v2.8.0)

| RFC编号 | 标题 | 状态 | 文件路径 |
|---------|------|------|----------|
| RFC-023 | AI助手双层架构 | ✅ 已实施 | docs/rfc/RFC-023-ai-assistant-dual-layer-architecture.md |
| RFC-024 | AI助手实施方案 | ✅ 已实施 | docs/rfc/RFC-024-ai-assistant-implementation.md |
| RFC-025 | AI执行模式选择 | ✅ 已实施 | docs/rfc/RFC-025-ai-execution-mode-selection.md |
| RFC-026 | 过程笔记本系统 | ✅ 已实施 | docs/rfc/RFC-026-process-notebook-system.md |
| RFC-027 | 过程笔记本扩展 | ✅ 已实施 | docs/rfc/RFC-027-process-notebook-extension.md |
| RFC-028 | v2.6.0架构优化 | ✅ 已实施 | docs/rfc/RFC-028-v2.6.0-architecture-optimization.md |
| RFC-029 | FindIQ知识迁移 | ✅ 已实施 | docs/rfc/RFC-029-findiq-knowledge-transfer.md |
| RFC-030 | 未来10年架构 | ✅ 已实施 | docs/rfc/RFC-030-future-10-year-architecture.md |
| RFC-031 | 全球SaaS架构 | ✅ 已实施 | docs/rfc/RFC-031-global-saas-architecture.md |
| RFC-032 | 智能人才网格 | ✅ 已实施 | docs/rfc/RFC-032-intelligent-talent-grid.md |
| RFC-033 | 门径管理系统 | ✅ 已实施 | docs/rfc/RFC-033-gate-management-system.md |
| RFC-034 | MES制造执行 | ✅ 已实施 | docs/rfc/RFC-034-mes-manufacturing-execution.md |
| RFC-035 | 子系统操作手册 | ✅ 已实施 | docs/rfc/RFC-035-subsystem-operation-manual.md |
| RFC-036 | AI-AI销售架构 | ✅ 已实施 | docs/rfc/RFC-036-ai-ai-sales-architecture.md |

### 3.2 核心技术规范文档

| 文档名称 | 用途 | 文件路径 |
|----------|------|----------|
| Claude Code NocoBase技术规范 | Claude Code实施指南 | docs/claude-code-nocobase-technical-specification.md |
| Claude Code预设语句规范 | NocoBase预设语句模板 | docs/claude-code-nocobase-preset-statements.md |
| SEO推广与IP保护策略 | 公开展示与核心保护 | docs/seo-promotion-ip-protection-strategy.md |
| 系统更新治理流程 | 变更管理规范 | docs/system-update-governance-process.md |
| Manus-Claude协作工作流 | 双AI协作规范 | docs/manus-claude-collaboration-workflow.md |

---

## 4. 数据库Schema

### 4.1 ZKP验证相关表

```sql
-- ZKP验证请求表
CREATE TABLE zkp_verification_requests (
  id VARCHAR(36) PRIMARY KEY,
  request_code VARCHAR(50) UNIQUE NOT NULL,
  requester_id VARCHAR(36) NOT NULL,
  verification_type ENUM('vda_191_compliance', 'chemical_safety', 'process_capability', 'equipment_certification') NOT NULL,
  target_standard VARCHAR(100) NOT NULL,
  input_parameters JSON NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ZKP验证结果表
CREATE TABLE zkp_verification_results (
  id VARCHAR(36) PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL,
  proof_hash VARCHAR(128) NOT NULL,
  verification_passed BOOLEAN NOT NULL,
  public_output JSON,
  circuit_version VARCHAR(20) NOT NULL,
  verification_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES zkp_verification_requests(id)
);

-- VDA 19.1清洁度标准表
CREATE TABLE vda_191_cleanliness_standards (
  id VARCHAR(36) PRIMARY KEY,
  standard_code VARCHAR(50) UNIQUE NOT NULL,
  cleanliness_level ENUM('A', 'B', 'C', 'D', 'E') NOT NULL,
  max_particle_size_um INT NOT NULL,
  max_particle_count INT NOT NULL,
  max_fiber_length_um INT,
  test_method VARCHAR(100) NOT NULL,
  applicable_components TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 能力证明配置表
CREATE TABLE capability_proof_configs (
  id VARCHAR(36) PRIMARY KEY,
  capability_code VARCHAR(50) UNIQUE NOT NULL,
  capability_name VARCHAR(100) NOT NULL,
  capability_category ENUM('cleaning', 'quality', 'manufacturing', 'ai', 'compliance') NOT NULL,
  proof_type ENUM('zkp', 'certificate', 'audit', 'test_report') NOT NULL,
  public_description TEXT,
  verification_criteria JSON,
  display_order INT DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 公开能力展示表
CREATE TABLE public_capability_showcase (
  id VARCHAR(36) PRIMARY KEY,
  capability_id VARCHAR(36) NOT NULL,
  showcase_title VARCHAR(200) NOT NULL,
  showcase_description TEXT NOT NULL,
  key_metrics JSON,
  case_summary TEXT,
  seo_keywords VARCHAR(500),
  display_priority INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (capability_id) REFERENCES capability_proof_configs(id)
);

-- 客户门户访问日志表
CREATE TABLE customer_portal_access_logs (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL,
  access_type ENUM('project_status', 'quotation', 'delivery', 'zkp_verification') NOT NULL,
  resource_id VARCHAR(36),
  access_ip VARCHAR(45),
  user_agent TEXT,
  access_result ENUM('success', 'denied', 'error') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 核心业务表概览

| 表名 | 用途 | 记录数估算 |
|------|------|------------|
| users | 用户账户 | ~100 |
| customers | 客户主数据 | ~500 |
| opportunities | 销售商机 | ~1000 |
| projects | 项目主数据 | ~200 |
| work_orders | 生产工单 | ~5000 |
| bom_items | BOM物料 | ~50000 |
| process_notebooks | 过程笔记本 | ~10000 |
| ai_assistant_logs | AI助手日志 | ~100000 |

---

## 5. API接口规范

### 5.1 tRPC路由结构

```typescript
// 主路由结构
export const appRouter = router({
  // 认证路由
  auth: authRouter,
  
  // 系统路由
  system: systemRouter,
  
  // CRM路由
  crm: crmRouter,
  
  // 项目管理路由
  project: projectRouter,
  
  // MES路由
  mes: mesRouter,
  
  // ZKP验证路由
  zkp: zkpRouter,
  
  // AI助手路由
  aiAssistant: aiAssistantRouter,
  
  // 过程笔记本路由
  notebook: notebookRouter,
});
```

### 5.2 ZKP验证接口

```typescript
// ZKP路由定义
export const zkpRouter = router({
  // 创建验证请求 (需认证)
  createVerificationRequest: protectedProcedure
    .input(z.object({
      verificationType: z.enum(['vda_191_compliance', 'chemical_safety', 'process_capability', 'equipment_certification']),
      targetStandard: z.string(),
      inputParameters: z.record(z.any()),
    }))
    .mutation(async ({ ctx, input }) => { ... }),
  
  // 执行验证 (需认证)
  executeVerification: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => { ... }),
  
  // 获取验证结果 (公开)
  getVerificationResult: publicProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ input }) => { ... }),
  
  // 验证证明哈希 (公开)
  validateProofHash: publicProcedure
    .input(z.object({ proofHash: z.string() }))
    .query(async ({ input }) => { ... }),
  
  // 获取公开能力展示 (公开, SEO友好)
  getPublicShowcase: publicProcedure
    .query(async () => { ... }),
});
```

---

## 6. Manus专用命令格式

### 6.1 命令语法规范

Gemini分析后生成的建议应遵循以下Manus专用命令格式：

```
@manus <command_type> <target> [options]
```

### 6.2 支持的命令类型

| 命令类型 | 说明 | 示例 |
|----------|------|------|
| `@manus create` | 创建新文件/组件 | `@manus create component ZKPVerificationCard` |
| `@manus update` | 更新现有文件 | `@manus update schema zkp_verification_requests` |
| `@manus fix` | 修复错误/问题 | `@manus fix typescript server/zkpRouter.ts` |
| `@manus refactor` | 重构代码 | `@manus refactor router zkpRouter` |
| `@manus test` | 创建/运行测试 | `@manus test vitest zkpRouter` |
| `@manus doc` | 更新文档 | `@manus doc rfc RFC-037` |
| `@manus rollback` | 版本回滚 | `@manus rollback version a4612592` |

### 6.3 命令参数格式

```json
{
  "command": "@manus create",
  "target": "component",
  "name": "ZKPVerificationCard",
  "options": {
    "path": "client/src/components/",
    "template": "card",
    "props": ["requestId", "onVerify", "onResult"],
    "dependencies": ["@/components/ui/card", "@/lib/trpc"]
  },
  "context": {
    "relatedFiles": ["server/zkpRouter.ts", "drizzle/schema.ts"],
    "requirements": "显示ZKP验证状态，支持实时更新"
  }
}
```

### 6.4 批量命令格式

```yaml
# Gemini建议批量执行格式
batch_commands:
  - id: fix-001
    command: "@manus fix typescript"
    target: "server/zkpRouter.ts"
    priority: high
    description: "修复zkpRouter.ts第75行参数错误"
    
  - id: fix-002
    command: "@manus fix import"
    target: "server/routers.ts"
    priority: high
    description: "修复aiNotebookRouter导入路径"
    
  - id: create-001
    command: "@manus create test"
    target: "server/zkpRouter.test.ts"
    priority: medium
    description: "创建ZKP路由单元测试"
    depends_on: [fix-001]
```

---

## 7. Rollback操作规范

### 7.1 Rollback触发条件

| 条件类型 | 触发场景 | 自动/手动 |
|----------|----------|-----------|
| 构建失败 | TypeScript编译错误超过阈值 | 手动 |
| 运行时错误 | 服务器启动失败 | 手动 |
| 功能回归 | 核心功能测试失败 | 手动 |
| 性能退化 | 响应时间超过SLA | 手动 |
| 安全漏洞 | 发现严重安全问题 | 手动 |

### 7.2 Rollback到v2.8.0 (a4612592)的标准流程

```
┌─────────────────────────────────────────────────────────────┐
│                 Rollback标准操作流程                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  步骤1: 确认回滚目标                                         │
│  ────────────────────                                       │
│  目标版本: a4612592                                          │
│  版本标签: v2.8.0 UI组件化与公开展示                          │
│  检查点时间: 2026-01-18                                      │
│                                                             │
│  步骤2: 备份当前状态                                         │
│  ────────────────────                                       │
│  @manus backup current --tag pre-rollback                   │
│                                                             │
│  步骤3: 执行回滚                                             │
│  ────────────────────                                       │
│  方式A: 通过Manus Management UI                              │
│    → Dashboard → Checkpoint → 选择a4612592 → Rollback       │
│                                                             │
│  方式B: 通过Manus命令                                        │
│    @manus rollback version a4612592                         │
│                                                             │
│  步骤4: 验证回滚结果                                         │
│  ────────────────────                                       │
│  @manus verify rollback --checklist                         │
│  □ 服务器正常启动                                            │
│  □ 数据库连接正常                                            │
│  □ 核心路由可访问                                            │
│  □ 前端页面正常渲染                                          │
│                                                             │
│  步骤5: 记录回滚日志                                         │
│  ────────────────────                                       │
│  @manus log rollback --reason "描述回滚原因"                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 回滚验证清单

```markdown
## Rollback验证清单 (v2.8.0 / a4612592)

### 基础功能验证
- [ ] 开发服务器正常启动 (端口3000)
- [ ] 数据库连接正常
- [ ] OAuth认证流程正常
- [ ] 主页面正常加载

### 核心模块验证
- [ ] /roadmap 路由正常
- [ ] /tools 路由正常
- [ ] /public 路由正常
- [ ] /capabilities 路由正常
- [ ] /subsystem-help 路由正常

### API接口验证
- [ ] trpc.auth.me 正常响应
- [ ] trpc.zkp.getPublicShowcase 正常响应
- [ ] trpc.system.notifyOwner 正常响应

### 数据完整性验证
- [ ] 用户数据完整
- [ ] 项目数据完整
- [ ] ZKP验证记录完整
```

### 7.4 紧急回滚命令

```bash
# 紧急回滚 (跳过确认)
@manus rollback version a4612592 --force --skip-backup

# 回滚并保留当前更改为分支
@manus rollback version a4612592 --preserve-changes --branch hotfix-backup

# 回滚并自动运行验证
@manus rollback version a4612592 --auto-verify
```

---

## 8. 待优化项清单

### 8.1 TypeScript错误 (446个)

当前存在的主要TypeScript编译错误：

| 文件 | 错误类型 | 优先级 | 建议修复方式 |
|------|----------|--------|--------------|
| server/zkpRouter.ts:75 | TS2554: 参数数量错误 | 高 | 添加缺失的ctx参数 |
| server/routers.ts:124 | 语法错误 | 高 | 修复大括号匹配 |
| server/routers.ts | 模块未找到 | 高 | 修复aiNotebookRouter导入路径 |
| 多个文件 | Date类型不匹配 | 中 | 使用.toISOString()转换 |

### 8.2 功能待实现

| 功能 | 优先级 | 预估工时 | 依赖 |
|------|--------|----------|------|
| 客户门户登录 | 高 | 8h | OAuth扩展 |
| 技术博客模块 | 中 | 16h | SEO优化 |
| ZKP电路实现 | 中 | 40h | snarkjs集成 |
| AI-AI对接接口 | 低 | 24h | AAS协议定义 |

### 8.3 性能优化建议

| 优化项 | 当前状态 | 目标 | 方案 |
|--------|----------|------|------|
| 首页加载时间 | ~2.5s | <1s | 代码分割、懒加载 |
| API响应时间 | ~200ms | <100ms | 查询优化、缓存 |
| 内存占用 | ~500MB | <300MB | 内存泄漏排查 |

---

## 附录A: Gemini分析建议模板

Gemini分析完成后，请按以下格式输出Manus可执行命令：

```yaml
# Gemini Analysis Report
# Generated: {timestamp}
# Target Version: v2.8.0 (a4612592)

analysis_summary:
  total_issues: {count}
  critical: {count}
  high: {count}
  medium: {count}
  low: {count}

recommended_commands:
  - id: CMD-001
    command: "@manus fix typescript server/zkpRouter.ts:75"
    priority: critical
    description: "修复Expected 2-3 arguments, but got 1错误"
    estimated_time: "5min"
    
  - id: CMD-002
    command: "@manus fix import server/routers.ts"
    priority: critical
    description: "修复aiNotebookRouter模块导入错误"
    estimated_time: "5min"

execution_order:
  - phase: 1
    name: "Critical Fixes"
    commands: [CMD-001, CMD-002]
    
  - phase: 2
    name: "Type Safety"
    commands: [CMD-003, CMD-004, ...]

rollback_checkpoint:
  version_id: a4612592
  command: "@manus rollback version a4612592"
  use_when: "任何阶段执行失败时"
```

---

## 附录B: 文件路径索引

```
/home/ubuntu/grt-implementation-plan/
├── docs/
│   ├── rfc/                          # RFC文档目录
│   │   ├── RFC-023-*.md ~ RFC-036-*.md
│   ├── exports/                      # 导出文档目录
│   │   └── GRT-v2.8.0-Complete-Specification-for-Gemini.md
│   ├── claude-code-nocobase-*.md     # Claude Code规范
│   ├── seo-promotion-ip-protection-strategy.md
│   └── system-update-governance-process.md
├── drizzle/
│   └── schema.ts                     # 数据库Schema
├── server/
│   ├── routers.ts                    # 主路由
│   ├── zkpRouter.ts                  # ZKP验证路由
│   └── db.ts                         # 数据库操作
├── client/
│   └── src/
│       ├── pages/
│       │   ├── PublicHome.tsx        # 公开首页
│       │   ├── Capabilities.tsx      # 能力介绍页
│       │   └── SubsystemHelp.tsx     # 子系统帮助页
│       └── components/
│           └── SubsystemHelpPanel.tsx # 帮助面板组件
├── CHANGELOG.md                      # 变更日志
└── todo.md                           # 任务追踪
```

---

**文档结束**

*本文档由Manus AI自动生成，供Gemini进行深度分析使用。*
*检查点版本: a4612592 | 导出时间: 2026-01-18*
