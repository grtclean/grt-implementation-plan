/**
 * AI Intervention Router — tRPC Procedure Tests
 *
 * Tests all 4 tRPC procedures through the caller layer:
 *   - dashboard (query): returns interventions, summary stats, modules
 *   - checkAccess (query): verifies operator machine access (AI interlock)
 *   - runScan (mutation): executes nightly intervention scan
 *   - override (mutation): manager override to unblock a user
 *
 * Also tests auth guards (anonymous rejection) for all procedures.
 *
 * Run: npx vitest run server/routers/ai-intervention.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// No DB mocking needed — this router uses in-memory MOCK data exclusively.

// ── Reset ───────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// tRPC Router Procedures
// ═══════════════════════════════════════════════════════════════
describe("aiIntervention router", () => {
  // ─── dashboard ─────────────────────────────────────────────
  describe("dashboard", () => {
    it("returns interventions array with all mock entries", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      expect(Array.isArray(result.interventions)).toBe(true);
      expect(result.interventions.length).toBe(5);
    });

    it("returns summary with correct total count", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      expect(result.summary.total).toBe(5);
    });

    it("returns correct activeBlocking count (PENDING_TRAINING + IN_PROGRESS)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      // Mock data: id=1 IN_PROGRESS, id=2 PENDING_TRAINING, id=3 PENDING_TRAINING => 3 active
      expect(result.summary.activeBlocking).toBe(3);
    });

    it("returns correct completed count", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      // Mock data: id=4 COMPLETED => 1 completed
      expect(result.summary.completed).toBe(1);
    });

    it("returns correct overridden count", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      // Mock data: id=5 OVERRIDDEN => 1 overridden
      expect(result.summary.overridden).toBe(1);
    });

    it("returns correct qualityTriggers count", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      // Mock data: ids 1,2,4,5 are QUALITY_DEFECT => 4
      expect(result.summary.qualityTriggers).toBe(4);
    });

    it("returns correct collaborationTriggers count", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      // Mock data: id=3 is COLLABORATION_LOW => 1
      expect(result.summary.collaborationTriggers).toBe(1);
    });

    it("returns modules array with training modules", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      expect(Array.isArray(result.modules)).toBe(true);
      expect(result.modules.length).toBe(6);
    });

    it("returns generatedAt as ISO timestamp", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      expect(result.generatedAt).toBeDefined();
      // Should be parseable as a date
      const d = new Date(result.generatedAt);
      expect(d.getTime()).not.toBeNaN();
    });

    it("returns dataSource as 'mock'", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      expect(result.dataSource).toBe("mock");
    });

    it("each intervention has required fields", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      for (const intv of result.interventions) {
        expect(intv).toHaveProperty("id");
        expect(intv).toHaveProperty("userId");
        expect(intv).toHaveProperty("userName");
        expect(intv).toHaveProperty("triggerType");
        expect(intv).toHaveProperty("triggerReason");
        expect(intv).toHaveProperty("assignedModuleId");
        expect(intv).toHaveProperty("assignedModuleTitle");
        expect(intv).toHaveProperty("status");
        expect(intv).toHaveProperty("progressPercent");
        expect(intv).toHaveProperty("createdAt");
      }
    });

    it("each module has required fields", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      for (const mod of result.modules) {
        expect(mod).toHaveProperty("id");
        expect(mod).toHaveProperty("moduleCode");
        expect(mod).toHaveProperty("title");
        expect(mod).toHaveProperty("titleZh");
        expect(mod).toHaveProperty("category");
        expect(mod).toHaveProperty("durationMinutes");
        expect(mod).toHaveProperty("passingScore");
        expect(mod).toHaveProperty("relatedMachineTypes");
      }
    });

    it("works with admin caller", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiIntervention.dashboard();
      expect(result.summary.total).toBe(5);
    });
  });

  // ─── checkAccess ───────────────────────────────────────────
  describe("checkAccess", () => {
    it("BLOCKS user with active PENDING_TRAINING intervention on requested machine", async () => {
      const caller = createAuthenticatedCaller();
      // User 1005 (Zhao Xin) has PENDING_TRAINING on machineId=201 (HYD-BENCH-001)
      const result = await caller.aiIntervention.checkAccess({
        userId: 1005,
        machineId: 201,
        machineCode: "HYD-BENCH-001",
      });
      expect(result.accessGranted).toBe(false);
      expect(result.blockedByIntervention).not.toBeNull();
      expect(result.reason).toContain("AI Training Required");
      expect(result.dataSource).toBe("mock");
    });

    it("BLOCKS user with IN_PROGRESS intervention on requested machine", async () => {
      const caller = createAuthenticatedCaller();
      // User 1002 (Li Ming) has IN_PROGRESS on machineId=101 (CNC-001)
      const result = await caller.aiIntervention.checkAccess({
        userId: 1002,
        machineId: 101,
        machineCode: "CNC-001",
      });
      expect(result.accessGranted).toBe(false);
      expect(result.blockedByIntervention).not.toBeNull();
      expect(result.reason).toContain("CNC Precision Tuning");
    });

    it("BLOCKS user with null blockedMachineId (blocks ALL machines)", async () => {
      const caller = createAuthenticatedCaller();
      // User 1006 (Zhou Wei) has PENDING_TRAINING with blockedMachineId=null
      const result = await caller.aiIntervention.checkAccess({
        userId: 1006,
        machineId: 999,
        machineCode: "ANY-MACHINE-999",
      });
      expect(result.accessGranted).toBe(false);
      expect(result.reason).toContain("AI Training Required");
    });

    it("GRANTS access to user with only COMPLETED interventions", async () => {
      const caller = createAuthenticatedCaller();
      // User 1003 (Wang Fang) has COMPLETED intervention on NZL-CAL-001
      const result = await caller.aiIntervention.checkAccess({
        userId: 1003,
        machineId: 301,
        machineCode: "NZL-CAL-001",
      });
      expect(result.accessGranted).toBe(true);
      expect(result.blockedByIntervention).toBeNull();
      expect(result.reason).toContain("access permitted");
    });

    it("GRANTS access to user with only OVERRIDDEN interventions", async () => {
      const caller = createAuthenticatedCaller();
      // User 1007 (Chen Jie) has OVERRIDDEN intervention
      const result = await caller.aiIntervention.checkAccess({
        userId: 1007,
        machineId: 401,
        machineCode: "WLD-TIG-001",
      });
      expect(result.accessGranted).toBe(true);
    });

    it("GRANTS access to user with no interventions at all", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.checkAccess({
        userId: 9999,
        machineId: 101,
        machineCode: "CNC-001",
      });
      expect(result.accessGranted).toBe(true);
      expect(result.reason).toContain("access permitted");
    });

    it("GRANTS access when user has intervention on a DIFFERENT machine", async () => {
      const caller = createAuthenticatedCaller();
      // User 1002 blocked on machine 101 (CNC-001), try machine 201 (HYD-BENCH-001)
      const result = await caller.aiIntervention.checkAccess({
        userId: 1002,
        machineId: 201,
        machineCode: "HYD-BENCH-001",
      });
      expect(result.accessGranted).toBe(true);
    });

    it("returns correct userId and machineId in response", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.checkAccess({
        userId: 1002,
        machineId: 101,
        machineCode: "CNC-001",
      });
      expect(result.userId).toBe(1002);
      expect(result.machineId).toBe(101);
      expect(result.machineCode).toBe("CNC-001");
    });

    it("returns dataSource as 'mock'", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.checkAccess({
        userId: 9999,
        machineId: 1,
        machineCode: "X",
      });
      expect(result.dataSource).toBe("mock");
    });
  });

  // ─── runScan ───────────────────────────────────────────────
  describe("runScan", () => {
    it("returns scan results with dataSource 'mock'", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.runScan();
      expect(result.dataSource).toBe("mock");
    });

    it("returns scanTimestamp as ISO string", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.runScan();
      expect(result.scanTimestamp).toBeDefined();
      const d = new Date(result.scanTimestamp);
      expect(d.getTime()).not.toBeNaN();
    });

    it("returns totalScanned as sum of defect records + meeting scores", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.runScan();
      // Mock: 2 defect records + 1 meeting score = 3
      expect(result.totalScanned).toBe(3);
    });

    it("skips users who already have active interventions (from MOCK_INTERVENTIONS)", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.runScan();
      // Users 1002, 1005, 1006 all have PENDING or IN_PROGRESS in MOCK_INTERVENTIONS
      // So the scan should skip them -> 0 new interventions
      expect(result.newInterventions).toHaveLength(0);
      expect(result.qualityTriggers).toBe(0);
      expect(result.collaborationTriggers).toBe(0);
    });

    it("returns newInterventions as an array", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.runScan();
      expect(Array.isArray(result.newInterventions)).toBe(true);
    });

    it("returns qualityTriggers and collaborationTriggers counts", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.runScan();
      expect(typeof result.qualityTriggers).toBe("number");
      expect(typeof result.collaborationTriggers).toBe("number");
    });

    it("works with admin caller", async () => {
      const caller = createAdminCaller();
      const result = await caller.aiIntervention.runScan();
      expect(result.dataSource).toBe("mock");
      expect(result.totalScanned).toBe(3);
    });
  });

  // ─── override ──────────────────────────────────────────────
  describe("override", () => {
    it("returns success for existing intervention with valid reason", async () => {
      const caller = createAuthenticatedCaller({ name: "Manager Zhang" });
      const result = await caller.aiIntervention.override({
        interventionId: 1,
        reason: "Production deadline requires immediate access",
      });
      expect(result.success).toBe(true);
      expect(result.interventionId).toBe(1);
      expect(result.newStatus).toBe("OVERRIDDEN");
      expect(result.previousStatus).toBe("IN_PROGRESS");
      expect(result.overriddenBy).toBe("Manager Zhang");
      expect(result.reason).toBe("Production deadline requires immediate access");
    });

    it("returns timestamp in ISO format", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.override({
        interventionId: 1,
        reason: "Urgent production need",
      });
      expect(result.success).toBe(true);
      const d = new Date(result.timestamp!);
      expect(d.getTime()).not.toBeNaN();
    });

    it("returns success=false for non-existent intervention", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.override({
        interventionId: 9999,
        reason: "Does not exist",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("9999");
      expect(result.error).toContain("not found");
    });

    it("records the correct previousStatus for PENDING_TRAINING", async () => {
      const caller = createAuthenticatedCaller();
      // Intervention 2 has status PENDING_TRAINING
      const result = await caller.aiIntervention.override({
        interventionId: 2,
        reason: "Manager decision to unblock operator",
      });
      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe("PENDING_TRAINING");
      expect(result.newStatus).toBe("OVERRIDDEN");
    });

    it("records the correct previousStatus for COMPLETED intervention", async () => {
      const caller = createAuthenticatedCaller();
      // Intervention 4 has status COMPLETED
      const result = await caller.aiIntervention.override({
        interventionId: 4,
        reason: "Override completed intervention for admin purposes",
      });
      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe("COMPLETED");
    });

    it("records the correct previousStatus for already OVERRIDDEN intervention", async () => {
      const caller = createAuthenticatedCaller();
      // Intervention 5 already OVERRIDDEN
      const result = await caller.aiIntervention.override({
        interventionId: 5,
        reason: "Re-override for documentation",
      });
      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe("OVERRIDDEN");
    });

    it("uses ctx.user.name as overriddenBy", async () => {
      const caller = createAuthenticatedCaller({ name: "王总监" });
      const result = await caller.aiIntervention.override({
        interventionId: 1,
        reason: "Manager override",
      });
      expect(result.overriddenBy).toBe("王总监");
    });

    it("falls back to User#id when user has no name", async () => {
      const caller = createAuthenticatedCaller({ id: 42, name: undefined as any });
      const result = await caller.aiIntervention.override({
        interventionId: 1,
        reason: "Override without name",
      });
      expect(result.overriddenBy).toBe("User#42");
    });

    it("rejects empty reason (min 1 char)", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.aiIntervention.override({
          interventionId: 1,
          reason: "",
        })
      ).rejects.toThrow();
    });

    it("works with admin caller", async () => {
      const caller = createAdminCaller({ name: "Admin User" });
      const result = await caller.aiIntervention.override({
        interventionId: 3,
        reason: "Admin override",
      });
      expect(result.success).toBe(true);
      expect(result.overriddenBy).toBe("Admin User");
    });
  });

  // ─── Authentication guards ────────────────────────────────
  describe("authentication", () => {
    it("rejects anonymous for dashboard", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.aiIntervention.dashboard()).rejects.toThrow();
    });

    it("rejects anonymous for checkAccess", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.aiIntervention.checkAccess({
          userId: 1002,
          machineId: 101,
          machineCode: "CNC-001",
        })
      ).rejects.toThrow();
    });

    it("rejects anonymous for runScan", async () => {
      const caller = createAnonymousCaller();
      await expect(caller.aiIntervention.runScan()).rejects.toThrow();
    });

    it("rejects anonymous for override", async () => {
      const caller = createAnonymousCaller();
      await expect(
        caller.aiIntervention.override({
          interventionId: 1,
          reason: "Should not work",
        })
      ).rejects.toThrow();
    });
  });

  // ─── Input validation ─────────────────────────────────────
  describe("input validation", () => {
    it("checkAccess rejects missing userId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.aiIntervention.checkAccess({
          machineId: 101,
          machineCode: "CNC-001",
        } as any)
      ).rejects.toThrow();
    });

    it("checkAccess rejects missing machineId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.aiIntervention.checkAccess({
          userId: 1002,
          machineCode: "CNC-001",
        } as any)
      ).rejects.toThrow();
    });

    it("checkAccess rejects missing machineCode", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.aiIntervention.checkAccess({
          userId: 1002,
          machineId: 101,
        } as any)
      ).rejects.toThrow();
    });

    it("override rejects missing interventionId", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.aiIntervention.override({
          reason: "Test reason",
        } as any)
      ).rejects.toThrow();
    });

    it("override rejects missing reason", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.aiIntervention.override({
          interventionId: 1,
        } as any)
      ).rejects.toThrow();
    });

    it("checkAccess rejects string userId (expects number)", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.aiIntervention.checkAccess({
          userId: "abc" as any,
          machineId: 101,
          machineCode: "CNC-001",
        })
      ).rejects.toThrow();
    });

    it("override rejects string interventionId (expects number)", async () => {
      const caller = createAuthenticatedCaller();
      await expect(
        caller.aiIntervention.override({
          interventionId: "abc" as any,
          reason: "Test reason",
        })
      ).rejects.toThrow();
    });
  });

  // ─── Data consistency ─────────────────────────────────────
  describe("data consistency", () => {
    it("dashboard modules include all categories used by interventions", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      const moduleIds = new Set(result.modules.map((m: any) => m.id));
      for (const intv of result.interventions) {
        expect(moduleIds.has(intv.assignedModuleId)).toBe(true);
      }
    });

    it("dashboard intervention statuses are all valid", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      const validStatuses = ["PENDING_TRAINING", "IN_PROGRESS", "COMPLETED", "OVERRIDDEN", "EXPIRED"];
      for (const intv of result.interventions) {
        expect(validStatuses).toContain(intv.status);
      }
    });

    it("dashboard intervention triggerTypes are all valid", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      const validTriggers = ["QUALITY_DEFECT", "COLLABORATION_LOW", "SAFETY_INCIDENT", "CERT_EXPIRING", "MANUAL"];
      for (const intv of result.interventions) {
        expect(validTriggers).toContain(intv.triggerType);
      }
    });

    it("dashboard summary counts add up correctly", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      // activeBlocking + completed + overridden should account for most/all
      // (there could also be EXPIRED ones, but mock data has none)
      const accounted = result.summary.activeBlocking + result.summary.completed + result.summary.overridden;
      expect(accounted).toBe(result.summary.total);
    });

    it("dashboard qualityTriggers + collaborationTriggers equals total", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.dashboard();
      // All mock interventions are either QUALITY_DEFECT or COLLABORATION_LOW
      expect(result.summary.qualityTriggers + result.summary.collaborationTriggers).toBe(result.summary.total);
    });

    it("checkAccess returns consistent data for blocked user", async () => {
      const caller = createAuthenticatedCaller();
      const result = await caller.aiIntervention.checkAccess({
        userId: 1005,
        machineId: 201,
        machineCode: "HYD-BENCH-001",
      });
      expect(result.accessGranted).toBe(false);
      const blocking = result.blockedByIntervention!;
      expect(blocking.userId).toBe(1005);
      expect(blocking.blockedMachineId).toBe(201);
      expect(blocking.blockedMachineCode).toBe("HYD-BENCH-001");
    });
  });
});
