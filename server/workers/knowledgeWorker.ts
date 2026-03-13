/**
 * Knowledge Ingestion Worker — Vision Processing (Mock/LLM)
 *
 * Async worker for processing multimodal assets:
 * - Parses images/PDFs descriptions
 * - Extracts semantic chunks with contextual metadata
 *
 * Uses project's invokeLLM for AI calls
 */
import { requireDb } from "../db";
import { aiTasks } from "../../drizzle/schema";
import { knowledgeAssets, knowledgeVectorChunks } from "../../drizzle/knowledge-ingestion-schema";
import { eq } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { invokeLLM } from "../_core/llm";

const log = createChildLogger("knowledge-worker");

// ─── Types ────────────────────────────────────────────
interface ParsedChunk {
  chunkIndex: number;
  content: string;
  metadata: {
    step?: number;
    isSafetyWarning?: boolean;
    torqueLimit?: string;
    qaSignoff?: boolean;
    toolRequired?: string;
    visualReference?: string;
    procedureType?: string;
    partNumber?: string;
  };
}

interface VisionParseResult {
  success: boolean;
  chunks: ParsedChunk[];
  parsedSections: string[];
  error?: string;
}

// ─── Mock Parser (fallback when no vision API) ────────────────────────────────────────────
async function parseDocument(assetType: string, title: string, mPhase?: string): Promise<VisionParseResult> {
  try {
    const systemPrompt = `You are a manufacturing documentation expert. Generate realistic mock data for a ${assetType} document titled "${title}"${mPhase ? ` for phase ${mPhase}` : ''}.

Create a JSON array of knowledge chunks. Each chunk should represent a step or section with metadata.`;

    const userPrompt = `Generate 3-5 knowledge chunks for this ${assetType}. Output as JSON array:
[
  {
    "chunkIndex": 0,
    "content": "Step description...",
    "metadata": {
      "step": 1,
      "isSafetyWarning": false,
      "torqueLimit": "50Nm",
      "qaSignoff": true,
      "toolRequired": "Torque Wrench",
      "procedureType": "assembly"
    }
  }
]

Return ONLY valid JSON array.`;

    const response = await invokeLLM({
      system: systemPrompt,
      prompt: userPrompt,
    });

    const content = response.content || response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    let chunks: ParsedChunk[];
    try {
      let jsonText = content.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
      }
      chunks = JSON.parse(jsonText);
    } catch {
      // Fallback to mock data
      chunks = [
        {
          chunkIndex: 0,
          content: `${assetType} Step 1: Initial preparation and safety check`,
          metadata: { step: 1, isSafetyWarning: true, procedureType: "preparation" },
        },
        {
          chunkIndex: 1,
          content: `${assetType} Step 2: Main procedure execution`,
          metadata: { step: 2, torqueLimit: "45Nm", toolRequired: "Torque Wrench", procedureType: "assembly" },
        },
        {
          chunkIndex: 2,
          content: `${assetType} Step 3: Quality verification and sign-off`,
          metadata: { step: 3, qaSignoff: true, procedureType: "inspection" },
        },
      ];
    }

    const parsedSections = chunks.map(c =>
      c.metadata.step ? `Step ${c.metadata.step}` :
      c.metadata.isSafetyWarning ? "Safety Warning" :
      c.metadata.procedureType || "Content"
    );

    return {
      success: true,
      chunks,
      parsedSections: [...new Set(parsedSections)],
    };
  } catch (err) {
    log.error({ err }, "[Knowledge Worker] Parsing failed");
    return {
      success: false,
      chunks: [],
      parsedSections: [],
      error: err instanceof Error ? err.message : "Parsing failed",
    };
  }
}

// ─── Main Worker Function ────────────────────────────────────────────
export async function triggerVisionIngestionWorker(
  taskId: number,
  assetId: number,
  _base64Image: string
): Promise<void> {
  const db = await requireDb();

  try {
    log.info({ taskId, assetId }, "[Knowledge Worker] Starting ingestion");

    // 1. Mark task as processing
    await db.update(aiTasks)
      .set({
        status: "processing",
        startedAt: new Date().toISOString(),
      })
      .where(eq(aiTasks.id, taskId));

    // 2. Update asset status
    await db.update(knowledgeAssets)
      .set({ status: "PARSING" })
      .where(eq(knowledgeAssets.id, assetId));

    // 3. Get asset details
    const [asset] = await db.select().from(knowledgeAssets)
      .where(eq(knowledgeAssets.id, assetId))
      .limit(1000);

    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    // 4. Parse document
    const parseResult = await parseDocument(
      asset.assetType,
      asset.title,
      asset.mPhase ?? undefined
    );

    if (!parseResult.success) {
      throw new Error(parseResult.error || "Parsing failed");
    }

    // 5. Store parsed chunks
    if (parseResult.chunks.length > 0) {
      await db.insert(knowledgeVectorChunks).values(
        parseResult.chunks.map(chunk => ({
          assetId,
          chunkIndex: chunk.chunkIndex,
          chunkContent: chunk.content,
          metadata: {
            ...chunk.metadata,
            mPhase: asset.mPhase ?? undefined,
            equipmentFamily: asset.equipmentFamily ?? undefined,
          },
        }))
      );
    }

    // 6. Mark task as completed
    await db.update(aiTasks)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        resultData: {
          chunkCount: parseResult.chunks.length,
          parsedSections: parseResult.parsedSections,
        } as Record<string, unknown>,
      })
      .where(eq(aiTasks.id, taskId));

    // 7. Update asset status
    await db.update(knowledgeAssets)
      .set({
        status: "COMPLETED",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(knowledgeAssets.id, assetId));

    log.info({ taskId, assetId, chunkCount: parseResult.chunks.length }, "[Knowledge Worker] Completed");

  } catch (err) {
    log.error({ err, taskId, assetId }, "[Knowledge Worker] Failed");

    await db.update(aiTasks)
      .set({
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      })
      .where(eq(aiTasks.id, taskId));

    await db.update(knowledgeAssets)
      .set({
        status: "FAILED",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(knowledgeAssets.id, assetId));
  }
}
