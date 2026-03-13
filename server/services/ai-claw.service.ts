/**
 * AI Open Claw — Service Layer
 *
 * 5 core functions for external tool execution:
 * 1. resolveTool         — Look up registered tool by code
 * 2. checkRoleToolAccess — Verify role has access to a tool
 * 3. logClawAudit        — Write audit trail entry
 * 4. createClawTask      — Enqueue an aiTask for the worker
 * 5. sanitizeExternalResponse + storeExternalResult — Quarantine external data
 */

import { requireDb } from "../db";
import { aiToolsRegistry, roleToolMappings } from "../../drizzle/ai-claw-schema";
import { aiTasks } from "../../drizzle/schema";
import { sysAuditLogs } from "../../drizzle/governance-schema";
import { knowledgeDocuments } from "../../drizzle/ai-genesis-schema";
import { eq, and } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ai-claw-service");

// ── 1. Resolve tool by code ────────────────────────────────────

export async function resolveTool(toolCode: string) {
  const db = await requireDb();
  const [tool] = await db
    .select()
    .from(aiToolsRegistry)
    .where(and(eq(aiToolsRegistry.toolCode, toolCode), eq(aiToolsRegistry.isActive, true)))
    .limit(1);
  return tool ?? null;
}

// ── 2. Check role-tool access ──────────────────────────────────

export async function checkRoleToolAccess(
  roleCode: string,
  toolId: number
): Promise<{ canExecute: boolean; canApprove: boolean }> {
  const db = await requireDb();
  const [mapping] = await db
    .select({
      canExecute: roleToolMappings.canExecute,
      canApprove: roleToolMappings.canApprove,
    })
    .from(roleToolMappings)
    .where(and(eq(roleToolMappings.roleCode, roleCode), eq(roleToolMappings.toolId, toolId)))
    .limit(1);
  return mapping ?? { canExecute: false, canApprove: false };
}

// ── 3. Audit logging (fire-and-forget) ─────────────────────────

interface ClawAuditEntry {
  userId: number;
  userName: string;
  toolCode: string;
  action: "CREATE" | "VIEW" | "APPROVE" | "REJECT";
  taskId?: number;
  metadata?: Record<string, unknown>;
}

export function logClawAudit(entry: ClawAuditEntry): void {
  // Fire-and-forget — do not await
  (async () => {
    try {
      const db = await requireDb();
      await db.insert(sysAuditLogs).values({
        entityType: "ai_claw_execution",
        entityId: entry.taskId ?? null,
        action: entry.action,
        actorId: entry.userId,
        actorName: entry.userName,
        metadata: {
          source: "AI_CLAW",
          toolCode: entry.toolCode,
          ...entry.metadata,
        },
      });
    } catch (err) {
      log.warn({ err, entry }, "Failed to write claw audit log");
    }
  })();
}

// ── 4. Create aiTask for worker ────────────────────────────────

interface CreateClawTaskParams {
  toolCode: string;
  toolId: number;
  inputParams: Record<string, unknown>;
  createdBy: number;
  requiresApproval: boolean;
}

export async function createClawTask(params: CreateClawTaskParams): Promise<number> {
  const db = await requireDb();
  const status = params.requiresApproval ? "pending_approval" : "pending";
  const [row] = await db
    .insert(aiTasks)
    .values({
      taskType: "CLAW_EXTERNAL_TOOL",
      status,
      inputData: {
        toolCode: params.toolCode,
        toolId: params.toolId,
        params: params.inputParams,
      },
      createdBy: String(params.createdBy),
      maxRetries: 3,
    })
    .returning({ id: aiTasks.id });
  return row.id;
}

// ── 5. Sanitize + store external data ──────────────────────────

const MAX_RESPONSE_BYTES = 100 * 1024; // 100 KB

/**
 * Strips dangerous keys (__proto__, constructor, prototype) and script tags.
 * Caps total stringified size to 100 KB.
 */
export function sanitizeExternalResponse(raw: unknown): Record<string, unknown> {
  const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

  function clean(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "string") {
      return obj.replace(/<script[\s\S]*?<\/script>/gi, "");
    }
    if (Array.isArray(obj)) {
      return obj.map(clean);
    }
    if (typeof obj === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        if (!DANGEROUS_KEYS.has(key)) {
          result[key] = clean(val);
        }
      }
      return result;
    }
    return obj;
  }

  const cleaned = clean(raw) as Record<string, unknown>;

  // Enforce size cap
  let serialized = JSON.stringify(cleaned);
  if (serialized.length > MAX_RESPONSE_BYTES) {
    serialized = serialized.slice(0, MAX_RESPONSE_BYTES);
    try {
      return JSON.parse(serialized + '"}');
    } catch {
      return { truncated: true, partial: serialized.slice(0, 1000) };
    }
  }

  return cleaned;
}

export async function storeExternalResult(params: {
  toolCode: string;
  responseData: Record<string, unknown>;
  userId: number;
  taskId: number;
}): Promise<number> {
  const db = await requireDb();
  const [row] = await db
    .insert(knowledgeDocuments)
    .values({
      fileName: `claw_${params.toolCode}_${params.taskId}.json`,
      fileType: "OTHER",
      status: "ANALYZED",
      extractedText: JSON.stringify(params.responseData),
      tags: ["source:EXTERNAL", "trust_level:CROWDSOURCED", `tool:${params.toolCode}`],
      uploadedBy: params.userId,
      metadata: {
        source: "EXTERNAL",
        trust_level: "CROWDSOURCED",
        clawTaskId: params.taskId,
        toolCode: params.toolCode,
        fetchedAt: new Date().toISOString(),
      },
    })
    .returning({ id: knowledgeDocuments.id });
  return row.id;
}
