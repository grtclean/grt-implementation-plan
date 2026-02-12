# Manus-Claude-Gemini 协作工作流实现指南

## 概述

本文档定义了GRT智能系统中Manus、Claude Code和Gemini三层AI协作架构的实现方式，形成完整的任务编排、代码实现和AI判断的闭环。

---

## 架构设计

### 三层协作模型

```
┌─────────────────────────────────────────────────────────────┐
│                    Manus (任务编排层)                        │
│  - 分析用户需求                                              │
│  - 制定任务计划                                              │
│  - 分配任务给Claude Code                                    │
│  - 监督执行进度                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Claude Code (代码实现层)                        │
│  - 接收Manus分配的任务                                      │
│  - 编写/修改代码实现功能                                    │
│  - 调用Gemini进行业务判断                                  │
│  - 返回实现结果给Manus                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Gemini (AI判断层)                              │
│  - 分析业务逻辑和数据                                        │
│  - 提供智能推荐和判断                                        │
│  - 评估方案可行性                                            │
│  - 返回判断结果给Claude Code                               │
└─────────────────────────────────────────────────────────────┘
```

### 数据流向

```
用户请求
   ↓
Manus分析 → 制定计划 → 创建任务
   ↓
Claude Code接收任务 → 分析需求 → 编写代码
   ↓
调用Gemini API → 获取AI判断 → 集成判断结果
   ↓
测试验证 → 返回结果给Manus
   ↓
Manus评估 → 反馈给用户
```

---

## 第一部分：Manus 任务编排层

### 1.1 任务定义规范

**任务结构（Task Interface）：**

```typescript
interface ManusTask {
  id: string;                    // 任务唯一标识
  title: string;                 // 任务标题
  description: string;           // 任务描述
  priority: 'P0' | 'P1' | 'P2';  // 优先级
  category: string;              // 任务类别（feature/bugfix/optimization）
  requirements: {
    functional: string[];        // 功能需求
    technical: string[];         // 技术需求
    constraints: string[];       // 约束条件
  };
  assignedTo: 'claude-code';     // 分配给Claude Code
  estimatedHours: number;        // 预计工时
  deadline: Date;                // 截止日期
  dependencies: string[];        // 依赖任务
  aiJudgmentRequired: boolean;   // 是否需要AI判断
  geminiPrompt?: string;         // Gemini提示词
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  result?: any;                  // 执行结果
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 任务创建流程

**Manus 创建任务的步骤：**

1. **需求分析**：理解用户需求
2. **任务分解**：将大任务分解为小任务
3. **优先级排序**：根据重要性排序
4. **依赖关系**：识别任务间的依赖
5. **创建任务**：生成结构化任务定义
6. **分配给Claude**：发送任务给Claude Code

**示例任务：**

```json
{
  "id": "task-001",
  "title": "实现CRM客户评分功能",
  "description": "根据BANT模型为CRM客户自动评分",
  "priority": "P0",
  "category": "feature",
  "requirements": {
    "functional": [
      "支持BANT评分模型",
      "自动计算客户评分",
      "显示评分结果和建议"
    ],
    "technical": [
      "使用Gemini进行评分逻辑判断",
      "集成到CRM系统",
      "添加单元测试"
    ],
    "constraints": [
      "评分结果必须可解释",
      "性能要求：<100ms",
      "支持批量评分"
    ]
  },
  "estimatedHours": 8,
  "aiJudgmentRequired": true,
  "geminiPrompt": "根据以下客户信息和BANT模型进行评分..."
}
```

### 1.3 任务监督与反馈

**Manus 监督执行的方式：**

1. **定期检查进度**：每小时检查一次任务状态
2. **识别阻塞**：发现任务被阻塞时立即处理
3. **质量评审**：检查代码质量和测试覆盖率
4. **反馈优化**：根据执行结果优化后续任务

---

## 第二部分：Claude Code 实现层

### 2.1 任务接收与分析

**Claude Code 接收任务的流程：**

```typescript
// 1. 接收任务
async function receiveTask(task: ManusTask) {
  console.log(`[Claude] 接收任务: ${task.title}`);
  
  // 2. 分析需求
  const analysis = analyzeRequirements(task);
  
  // 3. 制定实现方案
  const plan = createImplementationPlan(analysis);
  
  // 4. 开始实现
  await implementTask(task, plan);
}

// 分析需求
function analyzeRequirements(task: ManusTask) {
  return {
    functionalScope: task.requirements.functional,
    technicalApproach: task.requirements.technical,
    constraints: task.requirements.constraints,
    aiJudgmentPoints: identifyAIJudgmentPoints(task),
    testStrategy: defineTestStrategy(task)
  };
}

// 制定实现方案
function createImplementationPlan(analysis: any) {
  return {
    phases: [
      { phase: 1, name: '数据模型设计', hours: 2 },
      { phase: 2, name: '后端API实现', hours: 3 },
      { phase: 3, name: 'AI集成', hours: 2 },
      { phase: 4, name: '前端界面', hours: 2 },
      { phase: 5, name: '测试与优化', hours: 2 }
    ],
    aiIntegrationPoints: analysis.aiJudgmentPoints,
    testCases: analysis.testStrategy
  };
}
```

### 2.2 AI判断集成

**Claude Code 调用Gemini进行判断：**

```typescript
// Gemini 判断引擎集成
async function callGeminiForJudgment(context: {
  businessLogic: string;
  inputData: any;
  judmentType: 'scoring' | 'recommendation' | 'validation' | 'optimization';
  constraints: string[];
}) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(context.judmentType)
        },
        {
          role: 'user',
          content: buildUserPrompt(context)
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: defineResponseSchema(context.judmentType)
      }
    });
    
    return parseGeminiResponse(response, context.judmentType);
  } catch (error) {
    console.error('[Claude] Gemini 调用失败:', error);
    throw error;
  }
}

// 构建系统提示词
function buildSystemPrompt(judgmentType: string): string {
  const prompts = {
    scoring: `你是一个专业的评分系统。根据提供的数据和评分模型，进行客观、准确的评分。`,
    recommendation: `你是一个智能推荐系统。根据用户需求和历史数据，提供最优的推荐方案。`,
    validation: `你是一个数据验证系统。检查数据的有效性、完整性和一致性。`,
    optimization: `你是一个优化系统。分析当前方案并提出改进建议。`
  };
  return prompts[judgmentType] || prompts.scoring;
}

// 构建用户提示词
function buildUserPrompt(context: any): string {
  return `
业务逻辑：${context.businessLogic}

输入数据：
${JSON.stringify(context.inputData, null, 2)}

约束条件：
${context.constraints.join('\n')}

请根据上述信息进行${context.judmentType}判断。
  `;
}

// 定义响应Schema
function defineResponseSchema(judgmentType: string) {
  const schemas = {
    scoring: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100 },
        level: { type: 'string', enum: ['高', '中', '低'] },
        reasoning: { type: 'string' },
        recommendations: { type: 'array', items: { type: 'string' } }
      },
      required: ['score', 'level', 'reasoning']
    },
    recommendation: {
      type: 'object',
      properties: {
        recommendedOption: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reasoning: { type: 'string' },
        alternatives: { type: 'array', items: { type: 'string' } }
      },
      required: ['recommendedOption', 'confidence', 'reasoning']
    },
    // ... 其他Schema定义
  };
  return schemas[judgmentType] || schemas.scoring;
}

// 解析Gemini响应
function parseGeminiResponse(response: any, judgmentType: string) {
  try {
    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    return {
      success: true,
      data: parsed,
      timestamp: new Date(),
      model: response.model
    };
  } catch (error) {
    console.error('[Claude] 响应解析失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### 2.3 代码实现示例

**示例：CRM客户评分功能**

```typescript
// server/routers/crm.ts 中添加评分路由

export const crmRouter = router({
  // ... 其他路由
  
  // 自动评分客户
  scoreCustomer: protectedProcedure
    .input(z.object({
      customerId: z.number(),
      forceRecalculate: z.boolean().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // 1. 获取客户数据
        const customer = await getDb().query.customers.findFirst({
          where: eq(customers.id, input.customerId)
        });
        
        if (!customer) {
          throw new Error('客户不存在');
        }
        
        // 2. 获取BANT数据
        const bantScore = await getDb().query.bantScores.findFirst({
          where: eq(bantScores.customerId, input.customerId)
        });
        
        // 3. 调用Gemini进行评分判断
        const geminiJudgment = await callGeminiForJudgment({
          businessLogic: 'BANT客户评分模型',
          inputData: {
            customer: {
              name: customer.name,
              industry: customer.industry,
              annualRevenue: customer.annualRevenue
            },
            bant: {
              budget: bantScore?.budget,
              authority: bantScore?.authority,
              need: bantScore?.need,
              timeline: bantScore?.timeline
            }
          },
          judmentType: 'scoring',
          constraints: [
            '评分范围0-100',
            '必须提供评分理由',
            '必须提供后续建议'
          ]
        });
        
        if (!geminiJudgment.success) {
          throw new Error('Gemini评分失败');
        }
        
        // 4. 保存评分结果
        const result = await getDb().insert(bantScores).values({
          customerId: input.customerId,
          score: geminiJudgment.data.score,
          level: geminiJudgment.data.level,
          reasoning: geminiJudgment.data.reasoning,
          recommendations: JSON.stringify(geminiJudgment.data.recommendations),
          updatedAt: new Date().toISOString()
        }).onConflictDoUpdate({
          target: bantScores.customerId,
          set: {
            score: geminiJudgment.data.score,
            level: geminiJudgment.data.level,
            reasoning: geminiJudgment.data.reasoning,
            recommendations: JSON.stringify(geminiJudgment.data.recommendations),
            updatedAt: new Date().toISOString()
          }
        });
        
        // 5. 返回结果
        return {
          success: true,
          data: {
            customerId: input.customerId,
            score: geminiJudgment.data.score,
            level: geminiJudgment.data.level,
            reasoning: geminiJudgment.data.reasoning,
            recommendations: geminiJudgment.data.recommendations
          }
        };
      } catch (error) {
        console.error('[CRM] 客户评分失败:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }),
  
  // 批量评分
  scoreCustomersBatch: protectedProcedure
    .input(z.object({
      customerIds: z.array(z.number()),
      parallel: z.boolean().optional().default(false)
    }))
    .mutation(async ({ input }) => {
      const results = [];
      
      if (input.parallel) {
        // 并行处理
        const promises = input.customerIds.map(id =>
          crmRouter.createCaller({}).scoreCustomer({ customerId: id })
        );
        results.push(...await Promise.all(promises));
      } else {
        // 顺序处理
        for (const customerId of input.customerIds) {
          const result = await crmRouter.createCaller({}).scoreCustomer({
            customerId
          });
          results.push(result);
        }
      }
      
      return {
        success: true,
        totalCount: input.customerIds.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        results
      };
    })
});
```

### 2.4 测试实现

**单元测试示例：**

```typescript
// server/crm-scoring.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { crmRouter } from './routers/crm';

describe('CRM 客户评分', () => {
  let testCustomerId: number;
  
  beforeAll(async () => {
    // 创建测试客户
    testCustomerId = 1;
  });
  
  it('应该成功评分单个客户', async () => {
    const result = await crmRouter.createCaller({}).scoreCustomer({
      customerId: testCustomerId
    });
    
    expect(result.success).toBe(true);
    expect(result.data.score).toBeGreaterThanOrEqual(0);
    expect(result.data.score).toBeLessThanOrEqual(100);
    expect(result.data.level).toMatch(/^(高|中|低)$/);
    expect(result.data.reasoning).toBeTruthy();
  });
  
  it('应该批量评分客户', async () => {
    const result = await crmRouter.createCaller({}).scoreCustomersBatch({
      customerIds: [1, 2, 3],
      parallel: true
    });
    
    expect(result.success).toBe(true);
    expect(result.totalCount).toBe(3);
    expect(result.successCount).toBeGreaterThan(0);
  });
  
  it('应该处理不存在的客户', async () => {
    const result = await crmRouter.createCaller({}).scoreCustomer({
      customerId: 99999
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

---

## 第三部分：Gemini AI 判断层

### 3.1 判断引擎架构

**Gemini 判断引擎的核心功能：**

```typescript
// server/ai-services/geminiJudgmentEngine.ts

export class GeminiJudgmentEngine {
  private model: string = 'gemini-2.5-flash';
  
  // 1. 业务逻辑评估
  async evaluateBusinessLogic(params: {
    logic: string;
    data: any;
    constraints: string[];
  }): Promise<BusinessLogicEvaluation> {
    // 实现业务逻辑评估
  }
  
  // 2. 安全检查
  async performSafetyCheck(params: {
    action: string;
    data: any;
    riskLevel: 'low' | 'medium' | 'high';
  }): Promise<SafetyCheckResult> {
    // 实现安全检查
  }
  
  // 3. 智能推荐
  async generateRecommendation(params: {
    scenario: string;
    options: any[];
    criteria: string[];
  }): Promise<Recommendation> {
    // 实现智能推荐
  }
  
  // 4. AI问答路由
  async routeQuestion(params: {
    question: string;
    context: any;
    useGemini: boolean;
  }): Promise<Answer> {
    // 实现问答路由
  }
}
```

### 3.2 判断流程

**Gemini 判断的完整流程：**

1. **接收请求**：从Claude Code接收判断请求
2. **上下文分析**：分析业务背景和约束条件
3. **生成提示词**：根据判断类型生成优化的提示词
4. **调用LLM**：使用Gemini模型进行判断
5. **结果验证**：验证结果的有效性和一致性
6. **返回结果**：将结构化结果返回给Claude Code

---

## 第四部分：工作流集成

### 4.1 完整工作流示例

**从需求到交付的完整流程：**

```
用户提出需求
    ↓
Manus分析需求
    ↓
Manus创建任务：
  - 标题：实现CRM客户评分
  - 优先级：P0
  - 需要AI判断：是
    ↓
Claude Code接收任务
    ↓
Claude Code分析需求
    ↓
Claude Code编写代码
    ↓
Claude Code调用Gemini：
  - 请求：评分客户
  - 输入数据：客户信息、BANT数据
  - 约束条件：评分范围0-100
    ↓
Gemini返回评分结果：
  - 分数：85
  - 等级：高
  - 理由：...
  - 建议：...
    ↓
Claude Code集成结果
    ↓
Claude Code编写测试
    ↓
Claude Code返回结果给Manus
    ↓
Manus评估结果
    ↓
Manus反馈给用户
    ↓
功能上线
```

### 4.2 工作流配置

**在NocoBase中配置工作流：**

1. **创建工作流**：Manus-Claude-Gemini协作工作流
2. **定义触发器**：
   - 手动触发（用户请求）
   - 定时触发（定期任务）
   - 事件触发（系统事件）
3. **配置步骤**：
   - 步骤1：Manus任务创建
   - 步骤2：Claude Code执行
   - 步骤3：Gemini判断
   - 步骤4：结果验证
   - 步骤5：反馈通知
4. **设置条件**：根据结果进行条件分支

---

## 第五部分：最佳实践

### 5.1 任务设计原则

1. **清晰的需求**：任务描述必须明确、可度量
2. **合理的范围**：单个任务的工时不超过16小时
3. **明确的依赖**：标识任务间的依赖关系
4. **AI判断点**：明确指出需要AI判断的地方
5. **测试覆盖**：每个任务必须包含测试

### 5.2 代码实现规范

1. **类型安全**：使用TypeScript确保类型安全
2. **错误处理**：完整的错误处理和日志记录
3. **性能优化**：考虑性能影响，避免不必要的API调用
4. **可维护性**：代码结构清晰，便于维护和扩展
5. **文档完整**：添加必要的注释和文档

### 5.3 AI判断规范

1. **提示词优化**：使用清晰、具体的提示词
2. **约束条件**：明确指定约束条件和期望输出
3. **结果验证**：验证AI结果的合理性
4. **降级方案**：当AI判断失败时有备选方案
5. **持续学习**：收集反馈，优化判断逻辑

### 5.4 质量保证

1. **代码审查**：所有代码必须经过审查
2. **单元测试**：测试覆盖率不低于80%
3. **集成测试**：测试模块间的集成
4. **性能测试**：确保性能满足要求
5. **用户测试**：在上线前进行用户测试

---

## 第六部分：故障排查

### 常见问题

**Q1：Gemini API调用超时**
- 增加超时时间
- 简化提示词
- 使用更快的模型（gemini-2.5-flash）

**Q2：AI判断结果不符合预期**
- 优化提示词
- 提供更多上下文
- 调整约束条件

**Q3：任务执行被阻塞**
- 检查依赖任务状态
- 解决技术障碍
- 重新分配资源

---

## 总结

Manus-Claude-Gemini协作工作流形成了一个完整的AI驱动的开发流程，其中：

- **Manus** 负责任务规划和监督
- **Claude Code** 负责代码实现和集成
- **Gemini** 负责业务判断和智能推荐

这个架构确保了系统的高效性、可靠性和可维护性。
