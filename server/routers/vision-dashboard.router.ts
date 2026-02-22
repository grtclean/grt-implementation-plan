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
import { eq, desc, and, gte, sql } from "drizzle-orm";
import {
  stations,
  executionLogs,
} from "../../drizzle/kiosk-station-schema";
import { productionEquipments } from "../../drizzle/production-equipment-schema";
import { spareParts } from "../../drizzle/supply-chain-schema";
import { projects } from "../../drizzle/schema";

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
      return rows[0] ?? null;
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

  // ─── Shopfloor Real-Time Data ───────────────────────────

  shopfloorStations: publicProcedure.query(async () => {
    const db = await requireDb();
    const allStations = await db
      .select()
      .from(stations)
      .orderBy(stations.sortOrder);
    if (allStations.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allLogs = await db
      .select()
      .from(executionLogs)
      .where(gte(executionLogs.createdAt, today.toISOString()));

    const logsByStation: Record<number, typeof allLogs> = {};
    for (const log of allLogs) {
      if (!logsByStation[log.stationId]) logsByStation[log.stationId] = [];
      logsByStation[log.stationId].push(log);
    }

    const oneHourAgoMs = Date.now() - 3600000;
    return allStations.map((st) => {
      const logs = logsByStation[st.id] || [];
      const total = logs.length;
      const passCount = logs.filter(
        (l) => l.humanFinalResult === "PASS"
      ).length;
      const fpy =
        total > 0 ? Math.round((passCount / total) * 1000) / 10 : 100;
      const avgCycle =
        total > 0
          ? Math.round(
              logs.reduce((s, l) => s + (l.cycleTimeSeconds || 0), 0) / total
            )
          : 0;
      const latestLog = logs[logs.length - 1];

      // Use Date objects for comparison (DB returns "YYYY-MM-DD HH:mm:ss", not ISO)
      const recentLogs = logs.filter(
        (l) => new Date(l.createdAt).getTime() > oneHourAgoMs
      );
      let status: "running" | "idle" | "alarm" = "idle";
      if (
        recentLogs.some((l) =>
          ["FAIL", "SCRAP"].includes(l.humanFinalResult)
        )
      ) {
        status = "alarm";
      } else if (recentLogs.length > 0) {
        status = "running";
      }

      return {
        code: st.code,
        name: st.name,
        status,
        fpy,
        planQty: 0,
        actualQty: total,
        operator: latestLog?.operatorId || null,
        cycleTime: avgCycle,
      };
    });
  }),

  shopfloorRedBlackList: publicProcedure.query(async () => {
    const db = await requireDb();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const logs = await db
      .select()
      .from(executionLogs)
      .where(gte(executionLogs.createdAt, thirtyDaysAgo.toISOString()));
    if (logs.length === 0) return [];

    const byOp: Record<string, { total: number; fails: number }> = {};
    for (const log of logs) {
      if (!byOp[log.operatorId])
        byOp[log.operatorId] = { total: 0, fails: 0 };
      byOp[log.operatorId].total++;
      if (["FAIL", "SCRAP"].includes(log.humanFinalResult))
        byOp[log.operatorId].fails++;
    }

    const entries = Object.entries(byOp);
    const result: Array<{
      name: string;
      dept: string;
      type: "red" | "black";
      reason: string;
      count: number;
    }> = [];

    entries
      .filter(([, v]) => v.fails >= 2)
      .sort((a, b) => b[1].fails - a[1].fails)
      .slice(0, 3)
      .forEach(([name, stats]) => {
        result.push({
          name,
          dept: "",
          type: "red",
          reason: `${stats.fails}次质量不合格 (30天)`,
          count: stats.fails,
        });
      });

    entries
      .filter(([, v]) => v.fails === 0 && v.total >= 10)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3)
      .forEach(([name, stats]) => {
        result.push({
          name,
          dept: "",
          type: "black",
          reason: `零缺陷连续${stats.total}次操作`,
          count: stats.total,
        });
      });

    return result;
  }),

  shopfloorShortageAlerts: publicProcedure.query(async () => {
    const db = await requireDb();
    const parts = await db
      .select()
      .from(spareParts)
      .where(
        sql`${spareParts.currentStock} <= ${spareParts.reorderPoint} AND ${spareParts.reorderPoint} > 0`
      );

    return parts.map((p) => ({
      station: p.locationCode || "—",
      material: `${p.materialName} (${p.partCode})`,
      eta: p.leadTimeDays ? `预计${p.leadTimeDays}天到货` : "ETA未知",
      buyer: p.preferredSupplierName || "—",
      severity: (p.currentStock === 0 ? "critical" : "warning") as
        | "critical"
        | "warning",
    }));
  }),

  // ─── Lobby Real-Time Data ───────────────────────────────

  lobbyData: publicProcedure
    .input(
      z
        .object({
          mode: z.enum(["EXTERNAL", "INTERNAL"]).default("EXTERNAL"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const mode = input?.mode || "EXTERNAL";

      const [eqRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(productionEquipments);
      const [stRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(stations);
      const [prRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects);

      const eqByLoc = await db
        .select({
          location: productionEquipments.location,
          count: sql<number>`count(*)::int`,
        })
        .from(productionEquipments)
        .groupBy(productionEquipments.location);

      const locations = eqByLoc.map((row, idx) => ({
        id: idx + 1,
        city: row.location || "Factory",
        count: row.count,
      }));

      const externalKpis = [
        {
          key: "equipment",
          label: "全球设备运行",
          value: String(eqRow?.count || 0),
          unit: "台",
        },
        {
          key: "stations",
          label: "产线工位",
          value: String(stRow?.count || 0),
          unit: "个",
        },
        {
          key: "projects",
          label: "年度交付项目",
          value: String(prRow?.count || 0),
          unit: "个",
        },
        {
          key: "cert",
          label: "全球认证",
          value: "IATF 16949",
          unit: "",
        },
      ];

      let internalKpis: typeof externalKpis = [];
      if (mode === "INTERNAL") {
        const todayStr = new Date().toISOString().slice(0, 10);
        const [logRow] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(executionLogs)
          .where(gte(executionLogs.createdAt, todayStr));

        internalKpis = [
          {
            key: "todayOutput",
            label: "今日产出",
            value: String(logRow?.count || 0),
            unit: "件",
          },
          {
            key: "activeStations",
            label: "活跃工位",
            value: String(stRow?.count || 0),
            unit: "个",
          },
        ];
      }

      return { locations, externalKpis, internalKpis };
    }),
});
