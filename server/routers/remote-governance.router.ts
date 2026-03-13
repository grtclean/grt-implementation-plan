/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Remote Access Governance Router                            ║
 * ║  CEO mandate: Zero-Trust Remote Debugging Protocol          ║
 * ║  Time-bound VPN tokens + full audit trail                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { z } from "zod";
import { eq, desc, and, gt, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/trpc";
import { remoteAccessRequests, remoteAccessAuditLogs } from "../../drizzle/remote-governance-schema";
import { createChildLogger } from "../lib/logger";
import crypto from "crypto";

const log = createChildLogger("remote-governance");

// ── Token Generation ───────────────────────────────────────────

function generateVpnToken(): string {
  const seg1 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const seg2 = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `GRT-VPN-${seg1}-${seg2}`;
}

// ── Audit Helper ───────────────────────────────────────────────

async function writeAuditLog(
  db: any,
  requestId: number,
  action: string,
  performedBy: number,
  performerName: string,
  details?: string
) {
  await db.insert(remoteAccessAuditLogs).values({
    requestId,
    action,
    performedBy,
    performerName,
    details,
  });
}

// ── Sub-Routers ────────────────────────────────────────────────

/** Engineer-facing: request + view own requests */
const requestRouter = router({
  /** Submit a new remote access request */
  create: requirePermission("remote:access:request")
    .input(
      z.object({
        projectId: z.number().optional(),
        projectName: z.string().min(1).max(300),
        customerName: z.string().min(1).max(200),
        equipmentId: z.string().min(1).max(100),
        equipmentModel: z.string().max(200).optional(),
        targetIp: z.string().max(50).optional(),
        reasonForAccess: z.string().min(10).max(2000),
        urgency: z.enum(["NORMAL", "URGENT", "CRITICAL"]).default("NORMAL"),
        requestedDurationHours: z.number().int().min(1).max(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;
      const user = ctx.user!;
      const [row] = await db
        .insert(remoteAccessRequests)
        .values({
          ...input,
          engineerId: user.id,
          engineerName: user.name ?? `User#${user.id}`,
          status: "PENDING",
        })
        .returning();

      await writeAuditLog(db, row.id, "REQUEST_CREATED", user.id, user.name ?? "", `Duration: ${input.requestedDurationHours}h, Equipment: ${input.equipmentId}`);

      log.info({ requestId: row.id, engineer: user.name }, "Remote access request created");
      return row;
    }),

  /** List own requests */
  listMine: requirePermission("remote:access:request")
    .query(async ({ ctx }) => {
      const db = ctx.db;
      return db
        .select()
        .from(remoteAccessRequests)
        .where(eq(remoteAccessRequests.engineerId, ctx.user!.id))
        .orderBy(desc(remoteAccessRequests.createdAt))
        .limit(50);
    }),
});

/** Manager-facing: approve/reject/list pending */
const approvalRouter = router({
  /** List all pending requests */
  listPending: requirePermission("remote:access:approve")
    .query(async ({ ctx }) => {
      return ctx.db
        .select()
        .from(remoteAccessRequests)
        .where(eq(remoteAccessRequests.status, "PENDING"))
        .orderBy(desc(remoteAccessRequests.createdAt))
        .limit(100);
    }),

  /** Approve a request → generate VPN token + set expiry */
  approve: requirePermission("remote:access:approve")
    .input(z.object({ requestId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;
      const user = ctx.user!;

      // Fetch the request
      const [req] = await db
        .select()
        .from(remoteAccessRequests)
        .where(eq(remoteAccessRequests.id, input.requestId))
        .limit(1);

      if (!req) throw new Error("Request not found");
      if (req.status !== "PENDING") throw new Error(`Cannot approve request in status: ${req.status}`);

      const token = generateVpnToken();
      const expiresAt = new Date(Date.now() + req.requestedDurationHours * 3600 * 1000);

      const [updated] = await db
        .update(remoteAccessRequests)
        .set({
          status: "ACTIVE",
          tempVpnToken: token,
          approvedBy: user.id,
          approverName: user.name ?? `User#${user.id}`,
          approvedAt: new Date(),
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(remoteAccessRequests.id, input.requestId))
        .returning();

      await writeAuditLog(db, input.requestId, "APPROVED_TOKEN_GENERATED", user.id, user.name ?? "", `Token: ${token}, Expires: ${expiresAt.toISOString()}`);

      log.info({ requestId: input.requestId, token, expiresAt, approver: user.name }, "Remote access approved — VPN token generated");
      return updated;
    }),

  /** Reject a request */
  reject: requirePermission("remote:access:approve")
    .input(
      z.object({
        requestId: z.number().int(),
        reason: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;
      const user = ctx.user!;

      const [updated] = await db
        .update(remoteAccessRequests)
        .set({
          status: "REJECTED",
          rejectionReason: input.reason,
          approvedBy: user.id,
          approverName: user.name ?? `User#${user.id}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(remoteAccessRequests.id, input.requestId),
            eq(remoteAccessRequests.status, "PENDING")
          )
        )
        .returning();

      if (!updated) throw new Error("Request not found or not in PENDING status");

      await writeAuditLog(db, input.requestId, "REJECTED", user.id, user.name ?? "", `Reason: ${input.reason}`);

      log.info({ requestId: input.requestId, approver: user.name }, "Remote access request rejected");
      return updated;
    }),
});

/** Active tunnel management + kill switch */
const tunnelRouter = router({
  /** List all currently active tunnels */
  listActive: requirePermission("remote:tunnel:view")
    .query(async ({ ctx }) => {
      return ctx.db
        .select()
        .from(remoteAccessRequests)
        .where(
          and(
            eq(remoteAccessRequests.status, "ACTIVE"),
            gt(remoteAccessRequests.expiresAt, new Date())
          )
        )
        .orderBy(desc(remoteAccessRequests.expiresAt))
        .limit(50);
    }),

  /** Kill switch — instantly revoke a VPN token */
  revoke: requirePermission("remote:tunnel:kill")
    .input(
      z.object({
        requestId: z.number().int(),
        reason: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;
      const user = ctx.user!;

      const [updated] = await db
        .update(remoteAccessRequests)
        .set({
          status: "REVOKED",
          revokedAt: new Date(),
          revokedBy: user.id,
          revokeReason: input.reason,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(remoteAccessRequests.id, input.requestId),
            eq(remoteAccessRequests.status, "ACTIVE")
          )
        )
        .returning();

      if (!updated) throw new Error("Tunnel not found or not active");

      await writeAuditLog(db, input.requestId, "TOKEN_REVOKED_KILL_SWITCH", user.id, user.name ?? "", `Reason: ${input.reason}`);

      log.warn({ requestId: input.requestId, revoker: user.name, reason: input.reason }, "VPN TOKEN REVOKED — kill switch activated");
      return updated;
    }),

  /** Expire check — mark stale active tokens as expired (called by scheduler or on-demand) */
  expireStale: requirePermission("remote:tunnel:kill")
    .mutation(async ({ ctx }) => {
      const db = ctx.db;
      const now = new Date();
      const result = await db
        .update(remoteAccessRequests)
        .set({ status: "EXPIRED", updatedAt: now })
        .where(
          and(
            eq(remoteAccessRequests.status, "ACTIVE"),
            sql`${remoteAccessRequests.expiresAt} <= ${now}`
          )
        )
        .returning();

      if (result.length > 0) {
        log.info({ count: result.length }, "Expired stale VPN tokens");
      }
      return { expiredCount: result.length };
    }),
});

/** Audit log viewer */
const auditRouter = router({
  /** Get audit trail for a specific request */
  byRequest: requirePermission("remote:audit:view")
    .input(z.object({ requestId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(remoteAccessAuditLogs)
        .where(eq(remoteAccessAuditLogs.requestId, input.requestId))
        .orderBy(desc(remoteAccessAuditLogs.createdAt))
        .limit(100);
    }),

  /** Recent audit actions across all requests */
  recent: requirePermission("remote:audit:view")
    .query(async ({ ctx }) => {
      return ctx.db
        .select()
        .from(remoteAccessAuditLogs)
        .orderBy(desc(remoteAccessAuditLogs.createdAt))
        .limit(200);
    }),
});

/** Dashboard stats */
const dashboardRouter = router({
  /** Summary stats for the command center */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db;
    const [pending] = await db.select({ count: sql<number>`count(*)::int` }).from(remoteAccessRequests).where(eq(remoteAccessRequests.status, "PENDING"));
    const [active] = await db.select({ count: sql<number>`count(*)::int` }).from(remoteAccessRequests).where(and(eq(remoteAccessRequests.status, "ACTIVE"), gt(remoteAccessRequests.expiresAt, new Date())));
    const [todayTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(remoteAccessRequests).where(sql`${remoteAccessRequests.createdAt} >= CURRENT_DATE`);
    const [revoked] = await db.select({ count: sql<number>`count(*)::int` }).from(remoteAccessRequests).where(eq(remoteAccessRequests.status, "REVOKED"));

    return {
      pendingCount: pending.count,
      activeCount: active.count,
      todayRequestCount: todayTotal.count,
      revokedCount: revoked.count,
    };
  }),

  /** All requests (paginated) for history view */
  history: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50), offset: z.number().int().min(0).default(0) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(remoteAccessRequests)
        .orderBy(desc(remoteAccessRequests.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),
});

// ── Main Router ────────────────────────────────────────────────

export const remoteGovernanceRouter = router({
  request: requestRouter,
  approval: approvalRouter,
  tunnel: tunnelRouter,
  audit: auditRouter,
  dashboard: dashboardRouter,
});
