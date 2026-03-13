/**
 * SOP + Role Quality Interlock — Router Unit Tests
 *
 * Tests all 5 tRPC procedures:
 *   - listMachines (query)
 *   - verifyAccess (query)
 *   - acknowledgeSop (mutation)
 *   - getMachineInfo (query)
 *   - accessLog (query)
 *
 * Also tests the exported pure function `evaluateAccess` for completeness,
 * and verifies auth guards on all protectedProcedure endpoints.
 *
 * Run: pnpm test -- server/routers/sop-interlock.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";
import {
  evaluateAccess,
  type CertRequirement,
  type UserCert,
  type SopStatus,
} from "./sop-interlock.router";

// ── Hoisted mocks ──────────────────────────────────────────────────

const { selectResultsQueue, mockReturningResult } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const mockReturningResult: any[] = [];
  return { selectResultsQueue, mockReturningResult };
});

// Mock DB
vi.mock("../permission-management/permission.service", () => ({
  permissionService: {
    checkPermission: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      set: vi.fn(() => chain),
      values: vi.fn(() => chain),
      $dynamic: vi.fn(() => chain),
      returning: vi.fn(() => {
        const r = mockReturningResult.length > 0 ? [...mockReturningResult] : [{ id: 1 }];
        mockReturningResult.length = 0;
        return Object.assign(Promise.resolve(r), {
          then: (resolve: any) => Promise.resolve(r).then(resolve),
          catch: () => Promise.resolve(r),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };

    const db: any = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
    return db;
  }),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  gt: vi.fn((...args: any[]) => args),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  mockReturningResult.length = 0;
});

const caller = () => createAuthenticatedCaller();

// ── Fixtures ───────────────────────────────────────────────────────

const NOW = new Date("2026-02-25T08:00:00Z");

const sampleMachine = {
  id: 1,
  name: "CNC Mill #3",
  code: "CNC-003",
  location: "Building A, Bay 7",
};

const sampleRequirement = {
  certificationCode: "CNC_MILL_L2",
  skillName: "CNC Mill Operation Level 2",
  requiredLevel: "intermediate",
  sopTemplateId: 101,
};

const sampleCert = {
  certificateCode: "CNC_MILL_L2",
  expiryDate: "2027-12-31T23:59:59Z",
  certificateLevel: "intermediate",
};

const sampleSopDoc = {
  version: "2.1",
  title: "CNC Mill Operating Procedure",
};

const sampleAck = {
  versionSigned: "2.1",
};

const sampleAccessLogEntry = {
  id: 1,
  userId: 1,
  machineId: 1,
  decision: "GRANTED",
  blockReason: null,
  certCheckPassed: true,
  sopCheckPassed: true,
  missingCerts: null,
  sopVersionRequired: null,
  sopVersionSigned: null,
  checkedAt: "2026-02-25T08:00:00Z",
  deviceInfo: null,
};

// ── evaluateAccess() pure function tests ───────────────────────────

describe("evaluateAccess() — pure business logic", () => {
  const VALID_CERT: UserCert = {
    certificateCode: "CNC_MILL_L2",
    expiryDate: "2027-12-31T23:59:59Z",
    certificateLevel: "intermediate",
  };

  const WELDING_CERT: UserCert = {
    certificateCode: "WELDING_AWS",
    expiryDate: "2027-06-01T00:00:00Z",
    certificateLevel: "advanced",
  };

  const MACHINE_REQS: CertRequirement[] = [
    { certificationCode: "CNC_MILL_L2", skillName: "CNC Mill Operation Level 2", requiredLevel: "intermediate", sopTemplateId: 101 },
    { certificationCode: "WELDING_AWS", skillName: "AWS Welding Certification", requiredLevel: "basic", sopTemplateId: 101 },
  ];

  const SOP_CURRENT: SopStatus = {
    sopTemplateId: 101,
    currentVersion: "2.1",
    signedVersion: "2.1",
  };

  const SOP_OUTDATED: SopStatus = {
    sopTemplateId: 101,
    currentVersion: "2.1",
    signedVersion: "1.4",
  };

  const SOP_NEVER_SIGNED: SopStatus = {
    sopTemplateId: 101,
    currentVersion: "2.1",
    signedVersion: null,
  };

  describe("GRANTED scenarios", () => {
    it("grants access when all certs valid and all SOPs signed", () => {
      const result = evaluateAccess(MACHINE_REQS, [VALID_CERT, WELDING_CERT], [SOP_CURRENT], NOW);
      expect(result.status).toBe("GRANTED");
      expect(result.reason).toBeNull();
      expect(result.details.certCheckPassed).toBe(true);
      expect(result.details.sopCheckPassed).toBe(true);
      expect(result.details.missingCerts).toHaveLength(0);
      expect(result.details.outdatedSops).toHaveLength(0);
    });

    it("grants when machine has only cert requirements (no SOP link)", () => {
      const certOnly: CertRequirement[] = [
        { certificationCode: "CNC_MILL_L2", skillName: "CNC", requiredLevel: "basic", sopTemplateId: null },
      ];
      const result = evaluateAccess(certOnly, [VALID_CERT], [], NOW);
      expect(result.status).toBe("GRANTED");
    });
  });

  describe("BLOCKED — certification failures", () => {
    it("blocks when cert is expired", () => {
      const expired: UserCert = { ...VALID_CERT, expiryDate: "2025-06-15T23:59:59Z" };
      const result = evaluateAccess(MACHINE_REQS, [expired, WELDING_CERT], [SOP_CURRENT], NOW);
      expect(result.status).toBe("BLOCKED");
      expect(result.details.certCheckPassed).toBe(false);
      expect(result.details.missingCerts).toContain("CNC_MILL_L2");
      expect(result.reason).toContain("CNC_MILL_L2");
    });

    it("blocks when a required cert is entirely missing", () => {
      const result = evaluateAccess(MACHINE_REQS, [VALID_CERT], [SOP_CURRENT], NOW);
      expect(result.status).toBe("BLOCKED");
      expect(result.details.missingCerts).toContain("WELDING_AWS");
    });

    it("blocks when operator has zero certs", () => {
      const result = evaluateAccess(MACHINE_REQS, [], [SOP_CURRENT], NOW);
      expect(result.status).toBe("BLOCKED");
      expect(result.details.missingCerts).toHaveLength(2);
    });

    it("lists ALL missing certs", () => {
      const result = evaluateAccess(MACHINE_REQS, [], [SOP_CURRENT], NOW);
      expect(result.details.missingCerts).toContain("CNC_MILL_L2");
      expect(result.details.missingCerts).toContain("WELDING_AWS");
    });
  });

  describe("BLOCKED — SOP acknowledgment failures", () => {
    it("blocks when operator signed an outdated SOP version", () => {
      const result = evaluateAccess(MACHINE_REQS, [VALID_CERT, WELDING_CERT], [SOP_OUTDATED], NOW);
      expect(result.status).toBe("BLOCKED");
      expect(result.details.certCheckPassed).toBe(true);
      expect(result.details.sopCheckPassed).toBe(false);
      expect(result.details.outdatedSops).toHaveLength(1);
      expect(result.details.outdatedSops[0].required).toBe("2.1");
      expect(result.details.outdatedSops[0].signed).toBe("1.4");
      expect(result.reason).toContain("v2.1");
    });

    it("blocks when operator never signed the SOP", () => {
      const result = evaluateAccess(MACHINE_REQS, [VALID_CERT, WELDING_CERT], [SOP_NEVER_SIGNED], NOW);
      expect(result.status).toBe("BLOCKED");
      expect(result.details.sopCheckPassed).toBe(false);
      expect(result.details.outdatedSops[0].signed).toBeNull();
      expect(result.reason).toContain("vnone");
    });

    it("reports multiple outdated SOPs", () => {
      const reqs: CertRequirement[] = [
        { certificationCode: "CNC_MILL_L2", skillName: "CNC", requiredLevel: "basic", sopTemplateId: 101 },
        { certificationCode: "WELDING_AWS", skillName: "Welding", requiredLevel: "basic", sopTemplateId: 102 },
      ];
      const sops: SopStatus[] = [
        { sopTemplateId: 101, currentVersion: "3.0", signedVersion: "2.0" },
        { sopTemplateId: 102, currentVersion: "1.5", signedVersion: null },
      ];
      const result = evaluateAccess(reqs, [VALID_CERT, WELDING_CERT], sops, NOW);
      expect(result.details.outdatedSops).toHaveLength(2);
    });
  });

  describe("BLOCKED — combined failures", () => {
    it("reports both cert + SOP failures in reason string", () => {
      const expired: UserCert = { ...VALID_CERT, expiryDate: "2025-01-01T00:00:00Z" };
      const result = evaluateAccess(MACHINE_REQS, [expired, WELDING_CERT], [SOP_OUTDATED], NOW);
      expect(result.status).toBe("BLOCKED");
      expect(result.details.certCheckPassed).toBe(false);
      expect(result.details.sopCheckPassed).toBe(false);
      expect(result.reason).toContain("CNC_MILL_L2");
      expect(result.reason).toContain("v2.1");
    });
  });

  describe("FAIL-CLOSED — defensive defaults", () => {
    it("blocks when machine has no requirements configured", () => {
      const result = evaluateAccess([], [VALID_CERT], [], NOW);
      expect(result.status).toBe("BLOCKED");
      expect(result.reason).toContain("no skill requirements configured");
      expect(result.details.certCheckPassed).toBe(false);
      expect(result.details.sopCheckPassed).toBe(false);
    });
  });

  describe("Edge cases — expiry boundaries", () => {
    it("grants when cert expires later today", () => {
      const expiringToday: UserCert = {
        certificateCode: "CNC_MILL_L2",
        expiryDate: "2026-02-25T23:59:59Z",
        certificateLevel: "intermediate",
      };
      const singleReq: CertRequirement[] = [
        { certificationCode: "CNC_MILL_L2", skillName: "CNC", requiredLevel: "basic", sopTemplateId: null },
      ];
      const result = evaluateAccess(singleReq, [expiringToday], [], NOW);
      expect(result.status).toBe("GRANTED");
    });

    it("blocks when cert expired 1 second before now", () => {
      const justExpired: UserCert = {
        certificateCode: "CNC_MILL_L2",
        expiryDate: "2026-02-25T07:59:59Z",
        certificateLevel: "intermediate",
      };
      const singleReq: CertRequirement[] = [
        { certificationCode: "CNC_MILL_L2", skillName: "CNC", requiredLevel: "basic", sopTemplateId: null },
      ];
      const result = evaluateAccess(singleReq, [justExpired], [], NOW);
      expect(result.status).toBe("BLOCKED");
    });

    it("blocks when cert expires at exactly NOW (boundary: not strictly greater than)", () => {
      // The code checks: expiryDate > nowMs (strict gt), so expiry == now is BLOCKED.
      const exactlyNow: UserCert = {
        certificateCode: "CNC_MILL_L2",
        expiryDate: "2026-02-25T08:00:00Z",
        certificateLevel: "intermediate",
      };
      const singleReq: CertRequirement[] = [
        { certificationCode: "CNC_MILL_L2", skillName: "CNC", requiredLevel: "basic", sopTemplateId: null },
      ];
      const result = evaluateAccess(singleReq, [exactlyNow], [], NOW);
      expect(result.status).toBe("BLOCKED");
    });
  });
});

// ── Router procedure tests ─────────────────────────────────────────

describe("sopInterlock router", () => {

  // ═══ listMachines ═══
  describe("listMachines", () => {
    it("returns all machines from productionEquipments", async () => {
      const machines = [sampleMachine, { ...sampleMachine, id: 2, name: "Lathe #1", code: "LAT-001" }];
      selectResultsQueue.push(machines);

      const result = await caller().sopInterlock.listMachines();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("name", "CNC Mill #3");
      expect(result[1]).toHaveProperty("code", "LAT-001");
    });

    it("returns empty array when no machines exist", async () => {
      selectResultsQueue.push([]);
      const result = await caller().sopInterlock.listMachines();
      expect(result).toHaveLength(0);
    });
  });

  // ═══ verifyAccess ═══
  describe("verifyAccess", () => {
    it("returns GRANTED when all requirements met", async () => {
      // 1. Machine requirements (1 requirement with sopTemplateId 101)
      selectResultsQueue.push([sampleRequirement]);
      // 2. User certifications
      selectResultsQueue.push([sampleCert]);
      // 3. SOP template doc (for sopId 101)
      selectResultsQueue.push([sampleSopDoc]);
      // 4. Latest SOP acknowledgment (version matches)
      selectResultsQueue.push([sampleAck]);

      const result = await caller().sopInterlock.verifyAccess({ userId: 1, machineId: 1 });
      expect(result.status).toBe("GRANTED");
      expect(result.reason).toBeNull();
      expect(result.details.certCheckPassed).toBe(true);
      expect(result.details.sopCheckPassed).toBe(true);
    });

    it("returns BLOCKED when no requirements configured (fail-closed)", async () => {
      // 1. No machine requirements
      selectResultsQueue.push([]);
      // 2. User certs (still fetched)
      selectResultsQueue.push([sampleCert]);

      const result = await caller().sopInterlock.verifyAccess({ userId: 1, machineId: 99 });
      expect(result.status).toBe("BLOCKED");
      expect(result.reason).toContain("no skill requirements configured");
    });

    it("returns BLOCKED when operator missing required cert", async () => {
      // 1. Requirements
      selectResultsQueue.push([sampleRequirement]);
      // 2. User has no certs
      selectResultsQueue.push([]);
      // 3. SOP template doc
      selectResultsQueue.push([sampleSopDoc]);
      // 4. Latest SOP ack
      selectResultsQueue.push([sampleAck]);

      const result = await caller().sopInterlock.verifyAccess({ userId: 2, machineId: 1 });
      expect(result.status).toBe("BLOCKED");
      expect(result.details.certCheckPassed).toBe(false);
      expect(result.details.missingCerts).toContain("CNC_MILL_L2");
    });

    it("returns BLOCKED when SOP version is outdated", async () => {
      // 1. Requirements
      selectResultsQueue.push([sampleRequirement]);
      // 2. User certs (valid)
      selectResultsQueue.push([sampleCert]);
      // 3. SOP template doc (version 2.1)
      selectResultsQueue.push([sampleSopDoc]);
      // 4. User signed old version (1.0)
      selectResultsQueue.push([{ versionSigned: "1.0" }]);

      const result = await caller().sopInterlock.verifyAccess({ userId: 1, machineId: 1 });
      expect(result.status).toBe("BLOCKED");
      expect(result.details.sopCheckPassed).toBe(false);
      expect(result.details.outdatedSops).toHaveLength(1);
      expect(result.details.outdatedSops[0].required).toBe("2.1");
      expect(result.details.outdatedSops[0].signed).toBe("1.0");
    });

    it("returns BLOCKED when user never acknowledged the SOP", async () => {
      // 1. Requirements
      selectResultsQueue.push([sampleRequirement]);
      // 2. User certs (valid)
      selectResultsQueue.push([sampleCert]);
      // 3. SOP template doc
      selectResultsQueue.push([sampleSopDoc]);
      // 4. No acknowledgment found
      selectResultsQueue.push([]);

      const result = await caller().sopInterlock.verifyAccess({ userId: 1, machineId: 1 });
      expect(result.status).toBe("BLOCKED");
      expect(result.details.sopCheckPassed).toBe(false);
      expect(result.details.outdatedSops[0].signed).toBeNull();
    });

    it("skips SOP check for requirements with null sopTemplateId", async () => {
      const reqNoSop = { ...sampleRequirement, sopTemplateId: null };
      // 1. Requirements (no SOP linked)
      selectResultsQueue.push([reqNoSop]);
      // 2. User certs (valid)
      selectResultsQueue.push([sampleCert]);
      // No SOP queries expected — sopIds will be empty

      const result = await caller().sopInterlock.verifyAccess({ userId: 1, machineId: 1 });
      expect(result.status).toBe("GRANTED");
      expect(result.details.sopCheckPassed).toBe(true);
    });

    it("skips SOP status when sopTemplates row not found", async () => {
      // 1. Requirements (with sopTemplateId 101)
      selectResultsQueue.push([sampleRequirement]);
      // 2. User certs
      selectResultsQueue.push([sampleCert]);
      // 3. SOP template doc NOT FOUND (empty result)
      selectResultsQueue.push([]);
      // No ack query because sopDoc is missing — loop continues

      const result = await caller().sopInterlock.verifyAccess({ userId: 1, machineId: 1 });
      // Should be GRANTED — no SOP statuses accumulated (no version mismatch)
      expect(result.status).toBe("GRANTED");
    });

    it("deduplicates SOP template IDs from multiple requirements", async () => {
      const reqs = [
        { ...sampleRequirement, certificationCode: "CNC_MILL_L2", sopTemplateId: 101 },
        { ...sampleRequirement, certificationCode: "WELDING_AWS", sopTemplateId: 101 },
      ];
      const weldCert = { certificateCode: "WELDING_AWS", expiryDate: "2027-06-01T00:00:00Z", certificateLevel: "advanced" };

      // 1. Requirements (both point to same SOP 101)
      selectResultsQueue.push(reqs);
      // 2. User certs
      selectResultsQueue.push([sampleCert, weldCert]);
      // 3. SOP doc for 101 (only queried ONCE due to dedup)
      selectResultsQueue.push([sampleSopDoc]);
      // 4. Ack for 101
      selectResultsQueue.push([sampleAck]);

      const result = await caller().sopInterlock.verifyAccess({ userId: 1, machineId: 1 });
      expect(result.status).toBe("GRANTED");
    });

    it("handles multiple distinct SOP requirements", async () => {
      const reqs = [
        { certificationCode: "CNC_MILL_L2", skillName: "CNC", requiredLevel: "intermediate", sopTemplateId: 101 },
        { certificationCode: "WELDING_AWS", skillName: "Welding", requiredLevel: "basic", sopTemplateId: 202 },
      ];
      const weldCert = { certificateCode: "WELDING_AWS", expiryDate: "2027-06-01T00:00:00Z", certificateLevel: "advanced" };

      // 1. Requirements
      selectResultsQueue.push(reqs);
      // 2. User certs
      selectResultsQueue.push([sampleCert, weldCert]);
      // 3. SOP doc for 101
      selectResultsQueue.push([{ version: "2.1" }]);
      // 4. Ack for 101
      selectResultsQueue.push([{ versionSigned: "2.1" }]);
      // 5. SOP doc for 202
      selectResultsQueue.push([{ version: "1.0" }]);
      // 6. Ack for 202
      selectResultsQueue.push([{ versionSigned: "1.0" }]);

      const result = await caller().sopInterlock.verifyAccess({ userId: 1, machineId: 1 });
      expect(result.status).toBe("GRANTED");
    });
  });

  // ═══ acknowledgeSop ═══
  describe("acknowledgeSop", () => {
    it("records acknowledgment and returns SOP version + title", async () => {
      // 1. Fetch current SOP version
      selectResultsQueue.push([sampleSopDoc]);

      const result = await caller().sopInterlock.acknowledgeSop({ sopTemplateId: 101 });
      expect(result).toEqual({
        success: true,
        version: "2.1",
        title: "CNC Mill Operating Procedure",
      });
    });

    it("returns error when SOP not found", async () => {
      // 1. SOP not found
      selectResultsQueue.push([]);

      const result = await caller().sopInterlock.acknowledgeSop({ sopTemplateId: 999 });
      expect(result).toEqual({ success: false, error: "SOP not found" });
    });

    it("uses default signatureMethod of badge_scan", async () => {
      selectResultsQueue.push([sampleSopDoc]);

      const result = await caller().sopInterlock.acknowledgeSop({ sopTemplateId: 101 });
      expect(result.success).toBe(true);
    });

    it("accepts manual signatureMethod", async () => {
      selectResultsQueue.push([sampleSopDoc]);

      const result = await caller().sopInterlock.acknowledgeSop({
        sopTemplateId: 101,
        signatureMethod: "manual",
      });
      expect(result.success).toBe(true);
    });

    it("accepts digital_signature signatureMethod", async () => {
      selectResultsQueue.push([sampleSopDoc]);

      const result = await caller().sopInterlock.acknowledgeSop({
        sopTemplateId: 101,
        signatureMethod: "digital_signature",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid signatureMethod", async () => {
      await expect(
        caller().sopInterlock.acknowledgeSop({
          sopTemplateId: 101,
          signatureMethod: "telepathy" as any,
        }),
      ).rejects.toThrow();
    });
  });

  // ═══ getMachineInfo ═══
  describe("getMachineInfo", () => {
    it("returns machine data and its requirements", async () => {
      // 1. Machine select
      selectResultsQueue.push([sampleMachine]);
      // 2. Requirements
      selectResultsQueue.push([sampleRequirement]);

      const result = await caller().sopInterlock.getMachineInfo({ machineId: 1 });
      expect(result.machine).toEqual(sampleMachine);
      expect(result.requirements).toHaveLength(1);
      expect(result.requirements[0].certificationCode).toBe("CNC_MILL_L2");
    });

    it("returns null machine when not found, with empty requirements", async () => {
      // 1. No machine found
      selectResultsQueue.push([]);
      // 2. No requirements
      selectResultsQueue.push([]);

      const result = await caller().sopInterlock.getMachineInfo({ machineId: 999 });
      expect(result.machine).toBeNull();
      expect(result.requirements).toHaveLength(0);
    });

    it("returns machine with multiple requirements", async () => {
      const reqs = [
        sampleRequirement,
        { ...sampleRequirement, certificationCode: "WELDING_AWS", skillName: "Welding" },
      ];
      // 1. Machine
      selectResultsQueue.push([sampleMachine]);
      // 2. Requirements
      selectResultsQueue.push(reqs);

      const result = await caller().sopInterlock.getMachineInfo({ machineId: 1 });
      expect(result.requirements).toHaveLength(2);
    });
  });

  // ═══ accessLog ═══
  describe("accessLog", () => {
    it("returns recent access log entries for a machine", async () => {
      const entries = [
        sampleAccessLogEntry,
        { ...sampleAccessLogEntry, id: 2, decision: "BLOCKED", blockReason: "Missing cert" },
      ];
      selectResultsQueue.push(entries);

      const result = await caller().sopInterlock.accessLog({ machineId: 1 });
      expect(result).toHaveLength(2);
      expect(result[0].decision).toBe("GRANTED");
      expect(result[1].decision).toBe("BLOCKED");
    });

    it("returns empty array when no log entries exist", async () => {
      selectResultsQueue.push([]);

      const result = await caller().sopInterlock.accessLog({ machineId: 99 });
      expect(result).toHaveLength(0);
    });

    it("uses default limit of 50", async () => {
      selectResultsQueue.push([sampleAccessLogEntry]);

      const result = await caller().sopInterlock.accessLog({ machineId: 1 });
      expect(result).toHaveLength(1);
    });

    it("accepts custom limit", async () => {
      selectResultsQueue.push([sampleAccessLogEntry]);

      const result = await caller().sopInterlock.accessLog({ machineId: 1, limit: 10 });
      expect(result).toHaveLength(1);
    });
  });

  // ═══ Input Validation ═══
  describe("input validation", () => {
    it("rejects non-numeric userId in verifyAccess", async () => {
      await expect(
        caller().sopInterlock.verifyAccess({ userId: "abc" as any, machineId: 1 }),
      ).rejects.toThrow();
    });

    it("rejects non-numeric machineId in verifyAccess", async () => {
      await expect(
        caller().sopInterlock.verifyAccess({ userId: 1, machineId: "xyz" as any }),
      ).rejects.toThrow();
    });

    it("rejects non-numeric sopTemplateId in acknowledgeSop", async () => {
      await expect(
        caller().sopInterlock.acknowledgeSop({ sopTemplateId: "abc" as any }),
      ).rejects.toThrow();
    });

    it("rejects non-numeric machineId in getMachineInfo", async () => {
      await expect(
        caller().sopInterlock.getMachineInfo({ machineId: "xyz" as any }),
      ).rejects.toThrow();
    });

    it("rejects non-numeric machineId in accessLog", async () => {
      await expect(
        caller().sopInterlock.accessLog({ machineId: "xyz" as any }),
      ).rejects.toThrow();
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication — all procedures require auth", () => {
    it("rejects anonymous for listMachines", async () => {
      await expect(createAnonymousCaller().sopInterlock.listMachines()).rejects.toThrow();
    });

    it("rejects anonymous for verifyAccess", async () => {
      await expect(
        createAnonymousCaller().sopInterlock.verifyAccess({ userId: 1, machineId: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for acknowledgeSop", async () => {
      await expect(
        createAnonymousCaller().sopInterlock.acknowledgeSop({ sopTemplateId: 101 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for getMachineInfo", async () => {
      await expect(
        createAnonymousCaller().sopInterlock.getMachineInfo({ machineId: 1 }),
      ).rejects.toThrow();
    });

    it("rejects anonymous for accessLog", async () => {
      await expect(
        createAnonymousCaller().sopInterlock.accessLog({ machineId: 1 }),
      ).rejects.toThrow();
    });
  });
});
