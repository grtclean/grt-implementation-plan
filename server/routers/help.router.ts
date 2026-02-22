/**
 * GRT Help Articles Router — Contextual Help & Documentation APIs
 *
 * 10 procedures across 3 groups:
 *   Queries    (6): listArticles, getArticle, getContextualHelp, searchHelp, getCategories, getPopularArticles
 *   Mutations  (4): createArticle, updateArticle, deleteArticle, reorderArticles
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { helpArticles, HELP_CATEGORIES } from "../../drizzle/help-schema";
import { eq, and, desc, asc, sql, or, ilike, count } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id) : id;

export const helpRouter = router({
  // ══════════════════════════════════════════════════
  // Queries
  // ══════════════════════════════════════════════════

  listArticles: publicProcedure
    .input(
      z
        .object({
          category: z.enum(HELP_CATEGORIES).optional(),
          routePath: z.string().optional(),
          isActive: z.boolean().optional(),
          limit: z.number().default(100),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      if (input?.category)
        conditions.push(eq(helpArticles.category, input.category));
      if (input?.routePath)
        conditions.push(eq(helpArticles.routePath, input.routePath));
      if (input?.isActive !== undefined)
        conditions.push(eq(helpArticles.isActive, input.isActive));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, [{ value: total }]] = await Promise.all([
        db
          .select()
          .from(helpArticles)
          .where(where)
          .orderBy(asc(helpArticles.sortOrder), desc(helpArticles.createdAt))
          .limit(input?.limit ?? 100)
          .offset(input?.offset ?? 0),
        db.select({ value: count() }).from(helpArticles).where(where),
      ]);

      return { items, total: Number(total) };
    }),

  getArticle: publicProcedure
    .input(idInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .select()
        .from(helpArticles)
        .where(eq(helpArticles.id, toNum(input.id)));
      return item ?? null;
    }),

  getContextualHelp: publicProcedure
    .input(
      z.object({
        routePath: z.string().min(1),
        featureKey: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [eq(helpArticles.isActive, true)];

      // Match articles where routePath matches exactly OR routePath appears in relatedRoutes JSON
      const routeCondition = or(
        eq(helpArticles.routePath, input.routePath),
        sql`${helpArticles.relatedRoutes}::text LIKE ${"%" + input.routePath + "%"}`
      );

      if (input.featureKey) {
        // If featureKey provided, match articles where routePath/relatedRoutes match OR featureKey matches
        conditions.push(
          or(routeCondition, eq(helpArticles.featureKey, input.featureKey))!
        );
      } else {
        conditions.push(routeCondition!);
      }

      const articles = await db
        .select()
        .from(helpArticles)
        .where(and(...conditions))
        .orderBy(asc(helpArticles.sortOrder));

      return { articles, route: input.routePath };
    }),

  searchHelp: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const pattern = `%${input.query}%`;

      const articles = await db
        .select()
        .from(helpArticles)
        .where(
          and(
            eq(helpArticles.isActive, true),
            or(
              ilike(helpArticles.title, pattern),
              ilike(helpArticles.titleZh, pattern),
              ilike(helpArticles.content, pattern),
              ilike(helpArticles.contentZh, pattern)
            )
          )
        )
        .orderBy(asc(helpArticles.sortOrder), desc(helpArticles.createdAt))
        .limit(input.limit);

      return articles;
    }),

  getCategories: publicProcedure.query(async () => {
    const db = await requireDb();

    const rows = await db
      .select({
        category: helpArticles.category,
        count: count(),
      })
      .from(helpArticles)
      .where(eq(helpArticles.isActive, true))
      .groupBy(helpArticles.category);

    return rows.map((row) => ({
      category: row.category,
      count: Number(row.count),
    }));
  }),

  getPopularArticles: publicProcedure
    .input(
      z
        .object({
          limit: z.number().default(10),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 10;

      // Find articles with the most relatedRoutes entries or general articles (routePath = "/")
      // Use JSON array length to rank articles by how broadly applicable they are
      const articles = await db
        .select()
        .from(helpArticles)
        .where(eq(helpArticles.isActive, true))
        .orderBy(
          desc(sql`json_array_length(${helpArticles.relatedRoutes})`),
          asc(helpArticles.sortOrder)
        )
        .limit(limit);

      return articles;
    }),

  // ══════════════════════════════════════════════════
  // Mutations
  // ══════════════════════════════════════════════════

  createArticle: publicProcedure
    .input(
      z.object({
        routePath: z.string().max(500).optional(),
        featureKey: z.string().max(200).optional(),
        title: z.string().min(1).max(500),
        titleZh: z.string().min(1).max(500),
        content: z.string().min(1),
        contentZh: z.string().min(1),
        category: z.enum(HELP_CATEGORIES).optional(),
        tags: z.array(z.string()).optional(),
        relatedRoutes: z.array(z.string()).optional(),
        videoUrl: z.string().max(1000).optional(),
        sortOrder: z.number().default(0),
        isActive: z.boolean().default(true),
        createdBy: z.union([z.string(), z.number()]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .insert(helpArticles)
        .values({
          routePath: input.routePath,
          featureKey: input.featureKey,
          title: input.title,
          titleZh: input.titleZh,
          content: input.content,
          contentZh: input.contentZh,
          category: input.category,
          tags: input.tags as string[] | undefined,
          relatedRoutes: input.relatedRoutes as string[] | undefined,
          videoUrl: input.videoUrl,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
          createdBy: input.createdBy ? toNum(input.createdBy) : undefined,
        })
        .returning();
      return item;
    }),

  updateArticle: publicProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        routePath: z.string().max(500).optional(),
        featureKey: z.string().max(200).optional(),
        title: z.string().min(1).max(500).optional(),
        titleZh: z.string().min(1).max(500).optional(),
        content: z.string().min(1).optional(),
        contentZh: z.string().min(1).optional(),
        category: z.enum(HELP_CATEGORIES).optional(),
        tags: z.array(z.string()).optional(),
        relatedRoutes: z.array(z.string()).optional(),
        videoUrl: z.string().max(1000).nullable().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...rest } = input;
      const setData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (rest.routePath !== undefined) setData.routePath = rest.routePath;
      if (rest.featureKey !== undefined) setData.featureKey = rest.featureKey;
      if (rest.title !== undefined) setData.title = rest.title;
      if (rest.titleZh !== undefined) setData.titleZh = rest.titleZh;
      if (rest.content !== undefined) setData.content = rest.content;
      if (rest.contentZh !== undefined) setData.contentZh = rest.contentZh;
      if (rest.category !== undefined) setData.category = rest.category;
      if (rest.tags !== undefined) setData.tags = rest.tags;
      if (rest.relatedRoutes !== undefined)
        setData.relatedRoutes = rest.relatedRoutes;
      if (rest.videoUrl !== undefined) setData.videoUrl = rest.videoUrl;
      if (rest.sortOrder !== undefined) setData.sortOrder = rest.sortOrder;
      if (rest.isActive !== undefined) setData.isActive = rest.isActive;

      const [item] = await db
        .update(helpArticles)
        .set(setData)
        .where(eq(helpArticles.id, toNum(id)))
        .returning();
      if (!item) throw new Error(`Help article #${id} not found`);
      return item;
    }),

  deleteArticle: publicProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [item] = await db
        .update(helpArticles)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(helpArticles.id, toNum(input.id)))
        .returning();
      if (!item) throw new Error(`Help article #${input.id} not found`);
      return item;
    }),

  reorderArticles: publicProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.union([z.string(), z.number()]),
            sortOrder: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const results = [];

      for (const entry of input.items) {
        const [updated] = await db
          .update(helpArticles)
          .set({
            sortOrder: entry.sortOrder,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(helpArticles.id, toNum(entry.id)))
          .returning();
        if (updated) results.push(updated);
      }

      return { updated: results.length, items: results };
    }),
});
