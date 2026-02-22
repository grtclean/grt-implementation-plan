/**
 * GRT Vision Dashboard Router
 *
 * Manages display screens, playlists, and EXTERNAL/INTERNAL mode switching.
 * CRITICAL: Default mode is always EXTERNAL. INTERNAL unlock auto-reverts after 30 min.
 */
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import {
  displayScreens,
  screenPlaylists,
  screenSecurityLogs,
} from "../../drizzle/vision-dashboard-schema";
import { eq, desc, and } from "drizzle-orm";

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id) : id;

const UNLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export const visionDashboardRouter = router({
  // ─── Screens ───────────────────────────────────────────

  listScreens: publicProcedure
    .input(z.object({ location: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(displayScreens)
        .orderBy(displayScreens.location);
      if (input?.location) {
        return rows.filter((r) => r.location === input.location);
      }
      return rows;
    }),

  getScreen: publicProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const rows = await db
      .select()
      .from(displayScreens)
      .where(eq(displayScreens.id, toNum(input.id)));
    const screen = rows[0] ?? null;
    // Auto-revert if unlock has expired
    if (
      screen &&
      screen.currentMode === "INTERNAL" &&
      screen.modeUnlockExpiresAt &&
      new Date(screen.modeUnlockExpiresAt) < new Date()
    ) {
      await db
        .update(displayScreens)
        .set({
          currentMode: "EXTERNAL",
          modeUnlockedAt: null,
          modeUnlockExpiresAt: null,
          unlockedByName: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(displayScreens.id, screen.id));
      await db.insert(screenSecurityLogs).values({
        screenId: screen.id,
        action: "AUTO_REVERT",
        operatorName: "SYSTEM",
      });
      return { ...screen, currentMode: "EXTERNAL" as const };
    }
    return screen;
  }),

  createScreen: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        location: z.enum(["LOBBY", "SHOPFLOOR", "BU", "SERVICE"]),
        macAddress: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .insert(displayScreens)
        .values({
          name: input.name,
          location: input.location,
          macAddress: input.macAddress ?? null,
          currentMode: "EXTERNAL",
        })
        .returning();
      return rows[0];
    }),

  // ─── Mode Switching ────────────────────────────────────

  unlockInternal: publicProcedure
    .input(
      z.object({
        screenId: z.union([z.string(), z.number()]),
        pin: z.string().min(4),
        operatorName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // In production, validate PIN against a hashed secret.
      // For prototype, accept "8888" as the master PIN.
      if (input.pin !== "8888") {
        throw new Error("PIN码错误，无法解锁内部模式");
      }
      const db = await requireDb();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + UNLOCK_DURATION_MS);
      const rows = await db
        .update(displayScreens)
        .set({
          currentMode: "INTERNAL",
          modeUnlockedAt: now.toISOString(),
          modeUnlockExpiresAt: expiresAt.toISOString(),
          unlockedByName: input.operatorName || "Unknown",
          updatedAt: now.toISOString(),
        })
        .where(eq(displayScreens.id, toNum(input.screenId)))
        .returning();
      // Audit log
      await db.insert(screenSecurityLogs).values({
        screenId: toNum(input.screenId),
        action: "UNLOCK",
        operatorName: input.operatorName || "Unknown",
      });
      return rows[0] ?? null;
    }),

  lockExternal: publicProcedure
    .input(
      z.object({
        screenId: z.union([z.string(), z.number()]),
        operatorName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .update(displayScreens)
        .set({
          currentMode: "EXTERNAL",
          modeUnlockedAt: null,
          modeUnlockExpiresAt: null,
          unlockedByName: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(displayScreens.id, toNum(input.screenId)))
        .returning();
      await db.insert(screenSecurityLogs).values({
        screenId: toNum(input.screenId),
        action: "LOCK",
        operatorName: input.operatorName || "Unknown",
      });
      return rows[0] ?? null;
    }),

  // ─── Playlists ─────────────────────────────────────────

  listPlaylists: publicProcedure
    .input(z.object({ screenId: z.union([z.string(), z.number()]) }))
    .query(async ({ input }) => {
      const db = await requireDb();
      return db
        .select()
        .from(screenPlaylists)
        .where(eq(screenPlaylists.screenId, toNum(input.screenId)))
        .orderBy(screenPlaylists.orderIndex);
    }),

  upsertPlaylist: publicProcedure
    .input(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        screenId: z.union([z.string(), z.number()]),
        viewComponentName: z.string(),
        durationSeconds: z.number().min(5).default(30),
        orderIndex: z.number().default(0),
        mode: z.enum(["EXTERNAL", "INTERNAL", "BOTH"]).default("BOTH"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      if (input.id) {
        const rows = await db
          .update(screenPlaylists)
          .set({
            viewComponentName: input.viewComponentName,
            durationSeconds: input.durationSeconds,
            orderIndex: input.orderIndex,
            mode: input.mode,
          })
          .where(eq(screenPlaylists.id, toNum(input.id)))
          .returning();
        return rows[0];
      }
      const rows = await db
        .insert(screenPlaylists)
        .values({
          screenId: toNum(input.screenId),
          viewComponentName: input.viewComponentName,
          durationSeconds: input.durationSeconds,
          orderIndex: input.orderIndex,
          mode: input.mode,
        })
        .returning();
      return rows[0];
    }),

  // ─── Security Logs ─────────────────────────────────────

  securityLogs: publicProcedure
    .input(
      z.object({
        screenId: z.union([z.string(), z.number()]).optional(),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      let rows = await db
        .select()
        .from(screenSecurityLogs)
        .orderBy(desc(screenSecurityLogs.createdAt))
        .limit(input?.limit ?? 50);
      if (input?.screenId) {
        rows = rows.filter((r) => r.screenId === toNum(input.screenId!));
      }
      return rows;
    }),
});
