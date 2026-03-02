import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { jsonValue } from "@shared/validators";
import { aiChatSessions, aiChatMessages, aiChatTemplates } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { submitTask, getTaskStatus } from "../services/task-worker.service";

export const aiChatRouter = router({
  sendMessage: protectedProcedure.input(z.object({
    sessionId: z.number().optional(),
    assistantType: z.enum(["solution", "quotation", "planning", "kpi", "personal"]).optional(),
    message: z.string().min(1),
    context: z.record(z.string(), jsonValue).optional(),
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

    // Submit LLM task to async queue instead of blocking
    const { taskId } = await submitTask(
      "AI_CHAT_REPLY",
      {
        sessionId,
        message: input.message,
        userId: ctx.user.id,
        assistantType: input.assistantType || "personal",
        context: input.context,
      },
      ctx.user.name ?? `User#${ctx.user.id}`,
    );

    return { sessionId, taskId, status: "processing" as const };
  }),

  /** Poll for AI chat reply status */
  getReplyStatus: protectedProcedure.input(z.object({
    taskId: z.number(),
    sessionId: z.number(),
  })).query(async ({ input }) => {
    const task = await getTaskStatus(input.taskId);
    if (!task) return { taskStatus: "not_found" as const, message: null };

    if (task.status === "completed" && task.resultData) {
      const result = task.resultData as Record<string, unknown>;
      const db = await requireDb();
      // Retrieve the saved assistant message
      const messages = await db.select().from(aiChatMessages)
        .where(eq(aiChatMessages.sessionId, input.sessionId))
        .orderBy(desc(aiChatMessages.id))
        .limit(1);
      return {
        taskStatus: "completed" as const,
        message: messages[0] ?? { content: result.response as string },
      };
    }

    if (task.status === "failed") {
      return { taskStatus: "failed" as const, message: null, error: task.errorMessage };
    }

    return { taskStatus: task.status as "pending" | "processing", message: null };
  }),

  getQuickPrompts: protectedProcedure.input(z.object({
    assistantType: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    let templates = await db.select().from(aiChatTemplates).where(eq(aiChatTemplates.isPublic, 1)).orderBy(desc(aiChatTemplates.usageCount)).limit(1000);
    if (input?.assistantType) templates = templates.filter(t => t.assistantType === input.assistantType);
    if (templates.length > 0) return templates.map(t => ({ id: t.id, name: t.name, content: t.content, category: t.category }));
    return [
      { id: 0, name: "项目进度查询", content: "请帮我查看当前所有活跃项目的进度", category: "项目" },
      { id: 0, name: "质量分析", content: "请分析最近的质量问题趋势", category: "质量" },
      { id: 0, name: "成本优化建议", content: "请给出当前项目的成本优化建议", category: "成本" },
    ];
  }),
});
