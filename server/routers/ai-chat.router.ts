import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { aiChatSessions, aiChatMessages, aiChatTemplates } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const aiChatRouter = router({
  sendMessage: protectedProcedure.input(z.object({
    sessionId: z.number().optional(),
    assistantType: z.enum(["solution", "quotation", "planning", "kpi", "personal"]).optional(),
    message: z.string().min(1),
    context: z.record(z.string(), z.unknown()).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    let sessionId = input.sessionId;

    if (!sessionId) {
      const [session] = await db.insert(aiChatSessions).values({
        userId: ctx.user.id,
        assistantType: input.assistantType || "personal",
        title: input.message.slice(0, 50),
        status: "active",
        messageCount: 0,
      }).returning();
      sessionId = session.id;
    }

    await db.insert(aiChatMessages).values({
      sessionId,
      role: "user",
      content: input.message,
      contentType: "text",
    });

    let aiResponse = "抱歉，AI服务暂时不可用。";
    try {
      const result = await invokeLLM({
        messages: [
          { role: "system", content: "你是GRT智能工业系统的AI助手。请用中文回答。" },
          { role: "user", content: input.message },
        ],
      });
      aiResponse = result.choices[0]?.message?.content || aiResponse;
    } catch { /* fallback to default */ }

    const [msg] = await db.insert(aiChatMessages).values({
      sessionId,
      role: "assistant",
      content: aiResponse,
      contentType: "text",
    }).returning();

    await db.update(aiChatSessions).set({
      messageCount: (await db.select().from(aiChatMessages).where(eq(aiChatMessages.sessionId, sessionId))).length,
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(aiChatSessions.id, sessionId));

    return { sessionId, message: msg };
  }),

  getQuickPrompts: protectedProcedure.input(z.object({
    assistantType: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let templates = await db.select().from(aiChatTemplates).where(eq(aiChatTemplates.isPublic, 1)).orderBy(desc(aiChatTemplates.usageCount));
    if (input?.assistantType) templates = templates.filter(t => t.assistantType === input.assistantType);
    if (templates.length > 0) return templates.map(t => ({ id: t.id, name: t.name, content: t.content, category: t.category }));
    return [
      { id: 0, name: "项目进度查询", content: "请帮我查看当前所有活跃项目的进度", category: "项目" },
      { id: 0, name: "质量分析", content: "请分析最近的质量问题趋势", category: "质量" },
      { id: 0, name: "成本优化建议", content: "请给出当前项目的成本优化建议", category: "成本" },
    ];
  }),
});
