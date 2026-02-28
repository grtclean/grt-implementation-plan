import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { reportTemplates } from "../../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

export const reportTemplateRouter = router({
  // 报表模板列表
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    const items = await db.select().from(reportTemplates).orderBy(desc(reportTemplates.createdAt));
    return { items, total: items.length, page: 1, pageSize: items.length };
  }),

  // 获取模板详情
  getById: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, toNum(input.id)));
    return item || null;
  }),

  // 创建模板
  create: protectedProcedure.input(z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.any().optional(),
    reportTypes: z.any(),
    layout: z.any().optional(),
    styling: z.any().optional(),
    filters: z.any().optional(),
    isDefault: z.any().optional(),
    isPublic: z.any().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [template] = await db.insert(reportTemplates).values({
      name: input.name,
      description: input.description,
      category: typeof input.category === "string" ? input.category : JSON.stringify(input.category),
      reportTypes: typeof input.reportTypes === "string" ? input.reportTypes : JSON.stringify(input.reportTypes),
      layout: typeof input.layout === "string" ? input.layout : JSON.stringify(input.layout),
      styling: typeof input.styling === "string" ? input.styling : JSON.stringify(input.styling),
      filters: typeof input.filters === "string" ? input.filters : JSON.stringify(input.filters),
      isDefault: input.isDefault ? 1 : 0,
      isPublic: input.isPublic ? 1 : 0,
    }).returning();
    return { success: true, message: "模板已创建", data: template };
  }),

  // 更新模板
  update: protectedProcedure.input(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.any().optional(),
    reportTypes: z.any().optional(),
    layout: z.any().optional(),
    styling: z.any().optional(),
    filters: z.any().optional(),
    isDefault: z.any().optional(),
    isPublic: z.any().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, isDefault, isPublic, category, reportTypes, layout, styling, filters, ...rest } = input;
    const setData: Record<string, unknown> = { ...rest, updatedAt: new Date().toISOString() };
    if (isDefault !== undefined) setData.isDefault = isDefault ? 1 : 0;
    if (isPublic !== undefined) setData.isPublic = isPublic ? 1 : 0;
    if (category !== undefined) setData.category = typeof category === "string" ? category : JSON.stringify(category);
    if (reportTypes !== undefined) setData.reportTypes = typeof reportTypes === "string" ? reportTypes : JSON.stringify(reportTypes);
    if (layout !== undefined) setData.layout = typeof layout === "string" ? layout : JSON.stringify(layout);
    if (styling !== undefined) setData.styling = typeof styling === "string" ? styling : JSON.stringify(styling);
    if (filters !== undefined) setData.filters = typeof filters === "string" ? filters : JSON.stringify(filters);

    const [template] = await db.update(reportTemplates)
      .set(setData)
      .where(eq(reportTemplates.id, toNum(id)))
      .returning();
    return { success: true, message: "模板已更新", data: template };
  }),

  // 删除模板
  delete: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(reportTemplates).where(eq(reportTemplates.id, toNum(input.id)));
    return { success: true, message: "模板已删除" };
  }),

  // 生成报表
  generate: protectedProcedure.input(z.object({
    templateId: z.union([z.string(), z.number()]),
    params: z.record(z.string(), z.any()).optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, toNum(input.templateId)));
    if (!template) return { url: "" };

    await db.update(reportTemplates)
      .set({ usageCount: (template.usageCount || 0) + 1, updatedAt: new Date().toISOString() })
      .where(eq(reportTemplates.id, template.id));

    return { url: `/api/reports/generated/${template.id}` };
  }),

  // 导出模板（前端以 useQuery 调用）
  export: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, toNum(input.id)));
    if (!template) return { data: "" };
    return { data: JSON.stringify(template) };
  }),

  // 导入模板 (frontend passes { data: object, rename?, makePublic? })
  import: protectedProcedure.input(z.object({
    data: z.any(),
    rename: z.string().optional(),
    makePublic: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    try {
      const parsed = typeof input.data === "string" ? JSON.parse(input.data) : input.data;
      // Support { version, template } wrapper format
      const tplData = parsed.template || parsed;
      const name = input.rename || tplData.name || "导入模板";

      const [template] = await db.insert(reportTemplates).values({
        name,
        reportTypes: typeof tplData.reportTypes === "string" ? tplData.reportTypes : JSON.stringify(tplData.reportTypes || []),
        description: tplData.description,
        category: typeof tplData.category === "string" ? tplData.category : undefined,
        layout: typeof tplData.layout === "string" ? tplData.layout : JSON.stringify(tplData.layout),
        styling: typeof tplData.styling === "string" ? tplData.styling : JSON.stringify(tplData.styling),
        filters: typeof tplData.filters === "string" ? tplData.filters : JSON.stringify(tplData.filters),
        isPublic: input.makePublic ? 1 : 0,
      }).returning();
      return { success: true, message: "导入成功", data: template };
    } catch {
      return { success: false, message: "导入数据格式错误" };
    }
  }),

  // 验证导入数据
  validateImport: protectedProcedure.input(z.object({ data: z.any() })).query(({ input }) => {
    try {
      const parsed = typeof input.data === "string" ? JSON.parse(input.data) : input.data;
      const tplData = parsed.template || parsed;
      const errors: string[] = [];
      if (!tplData.name) errors.push("缺少模板名称");
      if (!tplData.reportTypes) errors.push("缺少报表类型");
      return { valid: errors.length === 0, errors };
    } catch {
      return { valid: false, errors: ["JSON格式错误"] };
    }
  }),

  // 从分享导入 (frontend passes { shareData, rename })
  importFromShare: protectedProcedure.input(z.object({
    shareData: z.string().optional(),
    shareId: z.union([z.string(), z.number()]).optional(),
    rename: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();

    // Try to parse shareData as JSON containing an ID or template
    let sourceId: number | null = null;
    if (input.shareId) {
      sourceId = toNum(input.shareId);
    } else if (input.shareData) {
      try {
        const parsed = JSON.parse(input.shareData);
        sourceId = parsed.id ? toNum(parsed.id) : null;
      } catch {
        sourceId = parseInt(input.shareData);
      }
    }

    if (!sourceId || isNaN(sourceId)) return { success: false, message: "无效的分享数据" };

    const [source] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, sourceId));
    if (!source) return { success: false, message: "分享模板不存在" };

    const [template] = await db.insert(reportTemplates).values({
      name: input.rename || `${source.name} (副本)`,
      description: source.description,
      category: source.category,
      reportTypes: source.reportTypes,
      layout: source.layout,
      styling: source.styling,
      filters: source.filters,
    }).returning();
    return { success: true, message: "导入成功", data: template };
  }),

  // 发布模板
  publish: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(reportTemplates)
      .set({ isPublic: 1, updatedAt: new Date().toISOString() })
      .where(eq(reportTemplates.id, toNum(input.id)));
    return { success: true, message: "已发布" };
  }),

  // 取消发布
  unpublish: protectedProcedure.input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(reportTemplates)
      .set({ isPublic: 0, updatedAt: new Date().toISOString() })
      .where(eq(reportTemplates.id, toNum(input.id)));
    return { success: true, message: "已取消发布" };
  }),

  // 获取公开模板
  getPublic: protectedProcedure.query(async () => {
    const db = await requireDb();
    return await db.select().from(reportTemplates)
      .where(eq(reportTemplates.isPublic, 1))
      .orderBy(desc(reportTemplates.usageCount));
  }),

  // 获取分享数据
  getShareData: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, toNum(input.id)));
    if (!template || template.isPublic !== 1) return { data: null };
    return { data: template };
  }),
});
