/**
 * IDO Router — Intelligent Document Optimization (文档智优中心)
 *
 * ~25 procedures across 4 groups:
 *   mapping.*  — Stage-Document-UI-Storage mapping CRUD
 *   storage.*  — Smart storage recommendations
 *   context.*  — File-open context (related docs, next actions, stage progress)
 *   workflow.* — Project document completion tracking
 */
import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  idoStageDocumentUiMap,
  idoStorageRecommendations,
  idoFileContextLog,
} from "../../drizzle/ido-schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  recommendStorage,
  buildFileOpenContext,
  getProjectDocumentCompletion,
  seedMappingTable,
} from "../services/ido.service";
import { STAGES } from "../../shared/stage-definitions";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ido-router");
const managePerm = requirePermission("doc:ido:manage");

export const idoRouter = router({
  // ═══════════════════════════════════════════════════════════════════════════
  // Mapping Group — Stage-Document-UI-Storage registry
  // ═══════════════════════════════════════════════════════════════════════════

  /** List all active mappings with optional stage filter */
  mappingList: protectedProcedure
    .input(
      z
        .object({
          stageCode: z.string().max(10).optional(),
          category: z.string().max(50).optional(),
          limit: z.number().int().min(1).max(200).default(100),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const limitN = input?.limit ?? 100;
      const offsetN = input?.offset ?? 0;

      const conditions = [eq(idoStageDocumentUiMap.isActive, true)];
      if (input?.stageCode) conditions.push(eq(idoStageDocumentUiMap.stageCode, input.stageCode));
      if (input?.category) conditions.push(eq(idoStageDocumentUiMap.documentCategory, input.category));

      const rows = await db
        .select()
        .from(idoStageDocumentUiMap)
        .where(and(...conditions))
        .orderBy(idoStageDocumentUiMap.stageCode, idoStageDocumentUiMap.sortOrder)
        .limit(limitN)
        .offset(offsetN);

      const [totalRow] = await db
        .select({ value: count() })
        .from(idoStageDocumentUiMap)
        .where(and(...conditions));

      return { items: rows, total: Number(totalRow?.value || 0) };
    }),

  /** Get mappings for a specific M-stage */
  mappingByStage: protectedProcedure
    .input(z.object({ stageCode: z.string().min(2).max(10) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(idoStageDocumentUiMap)
        .where(
          and(
            eq(idoStageDocumentUiMap.stageCode, input.stageCode),
            eq(idoStageDocumentUiMap.isActive, true),
          ),
        )
        .orderBy(idoStageDocumentUiMap.sortOrder)
        .limit(100);
    }),

  /** Get mappings for a specific UI page path */
  mappingByUiPage: protectedProcedure
    .input(z.object({ uiPagePath: z.string().max(500) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(idoStageDocumentUiMap)
        .where(
          and(
            eq(idoStageDocumentUiMap.uiPagePath, input.uiPagePath),
            eq(idoStageDocumentUiMap.isActive, true),
          ),
        )
        .orderBy(idoStageDocumentUiMap.stageCode, idoStageDocumentUiMap.sortOrder)
        .limit(100);
    }),

  /** Full M0-M12 matrix: stages × documents × pages × folders */
  mappingMatrix: protectedProcedure.query(async () => {
    const db = await requireDb();
    const allMappings = await db
      .select()
      .from(idoStageDocumentUiMap)
      .where(eq(idoStageDocumentUiMap.isActive, true))
      .orderBy(idoStageDocumentUiMap.stageCode, idoStageDocumentUiMap.sortOrder)
      .limit(1000);

    // Group by stage
    const matrix: Record<string, typeof allMappings> = {};
    for (const stage of STAGES) {
      matrix[stage.code] = [];
    }
    for (const m of allMappings) {
      if (!matrix[m.stageCode]) matrix[m.stageCode] = [];
      matrix[m.stageCode].push(m);
    }

    return {
      stages: STAGES.map((s) => ({
        code: s.code,
        name: s.name,
        nameEn: s.nameEn,
        category: s.category,
        color: s.color,
        documentCount: matrix[s.code]?.length || 0,
      })),
      matrix,
      totalDocuments: allMappings.length,
    };
  }),

  /** Create a new mapping entry (admin) */
  mappingCreate: managePerm
    .input(
      z.object({
        stageCode: z.string().min(2).max(10),
        documentTypeKey: z.string().min(1).max(100),
        documentName: z.string().min(1).max(200),
        documentNameEn: z.string().max(200).optional(),
        documentCategory: z.string().min(1).max(50),
        fileExtensions: z.string().max(200).optional(),
        uiPagePath: z.string().max(500).optional(),
        uiPageName: z.string().max(200).optional(),
        uiPageNameEn: z.string().max(200).optional(),
        sharepointFolder: z.string().max(200).optional(),
        sharepointSubfolder: z.string().max(200).optional(),
        plmDocType: z.string().max(30).optional(),
        isMandatory: z.boolean().default(false),
        sortOrder: z.number().int().default(0),
        responsibleRoles: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .insert(idoStageDocumentUiMap)
        .values({
          ...input,
          responsibleRoles: input.responsibleRoles ?? null,
          isActive: true,
          createdBy: ctx.user?.id ?? null,
          updatedBy: ctx.user?.id ?? null,
        })
        .returning();
      log.info({ id: row.id, stageCode: input.stageCode, docKey: input.documentTypeKey }, "Mapping created");
      return row;
    }),

  /** Update a mapping entry (admin) */
  mappingUpdate: managePerm
    .input(
      z.object({
        id: z.number().int(),
        documentName: z.string().min(1).max(200).optional(),
        documentNameEn: z.string().max(200).optional(),
        documentCategory: z.string().max(50).optional(),
        fileExtensions: z.string().max(200).optional(),
        uiPagePath: z.string().max(500).optional(),
        uiPageName: z.string().max(200).optional(),
        uiPageNameEn: z.string().max(200).optional(),
        sharepointFolder: z.string().max(200).optional(),
        sharepointSubfolder: z.string().max(200).optional(),
        plmDocType: z.string().max(30).nullable().optional(),
        isMandatory: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
        responsibleRoles: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      const [row] = await db
        .update(idoStageDocumentUiMap)
        .set({ ...updates, updatedBy: ctx.user?.id ?? null, updatedAt: new Date().toISOString() })
        .where(eq(idoStageDocumentUiMap.id, id))
        .returning();
      log.info({ id }, "Mapping updated");
      return row;
    }),

  /** Soft-delete a mapping entry (admin) */
  mappingDelete: managePerm
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(idoStageDocumentUiMap)
        .set({ isActive: false })
        .where(eq(idoStageDocumentUiMap.id, input.id));
      log.info({ id: input.id }, "Mapping soft-deleted");
      return { success: true };
    }),

  /** Seed default ~47 mapping rows (admin, idempotent) */
  mappingSeed: managePerm.mutation(async () => {
    const count = await seedMappingTable();
    return { seeded: count };
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // Storage Group — Smart storage recommendations
  // ═══════════════════════════════════════════════════════════════════════════

  /** Get storage recommendation for a file */
  storageRecommend: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(500),
        fileExtension: z.string().max(20).optional(),
        mimeType: z.string().max(200).optional(),
        projectId: z.number().int().optional(),
        stageCode: z.string().max(10).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return recommendStorage({
        ...input,
        userId: ctx.user?.id ?? 0,
      });
    }),

  /** User accepts a recommendation */
  storageAccept: protectedProcedure
    .input(z.object({ recommendationId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(idoStorageRecommendations)
        .set({ userAction: "accepted" })
        .where(eq(idoStorageRecommendations.id, input.recommendationId));
      return { success: true };
    }),

  /** User rejects a recommendation */
  storageReject: protectedProcedure
    .input(
      z.object({
        recommendationId: z.number().int(),
        actualPath: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(idoStorageRecommendations)
        .set({ userAction: "rejected", actualPath: input.actualPath ?? null })
        .where(eq(idoStorageRecommendations.id, input.recommendationId));
      return { success: true };
    }),

  /** Get recommendation history for current user */
  storageHistory: protectedProcedure
    .input(
      z
        .object({
          projectId: z.number().int().optional(),
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const conditions = [eq(idoStorageRecommendations.userId, ctx.user?.id ?? 0)];
      if (input?.projectId) conditions.push(eq(idoStorageRecommendations.projectId, input.projectId));

      return db
        .select()
        .from(idoStorageRecommendations)
        .where(and(...conditions))
        .orderBy(desc(idoStorageRecommendations.createdAt))
        .limit(input?.limit ?? 20);
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // Context Group — File-open context (related docs, actions, progress)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Get full context when opening a file */
  contextFileOpen: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(500),
        fileId: z.number().int().optional(),
        fileSource: z.string().max(30).optional(),
        projectId: z.number().int().optional(),
        stageCode: z.string().max(10).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return buildFileOpenContext(input);
    }),

  /** Get stage progress for a specific stage */
  contextStageProgress: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        stageCode: z.string().min(2).max(10),
      }),
    )
    .query(async ({ input }) => {
      const completion = await getProjectDocumentCompletion(input.projectId);
      return completion.find((c) => c.stageCode === input.stageCode) || null;
    }),

  /** Log that a user opened a file (analytics) */
  contextLogFileOpen: protectedProcedure
    .input(
      z.object({
        fileId: z.number().int().optional(),
        fileSource: z.string().max(30),
        projectId: z.number().int().optional(),
        stageCode: z.string().max(10).optional(),
        relatedDocCount: z.number().int().default(0),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await db.insert(idoFileContextLog).values({
        userId: ctx.user?.id ?? 0,
        fileId: input.fileId ?? null,
        fileSource: input.fileSource,
        projectId: input.projectId ?? null,
        stageCode: input.stageCode ?? null,
        relatedDocCount: input.relatedDocCount,
      });
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // Workflow Group — Project document completion tracking
  // ═══════════════════════════════════════════════════════════════════════════

  /** Get full M0-M12 document completion for a project */
  workflowProjectCompletion: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(async ({ input }) => {
      return getProjectDocumentCompletion(input.projectId);
    }),

  /** Get missing mandatory documents for a project's current + next stage */
  workflowMissingDocs: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(async ({ input }) => {
      const completion = await getProjectDocumentCompletion(input.projectId);
      const missing = completion
        .filter((c) => c.missingDocs.length > 0)
        .map((c) => ({
          stageCode: c.stageCode,
          stageName: c.stageName,
          missingMandatory: c.missingDocs.filter((d) => d.isMandatory),
          missingOptional: c.missingDocs.filter((d) => !d.isMandatory),
        }));
      return missing;
    }),

  /** Gate readiness: check if all mandatory docs are present for a stage */
  workflowGateReadiness: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        stageCode: z.string().min(2).max(10),
      }),
    )
    .query(async ({ input }) => {
      const completion = await getProjectDocumentCompletion(input.projectId);
      const stageData = completion.find((c) => c.stageCode === input.stageCode);
      if (!stageData) {
        return {
          ready: true,
          stageCode: input.stageCode,
          mandatoryCompletionPct: 100,
          missingMandatory: [],
          message: "No document requirements found for this stage",
        };
      }

      const missingMandatory = stageData.missingDocs.filter((d) => d.isMandatory);
      const ready = missingMandatory.length === 0;

      return {
        ready,
        stageCode: input.stageCode,
        mandatoryCompletionPct: stageData.mandatoryCompletionPct,
        missingMandatory,
        message: ready
          ? `${input.stageCode} 阶段所有必要文档已齐全，可以进入门控评审`
          : `${input.stageCode} 阶段还缺 ${missingMandatory.length} 份必要文档`,
      };
    }),

  /** Analytics: recommendation stats */
  analyticsOverview: protectedProcedure.query(async () => {
    const db = await requireDb();

    let totalRecs = 0;
    let acceptedRecs = 0;
    let rejectedRecs = 0;
    let totalOpens = 0;
    let engagedOpens = 0;

    try {
      const [recStats] = await db
        .select({ value: count() })
        .from(idoStorageRecommendations);
      totalRecs = Number(recStats?.value || 0);

      const [accepted] = await db
        .select({ value: count() })
        .from(idoStorageRecommendations)
        .where(eq(idoStorageRecommendations.userAction, "accepted"));
      acceptedRecs = Number(accepted?.value || 0);

      const [rejected] = await db
        .select({ value: count() })
        .from(idoStorageRecommendations)
        .where(eq(idoStorageRecommendations.userAction, "rejected"));
      rejectedRecs = Number(rejected?.value || 0);
    } catch {
      // tables may not exist
    }

    try {
      const [openStats] = await db
        .select({ value: count() })
        .from(idoFileContextLog);
      totalOpens = Number(openStats?.value || 0);

      const [engaged] = await db
        .select({ value: count() })
        .from(idoFileContextLog)
        .where(eq(idoFileContextLog.clickedRelatedDoc, true));
      engagedOpens = Number(engaged?.value || 0);
    } catch {
      // tables may not exist
    }

    return {
      recommendations: {
        total: totalRecs,
        accepted: acceptedRecs,
        rejected: rejectedRecs,
        pending: totalRecs - acceptedRecs - rejectedRecs,
        acceptanceRate: totalRecs > 0 ? Math.round((acceptedRecs / totalRecs) * 100) : 0,
      },
      fileOpens: {
        total: totalOpens,
        engaged: engagedOpens,
        engagementRate: totalOpens > 0 ? Math.round((engagedOpens / totalOpens) * 100) : 0,
      },
    };
  }),
});
