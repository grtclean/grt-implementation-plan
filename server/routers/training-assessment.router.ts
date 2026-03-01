import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { trainingAssessments, trainingAssessmentResults } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const trainingAssessmentRouter = router({
  // 评估列表
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(trainingAssessments).orderBy(desc(trainingAssessments.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取评估详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    const [assessment] = await db.select().from(trainingAssessments).where(eq(trainingAssessments.id, id));
    if (!assessment) return null;

    const results = await db.select().from(trainingAssessmentResults)
      .where(eq(trainingAssessmentResults.assessmentId, id));

    return { ...assessment, results };
  }),

  // 创建评估
  create: protectedProcedure.input(z.object({
    trainingId: z.number(),
    assessmentType: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    totalScore: z.number().optional(),
    passingScore: z.number().optional(),
    questions: z.union([z.string(), z.array(z.unknown())]).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [assessment] = await db.insert(trainingAssessments).values({
      trainingId: input.trainingId,
      assessmentType: (input.assessmentType || "quiz") as "quiz" | "survey" | "practical",
      name: input.name || "培训评估",
      description: input.description,
      totalScore: input.totalScore || 100,
      passingScore: input.passingScore || 60,
      questions: input.questions ? (typeof input.questions === "string" ? input.questions : JSON.stringify(input.questions)) : undefined,
      status: "draft" as const,
    }).returning();
    return { success: true, message: "评估已创建", data: assessment };
  }),

  // 更新评估
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    description: z.string().optional(),
    totalScore: z.number().optional(),
    passingScore: z.number().optional(),
    questions: z.union([z.string(), z.array(z.unknown())]).optional(),
    status: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.totalScore !== undefined) updates.totalScore = input.totalScore;
    if (input.passingScore !== undefined) updates.passingScore = input.passingScore;
    if (input.questions !== undefined) updates.questions = typeof input.questions === "string" ? input.questions : JSON.stringify(input.questions);
    if (input.status !== undefined) updates.status = input.status;

    const [assessment] = await db.update(trainingAssessments)
      .set(updates)
      .where(eq(trainingAssessments.id, id))
      .returning();
    return { success: true, message: "更新成功", data: assessment };
  }),

  // 删除评估
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = parseInt(input.id);
    await db.delete(trainingAssessmentResults).where(eq(trainingAssessmentResults.assessmentId, id));
    await db.delete(trainingAssessments).where(eq(trainingAssessments.id, id));
    return { success: true, message: "删除成功" };
  }),

  // 按培训获取评估
  getByTraining: protectedProcedure.input(z.object({
    trainingId: z.union([z.string(), z.number()]),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const trainingId = typeof input.trainingId === "string" ? parseInt(input.trainingId) : input.trainingId;
    return await db.select().from(trainingAssessments)
      .where(eq(trainingAssessments.trainingId, trainingId))
      .orderBy(desc(trainingAssessments.createdAt));
  }),
});
