import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { aiNotebookSuggestions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { searchDocuments } from "../modules/knowledge-base.service";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const aiNotebookRouter = router({
  getSuggestions: protectedProcedure.input(z.object({
    entryId: z.union([z.string(), z.number()]).optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let items = await db.select().from(aiNotebookSuggestions).orderBy(desc(aiNotebookSuggestions.createdAt));
    if (input?.entryId) items = items.filter(s => s.entryId === toNum(input.entryId));
    if (input?.status) items = items.filter(s => s.status === input.status);
    return items;
  }),

  /**
   * analyzeEntry — LLM-powered notebook entry analysis
   * Extracts findings, improvements, and keywords from content
   */
  analyzeEntry: protectedProcedure.input(z.object({
    entryId: z.union([z.string(), z.number()]),
    content: z.string().optional(),
    processType: z.string().optional(),
    processId: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { entryId, content, processType, processId } = input;

    if (!content || content.trim().length === 0) {
      return { success: true, message: "无内容可分析", suggestions: [] };
    }

    // RAG: search for related knowledge
    let kbContext = "";
    try {
      const kbResults = await searchDocuments(content.slice(0, 200), { limit: 3 });
      if (kbResults.length > 0) {
        kbContext = "\n\n参考知识:\n" + kbResults
          .map((r) => `[${r.category}] ${r.title}: ${r.content.slice(0, 200)}`)
          .join("\n");
      }
    } catch { /* non-fatal */ }

    const systemPrompt = [
      "你是GRT企业操作系统的AI分析助手。",
      "分析用户的笔记内容，提取以下信息:",
      "1. 关键发现 (findings)",
      "2. 改进建议 (improvements)",
      "3. 关键词 (keywords)",
      "回复JSON格式:",
      '[{"type":"finding","value":"...","keywords":["..."]},{"type":"improvement","value":"...","keywords":["..."]}]',
      kbContext,
    ].join("\n");

    let suggestions: { type: string; value: string; keywords: string[] }[] = [];

    try {
      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `分析以下笔记内容:\n\n${content}` },
        ],
      });

      const raw = llmResult.choices?.[0]?.message?.content || "";

      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      } catch {
        suggestions = [{
          type: "finding",
          value: raw.slice(0, 500),
          keywords: [],
        }];
      }
    } catch (err) {
      console.error("[analyzeEntry] LLM error:", err);
      return { success: false, message: "AI分析失败", suggestions: [] };
    }

    // Save suggestions to DB
    // suggestionTypeEnum valid values: 'field_update', 'process_link', 'content_match'
    const typeMap: Record<string, "field_update" | "process_link" | "content_match"> = {
      finding: "content_match",
      improvement: "field_update",
      process: "process_link",
    };

    const savedSuggestions = [];
    for (const s of suggestions) {
      try {
        const [saved] = await db.insert(aiNotebookSuggestions).values({
          entryId: toNum(entryId),
          suggestionType: typeMap[s.type] || "content_match",
          targetProcessType: processType || null,
          targetProcessId: processId || null,
          suggestedValue: s.value,
          extractedKeywords: s.keywords || [],
          reasoning: `AI分析: ${s.type}`,
          confidenceScore: "0.80",
        }).returning();
        if (saved) savedSuggestions.push(saved);
      } catch (dbErr) {
        console.error("[analyzeEntry] DB save error:", dbErr);
      }
    }

    return {
      success: true,
      message: `分析完成，生成${savedSuggestions.length}条建议`,
      suggestions: savedSuggestions,
    };
  }),

  acceptSuggestion: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    suggestionId: z.union([z.string(), z.number()]).optional(),
    acceptedValue: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id || input.suggestionId || 0);
    const [item] = await db.update(aiNotebookSuggestions).set({
      status: "accepted",
      acceptedValue: input.acceptedValue,
      acceptedAt: new Date().toISOString(),
    }).where(eq(aiNotebookSuggestions.id, numId)).returning();
    return { success: true, data: item };
  }),

  rejectSuggestion: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    suggestionId: z.union([z.string(), z.number()]).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const numId = toNum(input.id || input.suggestionId || 0);
    const [item] = await db.update(aiNotebookSuggestions).set({
      status: "rejected",
    }).where(eq(aiNotebookSuggestions.id, numId)).returning();
    return { success: true, data: item };
  }),
});
