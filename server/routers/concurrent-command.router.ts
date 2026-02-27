/**
 * 并行调试指挥中心路由 — DB-backed
 * Track 1: Software Dev Sandboxes (ccc_sandboxes)
 * Track 2: Equipment Commissioning Rooms (ccc_rooms)
 * Activity audit log (ccc_activities)
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { broadcastToWorkspace } from "../services/websocket.service";
import { requireDb } from "../db";
import {
  cccSandboxes,
  cccRooms,
  cccActivities,
} from "../../drizzle/concurrent-debug-schema";
import { eq, desc, sql } from "drizzle-orm";

// Dedicated workspace ID for Concurrent Command Center
const CCC_WORKSPACE_ID = 9900;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function pushActivity(
  action: string,
  target: string,
  userName: string,
  extraData?: Record<string, any>,
) {
  const db = await requireDb();
  const [entry] = await db
    .insert(cccActivities)
    .values({ action, target, userName, extraData: extraData ?? null })
    .returning();
  return entry;
}

async function broadcast(
  action: string,
  target: string,
  userName: string,
  extra?: Record<string, any>,
) {
  const entry = await pushActivity(action, target, userName, extra);
  try {
    broadcastToWorkspace(CCC_WORKSPACE_ID, {
      type: "action" as any,
      workspaceId: CCC_WORKSPACE_ID,
      data: { ...entry, ...extra },
      timestamp: Date.now(),
    });
  } catch {
    // WebSocket may not be initialized in test environments
  }
  return entry;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const concurrentCommandRouter = router({
  // ─── Track 1: Software Dev Sandboxes ──────────────────────────────────────

  listSandboxes: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(cccSandboxes).orderBy(cccSandboxes.id);
  }),

  updateSandboxStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        branchStatus: z.enum(["ISOLATED", "TESTING", "READY_FOR_MERGE"]),
        userName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();

      const [existing] = await db
        .select()
        .from(cccSandboxes)
        .where(eq(cccSandboxes.id, input.id));
      if (!existing) throw new Error("Sandbox not found");

      const [updated] = await db
        .update(cccSandboxes)
        .set({ branchStatus: input.branchStatus, updatedAt: now })
        .where(eq(cccSandboxes.id, input.id))
        .returning();

      await broadcast(
        "updateSandboxStatus",
        updated.moduleName,
        input.userName ?? "System",
        { branchStatus: input.branchStatus },
      );
      return updated;
    }),

  approveMerge: publicProcedure
    .input(
      z.object({
        id: z.number(),
        userName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [sandbox] = await db
        .select()
        .from(cccSandboxes)
        .where(eq(cccSandboxes.id, input.id));
      if (!sandbox) throw new Error("Sandbox not found");
      if (sandbox.branchStatus !== "READY_FOR_MERGE") {
        throw new Error("Branch must be READY_FOR_MERGE before approval");
      }

      const now = new Date().toISOString();
      const [updated] = await db
        .update(cccSandboxes)
        .set({ managerApproved: true, updatedAt: now })
        .where(eq(cccSandboxes.id, input.id))
        .returning();

      await broadcast("approveMerge", updated.moduleName, input.userName ?? "Manager");
      return updated;
    }),

  // ─── Track 2: Equipment Commissioning Rooms ───────────────────────────────

  listRooms: publicProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(cccRooms).orderBy(cccRooms.id);
  }),

  claimRoom: publicProcedure
    .input(
      z.object({
        id: z.number(),
        engineerName: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [room] = await db
        .select()
        .from(cccRooms)
        .where(eq(cccRooms.id, input.id));
      if (!room) throw new Error("Room not found");
      if (room.testStatus === "PASSED")
        throw new Error("Cannot claim a sub-system that already passed");
      if (room.engineerAssigned && room.engineerAssigned !== input.engineerName) {
        throw new Error(`Already claimed by ${room.engineerAssigned}`);
      }

      const now = new Date().toISOString();
      const [updated] = await db
        .update(cccRooms)
        .set({
          engineerAssigned: input.engineerName,
          testStatus: "DEBUGGING",
          updatedAt: now,
        })
        .where(eq(cccRooms.id, input.id))
        .returning();

      await broadcast("claimRoom", updated.subSystem, input.engineerName);
      return updated;
    }),

  updateRoomStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        testStatus: z.enum(["IDLE", "DEBUGGING", "PASSED"]),
        userName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      const [room] = await db
        .select()
        .from(cccRooms)
        .where(eq(cccRooms.id, input.id));
      if (!room) throw new Error("Room not found");

      const now = new Date().toISOString();
      const [updated] = await db
        .update(cccRooms)
        .set({ testStatus: input.testStatus, updatedAt: now })
        .where(eq(cccRooms.id, input.id))
        .returning();

      await broadcast(
        "updateRoomStatus",
        updated.subSystem,
        input.userName ?? room.engineerAssigned ?? "System",
        { testStatus: input.testStatus },
      );
      return updated;
    }),

  generateCommissioningReport: publicProcedure.query(async () => {
    const db = await requireDb();
    const rooms = await db.select().from(cccRooms).orderBy(cccRooms.id);

    const totalCount = rooms.length;
    const passedCount = rooms.filter((r) => r.testStatus === "PASSED").length;
    const allPassed = totalCount > 0 && passedCount === totalCount;

    if (!allPassed) {
      return { ready: false as const, report: null, approved: false };
    }

    // Report approved when ALL rooms have reportApproved=true
    const allApproved = rooms.every((r) => r.reportApproved);

    return {
      ready: true as const,
      approved: allApproved,
      report: {
        projectName: rooms[0]?.projectName ?? "Unknown Project",
        totalSubSystems: totalCount,
        passedSubSystems: passedCount,
        generatedAt: new Date().toISOString(),
        subSystems: rooms.map((r) => ({
          name: r.subSystem,
          engineer: r.engineerAssigned,
          status: r.testStatus,
          notes: r.testNotes,
        })),
      },
    };
  }),

  approveCommissioningReport: publicProcedure
    .input(z.object({ userName: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const now = new Date().toISOString();

      // Bulk-approve all rooms
      await db
        .update(cccRooms)
        .set({ reportApproved: true, updatedAt: now });

      await broadcast(
        "approveCommissioningReport",
        "Commissioning Report",
        input?.userName ?? "Chief Engineer",
      );
      return {
        success: true,
        approvedBy: input?.userName ?? "Chief Engineer",
        approvedAt: now,
      };
    }),

  // ─── Activity Log ─────────────────────────────────────────────────────────

  getActivityLog: publicProcedure.query(async () => {
    const db = await requireDb();
    return db
      .select()
      .from(cccActivities)
      .orderBy(desc(cccActivities.createdAt))
      .limit(50);
  }),

  // ─── Seed Demo Data ───────────────────────────────────────────────────────

  seedDemoData: publicProcedure.mutation(async () => {
    const db = await requireDb();

    // Clear existing data
    await db.delete(cccActivities);
    await db.delete(cccRooms);
    await db.delete(cccSandboxes);

    // Track 1: Software Dev Sandboxes
    await db.insert(cccSandboxes).values([
      {
        moduleName: "Finance",
        assignedAiAgent: "Claude Agent 1",
        branchName: "feature/finance-v2",
        branchStatus: "TESTING",
        managerApproved: false,
      },
      {
        moduleName: "HR",
        assignedAiAgent: "Claude Agent 2",
        branchName: "feature/hr-onboarding",
        branchStatus: "ISOLATED",
        managerApproved: false,
      },
      {
        moduleName: "Quality",
        assignedAiAgent: "Gemini Planner",
        branchName: "feature/quality-spc-upgrade",
        branchStatus: "READY_FOR_MERGE",
        managerApproved: false,
      },
      {
        moduleName: "Supply Chain",
        assignedAiAgent: "Claude Agent 3",
        branchName: "feature/scm-traceability",
        branchStatus: "ISOLATED",
        managerApproved: false,
      },
    ]);

    // Track 2: Equipment Commissioning Rooms
    await db.insert(cccRooms).values([
      {
        projectName: "SAIC New Energy Cleaning Line",
        subSystem: "Conveyor Belt System",
        engineerAssigned: "张工",
        testStatus: "PASSED",
        testNotes: "Conveyor speed calibration complete. Passed FAT.",
        reportApproved: false,
      },
      {
        projectName: "SAIC New Energy Cleaning Line",
        subSystem: "Ultrasonic Generator",
        engineerAssigned: "李工",
        testStatus: "DEBUGGING",
        testNotes: "Frequency drift at 40kHz — investigating transducer.",
        reportApproved: false,
      },
      {
        projectName: "SAIC New Energy Cleaning Line",
        subSystem: "Drying System",
        engineerAssigned: null,
        testStatus: "IDLE",
        testNotes: null,
        reportApproved: false,
      },
      {
        projectName: "SAIC New Energy Cleaning Line",
        subSystem: "Filtration Unit",
        engineerAssigned: null,
        testStatus: "IDLE",
        testNotes: null,
        reportApproved: false,
      },
      {
        projectName: "SAIC New Energy Cleaning Line",
        subSystem: "PLC Control Panel",
        engineerAssigned: "王工",
        testStatus: "DEBUGGING",
        testNotes: "Ladder logic mismatch on drying cycle timer.",
        reportApproved: false,
      },
    ]);

    // Sample activity entries
    await db.insert(cccActivities).values([
      { action: "claimRoom", target: "Conveyor Belt System", userName: "张工" },
      { action: "updateRoomStatus", target: "Conveyor Belt System", userName: "张工" },
      { action: "claimRoom", target: "Ultrasonic Generator", userName: "李工" },
      { action: "updateSandboxStatus", target: "Finance", userName: "System" },
    ]);

    return { success: true, message: "Demo data seeded: 4 sandboxes, 5 rooms, 4 activities" };
  }),
});
