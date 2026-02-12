# RFC-023: AI助手双层体系架构

## 元信息

| 项目 | 内容 |
|------|------|
| RFC编号 | RFC-023 |
| 提出日期 | 2026-01-18 |
| 提出人 | 用户 |
| 状态 | **已批准** |
| 目标版本 | v2.1.0 |
| 评审人 | Manus AI |
| 批准日期 | 2026-01-18 |

---

## 1. 背景

当前GRT智能系统已实现多种AI助手功能（Solution/Quotation/Planning/KPI等），但缺乏统一的命名体系和流程集成机制。用户提出需要建立双层AI助手体系：

1. **员工数字助手（DA）**：每个员工配备专属数字助手
2. **功能型AI助手**：无真实员工的岗位设定功能型助手

同时，需要在整个系统流程中集成AI建议功能，提供全过程、本过程和单步执行三种AI建议模式。

---

## 2. 目标

本RFC旨在实现以下目标：

| 目标 | 描述 | 优先级 |
|------|------|--------|
| **统一命名体系** | 建立员工DA和功能型AI助手的标准命名规范 | P0 |
| **流程集成** | 在系统流程中集成AI建议功能 | P0 |
| **用户体验** | 提供淡色显示的AI建议，不干扰主流程 | P1 |
| **可扩展性** | 支持未来新增AI助手类型 | P2 |

---

## 3. 功能描述

### 3.1 员工数字助手（DA）命名体系

每个员工可配置专属的数字助手，命名规则如下：

```
{员工号}-DA

示例：
E001-DA    → 员工E001的数字助手
E002-DA    → 员工E002的数字助手
PM001-DA   → 项目经理PM001的数字助手
```

员工DA具备以下特性：

| 特性 | 说明 |
|------|------|
| **个性化学习** | 学习员工的工作习惯和偏好 |
| **任务辅助** | 协助完成日常工作任务 |
| **知识积累** | 积累员工的专业知识和经验 |
| **沟通代理** | 代理常规沟通和提醒 |

### 3.2 功能型AI助手命名体系

无真实员工的岗位设定功能型AI助手，命名规则如下：

```
AI {功能名称} Assistant

示例：
AI Solution Assistant      → 方案设计助手
AI Quotation Assistant     → 报价生成助手
AI Planning Assistant      → 计划规划助手
AI KPI Assistant           → 绩效评估助手
AI Interview Assistant     → 面试评估助手
AI Purchase Assistant      → 采购管理助手
```

### 3.3 AI建议流程集成

在系统流程中集成三种AI建议模式：

| 模式 | 功能 | UI表现 |
|------|------|--------|
| **AI全过程建议** | 显示后续所有流程的AI智能助手建议 | 淡色面板，显示全流程建议列表 |
| **本过程AI建议** | 当前流程步骤的AI工作内容建议 | 淡色卡片，显示当前步骤建议 |
| **单步AI执行** | 执行到某一步时的AI智能助手工作 | 按钮触发，执行单步AI任务 |

---

## 4. 技术方案

### 4.1 数据库Schema设计

```typescript
// 员工数字助手表
export const employeeDigitalAssistants = mysqlTable('employee_digital_assistants', {
  id: int('id').primaryKey().autoincrement(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  assistantCode: varchar('assistant_code', { length: 100 }).notNull(), // E001-DA
  displayName: varchar('display_name', { length: 200 }),
  isActive: boolean('is_active').default(true),
  learningData: json('learning_data'), // 个性化学习数据
  preferences: json('preferences'), // 用户偏好设置
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// 功能型AI助手表
export const functionalAiAssistants = mysqlTable('functional_ai_assistants', {
  id: int('id').primaryKey().autoincrement(),
  assistantType: varchar('assistant_type', { length: 50 }).notNull(), // solution/quotation/planning/kpi
  assistantCode: varchar('assistant_code', { length: 100 }).notNull(), // AI Solution Assistant
  displayName: varchar('display_name', { length: 200 }).notNull(),
  description: text('description'),
  systemPrompt: text('system_prompt'), // 系统提示词
  capabilities: json('capabilities'), // 能力配置
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// AI流程建议表
export const aiProcessSuggestions = mysqlTable('ai_process_suggestions', {
  id: int('id').primaryKey().autoincrement(),
  processType: varchar('process_type', { length: 50 }).notNull(), // project/crm/hrm
  processId: varchar('process_id', { length: 100 }).notNull(),
  stepCode: varchar('step_code', { length: 50 }).notNull(), // M0/M1/M2...
  suggestionMode: varchar('suggestion_mode', { length: 20 }).notNull(), // full_process/current_step/single_action
  suggestionContent: json('suggestion_content'),
  assistantId: int('assistant_id'),
  isApplied: boolean('is_applied').default(false),
  appliedAt: timestamp('applied_at'),
  appliedBy: varchar('applied_by', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 4.2 API接口设计

```typescript
// AI助手路由
export const aiAssistantRouter = router({
  // 员工DA管理
  employeeDA: {
    create: protectedProcedure.input(z.object({
      employeeId: z.string(),
      displayName: z.string().optional(),
    })).mutation(async ({ input }) => {
      // 自动生成 {employeeId}-DA 格式的助手代码
    }),
    
    getByEmployee: protectedProcedure.input(z.object({
      employeeId: z.string(),
    })).query(async ({ input }) => {
      // 获取员工的数字助手
    }),
  },
  
  // 功能型助手管理
  functional: {
    list: protectedProcedure.query(async () => {
      // 获取所有功能型助手列表
    }),
    
    getByType: protectedProcedure.input(z.object({
      type: z.enum(['solution', 'quotation', 'planning', 'kpi', 'interview', 'purchase']),
    })).query(async ({ input }) => {
      // 获取指定类型的功能型助手
    }),
  },
  
  // AI流程建议
  processSuggestion: {
    getFullProcess: protectedProcedure.input(z.object({
      processType: z.string(),
      processId: z.string(),
    })).query(async ({ input }) => {
      // 获取全过程AI建议
    }),
    
    getCurrentStep: protectedProcedure.input(z.object({
      processType: z.string(),
      processId: z.string(),
      stepCode: z.string(),
    })).query(async ({ input }) => {
      // 获取当前步骤AI建议
    }),
    
    executeSingleAction: protectedProcedure.input(z.object({
      processType: z.string(),
      processId: z.string(),
      stepCode: z.string(),
      actionType: z.string(),
    })).mutation(async ({ input }) => {
      // 执行单步AI任务
    }),
  },
});
```

### 4.3 前端UI组件设计

```typescript
// AI建议面板组件
interface AISuggestionPanelProps {
  processType: string;
  processId: string;
  currentStep?: string;
  mode: 'full_process' | 'current_step' | 'single_action';
}

// 组件样式：淡色背景，不干扰主流程
const panelStyles = {
  backgroundColor: 'rgba(var(--primary-rgb), 0.05)',
  borderLeft: '3px solid rgba(var(--primary-rgb), 0.3)',
  padding: '1rem',
  borderRadius: '0.5rem',
};
```

---

## 5. 影响分析

### 5.1 系统影响

| 影响范围 | 说明 | 风险等级 |
|----------|------|----------|
| **数据库** | 新增3个表，不影响现有表 | 低 |
| **API** | 新增AI助手路由，不影响现有路由 | 低 |
| **前端** | 新增AI建议组件，需集成到现有页面 | 中 |
| **性能** | AI建议可能增加LLM调用，需要缓存优化 | 中 |

### 5.2 兼容性分析

本次变更向后兼容，不影响现有功能。新增的AI建议功能默认关闭，用户可按需启用。

---

## 6. 工作量估算

| 任务 | 估算工时 | 负责人 |
|------|----------|--------|
| 数据库Schema设计和迁移 | 2小时 | Claude Code |
| 员工DA API实现 | 3小时 | Claude Code |
| 功能型助手API实现 | 2小时 | Claude Code |
| AI流程建议API实现 | 4小时 | Claude Code |
| 前端AI建议组件开发 | 4小时 | Claude Code |
| 页面集成 | 3小时 | Claude Code |
| 单元测试 | 3小时 | Claude Code |
| 文档更新 | 2小时 | Manus AI |
| **总计** | **23小时** | - |

---

## 7. 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| LLM调用延迟影响用户体验 | 中 | 中 | 实现建议缓存，异步加载 |
| AI建议质量不稳定 | 中 | 中 | 优化提示词，增加人工审核选项 |
| 数据库性能下降 | 低 | 中 | 添加索引，定期清理历史数据 |

---

## 8. 评审记录

### 评审会议

- **日期**：2026-01-18
- **参与人**：用户、Manus AI
- **结论**：✅ 批准实施

### 评审意见

用户明确提出了AI助手双层体系架构的需求，包括员工DA命名规范、功能型AI助手命名规范，以及AI建议流程集成的三种模式。技术方案可行，风险可控。

---

## 9. 批准信息

- **批准人**：用户
- **批准日期**：2026-01-18
- **批准意见**：同意按照RFC-023方案实施AI助手双层体系架构升级

---

*文档版本：v1.0*
*更新日期：2026-01-18*
*作者：Manus AI*
