# NocoBase 文档历史参考声明

> **重要声明**：本目录下所有包含 "nocobase" 关键字的文档均为**历史参考文档**，不再作为当前系统的实施依据。

---

## 文档状态说明

| 状态 | 说明 |
|------|------|
| **历史参考** | 文档内容仅供参考，业务需求和功能规范仍然有效 |
| **技术栈已迁移** | 系统已从 NocoBase 迁移至 Drizzle ORM + tRPC + React |
| **需求仍有效** | 文档中定义的业务逻辑、功能需求、数据结构仍需实现 |

---

## 受影响文档列表

以下文档已标记为历史参考：

1. `claude-code-nocobase-preset-statements.md` - Claude Code NocoBase 预设语句
2. `claude-code-nocobase-technical-specification.md` - Claude Code NocoBase 技术规范
3. `grt-strategy-nocobase-implementation.md` - GRT 战略 NocoBase 实施方案
4. `nocobase-deployment-guide.md` - NocoBase 部署指南
5. `nocobase-local-deployment-guide.md` - NocoBase 本地部署指南
6. `nocobase-task-board-setup.md` - NocoBase 任务看板设置
7. `nocobase-task-decomposition.md` - NocoBase 任务分解
8. `nocobase-task-project-board-setup-v2.md` - NocoBase 项目看板设置 v2
9. `windows-nocobase-deployment-guide.md` - Windows NocoBase 部署指南

---

## 架构迁移说明

### 原架构（NocoBase）
- **平台**：NocoBase 低代码平台
- **数据库**：MySQL/PostgreSQL（通过 NocoBase 管理）
- **前端**：NocoBase 内置 UI
- **API**：NocoBase REST API

### 当前架构（Drizzle ORM + tRPC + React）
- **平台**：自定义 Web 应用
- **数据库**：MySQL/TiDB（通过 Drizzle ORM 管理）
- **前端**：React 19 + Tailwind CSS 4 + shadcn/ui
- **API**：tRPC 11 + Express 4

### 迁移原因
1. NocoBase 从未实际部署，所有内容仅存在于规划文档
2. 当前系统已基于 Drizzle ORM + tRPC + React 完整实现
3. 继续使用当前架构可避免 3-6 个月的重新实施周期

---

## 需求继承说明

尽管技术栈已迁移，以下业务需求和功能规范仍需在新架构中实现：

### 1. AI 助手双层体系
- **员工数字助手（DA）**：每个员工配置专属数字助手
- **功能型 AI 助手**：方案助手、报价助手、规划助手等

### 2. AI 建议流程集成
- **AI 全过程建议**：显示后续所有流程的 AI 建议
- **本过程 AI 建议**：当前步骤的 AI 工作建议
- **单步 AI 执行**：执行特定 AI 任务

### 3. 能力操作系统（Capability OS）
- **能力等级（L1-L5）**：基于项目、服务、结果证据
- **能力域**：技术(T)、系统理解(S)、交付(D)、客户价值(C)、知识沉淀(K)、领导力(L)
- **证据驱动升级**：自动触发，禁止主观手动升级

### 4. Tier 1 交付系统
- **红蓝对抗交付**：Tier 1 和高复杂度项目必须执行
- **系统级约束**：交付流程中嵌入系统级检查
- **问题只允许发生一次**：系统性学习机制

---

## 新技术栈开发指南

请参考以下文档了解当前技术栈的开发规范：

- `grt-drizzle-trpc-development-guide.md` - 新技术栈开发指南
- `architecture-decision-record-v2.5.50.md` - 架构决策记录
- `architecture-assessment-report-v2.5.49.md` - 架构评估报告

---

## 更新记录

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-01-30 | v1.0 | 初始版本，标记 NocoBase 文档为历史参考 |

---

*本声明由 v2.5.50 架构迁移决策生成*
