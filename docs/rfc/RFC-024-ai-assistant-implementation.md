# RFC-024: AI助手双层体系架构实现

## 基本信息

| 字段 | 值 |
|------|-----|
| RFC编号 | RFC-024 |
| 标题 | AI助手双层体系架构实现 |
| 状态 | 已批准 |
| 创建日期 | 2026-01-18 |
| 作者 | Manus AI |
| 依赖RFC | RFC-023 |

## 1. 背景与目标

基于RFC-023批准的AI助手双层体系架构设计，本RFC定义具体的技术实现方案，包括员工数字助手(DA)管理界面、AI建议UI组件和功能型AI助手Prompt配置。

### 1.1 实现目标

1. **员工DA创建界面**：为每位员工配置专属数字助手，支持个性化设置
2. **AI建议UI组件**：在业务流程中集成浅色AI建议显示，支持三种建议模式
3. **功能型AI助手Prompt**：为8种功能型AI助手配置专业的系统提示词

## 2. 技术规范

### 2.1 员工数字助手管理界面

#### 2.1.1 页面路由
- 路径：`/hrm-intelligent/digital-assistants`
- 权限：HR管理员、系统管理员

#### 2.1.2 功能需求

| 功能 | 描述 | 优先级 |
|------|------|--------|
| DA列表展示 | 显示所有员工数字助手，支持搜索和筛选 | P0 |
| DA创建 | 为员工创建数字助手，自动生成命名 | P0 |
| DA编辑 | 修改DA配置和能力设置 | P0 |
| DA激活/停用 | 管理DA状态 | P1 |
| 能力配置 | 配置任务协助、日程管理等能力 | P1 |
| 个性化设置 | 工作习惯、偏好、专业领域配置 | P2 |

#### 2.1.3 命名规则
```
{员工号}-DA
示例：E001-DA, GRT-2024-001-DA
```

### 2.2 AI建议UI组件

#### 2.2.1 组件设计

```typescript
interface AISuggestionPanelProps {
  processType: string;      // 流程类型
  processId: string;        // 流程ID
  stepCode: string;         // 当前步骤代码
  mode: 'full_process' | 'current_step' | 'single_action';
  onApply?: (suggestionId: number) => void;
}
```

#### 2.2.2 UI规范

| 属性 | 值 |
|------|-----|
| 背景色 | `bg-blue-50/50` (浅蓝色半透明) |
| 边框 | `border-l-4 border-blue-300` |
| 图标 | Sparkles (lucide-react) |
| 按钮样式 | `variant="outline"` 小尺寸 |

#### 2.2.3 三种建议模式

| 模式 | 说明 | 显示内容 |
|------|------|----------|
| `full_process` | AI全过程建议 | 后续所有流程的AI智能助手建议 |
| `current_step` | 本过程建议 | 当前流程步骤的AI工作内容建议 |
| `single_action` | 单步执行 | 执行到某一步的AI智能助手工作 |

### 2.3 功能型AI助手Prompt配置

#### 2.3.1 通用Prompt结构

```markdown
## 角色定义
你是GRT智能系统的{助手名称}，专注于{功能领域}。

## 核心能力
- {能力1}
- {能力2}
- ...

## 数据访问权限
- {数据源1}
- {数据源2}
- ...

## 工作流程
1. {步骤1}
2. {步骤2}
...

## 输出格式
{输出格式说明}

## 注意事项
- {注意事项1}
- {注意事项2}
```

#### 2.3.2 八种功能型AI助手配置

| 助手类型 | 核心功能 | 数据访问 |
|----------|----------|----------|
| AI Solution Assistant | 方案设计、解决方案推荐 | 历史方案库、设备型号、工艺参数 |
| AI Quotation Assistant | 报价生成、成本分析 | 成本基准、BOM数据、历史报价 |
| AI Planning Assistant | 工作计划、培训计划、拜访计划 | 年度计划、会议记录、KPI数据 |
| AI KPI Assistant | 绩效评估、实时评分、沟通建议 | 绩效数据、计划执行、考核标准 |
| AI Interview Assistant | 面试评估、候选人分析 | 简历库、岗位要求、面试记录 |
| AI Purchase Assistant | 采购管理、供应商协调 | 供应商数据、采购历史、价格信息 |
| AI Engineering Assistant | M0-M12项目管理 | 项目数据、里程碑、阶段文档 |
| AI Quality Assistant | 质量检验、问题分析 | 质量标准、检验记录、问题库 |

## 3. 数据库设计

### 3.1 已有表（RFC-023）
- `employee_digital_assistants` - 员工数字助手
- `functional_ai_assistants` - 功能型AI助手
- `ai_process_suggestions` - AI流程建议
- `ai_suggestion_execution_logs` - 建议执行日志

### 3.2 新增字段

无需新增表，仅需更新`functional_ai_assistants`表中的`systemPrompt`字段。

## 4. API设计

### 4.1 员工DA管理API

```typescript
// tRPC路由
employeeDA: {
  list: publicProcedure.query(),           // 获取DA列表
  getById: publicProcedure.input(z.number()).query(),
  create: protectedProcedure.input(CreateDAInput).mutation(),
  update: protectedProcedure.input(UpdateDAInput).mutation(),
  toggleStatus: protectedProcedure.input(z.number()).mutation(),
}
```

### 4.2 AI建议API

```typescript
// tRPC路由
aiSuggestion: {
  getSuggestions: publicProcedure.input(GetSuggestionsInput).query(),
  applySuggestion: protectedProcedure.input(z.number()).mutation(),
  logExecution: protectedProcedure.input(LogExecutionInput).mutation(),
}
```

## 5. 实施计划

| 阶段 | 任务 | 预计工时 |
|------|------|----------|
| Phase 1 | 员工DA管理界面 | 4-6小时 |
| Phase 2 | AI建议UI组件 | 3-4小时 |
| Phase 3 | 功能型AI助手Prompt | 2-3小时 |
| Phase 4 | 集成测试和文档 | 1-2小时 |

**总计预计工时**：10-15小时

## 6. 验收标准

### 6.1 员工DA管理界面
- [ ] 可以创建、编辑、删除员工数字助手
- [ ] 命名规则自动生成正确
- [ ] 能力配置保存正确
- [ ] 状态切换功能正常

### 6.2 AI建议UI组件
- [ ] 三种模式切换正常
- [ ] 建议内容正确显示
- [ ] 一键应用功能正常
- [ ] 执行日志记录正确

### 6.3 功能型AI助手Prompt
- [ ] 8种助手Prompt配置完整
- [ ] 数据访问权限设置正确
- [ ] 输出格式符合规范

## 7. 评审记录

| 日期 | 评审人 | 结果 | 备注 |
|------|--------|------|------|
| 2026-01-18 | 技术负责人 | 批准 | 按计划实施 |

---

**文档版本**：1.0
**最后更新**：2026-01-18
