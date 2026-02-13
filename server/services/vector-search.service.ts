/**
 * Vector Search Service (Task #74)
 * Embedding-based search preparation for knowledge base.
 */

import { requireDb } from "../db";
import { eq, desc, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema";

const EMBEDDING_DIM = 384;

export function generateEmbedding(text: string): number[] {
  const embedding: number[] = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const seed = hash + i * 7919;
    embedding.push(Math.sin(seed) * 0.5);
  }
  return embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}

function chunkText(text: string, chunkSize: number = 500): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

export async function indexDocument(docId: number, content: string): Promise<{ chunks: number; indexed: boolean }> {
  const db = await requireDb();
  const chunks = chunkText(content);
  for (let i = 0; i < chunks.length; i++) {
    const embedding = generateEmbedding(chunks[i]);
    await db.insert(schema.documentEmbeddings).values({
      sourceTable: "documents", sourceId: docId,
      documentTitle: `Document #${docId}`,
      contentDigest: chunks[i],
      embedding: JSON.stringify(embedding),
      embeddingModel: "text-embedding-placeholder",
      embeddingDim: EMBEDDING_DIM,
    });
  }
  return { chunks: chunks.length, indexed: true };
}

export async function searchSimilar(query: string, topK: number = 5): Promise<Array<{ sourceId: number; contentDigest: string; similarity: number }>> {
  const db = await requireDb();
  const queryEmb = generateEmbedding(query);
  const allEmbeddings = await db.select().from(schema.documentEmbeddings);
  const scored = allEmbeddings.map((row) => {
    const emb: number[] = row.embedding ? JSON.parse(row.embedding) : [];
    return { sourceId: row.sourceId, contentDigest: row.contentDigest, similarity: cosineSimilarity(queryEmb, emb) };
  });
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

export async function reindexAll(): Promise<{ reindexed: number }> {
  const db = await requireDb();
  await db.delete(schema.documentEmbeddings);
  // In production, would iterate over all documents and re-index
  return { reindexed: 0 };
}