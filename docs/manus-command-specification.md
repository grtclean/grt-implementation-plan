# Manus专用命令格式规范
## Gemini分析建议执行标准

**版本**: v1.1  
**创建时间**: 2026-01-18  
**更新时间**: 2026-01-19  
**适用范围**: Gemini分析GRT智能系统规范后生成的可执行命令

---

## 1. 概述

本规范定义了Gemini分析GRT智能系统技术规范后，生成供Manus执行的标准化命令格式。通过统一的命令语法和参数结构，确保Gemini的优化建议能够被Manus准确理解和执行。

---

## 2. 命令语法规范

### 2.1 基本语法

```
@manus <action> <target_type> <target_name> [--options]
```

| 组成部分 | 说明 | 必需 |
|----------|------|------|
| `@manus` | 命令前缀，标识Manus可执行命令 | 是 |
| `<action>` | 操作类型（create/update/fix/delete等） | 是 |
| `<target_type>` | 目标类型（file/component/schema/route等） | 是 |
| `<target_name>` | 目标名称或路径 | 是 |
| `[--options]` | 可选参数 | 否 |

### 2.2 支持的操作类型

| 操作 | 说明 | 示例 |
|------|------|------|
| `create` | 创建新资源 | `@manus create component Button` |
| `update` | 更新现有资源 | `@manus update schema users` |
| `fix` | 修复错误 | `@manus fix typescript server/routers.ts` |
| `delete` | 删除资源 | `@manus delete file temp.ts` |
| `refactor` | 重构代码 | `@manus refactor router authRouter` |
| `test` | 创建或运行测试 | `@manus test vitest zkpRouter` |
| `doc` | 更新文档 | `@manus doc rfc RFC-037` |
| `rollback` | 版本回滚 | `@manus rollback version a4612592` |
| `migrate` | 数据库迁移 | `@manus migrate schema push` |
| `deploy` | 部署操作 | `@manus deploy checkpoint` |

### 2.3 目标类型定义

| 目标类型 | 说明 | 典型路径 |
|----------|------|----------|
| `file` | 通用文件 | 任意路径 |
| `component` | React组件 | client/src/components/ |
| `page` | 页面组件 | client/src/pages/ |
| `schema` | 数据库Schema | drizzle/schema.ts |
| `router` | tRPC路由 | server/*.ts |
| `test` | 测试文件 | server/*.test.ts |
| `doc` | 文档文件 | docs/*.md |
| `rfc` | RFC文档 | docs/rfc/*.md |
| `config` | 配置文件 | 根目录配置 |
| `version` | 版本检查点 | Manus版本ID |

---

## 3. 参数传递格式

### 3.1 内联参数

简单参数直接跟在命令后：

```
@manus create component ZKPCard --path client/src/components/zkp/
@manus fix typescript server/zkpRouter.ts --line 75
@manus rollback version a4612592 --force
```

### 3.2 JSON参数块

复杂参数使用JSON格式：

```
@manus create component ZKPVerificationCard
```json
{
  "path": "client/src/components/zkp/",
  "template": "card",
  "props": {
    "requestId": "string",
    "onVerify": "() => void",
    "onResult": "(result: ZKPResult) => void"
  },
  "imports": [
    "@/components/ui/card",
    "@/components/ui/button",
    "@/lib/trpc"
  ],
  "features": [
    "loading-state",
    "error-handling",
    "real-time-update"
  ]
}
```

### 3.3 YAML参数块

批量命令使用YAML格式：

```yaml
@manus batch execute
---
commands:
  - id: FIX-001
    action: fix
    target_type: typescript
    target_name: server/zkpRouter.ts
    options:
      line: 75
      error: "Expected 2-3 arguments, but got 1"
      fix: "添加缺失的ctx参数"
    priority: critical
    
  - id: FIX-002
    action: fix
    target_type: import
    target_name: server/routers.ts
    options:
      module: aiNotebookRouter
      fix: "修正导入路径或创建缺失模块"
    priority: critical
    depends_on: []
    
  - id: CREATE-001
    action: create
    target_type: test
    target_name: server/zkpRouter.test.ts
    options:
      coverage: ["createVerificationRequest", "executeVerification", "getVerificationResult"]
    priority: medium
    depends_on: [FIX-001]

execution_strategy: sequential
rollback_on_failure: true
checkpoint_before: true
```

---

## 4. 命令模板库

### 4.1 TypeScript错误修复模板

```
@manus fix typescript <file_path>
```json
{
  "errors": [
    {
      "line": 75,
      "code": "TS2554",
      "message": "Expected 2-3 arguments, but got 1",
      "fix": {
        "type": "add_argument",
        "position": "after_first",
        "value": "ctx"
      }
    }
  ],
  "verify_after": true
}
```

### 4.2 组件创建模板

```
@manus create component <ComponentName>
```json
{
  "type": "functional",
  "path": "client/src/components/",
  "props": {
    "propName": {
      "type": "string",
      "required": true,
      "description": "属性说明"
    }
  },
  "hooks": ["useState", "useEffect", "trpc.*.useQuery"],
  "styling": "tailwind",
  "tests": true
}
```

### 4.3 tRPC路由创建模板

```
@manus create router <routerName>
```json
{
  "path": "server/",
  "procedures": [
    {
      "name": "list",
      "type": "query",
      "access": "protected",
      "input": "z.object({ page: z.number(), limit: z.number() })",
      "output": "z.array(ItemSchema)"
    },
    {
      "name": "create",
      "type": "mutation",
      "access": "protected",
      "input": "CreateItemSchema",
      "output": "ItemSchema"
    }
  ],
  "register_in": "server/routers.ts"
}
```

### 4.4 数据库Schema更新模板

```
@manus update schema <table_name>
```json
{
  "action": "add_column",
  "columns": [
    {
      "name": "new_field",
      "type": "varchar(100)",
      "nullable": true,
      "default": null
    }
  ],
  "migrate": true,
  "backup_before": true
}
```

### 4.5 版本回滚模板

```
@manus rollback version <version_id>
```json
{
  "backup_current": true,
  "backup_tag": "pre-rollback-{timestamp}",
  "verify_after": true,
  "verification_checklist": [
    "server_startup",
    "database_connection",
    "oauth_flow",
    "core_routes"
  ],
  "notify_on_complete": true
}
```

---

## 5. 执行优先级定义

| 优先级 | 标识 | 说明 | 执行顺序 |
|--------|------|------|----------|
| Critical | `P0` | 阻塞性问题，必须立即修复 | 最先执行 |
| High | `P1` | 重要问题，影响核心功能 | 次优先 |
| Medium | `P2` | 一般问题，影响用户体验 | 正常队列 |
| Low | `P3` | 次要问题，可延后处理 | 最后执行 |

---

## 6. 依赖关系定义

### 6.1 依赖语法

```yaml
commands:
  - id: CMD-001
    depends_on: []  # 无依赖，可立即执行
    
  - id: CMD-002
    depends_on: [CMD-001]  # 依赖CMD-001完成
    
  - id: CMD-003
    depends_on: [CMD-001, CMD-002]  # 依赖多个命令
```

### 6.2 执行策略

| 策略 | 说明 |
|------|------|
| `sequential` | 按依赖顺序串行执行 |
| `parallel` | 无依赖的命令并行执行 |
| `batch` | 分批执行，每批内并行 |

---

## 7. 错误处理规范

### 7.1 错误响应格式

```json
{
  "command_id": "CMD-001",
  "status": "failed",
  "error": {
    "code": "EXEC_ERROR",
    "message": "执行失败描述",
    "details": "详细错误信息",
    "stack": "错误堆栈（可选）"
  },
  "recovery": {
    "suggestion": "建议的恢复操作",
    "rollback_available": true,
    "rollback_command": "@manus rollback version a4612592"
  }
}
```

### 7.2 自动恢复策略

```yaml
error_handling:
  on_failure: rollback  # rollback | skip | pause | retry
  max_retries: 3
  retry_delay: 5s
  rollback_checkpoint: a4612592
  notify_on_error: true
```

---

## 8. Gemini输出模板

Gemini分析完成后，应按以下格式输出：

```yaml
# ============================================
# Gemini Analysis Report for GRT v2.8.0
# ============================================
# Generated: 2026-01-18T16:30:00Z
# Analyzed Version: a4612592
# Total Issues Found: 12
# ============================================

summary:
  critical_issues: 2
  high_issues: 3
  medium_issues: 5
  low_issues: 2
  estimated_fix_time: "2h 30m"

# ============================================
# PHASE 1: Critical Fixes (Must Execute First)
# ============================================

phase_1_critical:
  name: "Critical Error Fixes"
  description: "修复阻塞性错误，恢复系统正常运行"
  
  commands:
    - id: CRIT-001
      command: "@manus fix typescript server/zkpRouter.ts"
      priority: P0
      description: "修复zkpRouter.ts第75行参数错误"
      details: |
        错误: TS2554 - Expected 2-3 arguments, but got 1
        位置: server/zkpRouter.ts:75
        修复: 在getDb()调用中添加缺失的参数
      estimated_time: "5min"
      verification: "pnpm tsc --noEmit"
      
    - id: CRIT-002
      command: "@manus fix import server/routers.ts"
      priority: P0
      description: "修复aiNotebookRouter模块导入错误"
      details: |
        错误: ERR_MODULE_NOT_FOUND
        模块: aiNotebookRouter
        修复: 创建缺失模块或修正导入路径
      estimated_time: "10min"
      verification: "pnpm dev"

# ============================================
# PHASE 2: High Priority Improvements
# ============================================

phase_2_high:
  name: "Type Safety Improvements"
  description: "修复类型定义问题，提升代码质量"
  depends_on: [CRIT-001, CRIT-002]
  
  commands:
    - id: HIGH-001
      command: "@manus fix typescript"
      target: "Date类型转换"
      priority: P1
      files_affected: 15
      fix_pattern: "date.toISOString()"
      
# ============================================
# ROLLBACK INSTRUCTIONS
# ============================================

rollback:
  trigger_conditions:
    - "任何CRIT级别命令执行失败"
    - "服务器无法启动"
    - "核心功能测试失败"
  
  command: "@manus rollback version a4612592"
  
  verification_after_rollback:
    - "确认服务器正常启动"
    - "确认数据库连接正常"
    - "确认OAuth流程正常"
    - "确认核心路由可访问"

# ============================================
# END OF REPORT
# ============================================
```

---

## 9. 使用示例

### 9.1 单命令执行

```
用户: @manus fix typescript server/zkpRouter.ts --line 75

Manus执行:
1. 读取server/zkpRouter.ts
2. 定位第75行
3. 分析TS2554错误
4. 应用修复
5. 运行类型检查验证
6. 报告结果
```

### 9.2 批量命令执行

```
用户: 执行Gemini分析报告中的Phase 1命令

Manus执行:
1. 解析YAML格式的命令列表
2. 按依赖关系排序
3. 创建回滚检查点
4. 依次执行CRIT-001, CRIT-002
5. 每步验证结果
6. 汇总执行报告
```

### 9.3 回滚执行

```
用户: @manus rollback version a4612592 --verify

Manus执行:
1. 备份当前状态
2. 调用webdev_rollback_checkpoint(a4612592)
3. 等待回滚完成
4. 执行验证清单
5. 报告回滚结果
```

---

## 10. 最佳实践

### 10.1 命令编写原则

1. **明确性**: 每个命令应有清晰的目标和预期结果
2. **原子性**: 单个命令应完成单一任务
3. **可逆性**: 重要操作应支持回滚
4. **可验证**: 命令执行后应有验证步骤

### 10.2 批量执行建议

1. 始终在执行前创建检查点
2. 按优先级分阶段执行
3. 每阶段完成后验证
4. 保留执行日志供审计

### 10.3 错误处理建议

1. 遇到Critical错误立即停止
2. High错误可尝试跳过继续
3. 保留错误上下文供分析
4. 及时回滚避免状态混乱

---

## 11. 通知渠道配置命令

### 11.1 告警通知配置

```
@manus config notification <channel>
```json
{
  "channel": "email|dingtalk|wechat",
  "enabled": true,
  "config": {
    "email": {
      "smtp_host": "smtp.example.com",
      "smtp_port": 587,
      "recipients": ["admin@example.com"]
    },
    "dingtalk": {
      "webhook_url": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
      "secret": "SEC..."
    },
    "wechat": {
      "corp_id": "xxx",
      "agent_id": "xxx",
      "secret": "xxx"
    }
  },
  "alert_levels": ["critical", "high"],
  "cooldown_minutes": 30
}
```

### 11.2 通知测试命令

```
@manus test notification <channel> --message "测试消息"
```

---

## 12. 死锁监控命令

### 12.1 状态查询

```
@manus deadlock status
@manus deadlock history --days 7
@manus deadlock stats
```

### 12.2 配置更新

```
@manus deadlock config
```json
{
  "checkIntervalMs": 300000,
  "autoResolve": true,
  "alertThreshold": "high",
  "alertCooldownMinutes": 30,
  "historyRetentionDays": 30
}
```

### 12.3 手动检测

```
@manus deadlock check --force
```

---

## 13. 版本更新记录

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2026-01-18 | 初始版本，定义基本命令格式 |
| v1.1 | 2026-01-19 | 添加通知渠道配置、死锁监控命令 |

---

**文档结束**

*本规范由Manus AI创建，用于标准化Gemini分析建议的执行流程。*
