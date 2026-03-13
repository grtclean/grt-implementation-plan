import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
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
  create: requirePermission('workspace:preferences:manage').input(z.object({
    type: z.enum(["suggestion", "bug", "other"]).optional(),
    content: z.string().max(5000).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [item] = await db.insert(feedback).values({
      userId: ctx.user.id,
      type: (input.type || "suggestion") as "suggestion" | "bug" | "other",
      content: input.content || "",
      status: "pending" as const,
    }).returning();
    return { success: true, message: "反馈已提交", data: item };
  }),

  // 提交反馈（前端调用 submit）
  submit: requirePermission('workspace:preferences:manage').input(z.object({
    type: z.enum(["suggestion", "bug", "other"]).optional(),
    content: z.string().max(5000).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [item] = await db.insert(feedback).values({
      userId: ctx.user.id,
      type: (input.type || "suggestion") as "suggestion" | "bug" | "other",
      content: input.content || "",
      status: "pending" as const,
    }).returning();
    return { success: true, message: "反馈已提交", data: item };
  }),
});
