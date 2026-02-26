import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

// ─── Track 1: Software Dev Sandboxes (in-memory mock) ────────────────────────

const MOCK_SANDBOXES = [
  {
    id: 1,
    moduleName: "Finance",
    assignedAiAgent: "Claude Agent 1",
    branchName: "feature/finance-v2",
    branchStatus: "TESTING" as string,
    managerApproved: false,
    createdAt: "2026-02-24T08:00:00Z",
    updatedAt: "2026-02-24T10:30:00Z",
  },
  {
    id: 2,
    moduleName: "HR",
    assignedAiAgent: "Claude Agent 2",
    branchName: "feature/hr-onboarding",
    branchStatus: "ISOLATED" as string,
    managerApproved: false,
    createdAt: "2026-02-24T08:15:00Z",
    updatedAt: "2026-02-24T09:00:00Z",
  },
  {
    id: 3,
    moduleName: "Quality",
    assignedAiAgent: "Gemini Planner",
    branchName: "feature/quality-spc-upgrade",
    branchStatus: "READY_FOR_MERGE" as string,
    managerApproved: false,
    createdAt: "2026-02-23T14:00:00Z",
    updatedAt: "2026-02-24T11:00:00Z",
  },
  {
    id: 4,
    moduleName: "Supply Chain",
    assignedAiAgent: "Claude Agent 3",
    branchName: "feature/scm-traceability",
    branchStatus: "ISOLATED" as string,
    managerApproved: false,
    createdAt: "2026-02-24T09:00:00Z",
    updatedAt: "2026-02-24T09:30:00Z",
  },
];

// ─── Track 2: Equipment Commissioning Rooms (in-memory mock) ─────────────────

const MOCK_ROOMS = [
  {
    id: 1,
    projectName: "SAIC New Energy Cleaning Line",
    subSystem: "Conveyor Belt System",
    engineerAssigned: "张工",
    testStatus: "PASSED" as string,
    testNotes: "Conveyor speed calibration complete. Passed FAT.",
    createdAt: "2026-02-20T08:00:00Z",
    updatedAt: "2026-02-23T16:00:00Z",
  },
  {
    id: 2,
    projectName: "SAIC New Energy Cleaning Line",
    subSystem: "Ultrasonic Generator",
    engineerAssigned: "李工",
    testStatus: "DEBUGGING" as string,
    testNotes: "Frequency drift at 40kHz — investigating transducer.",
    createdAt: "2026-02-20T08:00:00Z",
    updatedAt: "2026-02-24T10:00:00Z",
  },
  {
    id: 3,
    projectName: "SAIC New Energy Cleaning Line",
    subSystem: "Drying System",
    engineerAssigned: null as string | null,
    testStatus: "IDLE" as string,
    testNotes: null as string | null,
    createdAt: "2026-02-20T08:00:00Z",
    updatedAt: "2026-02-20T08:00:00Z",
  },
  {
    id: 4,
    projectName: "SAIC New Energy Cleaning Line",
    subSystem: "Filtration Unit",
    engineerAssigned: null as string | null,
    testStatus: "IDLE" as string,
    testNotes: null as string | null,
    createdAt: "2026-02-20T08:00:00Z",
    updatedAt: "2026-02-20T08:00:00Z",
  },
  {
    id: 5,
    projectName: "SAIC New Energy Cleaning Line",
    subSystem: "PLC Control Panel",
    engineerAssigned: "王工",
    testStatus: "DEBUGGING" as string,
    testNotes: "Ladder logic mismatch on drying cycle timer.",
    createdAt: "2026-02-20T08:00:00Z",
    updatedAt: "2026-02-24T11:30:00Z",
  },
];

let commissioningReportApproved = false;

export const concurrentCommandRouter = router({
  // ─── Track 1 procedures ──────────────────────────────────────────────────

  listSandboxes: publicProcedure.query(() => {
    return MOCK_SANDBOXES;
  }),

  updateSandboxStatus: publicProcedure
    .input(z.object({ id: z.number(), branchStatus: z.enum(["ISOLATED", "TESTING", "READY_FOR_MERGE"]) }))
    .mutation(({ input }) => {
      const sandbox = MOCK_SANDBOXES.find((s) => s.id === input.id);
      if (!sandbox) throw new Error("Sandbox not found");
      sandbox.branchStatus = input.branchStatus;
      sandbox.updatedAt = new Date().toISOString();
      return sandbox;
    }),

  approveMerge: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      const sandbox = MOCK_SANDBOXES.find((s) => s.id === input.id);
      if (!sandbox) throw new Error("Sandbox not found");
      if (sandbox.branchStatus !== "READY_FOR_MERGE") {
        throw new Error("Branch must be READY_FOR_MERGE before approval");
      }
      sandbox.managerApproved = true;
      sandbox.updatedAt = new Date().toISOString();
      return sandbox;
    }),

  // ─── Track 2 procedures ──────────────────────────────────────────────────

  listRooms: publicProcedure.query(() => {
    return MOCK_ROOMS;
  }),

  claimRoom: publicProcedure
    .input(z.object({ id: z.number(), engineerName: z.string().min(1) }))
    .mutation(({ input }) => {
      const room = MOCK_ROOMS.find((r) => r.id === input.id);
      if (!room) throw new Error("Room not found");
      if (room.testStatus === "PASSED") throw new Error("Cannot claim a sub-system that already passed");
      room.engineerAssigned = input.engineerName;
      room.testStatus = "DEBUGGING";
      room.updatedAt = new Date().toISOString();
      return room;
    }),

  updateRoomStatus: publicProcedure
    .input(z.object({ id: z.number(), testStatus: z.enum(["IDLE", "DEBUGGING", "PASSED"]) }))
    .mutation(({ input }) => {
      const room = MOCK_ROOMS.find((r) => r.id === input.id);
      if (!room) throw new Error("Room not found");
      room.testStatus = input.testStatus;
      room.updatedAt = new Date().toISOString();
      return room;
    }),

  generateCommissioningReport: publicProcedure.query(() => {
    const allPassed = MOCK_ROOMS.every((r) => r.testStatus === "PASSED");
    if (!allPassed) {
      return { ready: false as const, report: null, approved: false };
    }
    return {
      ready: true as const,
      approved: commissioningReportApproved,
      report: {
        projectName: "SAIC New Energy Cleaning Line",
        totalSubSystems: MOCK_ROOMS.length,
        passedSubSystems: MOCK_ROOMS.length,
        generatedAt: new Date().toISOString(),
        subSystems: MOCK_ROOMS.map((r) => ({
          name: r.subSystem,
          engineer: r.engineerAssigned,
          status: r.testStatus,
          notes: r.testNotes,
        })),
      },
    };
  }),

  approveCommissioningReport: publicProcedure.mutation(() => {
    commissioningReportApproved = true;
    return { success: true, approvedBy: "Chief Engineer", approvedAt: new Date().toISOString() };
  }),
});
