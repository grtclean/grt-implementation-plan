/**
 * File Upload Router — Chunked Upload Lifecycle Management
 *
 * 5 procedures: initiateUpload, getUploadStatus, completeUpload, cancelUpload, listUploads
 *
 * NOTE: Actual chunk receiving happens via Express raw endpoint (not tRPC)
 * because tRPC is not suited for raw binary streaming. This router manages
 * the lifecycle metadata only — initiation, status tracking, completion,
 * cancellation, and listing.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import { requireDb } from "../db";
import {
  fileUploadSessions,
  fileUploadChunks,
} from "../../drizzle/file-upload-schema";
import { eq, desc, and, count, type SQL } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";
import { randomUUID } from "crypto";

const log = createChildLogger("file-upload-router");

const uploadPermission = requirePermission("platform:file:upload");

export const fileUploadRouter = router({
  // ── Initiate a new chunked upload session ─────────────────────────────
  initiateUpload: uploadPermission
    .input(
      z.object({
        fileName: z.string().min(1).max(500),
        fileSizeBytes: z.number().int().positive(),
        chunkSizeBytes: z.number().int().min(1048576).max(52428800).default(5242880), // 1MB–50MB, default 5MB
        mimeType: z.string().max(200).default("application/octet-stream"),
        targetPath: z.string().max(1000).default(""),
        sharepointSiteCode: z.string().max(20).optional(),
        projectId: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      try {
        const sessionId = randomUUID();
        const totalChunks = Math.ceil(input.fileSizeBytes / input.chunkSizeBytes);
        const userName = ctx.user!.name || ctx.user!.openId || String(ctx.user!.id);

        const [session] = await db
          .insert(fileUploadSessions)
          .values({
            sessionId,
            fileName: input.fileName,
            fileSizeBytes: input.fileSizeBytes,
            chunkSizeBytes: input.chunkSizeBytes,
            totalChunks,
            completedChunks: 0,
            status: "uploading",
            mimeType: input.mimeType,
            uploadedBy: userName,
            targetPath: input.targetPath,
            sharepointSiteCode: input.sharepointSiteCode,
            projectId: input.projectId,
          })
          .returning();

        log.info({ sessionId, fileName: input.fileName, totalChunks }, "Upload session initiated");
        return session;
      } catch (err) {
        log.error({ err, fileName: input.fileName }, "Failed to initiate upload session");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to initiate upload" });
      }
    }),

  // ── Get upload status + chunk completion details ──────────────────────
  getUploadStatus: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [session] = await db
        .select()
        .from(fileUploadSessions)
        .where(eq(fileUploadSessions.sessionId, input.sessionId))
        .limit(1);

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Upload session not found" });
      }

      const chunks = await db
        .select()
        .from(fileUploadChunks)
        .where(eq(fileUploadChunks.sessionId, input.sessionId))
        .orderBy(fileUploadChunks.chunkIndex)
        .limit(1000);

      const completedIndices = chunks.map((c) => c.chunkIndex);
      const progressPct =
        session.totalChunks > 0
          ? Math.round((completedIndices.length / session.totalChunks) * 100)
          : 0;

      return {
        ...session,
        completedIndices,
        progressPct,
        remainingChunks: session.totalChunks - completedIndices.length,
      };
    }),

  // ── Mark upload as completed (after all chunks received) ──────────────
  completeUpload: uploadPermission
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      try {
        const [session] = await db
          .select()
          .from(fileUploadSessions)
          .where(eq(fileUploadSessions.sessionId, input.sessionId))
          .limit(1);

        if (!session) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Upload session not found" });
        }
        if (session.status === "completed") {
          return session;
        }
        if (session.status === "cancelled") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot complete a cancelled upload" });
        }

        // Verify all chunks are present
        const [{ value: chunkCount }] = await db
          .select({ value: count() })
          .from(fileUploadChunks)
          .where(eq(fileUploadChunks.sessionId, input.sessionId));

        if (Number(chunkCount) < session.totalChunks) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Missing chunks: ${Number(chunkCount)}/${session.totalChunks} received`,
          });
        }

        const [updated] = await db
          .update(fileUploadSessions)
          .set({
            status: "completed",
            completedChunks: session.totalChunks,
            completedAt: new Date().toISOString(),
          })
          .where(eq(fileUploadSessions.sessionId, input.sessionId))
          .returning();

        log.info({ sessionId: input.sessionId }, "Upload completed");
        return updated;
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        log.error({ err, sessionId: input.sessionId }, "Failed to complete upload");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to complete upload" });
      }
    }),

  // ── Cancel an in-progress upload ──────────────────────────────────────
  cancelUpload: uploadPermission
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      try {
        const [session] = await db
          .select()
          .from(fileUploadSessions)
          .where(eq(fileUploadSessions.sessionId, input.sessionId))
          .limit(1);

        if (!session) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Upload session not found" });
        }
        if (session.status === "completed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel a completed upload" });
        }

        const [updated] = await db
          .update(fileUploadSessions)
          .set({ status: "cancelled" })
          .where(eq(fileUploadSessions.sessionId, input.sessionId))
          .returning();

        log.info({ sessionId: input.sessionId }, "Upload cancelled");
        return updated;
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        log.error({ err, sessionId: input.sessionId }, "Failed to cancel upload");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to cancel upload" });
      }
    }),

  // ── List upload sessions for current user ─────────────────────────────
  listUploads: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["uploading", "assembling", "completed", "failed", "cancelled"]).optional(),
          projectId: z.number().int().optional(),
          limit: z.number().int().min(1).max(500).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const userName = ctx.user!.name || ctx.user!.openId || String(ctx.user!.id);
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const conditions: SQL[] = [eq(fileUploadSessions.uploadedBy, userName)];
      if (input?.status) {
        conditions.push(eq(fileUploadSessions.status, input.status));
      }
      if (input?.projectId) {
        conditions.push(eq(fileUploadSessions.projectId, input.projectId));
      }

      const whereClause = and(...conditions);

      const [{ value: total }] = await db
        .select({ value: count() })
        .from(fileUploadSessions)
        .where(whereClause);

      const items = await db
        .select()
        .from(fileUploadSessions)
        .where(whereClause)
        .orderBy(desc(fileUploadSessions.createdAt))
        .limit(limit)
        .offset(offset);

      return { items, total: Number(total) };
    }),
});
