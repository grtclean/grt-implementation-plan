import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

// ── Mock queues ──────────────────────────────────────────────────────────

const selectResultsQueue: any[][] = [];
const returningQueue: any[][] = [];

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(() => {
    const result = selectResultsQueue.shift() || [];
    return Promise.resolve(result);
  }),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(() => {
    return Promise.resolve(returningQueue.shift() || [{ id: 1 }]);
  }),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  execute: vi.fn(),
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../../drizzle/plc-program-schema", () => ({
  plcProjects: { id: "id" },
  plcProgramModules: {
    id: "id",
    plcProjectId: "plc_project_id",
    moduleNumber: "module_number",
    sourceCode: "source_code",
    moduleName: "module_name",
  },
  plcVersionHistory: {
    id: "id",
    plcProjectId: "plc_project_id",
    isActive: "is_active",
    isFrozen: "is_frozen",
    versionString: "version_string",
    createdAt: "created_at",
  },
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Import after mocks
import {
  computeDigitalFingerprint,
  promoteVersion,
  verifyProductionIntegrity,
  assertNotFrozen,
} from "./plc-version-promotion.service";

// ── Helpers ──────────────────────────────────────────────────────────────

function expectedSha256(...parts: string[]): string {
  const hash = createHash("sha256");
  for (const p of parts) hash.update(p);
  return hash.digest("hex");
}

beforeEach(() => {
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════
// 1. computeDigitalFingerprint
// ═════════════════════════════════════════════════════════════════════════

describe("computeDigitalFingerprint", () => {
  it("returns SHA-256 of sorted modules (moduleNumber:sourceCode)", async () => {
    selectResultsQueue.push([
      { moduleNumber: "FB100", sourceCode: "IF x THEN y END_IF;" },
      { moduleNumber: "OB1", sourceCode: "CALL FB100, DB100;" },
    ]);

    const fp = await computeDigitalFingerprint(1);

    const expected = expectedSha256(
      "FB100:IF x THEN y END_IF;",
      "OB1:CALL FB100, DB100;",
    );
    expect(fp).toBe(expected);
    expect(fp).toHaveLength(64); // SHA-256 hex
  });

  it("treats null sourceCode as empty string", async () => {
    selectResultsQueue.push([
      { moduleNumber: "DB50", sourceCode: null },
    ]);

    const fp = await computeDigitalFingerprint(2);

    const expected = expectedSha256("DB50:");
    expect(fp).toBe(expected);
  });

  it("returns deterministic hash for empty project (no modules)", async () => {
    selectResultsQueue.push([]);

    const fp = await computeDigitalFingerprint(99);

    // SHA-256 of empty input
    const expected = createHash("sha256").digest("hex");
    expect(fp).toBe(expected);
  });

  it("produces different fingerprints for different source code", async () => {
    selectResultsQueue.push([
      { moduleNumber: "OB1", sourceCode: "version_A" },
    ]);
    const fpA = await computeDigitalFingerprint(1);

    selectResultsQueue.push([
      { moduleNumber: "OB1", sourceCode: "version_B" },
    ]);
    const fpB = await computeDigitalFingerprint(1);

    expect(fpA).not.toBe(fpB);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 2. promoteVersion
// ═════════════════════════════════════════════════════════════════════════

describe("promoteVersion", () => {
  // ── dev → test ──────────────────────────────────────────────────────

  describe("dev → test", () => {
    it("succeeds when all modules have sourceCode", async () => {
      // 1st select: active version lookup
      selectResultsQueue.push([
        {
          id: 10,
          plcProjectId: 1,
          versionType: "dev",
          versionNumber: "1.0.0",
          versionString: "V1.0.0-dev",
          isActive: true,
          isFrozen: false,
          testResults: {},
        },
      ]);
      // 2nd select: modules for dev→test validation
      selectResultsQueue.push([
        { id: 1, sourceCode: "FUNCTION_BLOCK FB100\nEND_FUNCTION_BLOCK", moduleName: "Main" },
        { id: 2, sourceCode: "ORGANIZATION_BLOCK OB1\nEND_ORGANIZATION_BLOCK", moduleName: "Cyclic" },
      ]);
      // 3rd select: modules for fingerprint computation
      selectResultsQueue.push([
        { moduleNumber: "FB100", sourceCode: "FUNCTION_BLOCK FB100\nEND_FUNCTION_BLOCK" },
        { moduleNumber: "OB1", sourceCode: "ORGANIZATION_BLOCK OB1\nEND_ORGANIZATION_BLOCK" },
      ]);
      returningQueue.push([{ id: 20 }]);

      const result = await promoteVersion({
        plcProjectId: 1,
        from: "dev",
        to: "test",
        promotedBy: "engineer@grt.com",
        changeLog: "Initial test promotion",
      });

      expect(result.versionId).toBe(20);
      expect(result.versionString).toBe("V1.1.0-test"); // minor bump
      expect(result.fingerprint).toHaveLength(64);
    });

    it("fails when a module has empty sourceCode", async () => {
      // Active version
      selectResultsQueue.push([
        {
          id: 10,
          plcProjectId: 1,
          versionType: "dev",
          versionNumber: "1.0.0",
          versionString: "V1.0.0-dev",
          isActive: true,
          isFrozen: false,
          testResults: {},
        },
      ]);
      // Modules — one empty
      selectResultsQueue.push([
        { id: 1, sourceCode: "valid code", moduleName: "FB_Main" },
        { id: 2, sourceCode: "", moduleName: "FB_Safety" },
        { id: 3, sourceCode: "   ", moduleName: "FC_Comm" },
      ]);

      await expect(
        promoteVersion({
          plcProjectId: 1,
          from: "dev",
          to: "test",
          promotedBy: "eng",
          changeLog: "test",
        }),
      ).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
        message: expect.stringContaining("2 module(s) have empty source code"),
      });
    });

    it("fails when a module has null sourceCode", async () => {
      selectResultsQueue.push([
        {
          id: 10,
          plcProjectId: 1,
          versionType: "dev",
          versionNumber: "1.0.0",
          versionString: "V1.0.0-dev",
          isActive: true,
          isFrozen: false,
          testResults: {},
        },
      ]);
      selectResultsQueue.push([
        { id: 1, sourceCode: null, moduleName: "EmptyModule" },
      ]);

      await expect(
        promoteVersion({
          plcProjectId: 1,
          from: "dev",
          to: "test",
          promotedBy: "eng",
          changeLog: "test",
        }),
      ).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
        message: expect.stringContaining("1 module(s) have empty source code"),
      });
    });
  });

  // ── test → production ───────────────────────────────────────────────

  describe("test → production", () => {
    it("succeeds when fatPassed=true in testResults param", async () => {
      // Active version
      selectResultsQueue.push([
        {
          id: 15,
          plcProjectId: 1,
          versionType: "test",
          versionNumber: "1.1.0",
          versionString: "V1.1.0-test",
          isActive: true,
          isFrozen: false,
          testResults: {},
        },
      ]);
      // Fingerprint modules
      selectResultsQueue.push([
        { moduleNumber: "OB1", sourceCode: "main code" },
      ]);
      returningQueue.push([{ id: 30 }]);

      const result = await promoteVersion({
        plcProjectId: 1,
        from: "test",
        to: "production",
        promotedBy: "qa@grt.com",
        changeLog: "Production release",
        testResults: { fatPassed: true, satPassed: true, notes: "All pass" },
      });

      expect(result.versionId).toBe(30);
      expect(result.versionString).toBe("V2.1.0-production"); // major bump
      expect(result.fingerprint).toHaveLength(64);
    });

    it("succeeds when fatPassed is on the active version record (no explicit testResults)", async () => {
      selectResultsQueue.push([
        {
          id: 15,
          plcProjectId: 1,
          versionType: "test",
          versionNumber: "1.2.0",
          versionString: "V1.2.0-test",
          isActive: true,
          isFrozen: false,
          testResults: { fatPassed: true },
        },
      ]);
      selectResultsQueue.push([
        { moduleNumber: "OB1", sourceCode: "main" },
      ]);
      returningQueue.push([{ id: 31 }]);

      const result = await promoteVersion({
        plcProjectId: 1,
        from: "test",
        to: "production",
        promotedBy: "qa@grt.com",
        changeLog: "Prod v2",
      });

      expect(result.versionId).toBe(31);
      expect(result.versionString).toBe("V2.2.0-production");
    });

    it("fails when FAT not passed", async () => {
      selectResultsQueue.push([
        {
          id: 15,
          plcProjectId: 1,
          versionType: "test",
          versionNumber: "1.1.0",
          versionString: "V1.1.0-test",
          isActive: true,
          isFrozen: false,
          testResults: { fatPassed: false },
        },
      ]);

      await expect(
        promoteVersion({
          plcProjectId: 1,
          from: "test",
          to: "production",
          promotedBy: "eng",
          changeLog: "attempt",
        }),
      ).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
        message: expect.stringContaining("FAT"),
      });
    });

    it("fails when no testResults at all", async () => {
      selectResultsQueue.push([
        {
          id: 15,
          plcProjectId: 1,
          versionType: "test",
          versionNumber: "1.1.0",
          versionString: "V1.1.0-test",
          isActive: true,
          isFrozen: false,
          testResults: {},
        },
      ]);

      await expect(
        promoteVersion({
          plcProjectId: 1,
          from: "test",
          to: "production",
          promotedBy: "eng",
          changeLog: "attempt",
        }),
      ).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
        message: expect.stringContaining("FAT"),
      });
    });
  });

  // ── Invalid paths ───────────────────────────────────────────────────

  describe("invalid promotion paths", () => {
    it("rejects dev → production (must go dev→test→production)", async () => {
      await expect(
        promoteVersion({
          plcProjectId: 1,
          from: "dev" as any,
          to: "production" as any,
          promotedBy: "eng",
          changeLog: "skip",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("Invalid promotion path"),
      });
    });

    it("rejects test → dev (backwards)", async () => {
      await expect(
        promoteVersion({
          plcProjectId: 1,
          from: "test" as any,
          to: "dev" as any,
          promotedBy: "eng",
          changeLog: "revert",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("Invalid promotion path"),
      });
    });
  });

  // ── Version string bumping ─────────────────────────────────────────

  describe("version string bumping", () => {
    it("dev→test bumps minor: 1.0.0 → V1.1.0-test", async () => {
      selectResultsQueue.push([
        {
          id: 1, plcProjectId: 1, versionType: "dev",
          versionNumber: "1.0.0", versionString: "V1.0.0-dev",
          isActive: true, isFrozen: false, testResults: {},
        },
      ]);
      selectResultsQueue.push([
        { id: 1, sourceCode: "code", moduleName: "M1" },
      ]);
      selectResultsQueue.push([
        { moduleNumber: "OB1", sourceCode: "code" },
      ]);
      returningQueue.push([{ id: 50 }]);

      const result = await promoteVersion({
        plcProjectId: 1, from: "dev", to: "test",
        promotedBy: "eng", changeLog: "v",
      });

      expect(result.versionString).toBe("V1.1.0-test");
    });

    it("test→production bumps major: 1.3.0 → V2.3.0-production", async () => {
      selectResultsQueue.push([
        {
          id: 5, plcProjectId: 1, versionType: "test",
          versionNumber: "1.3.0", versionString: "V1.3.0-test",
          isActive: true, isFrozen: false, testResults: { fatPassed: true },
        },
      ]);
      selectResultsQueue.push([
        { moduleNumber: "OB1", sourceCode: "code" },
      ]);
      returningQueue.push([{ id: 51 }]);

      const result = await promoteVersion({
        plcProjectId: 1, from: "test", to: "production",
        promotedBy: "qa", changeLog: "prod",
        testResults: { fatPassed: true },
      });

      expect(result.versionString).toBe("V2.3.0-production");
    });

    it("falls back to 1.0.0 when no active version exists", async () => {
      // No active version found
      selectResultsQueue.push([]);
      // Modules for dev→test check
      selectResultsQueue.push([
        { id: 1, sourceCode: "code", moduleName: "Main" },
      ]);
      // Modules for fingerprint
      selectResultsQueue.push([
        { moduleNumber: "OB1", sourceCode: "code" },
      ]);
      returningQueue.push([{ id: 60 }]);

      const result = await promoteVersion({
        plcProjectId: 1, from: "dev", to: "test",
        promotedBy: "eng", changeLog: "first",
      });

      // base 1.0.0, minor bump → 1.1.0
      expect(result.versionString).toBe("V1.1.0-test");
    });
  });

  // ── isFrozen flag ──────────────────────────────────────────────────

  describe("isFrozen flag on insert", () => {
    it("sets isFrozen=true for production versions", async () => {
      selectResultsQueue.push([
        {
          id: 15, plcProjectId: 1, versionType: "test",
          versionNumber: "1.1.0", versionString: "V1.1.0-test",
          isActive: true, isFrozen: false, testResults: {},
        },
      ]);
      selectResultsQueue.push([
        { moduleNumber: "OB1", sourceCode: "main" },
      ]);
      returningQueue.push([{ id: 70 }]);

      await promoteVersion({
        plcProjectId: 1, from: "test", to: "production",
        promotedBy: "qa", changeLog: "freeze",
        testResults: { fatPassed: true },
      });

      // Verify the insert was called with isFrozen=true
      const valuesCall = mockDb.values.mock.calls[mockDb.values.mock.calls.length - 1][0];
      expect(valuesCall.isFrozen).toBe(true);
      expect(valuesCall.versionType).toBe("production");
    });

    it("sets isFrozen=false for test versions", async () => {
      selectResultsQueue.push([
        {
          id: 1, plcProjectId: 1, versionType: "dev",
          versionNumber: "1.0.0", versionString: "V1.0.0-dev",
          isActive: true, isFrozen: false, testResults: {},
        },
      ]);
      selectResultsQueue.push([
        { id: 1, sourceCode: "code", moduleName: "M1" },
      ]);
      selectResultsQueue.push([
        { moduleNumber: "OB1", sourceCode: "code" },
      ]);
      returningQueue.push([{ id: 71 }]);

      await promoteVersion({
        plcProjectId: 1, from: "dev", to: "test",
        promotedBy: "eng", changeLog: "test",
      });

      const valuesCall = mockDb.values.mock.calls[mockDb.values.mock.calls.length - 1][0];
      expect(valuesCall.isFrozen).toBe(false);
      expect(valuesCall.versionType).toBe("test");
    });
  });

  // ── Active version type mismatch ───────────────────────────────────

  describe("active version type mismatch", () => {
    it("rejects promotion when active version type does not match 'from'", async () => {
      selectResultsQueue.push([
        {
          id: 10, plcProjectId: 1, versionType: "test", // active is test
          versionNumber: "1.1.0", versionString: "V1.1.0-test",
          isActive: true, isFrozen: false, testResults: {},
        },
      ]);

      await expect(
        promoteVersion({
          plcProjectId: 1,
          from: "dev", // asking to promote from dev
          to: "test",
          promotedBy: "eng",
          changeLog: "mismatch",
        }),
      ).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
        message: expect.stringContaining('Active version is "test"'),
      });
    });
  });

  // ── Deactivation of old version ────────────────────────────────────

  describe("old version deactivation", () => {
    it("calls update to deactivate the previous active version", async () => {
      selectResultsQueue.push([
        {
          id: 10, plcProjectId: 1, versionType: "dev",
          versionNumber: "1.0.0", versionString: "V1.0.0-dev",
          isActive: true, isFrozen: false, testResults: {},
        },
      ]);
      selectResultsQueue.push([
        { id: 1, sourceCode: "code", moduleName: "Main" },
      ]);
      selectResultsQueue.push([
        { moduleNumber: "OB1", sourceCode: "code" },
      ]);
      returningQueue.push([{ id: 80 }]);

      await promoteVersion({
        plcProjectId: 1, from: "dev", to: "test",
        promotedBy: "eng", changeLog: "deactivate old",
      });

      // update().set({ isActive: false }).where(eq(id, 10))
      expect(mockDb.update).toHaveBeenCalled();
      const setCall = mockDb.set.mock.calls[0][0];
      expect(setCall).toEqual({ isActive: false });
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 3. verifyProductionIntegrity
// ═════════════════════════════════════════════════════════════════════════

describe("verifyProductionIntegrity", () => {
  it("returns valid=true when fingerprints match", async () => {
    const knownFingerprint = expectedSha256("OB1:main code");

    // Version lookup
    selectResultsQueue.push([
      {
        id: 30, plcProjectId: 1, versionString: "V2.0.0-production",
        digitalFingerprint: knownFingerprint,
      },
    ]);
    // Fingerprint recompute (modules)
    selectResultsQueue.push([
      { moduleNumber: "OB1", sourceCode: "main code" },
    ]);

    const result = await verifyProductionIntegrity(30);

    expect(result.valid).toBe(true);
    expect(result.storedFingerprint).toBe(knownFingerprint);
    expect(result.computedFingerprint).toBe(knownFingerprint);
    expect(result.versionString).toBe("V2.0.0-production");
  });

  it("returns valid=false when fingerprints differ (tampered code)", async () => {
    // Version lookup
    selectResultsQueue.push([
      {
        id: 30, plcProjectId: 1, versionString: "V2.0.0-production",
        digitalFingerprint: "aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa1111bbbb2222",
      },
    ]);
    // Modules have changed → different fingerprint
    selectResultsQueue.push([
      { moduleNumber: "OB1", sourceCode: "tampered code" },
    ]);

    const result = await verifyProductionIntegrity(30);

    expect(result.valid).toBe(false);
    expect(result.storedFingerprint).not.toBe(result.computedFingerprint);
  });

  it("throws NOT_FOUND when version does not exist", async () => {
    selectResultsQueue.push([]);

    await expect(verifyProductionIntegrity(9999)).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Version not found",
    });
  });

  it("handles missing digitalFingerprint on version record", async () => {
    selectResultsQueue.push([
      {
        id: 30, plcProjectId: 1, versionString: "V1.0.0-dev",
        // no digitalFingerprint property
      },
    ]);
    selectResultsQueue.push([
      { moduleNumber: "OB1", sourceCode: "code" },
    ]);

    const result = await verifyProductionIntegrity(30);

    // stored is empty string → will not match computed
    expect(result.valid).toBe(false);
    expect(result.storedFingerprint).toBe("");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 4. assertNotFrozen
// ═════════════════════════════════════════════════════════════════════════

describe("assertNotFrozen", () => {
  it("throws FORBIDDEN when active version is frozen", async () => {
    selectResultsQueue.push([
      { isFrozen: true, versionString: "V2.0.0-production" },
    ]);

    await expect(assertNotFrozen(1)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("V2.0.0-production is frozen"),
    });
  });

  it("passes silently when active version is not frozen", async () => {
    selectResultsQueue.push([
      { isFrozen: false, versionString: "V1.1.0-test" },
    ]);

    await expect(assertNotFrozen(1)).resolves.toBeUndefined();
  });

  it("passes silently when no active version exists", async () => {
    selectResultsQueue.push([]);

    await expect(assertNotFrozen(99)).resolves.toBeUndefined();
  });

  it("passes when isFrozen is null/undefined", async () => {
    selectResultsQueue.push([
      { isFrozen: null, versionString: "V1.0.0-dev" },
    ]);

    await expect(assertNotFrozen(1)).resolves.toBeUndefined();
  });
});
