import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { aiProcessSuggestions, aiSuggestionExecutionLogs } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { searchDocuments } from "../modules/knowledge-base.service";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

// Process-specific system prompts
const PROCESS_PROMPTS: Record<string, string> = {
  FMEA: "你是FMEA（失效模式与影响分析）专家。基于AIAG VDA FMEA标准，分析潜在失效模式，评估风险优先级(AP)，给出改进建议。",
  "8D": "你是8D问题解决专家。帮助团队按照8D方法论（D1-D8步骤）系统地分析和解决质量问题。",
  CAPA: "你是CAPA（纠正与预防措施）专家。帮助识别根本原因，制定纠正措施和预防措施，确保问题不再复发。",
  PPAP: "你是PPAP（生产件批准程序）专家。指导完成18项PPAP提交要素，确保供应商零件满足设计规格。",
  ControlPlan: "你是控制计划专家。帮助制定生产过程控制计划，包括控制特性、检验方法、抽样频次和反应计划。",
};

export const aiSuggestionRouter = router({
  getSuggestions: publicProcedure.input(z.object({
    processType: z.string().optional(),
    processId: z.string().optional(),
    stepCode: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(aiProcessSuggestions).orderBy(desc(aiProcessSuggestions.createdAt));
    if (input?.processType) items = items.filter(s => s.processType === input.processType);
    if (input?.processId) items = items.filter(s => s.processId === input.processId);
    if (input?.stepCode) items = items.filter(s => s.stepCode === input.stepCode);
    return items;
  }),

  /**
   * generateSuggestion — LLM-powered process improvement suggestion
   */
  generateSuggestion: protectedProcedure.input(z.object({
    processType: z.string(),
    processId: z.string().optional(),
    stepCode: z.string().optional(),
    context: z.string().optional(),
    question: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { processType, processId, stepCode, context, question } = input;

    // Get process-specific system prompt
    const basePrompt = PROCESS_PROMPTS[processType] ||
      `你是GRT企业操作系统的AI质量顾问。帮助分析${processType}相关问题并给出改进建议。`;

    // RAG: search knowledge base for relevant context
    let kbContext = "";
    try {
      const searchQuery = `${processType} ${question || context || ""}`;
      const kbResults = await searchDocuments(searchQuery, { limit: 3 });
      if (kbResults.length > 0) {
        kbContext = "\n\n参考知识库:\n" + kbResults
          .map((r) => `[${r.category}] ${r.title}: ${r.content.slice(0, 300)}`)
          .join("\n");
      }
    } catch { /* non-fatal */ }

    const systemPrompt = [
      basePrompt,
      "请生成JSON格式的建议:",
      '{"summary":"简要总结","details":"详细说明","suggestedActions":["操作1","操作2"],"references":["参考标准1"]}',
      kbContext,
    ].join("\n");

    const userPrompt = [
      `工艺类型: ${processType}`,
      processId ? `工艺ID: ${processId}` : "",
      stepCode ? `步骤: ${stepCode}` : "",
      context ? `上下文: ${context}` : "",
      question ? `问题: ${question}` : `请基于当前${processType}流程提供改进建议。`,
    ].filter(Boolean).join("\n");

    let suggestion = { summary: "", details: "", suggestedActions: [] as string[], references: [] as string[] };

    try {
      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const raw = llmResult.choices?.[0]?.message?.content || "";

      // Parse JSON from LLM response
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          suggestion = JSON.parse(jsonMatch[0]);
        }
      } catch {
        suggestion = {
          summary: raw.slice(0, 200),
          details: raw,
          suggestedActions: [],
          references: [],
        };
      }
    } catch (err) {
      console.error("[generateSuggestion] LLM error:", err);
      suggestion = {
        summary: "AI建议生成失败",
        details: "请稍后重试或手动分析",
        suggestedActions: [],
        references: [],
      };
    }

    // Save to aiProcessSuggestions table
    try {
      const [saved] = await db.insert(aiProcessSuggestions).values({
        processType,
        processId: processId || "general",
        stepCode: stepCode || "N/A",
        suggestionMode: stepCode ? "current_step" : "full_process",
        suggestionSummary: suggestion.summary,
        suggestionDetails: suggestion.details,
        suggestedActions: JSON.stringify(suggestion.suggestedActions),
        references: JSON.stringify(suggestion.references),
      }).returning();

      return { success: true, suggestion, id: saved?.id };
    } catch (dbErr) {
      console.error("[generateSuggestion] DB save error:", dbErr);
      return { success: true, suggestion, id: null };
    }
  }),

  applySuggestion: protectedProcedure.input(z.union([
    z.number(),
    z.string(),
    z.object({
      suggestionId: z.union([z.string(), z.number()]).optional(),
      actionId: z.string().optional(),
      actionName: z.string().optional(),
      executedBy: z.string().optional(),
    }),
  ])).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = typeof input === "object" ? toNum(input.suggestionId || 0) : toNum(input);

    if (!numId || numId <= 0) {
      return { success: false, data: null, error: "Invalid suggestion ID" };
    }

    await db.update(aiProcessSuggestions).set({
      isApplied: 1,
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(aiProcessSuggestions.id, numId));

    const inputObj = typeof input === "object" ? input : {};
    const [log] = await db.insert(aiSuggestionExecutionLogs).values({
      suggestionId: numId,
      actionId: (inputObj as any).actionId || `ACT-${Date.now()}`,
      actionName: (inputObj as any).actionName || "应用建议",
      executedBy: (inputObj as any).executedBy || "system",
      status: "completed",
      result: "建议已应用",
    }).returning();

    return { success: true, data: log };
  }),

  recordFeedback: protectedProcedure.input(z.object({
    suggestionId: z.union([z.string(), z.number()]),
    result: z.string().optional(),
    isPositive: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const resultText = input.result || (input.isPositive ? "positive" : "negative");
    await db.update(aiProcessSuggestions).set({
      applyResult: resultText,
      updatedAt: new Date().toISOString(),
    }).where(eq(aiProcessSuggestions.id, toNum(input.suggestionId)));
    return { success: true };
  }),
});
