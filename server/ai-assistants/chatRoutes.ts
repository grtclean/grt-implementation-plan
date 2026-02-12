/**
 * AI Assistant Chat Routes
 * 
 * 提供统一的AI助手聊天接口，支持Solution/Quotation/Planning/KPI四种助手类型
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

// 助手类型
const assistantTypes = ["solution", "quotation", "planning", "kpi"] as const;
type AssistantType = typeof assistantTypes[number];

// 助手系统提示词配置
const ASSISTANT_PROMPTS: Record<AssistantType, string> = {
  solution: `你是GRT智能系统的方案助手（Solution Assistant），专门帮助用户分析客户需求并推荐最佳解决方案。

你的专业领域包括：
1. 工业清洗设备方案设计
2. 工艺参数分析（工件类型、材质、清洁度标准等）
3. 设备选型建议（喷淋清洗、超声波清洗、高压清洗等）
4. 技术可行性评估
5. 风险识别与应对措施

回答要求：
- 使用专业但易懂的语言
- 提供结构化的分析和建议
- 引用相关行业标准和最佳实践
- 给出具体可操作的建议
- 适当使用Markdown格式（标题、列表、表格）使回答更清晰`,

  quotation: `你是GRT智能系统的报价助手（Quotation Assistant），专门帮助用户进行成本估算和报价分析。

你的专业领域包括：
1. 设备成本构成分析（硬件、软件、人工、其他）
2. 利润率计算和定价策略
3. 竞品价格对比分析
4. 报价优化建议
5. 付款条款和交付周期规划

回答要求：
- 提供详细的成本分解
- 给出合理的价格区间建议
- 考虑市场竞争因素
- 提供多种报价方案供选择
- 使用表格展示数据对比`,

  planning: `你是GRT智能系统的规划助手（Planning Assistant），专门帮助用户进行项目规划和资源调度。

你的专业领域包括：
1. 项目进度规划（M0-M12全生命周期）
2. 资源分配和优化
3. 里程碑设定和跟踪
4. 风险预警和应对
5. 任务分解和依赖管理

回答要求：
- 提供清晰的时间节点和里程碑
- 识别关键路径和瓶颈
- 给出资源配置建议
- 考虑风险因素并提供预案
- 使用甘特图思维展示计划`,

  kpi: `你是GRT智能系统的KPI助手（KPI Assistant），专门帮助用户进行绩效指标分析和优化。

你的专业领域包括：
1. KPI指标设计和分解
2. 绩效数据分析和趋势预测
3. 对标分析和差距识别
4. 改进建议和行动计划
5. 绩效报告生成

回答要求：
- 使用数据驱动的分析方法
- 提供可量化的指标建议
- 给出同比/环比分析
- 识别改进机会
- 提供具体的改进措施`
};

// 聊天消息Schema
const chatMessageSchema = z.object({
  assistantType: z.enum(assistantTypes),
  message: z.string().min(1).max(4000),
  context: z.object({
    projectId: z.string().optional(),
    customerId: z.string().optional(),
    previousMessages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string()
    })).optional()
  }).optional()
});

export const aiChatRouter = router({
  /**
   * 发送消息到AI助手
   */
  sendMessage: protectedProcedure
    .input(chatMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const { assistantType, message, context } = input;
      
      // 构建消息历史
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: ASSISTANT_PROMPTS[assistantType] }
      ];
      
      // 添加历史消息
      if (context?.previousMessages) {
        for (const msg of context.previousMessages.slice(-10)) { // 最多保留10条历史
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
      
      // 添加当前用户消息
      messages.push({ role: "user", content: message });
      
      try {
        // 调用LLM
        const response = await invokeLLM({ messages });
        
        const assistantResponse = response.choices?.[0]?.message?.content || "抱歉，我暂时无法处理您的请求。请稍后再试。";
        
        return {
          success: true,
          response: assistantResponse,
          assistantType,
          timestamp: new Date().toISOString(),
          usage: response.usage
        };
      } catch (error) {
        console.error("[AI Chat Error]", error);
        return {
          success: false,
          response: "抱歉，AI服务暂时不可用。请稍后再试。",
          assistantType,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }),

  /**
   * 获取助手类型列表
   */
  getAssistantTypes: protectedProcedure
    .query(() => {
      return assistantTypes.map(type => ({
        id: type,
        name: {
          solution: "方案助手",
          quotation: "报价助手",
          planning: "规划助手",
          kpi: "KPI助手"
        }[type],
        nameEn: {
          solution: "Solution Assistant",
          quotation: "Quotation Assistant",
          planning: "Planning Assistant",
          kpi: "KPI Assistant"
        }[type],
        description: {
          solution: "智能分析客户需求，推荐最佳解决方案",
          quotation: "基于历史数据和市场分析，生成精准报价",
          planning: "项目规划与资源调度智能助手",
          kpi: "绩效指标分析与优化建议"
        }[type]
      }));
    }),

  /**
   * 获取快捷提问模板
   */
  getQuickPrompts: protectedProcedure
    .input(z.object({
      assistantType: z.enum(assistantTypes)
    }))
    .query(({ input }) => {
      const prompts: Record<AssistantType, string[]> = {
        solution: [
          "请帮我分析这个工件的清洗方案",
          "推荐适合汽车零部件的清洗设备",
          "如何满足VDA 19清洁度标准？",
          "超声波清洗和喷淋清洗如何选择？"
        ],
        quotation: [
          "请帮我估算这个项目的成本",
          "如何优化报价提高竞争力？",
          "分析竞品价格和我们的差异",
          "推荐合适的付款条款"
        ],
        planning: [
          "请帮我制定项目实施计划",
          "如何优化资源分配？",
          "识别项目关键路径",
          "制定风险应对预案"
        ],
        kpi: [
          "分析本月销售KPI完成情况",
          "如何提升项目交付准时率？",
          "对比行业标杆找差距",
          "制定下季度KPI改进计划"
        ]
      };
      
      return prompts[input.assistantType];
    })
});
