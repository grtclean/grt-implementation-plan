# GRT智能系统 Gemini分析使用指南

> **版本**: v2.10.0  
> **日期**: 2026-01-18  
> **目的**: 指导如何使用Gemini分析GRT系统规范并生成Manus可执行命令

---

## 1. 概述

本指南说明如何将GRT智能系统规范文档发送给Gemini进行深度分析，并获取可直接在Manus中执行的优化命令。

### 1.1 工作流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  导出规范   │ → │  Gemini分析  │ → │  Manus执行   │
│  文档包     │    │  生成命令   │    │  优化修复   │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## 2. 发送给Gemini的内容

### 2.1 主文档

将以下文件内容发送给Gemini：

**文件路径**: `docs/exports/GRT-v2.8.0-Complete-Specification-for-Gemini.md`

### 2.2 补充上下文

如需深度分析特定模块，可附加以下文档：

| 模块 | 文档路径 |
|------|----------|
| AI-AI销售架构 | `docs/rfc/RFC-036-ai-ai-sales-architecture.md` |
| ZKP验证系统 | `server/zkpRouter.ts` |
| 数据库Schema | `drizzle/schema.ts` |
| Manus命令规范 | `docs/manus-command-specification.md` |
| Rollback流程 | `docs/rollback-operation-procedure.md` |

---

## 3. Gemini分析提示词模板

### 3.1 TypeScript错误修复分析

```
请分析以下GRT智能系统规范文档，重点关注TypeScript编译错误。

当前错误统计：
- TS2769 (107个): 函数重载不匹配
- TS2339 (93个): 属性不存在
- TS2345 (62个): 参数类型错误
- TS2322 (61个): 类型不兼容

请按以下格式输出Manus可执行命令：

@manus fix typescript <file_path>
--error-type: <TS错误代码>
--line: <行号>
--solution: |
  <修复代码>
--priority: <P0|P1|P2|P3>

[附上规范文档内容]
```

### 3.2 架构优化分析

```
请分析以下GRT智能系统规范文档，提供架构优化建议。

重点分析：
1. AI-AI销售系统架构的可行性
2. ZKP零知识证明的实施路径
3. SEO优化与核心IP保护的平衡
4. NocoBase集成的最佳实践

请按以下格式输出Manus可执行命令：

@manus create component <component_name>
--path: <file_path>
--description: <功能描述>
--code: |
  <组件代码>

[附上规范文档内容]
```

### 3.3 数据库Schema优化

```
请分析以下GRT智能系统数据库Schema，识别：
1. 缺失的字段定义
2. 类型不一致问题
3. 关系定义错误
4. 索引优化建议

请按以下格式输出Manus可执行命令：

@manus update schema <table_name>
--action: <add_column|modify_column|add_index>
--definition: |
  <Drizzle ORM定义代码>

[附上drizzle/schema.ts内容]
```

---

## 4. Gemini输出格式要求

### 4.1 标准命令格式

```yaml
# Gemini分析结果 - GRT智能系统优化命令
# 生成时间: YYYY-MM-DD HH:MM
# 分析版本: v2.10.0

commands:
  - id: CMD-001
    priority: P0
    category: typescript-fix
    command: |
      @manus fix typescript server/db.ts
      --error-type: TS2769
      --line: 1511
      --solution: |
        await db.insert(projectGates).values({
          projectId,
          phaseCode: phase.phaseCode,
          name: `Gate ${phase.phaseCode}`,  // 添加必填字段
          status: "pending",
        });
    verification: |
      pnpm tsc --noEmit 2>&1 | grep "server/db.ts(1511" | wc -l
      # 预期结果: 0

  - id: CMD-002
    priority: P1
    category: schema-update
    command: |
      @manus update schema projectGates
      --action: modify_column
      --definition: |
        name: varchar('name', { length: 255 }).default(''),
```

### 4.2 批量命令格式

```yaml
batch_commands:
  name: "修复db.ts中的TS2769错误"
  total: 24
  files:
    - path: server/db.ts
      fixes:
        - line: 1511
          error: TS2769
          fix: "添加name字段"
        - line: 1917
          error: TS2769
          fix: "修复isActive类型"
```

---

## 5. Manus执行命令

### 5.1 单条命令执行

收到Gemini的命令后，直接在Manus对话中输入：

```
@manus fix typescript server/db.ts
--error-type: TS2769
--line: 1511
--solution: |
  await db.insert(projectGates).values({
    projectId,
    phaseCode: phase.phaseCode,
    name: `Gate ${phase.phaseCode}`,
    status: "pending",
  });
```

### 5.2 批量命令执行

```
@manus batch execute
--source: gemini-analysis-2026-01-18.yaml
--filter: priority=P0
--dry-run: false
```

### 5.3 验证命令

```
@manus verify typescript
--scope: server/**/*.ts
--report: true
```

---

## 6. 回滚操作

如果Gemini建议的修复导致问题，可使用以下命令回滚：

### 6.1 回滚到稳定版本

```
@manus rollback version a0dbee40
```

### 6.2 已验证的稳定版本

| 版本ID | 版本号 | 描述 |
|--------|--------|------|
| a0dbee40 | v2.10.0 | TypeScript类型修复 |
| c8224def | v2.9.0 | 规范导出与Rollback流程 |
| a4612592 | v2.8.0 | UI组件化与公开展示 |
| da8810c6 | v2.7.0 | AI-AI销售架构 |

---

## 7. 当前待修复错误清单

### 7.1 TS2769错误分布（107个）

| 文件 | 错误数 | 主要原因 |
|------|--------|----------|
| server/db.ts | 24 | 缺少必填字段 |
| server/permissionRoutes.ts | 13 | 类型不匹配 |
| server/processNotebookRoutes.ts | 11 | 字段名不一致 |
| server/ai-assistants/engineeringRoutes.ts | 6 | Date类型问题 |
| server/daIntegrationRoutes.ts | 5 | Schema不匹配 |
| 其他文件 | 48 | 混合问题 |

### 7.2 TS2339错误分布（93个）

| 文件 | 错误数 | 主要原因 |
|------|--------|----------|
| client/src/pages/*.tsx | 35 | 对象属性访问 |
| server/*.ts | 58 | 类型定义缺失 |

### 7.3 优先修复建议

1. **P0 Critical**: server/db.ts - 影响核心数据操作
2. **P1 High**: server/permissionRoutes.ts - 影响权限系统
3. **P2 Medium**: client/src/pages/*.tsx - 影响前端显示
4. **P3 Low**: 其他辅助文件

---

## 8. 附录：完整错误列表生成命令

在Manus中执行以下命令生成完整错误列表：

```bash
cd /home/ubuntu/grt-implementation-plan && \
pnpm tsc --noEmit 2>&1 | \
grep "error TS" | \
sort > /tmp/ts-errors-full.txt && \
cat /tmp/ts-errors-full.txt
```

---

**文档作者**: Manus AI  
**最后更新**: 2026-01-18
