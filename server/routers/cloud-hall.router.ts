/**
 * Digital Cloud Hall Router (数字云厅)
 *
 * tRPC signaling layer for field sales ↔ HQ leadership video sessions.
 * WebRTC placeholder — no real SDK wired; session lifecycle is fully DB-backed.
 *
 * 9 procedures:
 *   createSession, inviteLeadership, joinSession, getSessionState,
 *   updateSlideContext, heartbeat, endSession, listSessions, seedDemo
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  cloudHallSessions,
  cloudHallSessionLogs,
} from "../../drizzle/cloud-hall-schema";
import { eq, and, desc, sql, count, or } from "drizzle-orm";

// ─── Helpers ────────────────────────────────────────────────

function pad(n: number, len = 3) {
  return String(n).padStart(len, "0");
}

async function generateSessionCode(db: any): Promise<string> {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const prefix = `CH-${dateStr}-`;
  const [last] = await db
    .select({ code: cloudHallSessions.sessionCode })
    .from(cloudHallSessions)
    .where(sql`${cloudHallSessions.sessionCode} LIKE ${prefix + "%"}`)
    .orderBy(desc(cloudHallSessions.id))
    .limit(1);

  const seq = last ? parseInt(last.code.split("-").pop() || "0", 10) + 1 : 1;
  return `${prefix}${pad(seq)}`;
}

async function insertLog(
  db: any,
  sessionId: number,
  action: string,
  actorUserId?: number,
  actorName?: string,
  details?: string
) {
  await db.insert(cloudHallSessionLogs).values({
    sessionId,
    action,
    actorUserId,
    actorName,
    details,
  });
}

// ─── Router ─────────────────────────────────────────────────

export const cloudHallRouter = router({
  /**
   * createSession — field sales initiates a new session
   */
  createSession: publicProcedure
    .input(
      z.object({
        initiatorName: z.string().min(1),
        initiatorRole: z.string().optional(),
        initiatorDevice: z.string().optional(),
        buId: z.number().optional(),
        projectId: z.number().optional(),
        customerName: z.string().min(1),
        customerSite: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = (ctx as any).user?.id ?? 0;
      const sessionCode = await generateSessionCode(db);

      const [session] = await db
        .insert(cloudHallSessions)
        .values({
          sessionCode,
          status: "waiting",
          initiatorUserId: userId,
          initiatorName: input.initiatorName,
          initiatorRole: input.initiatorRole ?? "bu_sales",
          initiatorDevice: input.initiatorDevice ?? "laptop",
          buId: input.buId,
          projectId: input.projectId,
          customerName: input.customerName,
          customerSite: input.customerSite,
          signalingState: "idle",
          videoProvider: "placeholder",
        })
        .returning();

      await insertLog(db, session.id, "created", userId, input.initiatorName);

      return session;
    }),

  /**
   * inviteLeadership — sales invites a specific leader to the session
   */
  inviteLeadership: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        leadershipUserId: z.number(),
        leadershipName: z.string(),
        leadershipRole: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      const [session] = await db
        .select()
        .from(cloudHallSessions)
        .where(eq(cloudHallSessions.id, input.sessionId));

      if (!session) throw new Error("Session not found");
      if (session.status !== "waiting")
        throw new Error("Session is not in waiting state");

      const [updated] = await db
        .update(cloudHallSessions)
        .set({
          leadershipUserId: input.leadershipUserId,
          leadershipName: input.leadershipName,
          leadershipRole: input.leadershipRole ?? "director",
          status: "ringing",
          signalingState: "offer_sent",
          updatedAt: sql`NOW()`,
        })
        .where(eq(cloudHallSessions.id, input.sessionId))
        .returning();

      await insertLog(
        db,
        input.sessionId,
        "invited",
        (ctx as any).user?.id,
        (ctx as any).user?.name,
        JSON.stringify({
          leadershipUserId: input.leadershipUserId,
          leadershipName: input.leadershipName,
        })
      );

      return updated;
    }),

  /**
   * joinSession — leadership accepts / joins the session
   */
  joinSession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = (ctx as any).user?.id ?? 0;

      const [session] = await db
        .select()
        .from(cloudHallSessions)
        .where(eq(cloudHallSessions.id, input.sessionId));

      if (!session) throw new Error("Session not found");
      if (session.status !== "ringing")
        throw new Error("Session is not ringing");

      const [updated] = await db
        .update(cloudHallSessions)
        .set({
          status: "active",
          signalingState: "connected",
          connectionQuality: "good",
          lastHeartbeat: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(cloudHallSessions.id, input.sessionId))
        .returning();

      await insertLog(
        db,
        input.sessionId,
        "joined",
        userId,
        (ctx as any).user?.name
      );

      return updated;
    }),

  /**
   * getSessionState — poll current session state
   * Auto-marks disconnected if heartbeat > 60s stale while active
   */
  getSessionState: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const [session] = await db
        .select()
        .from(cloudHallSessions)
        .where(eq(cloudHallSessions.id, input.sessionId));

      if (!session) throw new Error("Session not found");

      // Auto-disconnect detection
      if (session.status === "active" && session.lastHeartbeat) {
        const lastBeat = new Date(session.lastHeartbeat).getTime();
        const now = Date.now();
        if (now - lastBeat > 60_000) {
          await db
            .update(cloudHallSessions)
            .set({
              connectionQuality: "disconnected",
              signalingState: "disconnected",
              updatedAt: sql`NOW()`,
            })
            .where(eq(cloudHallSessions.id, input.sessionId));

          await insertLog(db, input.sessionId, "heartbeat_timeout");

          return {
            ...session,
            connectionQuality: "disconnected",
            signalingState: "disconnected",
          };
        }
      }

      return session;
    }),

  /**
   * updateSlideContext — sync current slide/product context
   */
  updateSlideContext: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        slideContext: z.object({
          slideIndex: z.number(),
          slideTitle: z.string(),
          productId: z.number().optional(),
          productName: z.string().optional(),
          productCategory: z.string().optional(),
          pageUrl: z.string().optional(),
          customData: z.record(z.string(), z.unknown()).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      const [updated] = await db
        .update(cloudHallSessions)
        .set({
          currentSlideContext: input.slideContext,
          updatedAt: sql`NOW()`,
        })
        .where(eq(cloudHallSessions.id, input.sessionId))
        .returning();

      await insertLog(
        db,
        input.sessionId,
        "slide_changed",
        (ctx as any).user?.id,
        (ctx as any).user?.name,
        JSON.stringify(input.slideContext)
      );

      return updated;
    }),

  /**
   * heartbeat — keep-alive ping with optional connection quality
   */
  heartbeat: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        connectionQuality: z
          .enum(["excellent", "good", "fair", "poor", "disconnected"])
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const updates: Record<string, any> = {
        lastHeartbeat: sql`NOW()`,
        updatedAt: sql`NOW()`,
      };

      if (input.connectionQuality) {
        updates.connectionQuality = input.connectionQuality;
      }

      // Reconnect if was disconnected
      const [session] = await db
        .select({ signalingState: cloudHallSessions.signalingState })
        .from(cloudHallSessions)
        .where(eq(cloudHallSessions.id, input.sessionId));

      if (session?.signalingState === "disconnected") {
        updates.signalingState = "connected";
        updates.connectionQuality = input.connectionQuality ?? "fair";
        await insertLog(db, input.sessionId, "reconnected");
      }

      await db
        .update(cloudHallSessions)
        .set(updates)
        .where(eq(cloudHallSessions.id, input.sessionId));

      return { ok: true };
    }),

  /**
   * endSession — gracefully end a session
   */
  endSession: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      const [session] = await db
        .select()
        .from(cloudHallSessions)
        .where(eq(cloudHallSessions.id, input.sessionId));

      if (!session) throw new Error("Session not found");

      // Calculate duration
      let durationSec = 0;
      if (session.createdAt) {
        durationSec = Math.round(
          (Date.now() - new Date(session.createdAt).getTime()) / 1000
        );
      }

      const [updated] = await db
        .update(cloudHallSessions)
        .set({
          status: "ended",
          signalingState: "disconnected",
          endReason: input.reason ?? "normal",
          sessionNotes: input.notes ?? session.sessionNotes,
          sessionDurationSec: durationSec,
          endedAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(cloudHallSessions.id, input.sessionId))
        .returning();

      await insertLog(
        db,
        input.sessionId,
        "ended",
        (ctx as any).user?.id,
        (ctx as any).user?.name,
        JSON.stringify({ reason: input.reason ?? "normal", durationSec })
      );

      return updated;
    }),

  /**
   * listSessions — paginated session list with filters
   */
  listSessions: publicProcedure
    .input(
      z.object({
        status: z.string().optional(),
        initiatorUserId: z.number().optional(),
        leadershipUserId: z.number().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();

      const conditions: any[] = [];
      if (input.status)
        conditions.push(eq(cloudHallSessions.status, input.status));
      if (input.initiatorUserId)
        conditions.push(
          eq(cloudHallSessions.initiatorUserId, input.initiatorUserId)
        );
      if (input.leadershipUserId)
        conditions.push(
          eq(cloudHallSessions.leadershipUserId, input.leadershipUserId)
        );

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(cloudHallSessions)
          .where(where)
          .orderBy(desc(cloudHallSessions.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ total: count() }).from(cloudHallSessions).where(where),
      ]);

      return {
        items: rows,
        total: totalResult[0]?.total ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * seedDemo — insert 3 demonstration sessions
   */
  seedDemo: publicProcedure.mutation(async () => {
    const db = await requireDb();

    const now = new Date();
    const dateStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("");

    const demos = [
      {
        sessionCode: `CH-${dateStr}-D01`,
        status: "ended" as const,
        initiatorUserId: 1,
        initiatorName: "张工 (现场销售)",
        initiatorRole: "bu_sales",
        initiatorDevice: "pad",
        leadershipUserId: 2,
        leadershipName: "王总 (事业部总经理)",
        leadershipRole: "bu_gm",
        buId: 1,
        customerName: "上汽大众 MEB 平台",
        customerSite: "上海安亭工厂",
        signalingState: "disconnected",
        connectionQuality: "good",
        videoProvider: "placeholder",
        sessionDurationSec: 1847,
        endReason: "normal",
        sessionNotes: "客户对超声波清洗方案感兴趣，需要后续报价",
        currentSlideContext: {
          slideIndex: 3,
          slideTitle: "超声波清洗机 UC-3000",
          productName: "UC-3000 超声波清洗机",
          productCategory: "ultrasonic",
        },
      },
      {
        sessionCode: `CH-${dateStr}-D02`,
        status: "active" as const,
        initiatorUserId: 3,
        initiatorName: "李工 (客服工程师)",
        initiatorRole: "cs_engineer",
        initiatorDevice: "laptop",
        leadershipUserId: 4,
        leadershipName: "赵总监 (技术总监)",
        leadershipRole: "director",
        buId: 2,
        customerName: "博世长沙",
        customerSite: "长沙经开区工厂",
        signalingState: "connected",
        connectionQuality: "excellent",
        videoProvider: "placeholder",
        currentSlideContext: {
          slideIndex: 1,
          slideTitle: "喷淋清洗机 SP-5000",
          productName: "SP-5000 高压喷淋清洗机",
          productCategory: "spray",
        },
      },
      {
        sessionCode: `CH-${dateStr}-D03`,
        status: "waiting" as const,
        initiatorUserId: 5,
        initiatorName: "陈工 (项目经理)",
        initiatorRole: "bu_pm",
        initiatorDevice: "desktop",
        buId: 3,
        customerName: "宁德时代",
        customerSite: "宁德蕉城基地",
        signalingState: "idle",
        videoProvider: "placeholder",
        currentSlideContext: {
          slideIndex: 0,
          slideTitle: "浸没式清洗机 IM-2000",
          productName: "IM-2000 浸没式清洗线",
          productCategory: "immersion",
        },
      },
    ];

    for (const demo of demos) {
      // Upsert: skip if sessionCode exists
      const [existing] = await db
        .select({ id: cloudHallSessions.id })
        .from(cloudHallSessions)
        .where(eq(cloudHallSessions.sessionCode, demo.sessionCode));

      if (!existing) {
        const [inserted] = await db
          .insert(cloudHallSessions)
          .values(demo)
          .returning();
        await insertLog(db, inserted.id, "created", demo.initiatorUserId, demo.initiatorName, "demo seed");
      }
    }

    return { seeded: true, count: demos.length };
  }),
});
