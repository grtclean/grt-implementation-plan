# 任务3：预警规则AI推荐

**版本**: v1.3.12  
**任务编号**: TASK-3  
**负责方**: Claude Code  
**检查方**: Manus  
**预计工时**: 4-5小时  
**优先级**: P1

---

## 1. 任务概述

本任务旨在为预警规则模块添加AI智能推荐功能，通过分析项目历史数据和行业最佳实践，自动推荐适合当前项目的预警规则配置。该功能将利用系统内置的LLM能力，为项目经理提供智能化的预警规则配置建议。

### 1.1 业务价值

AI推荐功能能够帮助用户快速配置适合项目特点的预警规则，降低配置门槛，提高预警的准确性和及时性。

| 价值维度 | 描述 |
|----------|------|
| 效率提升 | 减少手动配置时间，一键应用推荐规则 |
| 准确性 | 基于历史数据分析，推荐更精准的阈值 |
| 专业性 | 融入行业最佳实践，提供专业建议 |
| 学习性 | 根据用户反馈持续优化推荐质量 |

### 1.2 功能范围

| 功能模块 | 描述 | 优先级 |
|----------|------|--------|
| 项目分析 | 分析项目历史数据特征 | P1 |
| 规则推荐 | 基于分析结果推荐规则 | P1 |
| 推荐展示 | 展示推荐结果和理由 | P1 |
| 一键应用 | 快速应用推荐规则 | P1 |
| 反馈收集 | 收集用户对推荐的反馈 | P2 |

---

## 2. 技术设计

### 2.1 数据库Schema设计

在 `drizzle/schema.ts` 中添加以下表定义：

```typescript
// AI推荐记录表 - 存储推荐历史和用户反馈
export const costAlertAiRecommendations = mysqlTable("cost_alert_ai_recommendations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  
  // 推荐内容
  recommendations: json("recommendations").$type<AiRecommendation[]>().notNull(),
  analysisContext: json("analysis_context").$type<AnalysisContext>(), // 分析上下文
  
  // 状态
  status: mysqlEnum("status", ["pending", "applied", "rejected", "partial"]).default("pending").notNull(),
  appliedRuleIds: json("applied_rule_ids").$type<string[]>(), // 已应用的规则ID
  
  // 用户反馈
  feedback: mysqlEnum("feedback", ["helpful", "not_helpful", "neutral"]),
  feedbackNotes: text("feedback_notes"),
  
  // 时间戳
  createdAt: timestamp("created_at").defaultNow().notNull(),
  appliedAt: timestamp("applied_at"),
  feedbackAt: timestamp("feedback_at"),
});

// 类型定义
export interface AiRecommendation {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: string;
  threshold: number;
  level: "info" | "warning" | "critical";
  reason: string; // AI推荐理由
  confidence: number; // 置信度 0-100
  category: string;
  basedOn: string; // 基于什么数据/规则推荐
}

export interface AnalysisContext {
  projectType: string;
  projectBudget: number;
  projectDuration: number;
  historicalAlerts: number;
  existingRules: number;
  industryBenchmarks: Record<string, number>;
}

export type CostAlertAiRecommendation = typeof costAlertAiRecommendations.$inferSelect;
export type InsertCostAlertAiRecommendation = typeof costAlertAiRecommendations.$inferInsert;
```

### 2.2 LLM集成设计

在 `server/ai/alertRecommendation.ts` 中创建AI推荐服务：

```typescript
import { invokeLLM } from "../_core/llm";

/**
 * 项目分析数据接口
 */
interface ProjectAnalysisData {
  projectId: string;
  projectName: string;
  projectType: string;
  budget: number;
  startDate: string;
  endDate: string;
  currentCost: number;
  costVariance: number;
  existingRules: ExistingRule[];
  historicalAlerts: HistoricalAlert[];
  costBreakdown: CostBreakdown[];
}

/**
 * 分析项目数据并生成推荐
 */
export async function generateAlertRecommendations(
  data: ProjectAnalysisData
): Promise<AiRecommendation[]> {
  const systemPrompt = `你是一个专业的项目成本管理专家，擅长分析项目数据并推荐合适的预警规则。

你需要基于以下信息推荐预警规则：
1. 项目基本信息（类型、预算、工期）
2. 当前成本状况（实际成本、偏差）
3. 现有预警规则
4. 历史预警记录
5. 成本构成分析

推荐规则时请考虑：
- 项目类型特点（研发项目vs工程项目）
- 预算规模（大型项目需要更精细的预警）
- 项目阶段（早期vs后期）
- 历史预警模式（哪些预警有效）
- 行业最佳实践

每条推荐需要包含：
- 规则名称和描述
- 监控指标和条件
- 阈值设置（要具体数值）
- 预警级别
- 推荐理由
- 置信度（0-100）`;

  const userPrompt = `请分析以下项目数据，推荐5-8条预警规则：

项目信息：
- 名称：${data.projectName}
- 类型：${data.projectType}
- 预算：${data.budget}元
- 工期：${data.startDate} 至 ${data.endDate}
- 当前成本：${data.currentCost}元
- 成本偏差：${data.costVariance}%

现有规则数量：${data.existingRules.length}
历史预警数量：${data.historicalAlerts.length}

成本构成：
${data.costBreakdown.map(c => `- ${c.category}: ${c.amount}元 (${c.percentage}%)`).join('\n')}

请以JSON格式返回推荐规则数组。`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "alert_recommendations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  metric: { type: "string" },
                  condition: { type: "string" },
                  threshold: { type: "number" },
                  level: { type: "string", enum: ["info", "warning", "critical"] },
                  reason: { type: "string" },
                  confidence: { type: "number" },
                  category: { type: "string" },
                  basedOn: { type: "string" },
                },
                required: ["name", "description", "metric", "condition", "threshold", "level", "reason", "confidence", "category", "basedOn"],
                additionalProperties: false,
              },
            },
          },
          required: ["recommendations"],
          additionalProperties: false,
        },
      },
    },
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result.recommendations.map((r: any, index: number) => ({
    ...r,
    id: `rec-${Date.now()}-${index}`,
  }));
}

/**
 * 获取项目分析数据
 */
export async function getProjectAnalysisData(projectId: string): Promise<ProjectAnalysisData> {
  // 从数据库获取项目信息
  // 获取成本数据
  // 获取现有规则
  // 获取历史预警
  // 计算成本构成
}

/**
 * 应用推荐规则
 */
export async function applyRecommendedRules(
  projectId: string,
  recommendations: AiRecommendation[],
  userId: string
): Promise<{ success: boolean; createdRuleIds: string[] }>
```

### 2.3 数据库函数设计

在 `server/db.ts` 中添加以下函数：

```typescript
// ==================== AI推荐管理函数 ====================

/**
 * 创建AI推荐记录
 */
export async function createAiRecommendation(
  data: Omit<InsertCostAlertAiRecommendation, "id" | "createdAt">
): Promise<CostAlertAiRecommendation>

/**
 * 获取项目的AI推荐历史
 */
export async function getProjectAiRecommendations(
  projectId: string,
  limit?: number
): Promise<CostAlertAiRecommendation[]>

/**
 * 更新AI推荐状态
 */
export async function updateAiRecommendationStatus(
  id: string,
  status: "applied" | "rejected" | "partial",
  appliedRuleIds?: string[]
): Promise<{ success: boolean }>

/**
 * 提交AI推荐反馈
 */
export async function submitAiRecommendationFeedback(
  id: string,
  feedback: "helpful" | "not_helpful" | "neutral",
  notes?: string
): Promise<{ success: boolean }>

/**
 * 获取项目成本分析数据（用于AI分析）
 */
export async function getProjectCostAnalysis(projectId: string): Promise<{
  budget: number;
  actualCost: number;
  costVariance: number;
  costBreakdown: { category: string; amount: number; percentage: number }[];
  historicalAlerts: { date: string; level: string; message: string }[];
}>
```

### 2.4 API路由设计

在 `server/routers.ts` 中添加以下路由：

```typescript
// AI推荐路由
aiRecommendation: router({
  // 生成推荐
  generate: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 获取项目分析数据
      const analysisData = await getProjectAnalysisData(input.projectId);
      
      // 调用AI生成推荐
      const recommendations = await generateAlertRecommendations(analysisData);
      
      // 保存推荐记录
      const record = await createAiRecommendation({
        projectId: input.projectId,
        userId: ctx.user.id,
        recommendations,
        analysisContext: {
          projectType: analysisData.projectType,
          projectBudget: analysisData.budget,
          projectDuration: calculateDuration(analysisData.startDate, analysisData.endDate),
          historicalAlerts: analysisData.historicalAlerts.length,
          existingRules: analysisData.existingRules.length,
          industryBenchmarks: {},
        },
        status: "pending",
      });
      
      return record;
    }),
    
  // 获取推荐历史
  history: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      return getProjectAiRecommendations(input.projectId, input.limit);
    }),
    
  // 应用推荐
  apply: protectedProcedure
    .input(z.object({
      recommendationId: z.string(),
      selectedIds: z.array(z.string()), // 选择要应用的推荐ID
    }))
    .mutation(async ({ input, ctx }) => {
      // 获取推荐记录
      const record = await getAiRecommendationById(input.recommendationId);
      if (!record) throw new TRPCError({ code: "NOT_FOUND" });
      
      // 筛选要应用的推荐
      const selectedRecommendations = record.recommendations.filter(
        r => input.selectedIds.includes(r.id)
      );
      
      // 创建预警规则
      const result = await applyRecommendedRules(
        record.projectId,
        selectedRecommendations,
        ctx.user.id
      );
      
      // 更新推荐状态
      const status = input.selectedIds.length === record.recommendations.length 
        ? "applied" 
        : "partial";
      await updateAiRecommendationStatus(
        input.recommendationId,
        status,
        result.createdRuleIds
      );
      
      return result;
    }),
    
  // 提交反馈
  feedback: protectedProcedure
    .input(z.object({
      recommendationId: z.string(),
      feedback: z.enum(["helpful", "not_helpful", "neutral"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return submitAiRecommendationFeedback(
        input.recommendationId,
        input.feedback,
        input.notes
      );
    }),
}),
```

### 2.5 前端组件设计

#### 2.5.1 AI推荐入口按钮

在 `CostManagement.tsx` 的预警规则卡片头部添加：

```typescript
<Button 
  variant="outline" 
  onClick={() => setShowAiRecommendDialog(true)}
  className="gap-2"
>
  <Sparkles className="w-4 h-4" />
  AI推荐
</Button>
```

#### 2.5.2 AI推荐对话框

```typescript
function AiRecommendDialog({ 
  projectId, 
  open, 
  onClose,
  onApply 
}: AiRecommendDialogProps) {
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateMutation = trpc.aiRecommendation.generate.useMutation();
  const applyMutation = trpc.aiRecommendation.apply.useMutation();
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({ projectId });
      setRecommendations(result.recommendations);
      setSelectedIds(result.recommendations.map(r => r.id));
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleApply = async () => {
    if (selectedIds.length === 0) return;
    
    await applyMutation.mutateAsync({
      recommendationId: currentRecommendationId,
      selectedIds,
    });
    
    onApply();
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI智能推荐预警规则
          </DialogTitle>
          <DialogDescription>
            基于项目数据和行业最佳实践，为您推荐适合的预警规则配置
          </DialogDescription>
        </DialogHeader>
        
        {recommendations.length === 0 ? (
          <div className="py-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              点击下方按钮，AI将分析项目数据并生成推荐规则
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  正在分析...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始分析
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 推荐列表 */}
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  selected={selectedIds.includes(rec.id)}
                  onToggle={() => toggleSelection(rec.id)}
                />
              ))}
            </div>
            
            {/* 操作按钮 */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                已选择 {selectedIds.length} / {recommendations.length} 条规则
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGenerate}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新生成
                </Button>
                <Button 
                  onClick={handleApply} 
                  disabled={selectedIds.length === 0 || applyMutation.isPending}
                >
                  {applyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      应用中...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      应用选中规则
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

#### 2.5.3 推荐卡片组件

```typescript
function RecommendationCard({ 
  recommendation, 
  selected, 
  onToggle 
}: RecommendationCardProps) {
  const levelColors = {
    info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
  };
  
  return (
    <div 
      className={cn(
        "border rounded-lg p-4 cursor-pointer transition-all",
        selected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} />
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{recommendation.name}</h4>
            <div className="flex items-center gap-2">
              <Badge className={levelColors[recommendation.level]}>
                {recommendation.level === "info" ? "提示" : 
                 recommendation.level === "warning" ? "警告" : "严重"}
              </Badge>
              <Badge variant="outline">
                置信度 {recommendation.confidence}%
              </Badge>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {recommendation.description}
          </p>
          
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              指标: <code className="bg-muted px-1 rounded">{recommendation.metric}</code>
            </span>
            <span className="text-muted-foreground">
              条件: <code className="bg-muted px-1 rounded">{recommendation.condition} {recommendation.threshold}</code>
            </span>
          </div>
          
          <div className="flex items-start gap-2 text-sm bg-muted/50 rounded p-2">
            <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{recommendation.reason}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. 实施步骤

### 步骤1：数据库Schema创建

1. 在 `drizzle/schema.ts` 中添加 `costAlertAiRecommendations` 表
2. 定义相关类型接口
3. 运行 `pnpm db:push` 同步数据库

**验收标准**：
- [ ] 表成功创建
- [ ] JSON字段正确存储
- [ ] 类型定义完整

### 步骤2：AI推荐服务实现

1. 创建 `server/ai/alertRecommendation.ts` 文件
2. 实现 `generateAlertRecommendations` 函数
3. 实现 `getProjectAnalysisData` 函数
4. 实现 `applyRecommendedRules` 函数
5. 编写详细的Prompt模板

**验收标准**：
- [ ] LLM调用正确
- [ ] JSON Schema响应格式正确
- [ ] 推荐结果合理
- [ ] 错误处理完善

### 步骤3：数据库函数实现

1. 在 `server/db.ts` 中实现推荐记录CRUD函数
2. 实现项目成本分析数据获取函数
3. 实现反馈提交函数

**验收标准**：
- [ ] 所有函数有完整的JSDoc注释
- [ ] 函数返回类型正确
- [ ] 错误处理完善

### 步骤4：API路由实现

1. 在 `server/routers.ts` 中添加 `aiRecommendation` 路由
2. 实现生成、应用、反馈等端点
3. 添加输入验证

**验收标准**：
- [ ] 所有API端点可正常调用
- [ ] 输入验证正确
- [ ] 错误响应格式统一

### 步骤5：单元测试编写

1. 创建 `server/v1.3.12-ai-recommendation.test.ts`
2. 编写推荐生成测试（Mock LLM）
3. 编写推荐应用测试
4. 编写反馈提交测试

**测试用例清单**：

| 测试场景 | 描述 |
|----------|------|
| 推荐生成-正常 | 验证正常生成推荐 |
| 推荐生成-空项目 | 验证空项目数据处理 |
| 推荐应用-全部 | 验证应用全部推荐 |
| 推荐应用-部分 | 验证应用部分推荐 |
| 推荐应用-空 | 验证空选择处理 |
| 反馈提交 | 验证反馈正确保存 |
| 历史查询 | 验证历史记录查询 |

**验收标准**：
- [ ] 测试覆盖所有核心场景
- [ ] 所有测试通过
- [ ] LLM调用正确Mock

### 步骤6：前端开发

1. 在 `CostManagement.tsx` 添加AI推荐按钮
2. 实现AI推荐对话框组件
3. 实现推荐卡片组件
4. 实现选择和应用逻辑
5. 添加加载状态和错误处理
6. 添加国际化翻译

**验收标准**：
- [ ] AI推荐按钮正确显示
- [ ] 对话框正确渲染
- [ ] 推荐生成流程正常
- [ ] 选择和应用功能正常
- [ ] 加载状态正确显示

### 步骤7：集成测试

1. 在浏览器中测试完整流程
2. 验证AI推荐质量
3. 验证规则创建正确
4. 检查错误处理

**验收标准**：
- [ ] 生成推荐 → 选择规则 → 应用规则 流程正常
- [ ] 推荐内容合理
- [ ] 创建的规则正确
- [ ] 错误提示友好

---

## 4. Prompt设计

### 4.1 系统Prompt

```
你是一个专业的项目成本管理专家，擅长分析项目数据并推荐合适的预警规则。

你的任务是基于项目数据推荐预警规则，帮助项目经理及时发现成本风险。

推荐原则：
1. 规则要具体可执行，阈值要有明确数值
2. 考虑项目类型特点（研发项目vs工程项目）
3. 考虑预算规模（大型项目需要更精细的预警）
4. 考虑项目阶段（早期vs后期）
5. 参考历史预警模式（哪些预警有效）
6. 融入行业最佳实践

推荐规则类型：
- 预算类：预算使用率、预算偏差
- 绩效类：CPI、SPI、EAC
- 成本类：单项成本超支、成本增长率
- 风险类：成本波动、异常支出

每条推荐必须包含：
- name: 规则名称（简洁明了）
- description: 规则描述（说明监控内容）
- metric: 监控指标（如budget_usage, cpi, cost_variance）
- condition: 条件运算符（gt, lt, gte, lte, eq）
- threshold: 阈值（具体数值）
- level: 预警级别（info/warning/critical）
- reason: 推荐理由（为什么推荐这条规则）
- confidence: 置信度（0-100，基于数据充分程度）
- category: 规则类别（budget/performance/cost/risk）
- basedOn: 推荐依据（基于什么数据或规则）
```

### 4.2 用户Prompt模板

```
请分析以下项目数据，推荐5-8条预警规则：

## 项目基本信息
- 名称：{projectName}
- 类型：{projectType}
- 预算：{budget}元
- 工期：{startDate} 至 {endDate}
- 当前进度：{progress}%

## 成本状况
- 当前成本：{currentCost}元
- 预算使用率：{budgetUsage}%
- 成本偏差：{costVariance}%
- CPI：{cpi}
- SPI：{spi}

## 成本构成
{costBreakdown}

## 现有规则
{existingRules}

## 历史预警
{historicalAlerts}

请以JSON格式返回推荐规则数组，每条规则包含完整的字段信息。
```

---

## 5. 检查清单

### 5.1 代码检查

- [ ] 代码符合命名规范
- [ ] 包含必要的注释
- [ ] 无TypeScript类型错误
- [ ] 无ESLint警告
- [ ] LLM调用有超时和错误处理

### 5.2 功能检查

- [ ] AI推荐生成正常
- [ ] 推荐内容合理
- [ ] 规则应用正确
- [ ] 反馈提交正常
- [ ] 历史记录正确

### 5.3 测试检查

- [ ] 单元测试全部通过
- [ ] 测试覆盖核心场景
- [ ] LLM调用正确Mock

### 5.4 用户体验检查

- [ ] 加载状态清晰
- [ ] 错误提示友好
- [ ] 推荐理由易懂
- [ ] 操作流程顺畅

---

## 6. 参考资源

### 6.1 现有代码参考

| 功能 | 文件路径 | 参考内容 |
|------|----------|----------|
| LLM调用 | `server/_core/llm.ts` | `invokeLLM` 函数 |
| 预警规则 | `server/db.ts` | `createCostAlertRule` 函数 |
| 模板库 | `server/db.ts` | `createRuleFromTemplate` 函数 |
| 成本管理UI | `client/src/pages/CostManagement.tsx` | 预警规则Tab |

### 6.2 外部参考

- [OpenAI JSON Mode](https://platform.openai.com/docs/guides/structured-outputs)
- [项目成本管理最佳实践](https://www.pmi.org/learning/library)

---

**文档版本**: 1.0  
**创建日期**: 2026-01-16  
**作者**: Manus AI
