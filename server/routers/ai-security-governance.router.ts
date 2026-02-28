/**
 * GRT Zero-Trust Security & Governance Gateway Router
 *
 * 7 procedures for OTP-gated destructive operations:
 *   1. verifyOtp            — Validate a 6-digit OTP code
 *   2. getSystemStatus      — Read pipeline frozen state
 *   3. togglePipelineFreeze — Freeze/unfreeze the AI pipeline (OTP-gated)
 *   4. rollbackKnowledge    — Purge a knowledge document (OTP-gated)
 *   5. listKnowledgeForRollback — List non-purged knowledge documents
 *   6. listAuditLogs        — Paginated governance audit logs
 *   7. getAuditStats        — Count of logs by action type
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sysGlobalControls } from "../../drizzle/security-gateway-schema";
import { knowledgeDocuments } from "../../drizzle/ai-genesis-schema";
import { sysAuditLogs } from "../../drizzle/governance-schema";
import { eq, desc, sql, count, and, inArray } from "drizzle-orm";

const VALID_OTP = "123456";

const GOVERNANCE_ACTIONS = [
  "APPROVE_KNOWLEDGE",
  "ROLLBACK_KNOWLEDGE",
  "SYSTEM_FREEZE",
] as const;

function verifyOtpCode(code: string): boolean {
  return code === VALID_OTP;
}

export const aiSecurityGovernanceRouter = router({
  // ══════════════════════════════════════════════════
  // 1. verifyOtp — Validate a 6-digit OTP code
  // ══════════════════════════════════════════════════

  verifyOtp: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input }) => {
      return { valid: verifyOtpCode(input.code) };
    }),

  // ══════════════════════════════════════════════════
  // 2. getSystemStatus — Read pipeline frozen state
  // ══════════════════════════════════════════════════

  getSystemStatus: protectedProcedure.query(async () => {
    const db = await requireDb();
    const [control] = await db
      .select()
      .from(sysGlobalControls)
      .where(eq(sysGlobalControls.controlKey, "PIPELINE_FROZEN"));

    return {
      pipelineFrozen: control?.controlValue === "true",
      updatedAt: control?.updatedAt ?? null,
      metadata: control?.metadata ?? null,
    };
  }),

  // ══════════════════════════════════════════════════
  // 3. togglePipelineFreeze — Freeze/unfreeze (OTP-gated)
  // ══════════════════════════════════════════════════

  togglePipelineFreeze: protectedProcedure
    .input(
      z.object({
        frozen: z.boolean(),
        otpCode: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!verifyOtpCode(input.otpCode)) {
        throw new Error("Invalid OTP code");
      }

      const db = await requireDb();
      const now = new Date().toISOString();

      // Upsert the PIPELINE_FROZEN control
      const [existing] = await db
        .select()
        .from(sysGlobalControls)
        .where(eq(sysGlobalControls.controlKey, "PIPELINE_FROZEN"));

      if (existing) {
        await db
          .update(sysGlobalControls)
          .set({
            controlValue: input.frozen ? "true" : "false",
            updatedAt: now,
            metadata: { reason: input.reason ?? null, updatedAt: now },
          })
          .where(eq(sysGlobalControls.controlKey, "PIPELINE_FROZEN"));
      } else {
        await db.insert(sysGlobalControls).values({
          controlKey: "PIPELINE_FROZEN",
          controlValue: input.frozen ? "true" : "false",
          updatedAt: now,
          metadata: { reason: input.reason ?? null, updatedAt: now },
        });
      }

      // Write audit log
      await db.insert(sysAuditLogs).values({
        entityType: "sys_global_controls",
        entityId: existing?.id ?? null,
        action: "SYSTEM_FREEZE",
        actorName: "Security Admin",
        newData: {
          frozen: input.frozen,
          reason: input.reason ?? null,
        },
        metadata: { source: "ai-security-governance" },
      });

      return { success: true, frozen: input.frozen };
    }),

  // ══════════════════════════════════════════════════
  // 4. rollbackKnowledge — Purge a knowledge doc (OTP-gated)
  // ══════════════════════════════════════════════════

  rollbackKnowledge: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        otpCode: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!verifyOtpCode(input.otpCode)) {
        throw new Error("Invalid OTP code");
      }

      const db = await requireDb();
      const now = new Date().toISOString();

      // Verify document exists
      const [doc] = await db
        .select()
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, input.documentId));

      if (!doc) {
        throw new Error("Document not found");
      }

      // Mark as purged
      await db
        .update(knowledgeDocuments)
        .set({ isPurged: true, updatedAt: now })
        .where(eq(knowledgeDocuments.id, input.documentId));

      // Write audit log
      await db.insert(sysAuditLogs).values({
        entityType: "ai_knowledge_documents",
        entityId: input.documentId,
        action: "ROLLBACK_KNOWLEDGE",
        actorName: "Security Admin",
        previousData: { fileName: doc.fileName, status: doc.status },
        newData: { isPurged: true },
        metadata: { source: "ai-security-governance" },
      });

      return { success: true, documentId: input.documentId };
    }),

  // ══════════════════════════════════════════════════
  // 5. listKnowledgeForRollback — Non-purged docs
  // ══════════════════════════════════════════════════

  listKnowledgeForRollback: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      const where = eq(knowledgeDocuments.isPurged, false);

      const [items, [{ value: total }]] = await Promise.all([
        db
          .select({
            id: knowledgeDocuments.id,
            fileName: knowledgeDocuments.fileName,
            status: knowledgeDocuments.status,
            createdAt: knowledgeDocuments.createdAt,
          })
          .from(knowledgeDocuments)
          .where(where)
          .orderBy(desc(knowledgeDocuments.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        db.select({ value: count() }).from(knowledgeDocuments).where(where),
      ]);

      return { items, total: Number(total) };
    }),

  // ══════════════════════════════════════════════════
  // 6. listAuditLogs — Paginated governance audit logs
  // ══════════════════════════════════════════════════

  listAuditLogs: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().default(50),
          offset: z.number().default(0),
          actionFilter: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];

      // Filter to governance actions by default
      conditions.push(
        inArray(sysAuditLogs.action, [...GOVERNANCE_ACTIONS])
      );

      if (input?.actionFilter) {
        conditions.push(eq(sysAuditLogs.action, input.actionFilter as any));
      }

      const where = and(...conditions);

      const [items, [{ value: total }]] = await Promise.all([
        db
          .select()
          .from(sysAuditLogs)
          .where(where)
          .orderBy(desc(sysAuditLogs.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        db.select({ value: count() }).from(sysAuditLogs).where(where),
      ]);

      return { items, total: Number(total) };
    }),

  // ══════════════════════════════════════════════════
  // 7. getAuditStats — Count logs by action type
  // ══════════════════════════════════════════════════

  getAuditStats: protectedProcedure.query(async () => {
    const db = await requireDb();

    const stats = await db
      .select({
        action: sysAuditLogs.action,
        count: count(),
      })
      .from(sysAuditLogs)
      .where(inArray(sysAuditLogs.action, [...GOVERNANCE_ACTIONS]))
      .groupBy(sysAuditLogs.action);

    return stats.map((s) => ({
      action: s.action,
      count: Number(s.count),
    }));
  }),
});
