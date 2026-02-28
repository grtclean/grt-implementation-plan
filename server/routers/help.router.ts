/**
 * GRT Help Articles Router — Contextual Help & Documentation APIs
 *
 * 14 procedures across 3 groups:
 *   Queries    (8): listArticles, getArticle, getContextualHelp, searchHelp, getCategories, getPopularArticles, getChangelog, getWalkthroughs
 *   Mutations  (6): createArticle, updateArticle, deleteArticle, reorderArticles, askCopilot, recordCopilotFeedback
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { helpArticles, HELP_CATEGORIES } from "../../drizzle/help-schema";
import { aiLearningRecords, feedback } from "../../drizzle/schema";
import { eq, and, desc, asc, sql, or, ilike, count, gte } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { searchDocuments, incrementRelevance } from "../modules/knowledge-base.service";

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

  getChangelog: publicProcedure
    .input(
      z.object({ limit: z.number().default(20) }).optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const articles = await db
        .select()
        .from(helpArticles)
        .where(
          and(
            eq(helpArticles.category, "CHANGELOG"),
            eq(helpArticles.isActive, true)
          )
        )
        .orderBy(desc(helpArticles.sortOrder), desc(helpArticles.createdAt))
        .limit(input?.limit ?? 20);
      return articles;
    }),

  getWalkthroughs: publicProcedure
    .input(
      z.object({
        routePath: z.string().optional(),
        limit: z.number().default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [
        eq(helpArticles.category, "WALKTHROUGH"),
        eq(helpArticles.isActive, true),
      ];
      if (input?.routePath) {
        conditions.push(eq(helpArticles.routePath, input.routePath));
      }
      const articles = await db
        .select()
        .from(helpArticles)
        .where(and(...conditions))
        .orderBy(asc(helpArticles.sortOrder))
        .limit(input?.limit ?? 10);
      return articles;
    }),

  // ══════════════════════════════════════════════════
  // Mutations
  // ══════════════════════════════════════════════════

  askCopilot: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        routePath: z.string().optional(),
        conversationHistory: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { query, routePath, conversationHistory } = input;

      // 1. Search help_articles for relevant content
      const pattern = `%${query}%`;
      const helpResults = await db
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
        .orderBy(asc(helpArticles.sortOrder))
        .limit(3);

      // 2. RAG: search knowledge base
      let kbResults: { id: number; title: string; content: string; category: string }[] = [];
      try {
        kbResults = await searchDocuments(query, { limit: 3 });
      } catch {
        // KB search failure is non-fatal
      }

      // 3. Page-specific help
      let pageHelp: typeof helpResults = [];
      if (routePath) {
        pageHelp = await db
          .select()
          .from(helpArticles)
          .where(
            and(
              eq(helpArticles.isActive, true),
              eq(helpArticles.routePath, routePath)
            )
          )
          .orderBy(asc(helpArticles.sortOrder))
          .limit(2);
      }

      // 4. Load positive past Q&A as few-shot examples (self-learning)
      let fewShotExamples: { learnedContent: string | null }[] = [];
      try {
        const fewShotConditions = [
          gte(aiLearningRecords.confidenceScore, "0.80"),
        ];
        fewShotExamples = await db
          .select({ learnedContent: aiLearningRecords.learnedContent })
          .from(aiLearningRecords)
          .where(and(...fewShotConditions))
          .orderBy(desc(aiLearningRecords.appliedCount))
          .limit(3);
      } catch {
        // Learning records query failure is non-fatal
      }

      // 5. Build system prompt with all context
      const helpContext = helpResults
        .map((a) => `[帮助] ${a.titleZh}: ${a.contentZh}`)
        .join("\n");
      const kbContext = kbResults
        .map((d) => `[知识库] ${d.title}: ${d.content.slice(0, 300)}`)
        .join("\n");
      const pageContext = pageHelp
        .map((a) => `[当前页面] ${a.titleZh}: ${a.contentZh}`)
        .join("\n");
      const exampleContext = fewShotExamples
        .filter((e) => e.learnedContent)
        .map((e) => e.learnedContent)
        .join("\n");

      const systemPrompt = [
        "你是GRT企业操作系统的智能助手（GRT Copilot）。",
        "你的职责是帮助用户使用系统功能、解答操作疑问、推荐最佳实践。",
        "回答要简洁、专业、可操作。如果涉及导航，请给出具体路径。",
        routePath ? `用户当前位于页面: ${routePath}` : "",
        helpContext ? `\n参考帮助文档:\n${helpContext}` : "",
        kbContext ? `\n参考知识库:\n${kbContext}` : "",
        pageContext ? `\n当前页面帮助:\n${pageContext}` : "",
        exampleContext ? `\n优秀问答示例:\n${exampleContext}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      // 6. Build messages array
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];
      if (conversationHistory) {
        for (const msg of conversationHistory.slice(-10)) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
      messages.push({ role: "user", content: query });

      // 7. Invoke LLM
      let answer = "";
      try {
        const llmResult = await invokeLLM({ messages });
        answer = llmResult.choices?.[0]?.message?.content || "抱歉，暂时无法回答您的问题。";
      } catch (err) {
        console.error("[askCopilot] LLM error:", err);
        answer = "AI服务暂时不可用，请查阅帮助文档或稍后重试。";
      }

      // 8. Increment relevance for matched KB docs
      for (const doc of kbResults) {
        try { await incrementRelevance(doc.id); } catch { /* non-fatal */ }
      }

      // 9. Increment appliedCount for used few-shot examples
      // (tracked via the feedback loop)

      // Build source citations
      const sources = [
        ...helpResults.map((a) => ({ type: "help" as const, title: a.titleZh, id: a.id })),
        ...kbResults.map((d) => ({ type: "kb" as const, title: d.title, id: d.id })),
      ];

      const suggestedActions = pageHelp.map((a) => ({
        title: a.titleZh,
        route: a.routePath,
      }));

      return { answer, sources, suggestedActions };
    }),

  recordCopilotFeedback: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        answer: z.string(),
        routePath: z.string().optional(),
        isPositive: z.boolean(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { query, answer, routePath, isPositive, comment } = input;

      // Save to aiLearningRecords for self-improvement
      // learningSourceEnum: 'interaction' | 'task' | 'feedback' | 'document' | 'meeting'
      try {
        await db.insert(aiLearningRecords).values({
          assistantId: 0,
          employeeId: 0,
          learningSource: "feedback",
          sourceReference: routePath || "/",
          learnedContent: `Q: ${query}\nA: ${answer}`,
          contentCategory: "copilot_qa",
          confidenceScore: isPositive ? "0.90" : "0.30",
          appliedCount: 0,
        });
      } catch (err) {
        console.error("[recordCopilotFeedback] learning record error:", err);
      }

      // Save to feedback table for admin review
      // typeEnum6: 'suggestion' | 'bug' | 'other'
      try {
        await db.insert(feedback).values({
          type: "suggestion",
          content: `[Copilot ${isPositive ? "+" : "-"}] ${query}\n---\n${answer}${comment ? `\n\nUser comment: ${comment}` : ""}`,
        });
      } catch (err) {
        console.error("[recordCopilotFeedback] feedback error:", err);
      }

      return { success: true };
    }),

  createArticle: protectedProcedure
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

  updateArticle: protectedProcedure
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

  deleteArticle: protectedProcedure
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

  reorderArticles: protectedProcedure
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
