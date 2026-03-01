import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { trainingCertificates } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const trainingCertificateRouter = router({
  // 证书列表
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(trainingCertificates).orderBy(desc(trainingCertificates.createdAt)).limit(100);
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取证书详情
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(trainingCertificates).where(eq(trainingCertificates.id, parseInt(input.id))).limit(1000);
    return item || null;
  }),

  // 创建证书
  create: protectedProcedure.input(z.object({
    trainingId: z.number(),
    participantId: z.number(),
    certificateNo: z.string().optional(),
    name: z.string().optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    fileUrl: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const certNo = input.certificateNo || `CERT-${Date.now().toString(36).toUpperCase()}`;
    const [cert] = await db.insert(trainingCertificates).values({
      trainingId: input.trainingId,
      participantId: input.participantId,
      certificateNo: certNo,
      name: input.name || "培训证书",
      issueDate: input.issueDate || new Date().toISOString(),
      expiryDate: input.expiryDate,
      status: "active" as const,
      fileUrl: input.fileUrl,
    }).returning();
    return { success: true, message: "证书已创建", data: cert };
  }),

  // 更新证书
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    expiryDate: z.string().optional(),
    status: z.string().optional(),
    fileUrl: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = typeof input.id === "string" ? parseInt(input.id) : input.id;
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.expiryDate !== undefined) updates.expiryDate = input.expiryDate;
    if (input.status !== undefined) updates.status = input.status;
    if (input.fileUrl !== undefined) updates.fileUrl = input.fileUrl;

    const [cert] = await db.update(trainingCertificates)
      .set(updates)
      .where(eq(trainingCertificates.id, id))
      .returning();
    return { success: true, message: "更新成功", data: cert };
  }),

  // 删除证书
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(trainingCertificates).where(eq(trainingCertificates.id, parseInt(input.id)));
    return { success: true, message: "删除成功" };
  }),

  // 按参与者获取证书
  getByParticipant: protectedProcedure.input(z.object({
    participantId: z.union([z.string(), z.number()]),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const participantId = typeof input.participantId === "string" ? parseInt(input.participantId) : input.participantId;
    return await db.select().from(trainingCertificates)
      .where(eq(trainingCertificates.participantId, participantId))
      .orderBy(desc(trainingCertificates.issueDate)).limit(1000);
  }),

  // 颁发证书
  issue: protectedProcedure.input(z.object({
    trainingId: z.number(),
    participantId: z.number(),
    certificateNo: z.string().optional(),
    name: z.string().optional(),
    expiryDate: z.string().optional(),
    fileUrl: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const certNo = `CERT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const [cert] = await db.insert(trainingCertificates).values({
      trainingId: input.trainingId,
      participantId: input.participantId,
      certificateNo: certNo,
      name: input.name || "培训证书",
      issueDate: new Date().toISOString(),
      expiryDate: input.expiryDate,
      status: "active" as const,
      fileUrl: input.fileUrl,
    }).returning();
    return { success: true, message: "证书已颁发", data: cert };
  }),
});
