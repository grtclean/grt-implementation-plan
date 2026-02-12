# RFC-025: AI执行模式选择功能

**状态**: 待评审  
**创建日期**: 2026-01-18  
**作者**: Manus AI  
**版本**: 1.0

---

## 1. 概述

本RFC提议在GRT智能系统中实现AI执行模式选择功能，允许用户在"系统内AI"和"泛互式AI"两种模式之间进行选择，以满足不同场景下的AI辅助需求。

## 2. 背景与动机

当前系统的AI助手功能采用统一的执行模式，无法根据具体场景灵活调整AI的响应策略。用户反馈需要：

1. **轻度AI辅助**：基于现有案例库和已有AI化成果，快速响应，结果可预测
2. **深度AI分析**：泛化式广泛分析，深度推理，适合复杂决策场景

## 3. 技术方案

### 3.1 AI执行模式定义

| 模式 | 名称 | 英文标识 | 特点 | 适用场景 |
|------|------|----------|------|----------|
| 系统内AI | Internal AI | `internal` | 基于案例库、快速响应、结果可预测、成本低 | 日常任务、标准流程、快速查询 |
| 泛互式AI | Generative AI | `generative` | 深度分析、创新建议、广泛推理、成本较高 | 复杂决策、方案设计、战略规划 |

### 3.2 数据库Schema设计

```sql
-- AI执行模式配置表
CREATE TABLE ai_execution_mode_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assistant_type VARCHAR(64) NOT NULL COMMENT '助手类型',
    default_mode ENUM('internal', 'generative') DEFAULT 'internal' COMMENT '默认模式',
    internal_prompt TEXT COMMENT '系统内AI提示词',
    generative_prompt TEXT COMMENT '泛互式AI提示词',
    internal_knowledge_sources JSON COMMENT '系统内AI知识源配置',
    generative_model_config JSON COMMENT '泛互式AI模型配置',
    is_enabled TINYINT DEFAULT 1 COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- AI执行记录表（用于效果追踪）
CREATE TABLE ai_execution_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL COMMENT '会话ID',
    assistant_type VARCHAR(64) NOT NULL COMMENT '助手类型',
    execution_mode ENUM('internal', 'generative') NOT NULL COMMENT '执行模式',
    user_id INT COMMENT '用户ID',
    input_content TEXT COMMENT '输入内容',
    output_content TEXT COMMENT '输出内容',
    response_time_ms INT COMMENT '响应时间(毫秒)',
    token_usage JSON COMMENT 'Token使用量',
    is_adopted TINYINT DEFAULT NULL COMMENT '是否被采纳',
    adoption_feedback TEXT COMMENT '采纳反馈',
    effectiveness_score DECIMAL(3,2) COMMENT '效果评分(0-1)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 API接口设计

```typescript
// AI执行模式路由
const aiExecutionModeRouter = router({
    // 获取助手的执行模式配置
    getModeConfig: publicProcedure
        .input(z.object({ assistantType: z.string() }))
        .query(async ({ input }) => { ... }),
    
    // 更新执行模式配置
    updateModeConfig: protectedProcedure
        .input(z.object({
            assistantType: z.string(),
            defaultMode: z.enum(['internal', 'generative']),
            internalPrompt: z.string().optional(),
            generativePrompt: z.string().optional()
        }))
        .mutation(async ({ input }) => { ... }),
    
    // 执行AI请求（支持模式选择）
    execute: protectedProcedure
        .input(z.object({
            assistantType: z.string(),
            mode: z.enum(['internal', 'generative']),
            content: z.string(),
            context: z.any().optional()
        }))
        .mutation(async ({ input, ctx }) => { ... }),
    
    // 记录采纳反馈
    recordAdoption: protectedProcedure
        .input(z.object({
            executionLogId: z.number(),
            isAdopted: z.boolean(),
            feedback: z.string().optional(),
            effectivenessScore: z.number().min(0).max(1).optional()
        }))
        .mutation(async ({ input }) => { ... }),
    
    // 获取效果统计
    getEffectivenessStats: protectedProcedure
        .input(z.object({
            assistantType: z.string().optional(),
            mode: z.enum(['internal', 'generative']).optional(),
            dateRange: z.object({
                start: z.date(),
                end: z.date()
            }).optional()
        }))
        .query(async ({ input }) => { ... })
});
```

### 3.4 前端UI设计

**模式选择组件**：在AISuggestionPanel中添加模式切换功能

```tsx
// 模式选择下拉菜单
<Select value={executionMode} onValueChange={setExecutionMode}>
    <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="选择AI模式" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="internal">
            <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>系统内AI</span>
                <Badge variant="secondary" className="text-xs">快速</Badge>
            </div>
        </SelectItem>
        <SelectItem value="generative">
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>泛互式AI</span>
                <Badge variant="outline" className="text-xs">深度</Badge>
            </div>
        </SelectItem>
    </SelectContent>
</Select>
```

### 3.5 系统内AI vs 泛互式AI 执行策略

| 维度 | 系统内AI (Internal) | 泛互式AI (Generative) |
|------|---------------------|----------------------|
| **知识来源** | 案例库、历史数据、SOP文档 | LLM通用知识 + 案例库 |
| **提示词策略** | 结构化模板、固定格式输出 | 开放式推理、创新建议 |
| **响应时间** | <2秒 | 5-30秒 |
| **Token消耗** | 低（500-1000） | 高（2000-8000） |
| **结果特点** | 标准化、可预测、一致性高 | 创新性、多样化、深度分析 |
| **适用场景** | 日常查询、标准流程、快速决策 | 复杂分析、方案设计、战略规划 |

## 4. 实施计划

### Phase 1: 基础架构（2小时）
- 创建数据库表
- 实现基础API
- 更新技术规范文档

### Phase 2: 前端集成（3小时）
- 更新AISuggestionPanel组件
- 添加模式选择UI
- 集成到业务页面

### Phase 3: 效果追踪（2小时）
- 实现执行日志记录
- 实现采纳率统计
- 创建效果分析仪表盘

### Phase 4: DA联动（2小时）
- 实现DA调用功能助手
- 创建工作流配置
- 测试和验证

## 5. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 泛互式AI响应慢 | 用户体验下降 | 添加加载动画、超时处理 |
| Token成本增加 | 运营成本上升 | 设置使用配额、优先推荐系统内AI |
| 模式选择困惑 | 用户不知如何选择 | 添加智能推荐、场景引导 |

## 6. 验收标准

1. 用户可在AI建议面板中选择执行模式
2. 系统内AI响应时间<2秒
3. 泛互式AI能提供深度分析结果
4. 执行日志正确记录模式和结果
5. 效果统计功能正常工作
6. 所有单元测试通过

## 7. 评审意见

**评审人**: _待填写_  
**评审日期**: _待填写_  
**评审结果**: [ ] 批准 / [ ] 需修改 / [ ] 拒绝

**评审意见**:
_待填写_

---

## 附录A: 8种功能型AI助手的模式配置

| 助手类型 | 默认模式 | 系统内AI场景 | 泛互式AI场景 |
|----------|----------|--------------|--------------|
| Solution Assistant | internal | 标准方案推荐 | 创新方案设计 |
| Quotation Assistant | internal | 标准报价生成 | 复杂项目报价 |
| Planning Assistant | internal | 日常计划生成 | 战略规划制定 |
| KPI Assistant | internal | 日常绩效查询 | 深度绩效分析 |
| Interview Assistant | generative | - | 候选人深度评估 |
| Purchase Assistant | internal | 标准采购流程 | 供应商战略分析 |
| Engineering Assistant | internal | 阶段任务分配 | 技术方案评审 |
| Quality Assistant | internal | 标准质检流程 | 质量问题根因分析 |

