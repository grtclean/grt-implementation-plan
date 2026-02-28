import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { feedback } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const feedbackRouter = router({
  // 反馈列表
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 创建反馈
  create: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.insert(feedback).values({
      userId: input.userId || 1,
      type: (input.type || "suggestion") as "suggestion" | "bug" | "other",
      content: input.content || "",
      status: "pending" as const,
    }).returning();
    return { success: true, message: "反馈已提交", data: item };
  }),

  // 提交反馈（前端调用 submit）
  submit: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.insert(feedback).values({
      userId: input.userId || 1,
      type: (input.type || "suggestion") as "suggestion" | "bug" | "other",
      content: input.content || "",
      status: "pending" as const,
    }).returning();
    return { success: true, message: "反馈已提交", data: item };
  }),
});
