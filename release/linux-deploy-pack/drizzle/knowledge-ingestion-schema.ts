/**
 * Knowledge Ingestion Schema — Multimodal Knowledge Feed-In Engine
 *
 * Supports complex manufacturing assets:
 * - Technical schematics (P&ID)
 * - Detailed assembly SOPs (with torque limits and QA sign-offs)
 *
 * Semantic chunking by m_phase (e.g., M6, M9) and equipment_family
 */
import { pgTable, serial, varchar, text, timestamp, integer, json, index } from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { aiTasks } from './schema';

// ══════════════════════════════════════════════════════════════
// Knowledge Assets — Core asset metadata
// ══════════════════════════════════════════════════════════════

export const knowledgeAssets = pgTable('knowledge_assets', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  assetType: varchar('asset_type', { length: 50 }).notNull(), // 'SOP', 'SCHEMATIC', 'POLICY'
  mPhase: varchar('m_phase', { length: 10 }), // 'M6', 'M7', 'M9' etc.
  equipmentFamily: varchar('equipment_family', { length: 100 }), // Equipment categorization
  fileUrl: text('file_url'), // Link to S3 or local storage
  originalFilename: varchar('original_filename', { length: 300 }),
  mimeType: varchar('mime_type', { length: 100 }),
  status: varchar('status', { length: 30 }).default('PENDING_VISION_PARSE').notNull(),
  // 'PENDING_VISION_PARSE' | 'PARSING' | 'COMPLETED' | 'FAILED'
  aiTaskId: integer('ai_task_id').references(() => aiTasks.id),
  createdBy: varchar('created_by', { length: 50 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('ka_asset_type_idx').on(table.assetType),
  index('ka_m_phase_idx').on(table.mPhase),
  index('ka_status_idx').on(table.status),
  index('ka_equipment_family_idx').on(table.equipmentFamily),
  index('ka_ai_task_idx').on(table.aiTaskId),
]);

export type KnowledgeAsset = InferSelectModel<typeof knowledgeAssets>;
export type InsertKnowledgeAsset = InferInsertModel<typeof knowledgeAssets>;

// ══════════════════════════════════════════════════════════════
// Knowledge Vector Chunks — Semantic chunks with spatial/contextual metadata
// ══════════════════════════════════════════════════════════════

/**
 * Chunk metadata structure for manufacturing SOPs:
 * {
 *   "step": 3,
 *   "isSafetyWarning": true,
 *   "torqueLimit": "50Nm",
 *   "qaSignoff": true,
 *   "toolRequired": "Torque Wrench",
 *   "visualReference": "Fig 3.2",
 *   "mPhase": "M6"
 * }
 */
export const knowledgeVectorChunks = pgTable('knowledge_vector_chunks', {
  id: serial('id').primaryKey(),
  assetId: integer('asset_id').references(() => knowledgeAssets.id, { onDelete: 'cascade' }).notNull(),
  chunkIndex: integer('chunk_index').notNull(), // Order within document
  chunkContent: text('chunk_content').notNull(),
  // 向量嵌入 (JSON数组 float[]) - compatible with all PostgreSQL deployments (no pgvector required)
  embedding: text('embedding'), // JSON: number[] (1536 dims for OpenAI)
  embeddingModel: varchar('embedding_model', { length: 50 }), // 'text-embedding-3-small'
  embeddingDim: integer('embedding_dim'), // 1536
  // Contextual metadata extracted from vision parsing
  metadata: json('metadata').$type<{
    step?: number;
    isSafetyWarning?: boolean;
    torqueLimit?: string;
    qaSignoff?: boolean;
    toolRequired?: string;
    visualReference?: string;
    mPhase?: string;
    equipmentFamily?: string;
    partNumber?: string;
    procedureType?: string;
  }>(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('kvc_asset_idx').on(table.assetId),
  index('kvc_chunk_order_idx').on(table.assetId, table.chunkIndex),
]);

export type KnowledgeVectorChunk = InferSelectModel<typeof knowledgeVectorChunks>;
export type InsertKnowledgeVectorChunk = InferInsertModel<typeof knowledgeVectorChunks>;
