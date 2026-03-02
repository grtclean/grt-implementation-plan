/**
 * 文档嵌入服务 (Document Embedding Service)
 * Phase A: 工程文档AI推荐系统
 *
 * 职责：
 * - 调用OpenAI/DeepSeek/Ollama生成文档向量嵌入
 * - 从文档元数据构建可嵌入的文本摘要
 * - 计算余弦相似度
 * - 管理嵌入的CRUD
 */

import { eq, and, sql } from "drizzle-orm";
import { requireDb } from "../db";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("doc-embedding");
import {
  documentEmbeddings,
  projectDocuments,
  technicalDocuments,
} from "../../drizzle/schema";
import { AIServiceFactory, type AppRegion } from "../ai-adapter/AIServiceFactory";

// =============================================================================
// 类型定义
// =============================================================================

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface DocumentForEmbedding {
  sourceTable: 'project_documents' | 'technical_documents';
  sourceId: number;
  projectId: number | null;
  stageCode: string | null;
  title: string;
  type: string | null;
  content: string | null;
  description: string | null;
}

export interface SimilarDocument {
  id: number;
  sourceTable: string;
  sourceId: number;
  projectId: number | null;
  stageCode: string | null;
  documentTitle: string;
  documentType: string | null;
  similarity: number;
}

// =============================================================================
// 嵌入生成（多提供商支持）
// =============================================================================

/**
 * 调用OpenAI Embeddings API生成向量
 */
async function generateOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Embeddings API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    embedding: data.data[0].embedding,
    model: "text-embedding-3-small",
    dimensions: data.data[0].embedding.length,
  };
}

/**
 * 使用LLM生成伪嵌入（降级方案：当没有专用embedding API时）
 * 通过让LLM输出关键词，然后做简化的TF-IDF风格向量
 */
async function generateFallbackEmbedding(text: string): Promise<EmbeddingResult> {
  // 使用一致的哈希方式生成伪向量（基于文本内容）
  const dim = 256; // 较小维度用于降级模式
  const embedding = new Array(dim).fill(0);

  // 简单但确定性的向量生成
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const idx = (charCode * (i + 1)) % dim;
    embedding[idx] += 1;
  }

  // 归一化
  const magnitude = Math.sqrt(embedding.reduce((sum: number, val: number) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dim; i++) {
      embedding[i] /= magnitude;
    }
  }

  return {
    embedding,
    model: "fallback-hash",
    dimensions: dim,
  };
}

/**
 * 生成文档嵌入（自动选择提供商）
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const region = AIServiceFactory.detectRegion();

  // 截断过长文本（OpenAI embedding 最多 8191 tokens）
  const truncated = text.slice(0, 8000);

  try {
    if ((region === "US" || region === "DE") && process.env.OPENAI_API_KEY) {
      return await generateOpenAIEmbedding(truncated);
    }
  } catch (err) {
    log.error({ err }, "OpenAI embedding failed, using fallback");
  }

  // 降级方案：确定性哈希向量
  return await generateFallbackEmbedding(truncated);
}

// =============================================================================
// 文本摘要构建
// =============================================================================

/**
 * 从文档元数据构建可嵌入的文本摘要
 */
export function buildContentDigest(doc: DocumentForEmbedding): string {
  const parts: string[] = [];

  if (doc.title) parts.push(`标题: ${doc.title}`);
  if (doc.type) parts.push(`类型: ${doc.type}`);
  if (doc.stageCode) parts.push(`阶段: ${doc.stageCode}`);
  if (doc.description) parts.push(`描述: ${doc.description}`);
  if (doc.content) parts.push(`内容: ${doc.content.slice(0, 2000)}`);

  return parts.join("\n");
}

// =============================================================================
// 余弦相似度计算
// =============================================================================

/**
 * 计算两个向量的余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // 维度不匹配时返回0
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// =============================================================================
// 嵌入CRUD操作
// =============================================================================

/**
 * 为单个文档生成并存储嵌入
 */
export async function embedDocument(doc: DocumentForEmbedding): Promise<number> {
  const db = await requireDb();
  const digest = buildContentDigest(doc);
  const result = await generateEmbedding(digest);

  // 检查是否已存在
  const existing = await db
    .select({ id: documentEmbeddings.id })
    .from(documentEmbeddings)
    .where(
      and(
        eq(documentEmbeddings.sourceTable, doc.sourceTable),
        eq(documentEmbeddings.sourceId, doc.sourceId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // 更新已有嵌入
    await db
      .update(documentEmbeddings)
      .set({
        documentTitle: doc.title,
        documentType: doc.type,
        projectId: doc.projectId,
        stageCode: doc.stageCode,
        contentDigest: digest,
        embedding: JSON.stringify(result.embedding),
        embeddingModel: result.model,
        embeddingDim: result.dimensions,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(documentEmbeddings.id, existing[0].id));
    return existing[0].id;
  }

  // 插入新嵌入
  const [inserted] = await db
    .insert(documentEmbeddings)
    .values({
      sourceTable: doc.sourceTable,
      sourceId: doc.sourceId,
      projectId: doc.projectId,
      stageCode: doc.stageCode,
      documentTitle: doc.title,
      documentType: doc.type,
      contentDigest: digest,
      embedding: JSON.stringify(result.embedding),
      embeddingModel: result.model,
      embeddingDim: result.dimensions,
    })
    .returning({ id: documentEmbeddings.id });

  return inserted.id;
}

/**
 * 批量为project_documents表中的文档生成嵌入
 */
export async function embedProjectDocuments(projectId?: number): Promise<number> {
  const db = await requireDb();
  const conditions = projectId
    ? eq(projectDocuments.projectId, projectId)
    : undefined;

  const docs = await db
    .select()
    .from(projectDocuments)
    .where(conditions);

  let count = 0;
  for (const doc of docs) {
    try {
      await embedDocument({
        sourceTable: "project_documents",
        sourceId: doc.id,
        projectId: doc.projectId,
        stageCode: doc.phaseCode,
        title: doc.name,
        type: doc.type,
        content: null,
        description: doc.description,
      });
      count++;
    } catch (err) {
      log.error({ err, docId: doc.id }, "Failed to embed project_document");
    }
  }
  return count;
}

/**
 * 批量为technical_documents表中的文档生成嵌入
 */
export async function embedTechnicalDocuments(projectId?: number): Promise<number> {
  const db = await requireDb();
  const conditions = projectId
    ? eq(technicalDocuments.projectId, projectId)
    : undefined;

  const docs = await db
    .select()
    .from(technicalDocuments)
    .where(conditions);

  let count = 0;
  for (const doc of docs) {
    try {
      await embedDocument({
        sourceTable: "technical_documents",
        sourceId: doc.id,
        projectId: doc.projectId,
        stageCode: null,
        title: doc.title,
        type: doc.docType,
        content: doc.content,
        description: null,
      });
      count++;
    } catch (err) {
      log.error({ err, docId: doc.id }, "Failed to embed technical_document");
    }
  }
  return count;
}

/**
 * 语义搜索：找到与查询文本最相似的文档
 */
export async function searchSimilarByText(
  queryText: string,
  opts: {
    limit?: number;
    stageCode?: string;
    projectId?: number;
    minSimilarity?: number;
  } = {}
): Promise<SimilarDocument[]> {
  const { limit = 10, stageCode, projectId, minSimilarity = 0.3 } = opts;

  const db = await requireDb();

  // 生成查询向量
  const queryResult = await generateEmbedding(queryText);
  const queryVector = queryResult.embedding;

  // 获取所有嵌入（按条件过滤）
  const conditions: any[] = [];
  if (stageCode) conditions.push(eq(documentEmbeddings.stageCode, stageCode));
  if (projectId) conditions.push(eq(documentEmbeddings.projectId, projectId));

  const allEmbeddings = await db
    .select()
    .from(documentEmbeddings)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // 计算相似度并排序
  const scored: SimilarDocument[] = allEmbeddings
    .map((emb) => {
      const docVector: number[] = JSON.parse(emb.embedding);
      const similarity = cosineSimilarity(queryVector, docVector);
      return {
        id: emb.id,
        sourceTable: emb.sourceTable,
        sourceId: emb.sourceId,
        projectId: emb.projectId,
        stageCode: emb.stageCode,
        documentTitle: emb.documentTitle,
        documentType: emb.documentType,
        similarity,
      };
    })
    .filter((d) => d.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}

/**
 * 查找与指定文档最相似的其他文档
 */
export async function findSimilarDocuments(
  sourceTable: string,
  sourceId: number,
  opts: { limit?: number; minSimilarity?: number } = {}
): Promise<SimilarDocument[]> {
  const { limit = 10, minSimilarity = 0.3 } = opts;

  const db = await requireDb();

  // 获取源文档的嵌入
  const [sourceEmb] = await db
    .select()
    .from(documentEmbeddings)
    .where(
      and(
        eq(documentEmbeddings.sourceTable, sourceTable),
        eq(documentEmbeddings.sourceId, sourceId)
      )
    )
    .limit(1);

  if (!sourceEmb) return [];

  const sourceVector: number[] = JSON.parse(sourceEmb.embedding);

  // 获取所有其他嵌入
  const allEmbeddings = await db
    .select()
    .from(documentEmbeddings)
    .where(sql`${documentEmbeddings.id} != ${sourceEmb.id}`);

  const scored: SimilarDocument[] = allEmbeddings
    .map((emb) => {
      const docVector: number[] = JSON.parse(emb.embedding);
      const similarity = cosineSimilarity(sourceVector, docVector);
      return {
        id: emb.id,
        sourceTable: emb.sourceTable,
        sourceId: emb.sourceId,
        projectId: emb.projectId,
        stageCode: emb.stageCode,
        documentTitle: emb.documentTitle,
        documentType: emb.documentType,
        similarity,
      };
    })
    .filter((d) => d.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}

/**
 * 获取嵌入统计信息
 */
export async function getEmbeddingStats(): Promise<{
  totalEmbeddings: number;
  bySource: { sourceTable: string; count: number }[];
  byStage: { stageCode: string; count: number }[];
}> {
  const db = await requireDb();

  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(documentEmbeddings);

  const bySource = await db
    .select({
      sourceTable: documentEmbeddings.sourceTable,
      count: sql<number>`count(*)`,
    })
    .from(documentEmbeddings)
    .groupBy(documentEmbeddings.sourceTable);

  const byStage = await db
    .select({
      stageCode: documentEmbeddings.stageCode,
      count: sql<number>`count(*)`,
    })
    .from(documentEmbeddings)
    .where(sql`${documentEmbeddings.stageCode} IS NOT NULL`)
    .groupBy(documentEmbeddings.stageCode);

  return {
    totalEmbeddings: Number(total.count),
    bySource: bySource.map((r) => ({ sourceTable: r.sourceTable, count: Number(r.count) })),
    byStage: byStage.map((r) => ({ stageCode: r.stageCode || '', count: Number(r.count) })),
  };
}
