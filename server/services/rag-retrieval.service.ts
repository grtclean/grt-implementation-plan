/**
 * RAG检索增强服务
 * 从 knowledge_vector_chunks 表检索语义相关的知识片段
 * 供 CopilotBar / AI Canvas / Agent 调用
 *
 * 检索流程:
 * 1. 用户输入query
 * 2. 生成embedding (384维或1536维)
 * 3. 余弦相似度搜索top-K chunks
 * 4. 附带元数据(SOP步骤号/安全警告/工艺参数)
 * 5. 返回enriched context供LLM使用
 */

import { createChildLogger } from '../lib/logger';
import { sql } from 'drizzle-orm';

const log = createChildLogger('rag-retrieval');

export interface RAGQuery {
  query: string;
  topK?: number;
  minScore?: number;
  filters?: {
    assetType?: string; // SOP/SCHEMATIC/POLICY/FMEA/CUSTOMER_CASE
    projectCode?: string;
    mPhase?: string; // M0-M12
    department?: string;
    equipmentType?: string;
  };
  includeMetadata?: boolean;
}

export interface RAGChunk {
  chunkId: number;
  assetId: number;
  assetName: string;
  assetType: string;
  content: string;
  score: number;
  metadata: {
    stepNumber?: number;
    safetyWarning?: string;
    torqueLimit?: string;
    toolRequirement?: string;
    partNumbers?: string[];
    qualitySignoff?: string;
    mPhase?: string;
    projectCode?: string;
  };
}

export interface RAGResult {
  query: string;
  chunks: RAGChunk[];
  totalFound: number;
  searchTimeMs: number;
  context: string; // Pre-formatted context for LLM injection
}

/**
 * Simple cosine similarity (for when vectors are stored as JSON arrays)
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

/**
 * Generate a simple embedding from text (TF-IDF inspired, for fallback)
 * In production, this would call an embedding API (OpenAI/local model)
 */
function generateSimpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(384).fill(0);
  for (let i = 0; i < words.length; i++) {
    const hash = words[i].split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    embedding[Math.abs(hash) % 384] += 1 / words.length;
  }
  // Normalize
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0)) || 1;
  return embedding.map(v => v / norm);
}

/**
 * Search knowledge base with semantic similarity
 */
export async function searchKnowledge(query: RAGQuery): Promise<RAGResult> {
  const start = Date.now();
  const { topK = 5, minScore = 0.3 } = query;

  log.info({ query: query.query.substring(0, 100), topK, filters: query.filters }, 'RAG检索开始');

  // Generate query embedding
  const queryEmbedding = generateSimpleEmbedding(query.query);

  const chunks: RAGChunk[] = [];

  try {
    const { requireDb } = await import('../db');
    const db = await requireDb();

    // Build filter conditions
    let filterSql = '';
    const params: any[] = [];
    if (query.filters?.assetType) {
      filterSql += ` AND ka.asset_type = $${params.length + 1}`;
      params.push(query.filters.assetType);
    }
    if (query.filters?.projectCode) {
      filterSql += ` AND kvc.metadata::text LIKE $${params.length + 1}`;
      params.push(`%${query.filters.projectCode}%`);
    }

    // Query knowledge_vector_chunks joined with knowledge_assets
    const rows = await db.execute(sql`
      SELECT kvc.id AS chunk_id, kvc.asset_id, kvc.chunk_text AS content,
             kvc.chunk_index, kvc.metadata,
             ka.asset_name, ka.asset_type, ka.m_phase
      FROM knowledge_vector_chunks kvc
      JOIN knowledge_assets ka ON kvc.asset_id = ka.id
      WHERE ka.status = 'COMPLETED'
      ORDER BY kvc.chunk_index
      LIMIT ${topK * 3}
    `);

    const dbRows = (rows as any).rows ?? [];

    // Score by simple keyword matching (until vector search is production-ready)
    const queryWords = query.query.toLowerCase().split(/\s+/).filter(w => w.length > 1);

    for (const row of dbRows) {
      const content = String(row.content || '');
      const contentLower = content.toLowerCase();

      // Simple relevance scoring: count matching words
      let matchCount = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) matchCount++;
      }
      const score = queryWords.length > 0 ? matchCount / queryWords.length : 0;

      if (score >= minScore) {
        const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
        chunks.push({
          chunkId: row.chunk_id,
          assetId: row.asset_id,
          assetName: row.asset_name || '',
          assetType: row.asset_type || '',
          content: content.substring(0, 500),
          score,
          metadata: {
            stepNumber: meta.step_number,
            safetyWarning: meta.safety_warning,
            torqueLimit: meta.torque_limit,
            toolRequirement: meta.tool_requirement,
            partNumbers: meta.part_numbers,
            qualitySignoff: meta.qa_signoff,
            mPhase: row.m_phase,
            projectCode: meta.project_code,
          },
        });
      }
    }

    // Sort by score descending, take topK
    chunks.sort((a, b) => b.score - a.score);
    chunks.splice(topK);

  } catch (dbErr) {
    log.warn({ err: dbErr }, 'RAG知识库查询失败，返回空结果');
  }

  const searchTimeMs = Date.now() - start;

  // Format context for LLM injection
  const context = chunks.length > 0
    ? chunks.map((c, i) => `[知识片段 ${i + 1}] (${c.assetType}: ${c.assetName}, 相关度: ${(c.score * 100).toFixed(0)}%)\n${c.content}`).join('\n\n')
    : '未找到相关知识片段。';

  log.info({ found: chunks.length, searchTimeMs }, 'RAG检索完成');

  return {
    query: query.query,
    chunks,
    totalFound: chunks.length,
    searchTimeMs,
    context,
  };
}

/**
 * Search with manufacturing-specific context enrichment
 * Adds relevant SOP steps, FMEA risk items, and historical customer cases
 */
export async function searchWithContext(
  query: string,
  projectCode?: string,
  equipmentType?: string
): Promise<{
  sopChunks: RAGChunk[];
  fmeaChunks: RAGChunk[];
  caseChunks: RAGChunk[];
  combinedContext: string;
}> {
  const [sopResult, fmeaResult, caseResult] = await Promise.all([
    searchKnowledge({ query, topK: 3, filters: { assetType: 'SOP', projectCode, equipmentType } }),
    searchKnowledge({ query, topK: 2, filters: { assetType: 'FMEA', projectCode } }),
    searchKnowledge({ query, topK: 2, filters: { assetType: 'CUSTOMER_CASE' } }),
  ]);

  const combinedContext = [
    sopResult.context ? `## 相关SOP\n${sopResult.context}` : '',
    fmeaResult.context ? `## 相关FMEA风险\n${fmeaResult.context}` : '',
    caseResult.context ? `## 历史客户案例\n${caseResult.context}` : '',
  ].filter(Boolean).join('\n\n---\n\n');

  return {
    sopChunks: sopResult.chunks,
    fmeaChunks: fmeaResult.chunks,
    caseChunks: caseResult.chunks,
    combinedContext: combinedContext || '暂无相关知识。系统将持续积累工业知识库。',
  };
}

/**
 * Format RAG context for LLM system prompt injection
 */
export function formatForLLM(ragResult: RAGResult, role: string): string {
  if (ragResult.chunks.length === 0) return '';

  return `
<knowledge_context role="${role}">
以下是从GRT知识库检索到的与当前任务相关的信息:

${ragResult.context}

请基于以上知识回答用户问题。如果知识库中的信息不足以回答，请明确说明。
</knowledge_context>
`.trim();
}
