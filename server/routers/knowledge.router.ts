/**
 * Knowledge Ingestion Router — Multimodal Knowledge Feed-In Engine
 *
 * Async ingestion gateway for complex manufacturing assets:
 * - Technical schematics (P&ID)
 * - Detailed assembly SOPs (with torque limits and QA sign-offs)
 *
 * Zero Blocking: Vision parsing is async via ai_tasks polling
 */
import { z } from "zod";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { aiTasks } from "../../drizzle/schema";
import { knowledgeAssets, knowledgeVectorChunks } from "../../drizzle/knowledge-ingestion-schema";
import { eq, desc, sql, SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { triggerVisionIngestionWorker } from "../workers/knowledgeWorker";

const log = createChildLogger("knowledge");

// ─── ensureTables ────────────────────────────────────────────
let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    const db = await requireDb();
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_assets (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        asset_type VARCHAR(50) NOT NULL,
        m_phase VARCHAR(10),
        equipment_family VARCHAR(100),
        file_url TEXT,
        original_filename VARCHAR(300),
        mime_type VARCHAR(100),
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VISION_PARSE',
        ai_task_id INTEGER REFERENCES ai_tasks(id),
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ka_asset_type_idx ON knowledge_assets (asset_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ka_m_phase_idx ON knowledge_assets (m_phase)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ka_status_idx ON knowledge_assets (status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ka_ai_task_idx ON knowledge_assets (ai_task_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_vector_chunks (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER REFERENCES knowledge_assets(id) ON DELETE CASCADE NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_content TEXT NOT NULL,
        embedding TEXT,
        embedding_model VARCHAR(50),
        embedding_dim INTEGER,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS kvc_asset_idx ON knowledge_vector_chunks (asset_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS kvc_chunk_order_idx ON knowledge_vector_chunks (asset_id, chunk_index)`);

    tablesEnsured = true;
    log.info("[Knowledge] Tables ensured");
  } catch (err) {
    log.warn({ err }, "[Knowledge] ensureTables failed");
  }
}

// ─── Router ──────────────────────────────────────────────────
export const knowledgeRouter = router({
  /**
   * Fire and Forget: Start the upload and parsing process
   * Returns immediately with taskId for frontend polling
   */
  ingestMultimodalAsset: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      assetType: z.enum(['SOP', 'SCHEMATIC', 'POLICY']),
      mPhase: z.string().max(10).optional(),
      equipmentFamily: z.string().max(100).optional(),
      base64Image: z.string(), // The uploaded image/PDF as base64
      originalFilename: z.string().max(300).optional(),
      mimeType: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await ensureTables();
      const db = await requireDb();
      const userId = ctx.user?.name ?? "system";

      // 1. Create pending AI task
      const [newTask] = await db.insert(aiTasks).values({
        taskType: 'VISION_KNOWLEDGE_INGESTION',
        status: 'pending',
        inputData: {
          title: input.title,
          assetType: input.assetType,
          mPhase: input.mPhase,
        } as Record<string, unknown>,
        createdBy: userId,
      }).returning();

      // 2. Create asset record linked to task
      const [newAsset] = await db.insert(knowledgeAssets).values({
        title: input.title,
        assetType: input.assetType,
        mPhase: input.mPhase ?? null,
        equipmentFamily: input.equipmentFamily ?? null,
        originalFilename: input.originalFilename ?? null,
        mimeType: input.mimeType ?? null,
        status: 'PENDING_VISION_PARSE',
        aiTaskId: newTask.id,
        createdBy: userId,
      }).returning();

      log.info({ taskId: newTask.id, assetId: newAsset.id, title: input.title }, "[Knowledge] Asset ingestion started");

      // 3. TRIGGER WORKER ASYNCHRONOUSLY (Do not await!)
      // Fire-and-forget: Worker will update task/asset status
      triggerVisionIngestionWorker(newTask.id, newAsset.id, input.base64Image).catch(err => {
        log.error({ err, taskId: newTask.id }, "[Knowledge] Worker trigger failed");
      });

      return {
        success: true,
        taskId: newTask.id,
        assetId: newAsset.id,
        message: "Ingestion started. Poll getIngestionStatus for progress."
      };
    }),

  /**
   * Polling Endpoint for Frontend — Check task status
   * useQuery with refetchInterval for live updates
   */
  getIngestionStatus: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const [task] = await db.select().from(aiTasks)
        .where(eq(aiTasks.id, input.taskId))
        .limit(1);

      if (!task) {
        return { status: 'not_found', taskId: input.taskId };
      }

      return {
        taskId: task.id,
        status: task.status,
        resultData: task.resultData as { chunkCount?: number; parsedSections?: string[] } | null,
        errorMessage: task.errorMessage,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      };
    }),

  /**
   * Get asset details including parsed chunks
   */
  getAsset: protectedProcedure
    .input(z.object({ assetId: z.number() }))
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      const [asset] = await db.select().from(knowledgeAssets)
        .where(eq(knowledgeAssets.id, input.assetId))
        .limit(1);

      if (!asset) {
        throw new Error("Asset not found");
      }

      const chunks = await db.select().from(knowledgeVectorChunks)
        .where(eq(knowledgeVectorChunks.assetId, input.assetId))
        .orderBy(knowledgeVectorChunks.chunkIndex)
      .limit(1000);

      return {
        ...asset,
        chunks: chunks.map(c => ({
          id: c.id,
          chunkIndex: c.chunkIndex,
          content: c.chunkContent,
          metadata: c.metadata,
        })),
      };
    }),

  /**
   * List all knowledge assets with optional filters
   */
  listAssets: protectedProcedure
    .input(z.object({
      assetType: z.enum(['SOP', 'SCHEMATIC', 'POLICY']).optional(),
      mPhase: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      await ensureTables();
      const db = await requireDb();

      // Build dynamic SQL conditions
      const conditions: SQL[] = [];
      if (input?.assetType) conditions.push(sql`asset_type = ${input.assetType}`);
      if (input?.mPhase) conditions.push(sql`m_phase = ${input.mPhase}`);
      if (input?.status) conditions.push(sql`status = ${input.status}`);

      const whereClause = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      const result = await db.execute(sql`
        SELECT id, title, asset_type, m_phase, equipment_family, status,
               original_filename, created_by, created_at, updated_at
        FROM knowledge_assets
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${input?.limit ?? 20}
      `);

      return result.rows;
    }),
});
