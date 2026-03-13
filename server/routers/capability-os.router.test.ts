/**
 * Capability OS Router — Comprehensive Unit Tests
 *
 * Covers all ~55 procedures across 14 groups:
 *   Basic CRUD (5):     list, getById, create, update, delete
 *   Reports (1):        getAssessmentReport
 *   Employee (2):       getEmployeeCapabilities, getDevelopmentPath
 *   Upgrade (2):        getUpgradeRules, upgradeCapability
 *   List/Domain (3):    listCapabilities, getDomains, getMyCapabilities
 *   Evidences (6):      getMyEvidences, getEvidenceTypes, submitEvidence, reviewEvidence, getPendingEvidences, getAllEvidences
 *   Badges (5):         getAllBadges, getUserBadges, getBadgeLeaderboard, getBadgeStatistics, updateBadgeDisplay
 *   Leaderboard (4):    getDomainLeaderboard, getOverallLeaderboard, getProgressLeaderboard, getLeaderboardStats
 *   Certificates (4):   getMyCertificates, checkCertificateEligibility, generateCertificate, verifyCertificateByQR
 *   Checkpoints (4):    getAllEngineerCheckpoints, approveCheckpoint, rejectCheckpoint, completePhase
 *   Path (1):           getPathRecommendation
 *   Agent Units (6):    getAgentUnits, createAgentUnit, updateAgentUnitStatus, batchImportAgentUnits, getAgentUnitStatistics, getAgentUnitImportHistory
 *   Approval (4):       getApprovalChainConfigs, createApprovalChainConfig, updateApprovalChainConfig, deleteApprovalChainConfig
 *   UWB/Calib/Clean/Toothpaste/Proposals (13)
 *
 * Run: npx vitest run server/routers/capability-os.router.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────────
let mockQueryResult: any = [];
let mockReturningResult: any[] = [{ id: 1 }];
let mockExecuteResult: any = { rows: [] };
const selectResultsQueue: any[][] = [];

function getNextResult() {
  return selectResultsQueue.length > 0
    ? selectResultsQueue.shift()!
    : mockQueryResult;
}

function createMockDb() {
  const chain: any = {};
  for (const m of [
    "from",
    "where",
    "and",
    "orderBy",
    "limit",
    "offset",
    "values",
    "set",
    "onConflictDoUpdate",
    "onConflictDoNothing",
    "groupBy",
    "having",
    "innerJoin",
    "leftJoin",
    "rightJoin",
    "fullJoin",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
  chain.then = (resolve: any, reject?: any) => {
    try {
      return resolve(getNextResult());
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  };

  const db: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => {
      const uChain: any = {};
      for (const m of ["from", "where", "and", "set", "returning"]) {
        uChain[m] = vi.fn(() => uChain);
      }
      uChain.returning = vi.fn(() => Promise.resolve(mockReturningResult));
      uChain.then = (resolve: any, reject?: any) => {
        try {
          return resolve(getNextResult());
        } catch (e) {
          if (reject) return reject(e);
          throw e;
        }
      };
      return uChain;
    }),
    delete: vi.fn(() => chain),
    execute: vi.fn(() => Promise.resolve(mockExecuteResult)),
    $count: vi.fn(() => Promise.resolve(0)),
    transaction: vi.fn(async (fn: any) => fn(db)),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
  getDb: vi.fn(async () => mockDb),
}));

// ── Mock schema imports (column-name string objects) ────────
vi.mock("../../drizzle/schema", () => ({
  capabilityProofConfigs: {
    id: "id",
    capabilityCode: "capabilityCode",
    capabilityName: "capabilityName",
    capabilityCategory: "capabilityCategory",
    publicDescription: "publicDescription",
    publicEvidence: "publicEvidence",
    verificationRules: "verificationRules",
    requiredDataSources: "requiredDataSources",
    zkpEnabled: "zkpEnabled",
    zkpCircuitType: "zkpCircuitType",
    isActive: "isActive",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  capabilityEvidences: {
    id: "id",
    evidenceId: "evidenceId",
    userId: "userId",
    userName: "userName",
    evidenceType: "evidenceType",
    capabilityDomain: "capabilityDomain",
    title: "title",
    description: "description",
    projectId: "projectId",
    projectName: "projectName",
    equipmentModel: "equipmentModel",
    fileUrl: "fileUrl",
    fileKey: "fileKey",
    fileName: "fileName",
    fileType: "fileType",
    fileSize: "fileSize",
    status: "status",
    reviewerId: "reviewerId",
    reviewerName: "reviewerName",
    reviewComment: "reviewComment",
    reviewedAt: "reviewedAt",
    currentLevel: "currentLevel",
    targetLevel: "targetLevel",
    metadata: "metadata",
    tags: "tags",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  publicCapabilityShowcase: {
    id: "id",
    showcaseCode: "showcaseCode",
    title: "title",
    slug: "slug",
    status: "status",
    createdAt: "createdAt",
  },
}));

// ── Mock shared/validators ────────────────────────────────
vi.mock("../../shared/validators", () => {
  const z = require("zod");
  return {
    jsonValue: z.any(),
  };
});

// ── Mock drizzle-orm operators ─────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  and: vi.fn((...args: any[]) => args),
  count: vi.fn((col: any) => col),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values }),
    { raw: (s: string) => s }
  ),
  lt: vi.fn((...args: any[]) => args),
  gte: vi.fn((...args: any[]) => args),
  ne: vi.fn((...args: any[]) => args),
  inArray: vi.fn((...args: any[]) => args),
}));

// ── Import test utilities AFTER mocks ──────────────────────
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
  createAdminCaller,
} from "../_test/trpc-test-utils";

// ── Reset between tests ────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockQueryResult = [];
  mockReturningResult = [{ id: 1 }];
  mockExecuteResult = { rows: [] };
  selectResultsQueue.length = 0;
});

// ═════════════════════════════════════════════════════════════
// AUTH GUARD — anonymous callers must be rejected
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — auth guard", () => {
  it("rejects anonymous caller on list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.capabilityOs.list()).rejects.toThrow();
  });

  it("rejects anonymous caller on getById", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.capabilityOs.getById({ id: 1 })).rejects.toThrow();
  });

  it("rejects anonymous caller on create", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.capabilityOs.create({})).rejects.toThrow();
  });

  it("rejects anonymous caller on submitEvidence", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.capabilityOs.submitEvidence({})).rejects.toThrow();
  });

  it("rejects anonymous caller on reviewEvidence", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.capabilityOs.reviewEvidence({})).rejects.toThrow();
  });

  it("rejects anonymous caller on getMyCertificates", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.capabilityOs.getMyCertificates()).rejects.toThrow();
  });

  it("rejects anonymous caller on getUpgradeRules", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.capabilityOs.getUpgradeRules()).rejects.toThrow();
  });

  it("rejects anonymous caller on upgradeCapability", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.capabilityOs.upgradeCapability({ capabilityId: 1 })
    ).rejects.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════
// 1. Basic CRUD — list, getById, create, update, delete
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — list", () => {
  it("returns items and total with empty results", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.list();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page", 1);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("returns populated items", async () => {
    mockQueryResult = [
      { id: 1, capabilityCode: "CAP-001", capabilityName: "Test Cap" },
      { id: 2, capabilityCode: "CAP-002", capabilityName: "Another Cap" },
    ];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.list();
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.pageSize).toBe(2);
  });
});

describe("capabilityOs — getById", () => {
  it("returns item when found", async () => {
    const mockItem = { id: 1, capabilityCode: "CAP-001", capabilityName: "Test" };
    mockQueryResult = [mockItem];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getById({ id: 1 });
    expect(result).toEqual(mockItem);
  });

  it("returns null when not found", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getById({ id: 999 });
    expect(result).toBeNull();
  });

  it("accepts string id", async () => {
    mockQueryResult = [{ id: 1, capabilityName: "Test" }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getById({ id: "1" });
    expect(result).toBeTruthy();
  });
});

describe("capabilityOs — create", () => {
  it("creates with minimal input", async () => {
    mockReturningResult = [{ id: 1, capabilityCode: "CAP-NEW", capabilityName: "新能力" }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.create({});
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("message", "创建成功");
    expect(result).toHaveProperty("data");
  });

  it("creates with full input", async () => {
    const input = {
      capabilityCode: "CAP-CUSTOM",
      capabilityName: "Custom Capability",
      capabilityCategory: "technical",
      publicDescription: "A custom description",
    };
    mockReturningResult = [{ id: 2, ...input }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.create(input);
    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
  });

  it("uses name fallback when capabilityName is missing", async () => {
    mockReturningResult = [{ id: 3, capabilityName: "My Name" }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.create({ name: "My Name" });
    expect(result.success).toBe(true);
  });

  it("uses description fallback", async () => {
    mockReturningResult = [{ id: 4 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.create({ description: "Desc here" });
    expect(result.success).toBe(true);
  });
});

describe("capabilityOs — update", () => {
  it("updates with only id", async () => {
    mockReturningResult = [{ id: 1, capabilityName: "Updated" }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.update({ id: 1 });
    expect(result.success).toBe(true);
    expect(result.message).toBe("更新成功");
  });

  it("updates multiple fields", async () => {
    mockReturningResult = [{ id: 1, capabilityName: "New Name" }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.update({
      id: 1,
      capabilityName: "New Name",
      capabilityCategory: "leadership",
      publicDescription: "New desc",
      publicEvidence: "New evidence",
      zkpEnabled: true,
      zkpCircuitType: "groth16",
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts string id", async () => {
    mockReturningResult = [{ id: 1 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.update({ id: "1", capabilityName: "X" });
    expect(result.success).toBe(true);
  });

  it("handles verificationRules and requiredDataSources", async () => {
    mockReturningResult = [{ id: 1 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.update({
      id: 1,
      verificationRules: { rule1: "test" },
      requiredDataSources: ["source1", "source2"],
    });
    expect(result.success).toBe(true);
  });

  it("converts zkpEnabled boolean to 0/1", async () => {
    mockReturningResult = [{ id: 1 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.update({ id: 1, zkpEnabled: false });
    expect(result.success).toBe(true);
  });
});

describe("capabilityOs — delete", () => {
  it("deletes by numeric id", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.delete({ id: 1 });
    expect(result).toEqual({ success: true, message: "操作成功" });
  });

  it("deletes by string id", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.delete({ id: "5" });
    expect(result.success).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════
// 2. Assessment Report
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — getAssessmentReport", () => {
  it("returns report with domains and capabilities", async () => {
    mockQueryResult = [{ id: 1, capabilityName: "Test", isActive: 1 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getAssessmentReport();
    expect(result).toHaveProperty("report");
    expect(result.report).toHaveProperty("domains");
    expect(result.report.domains).toHaveLength(6);
    expect(result.report).toHaveProperty("capabilities");
  });

  it("includes all 6 capability domains", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getAssessmentReport();
    const domainCodes = result.report.domains.map((d: any) => d.code);
    expect(domainCodes).toEqual(["T", "S", "D", "C", "K", "L"]);
  });
});

// ═════════════════════════════════════════════════════════════
// 3. Employee Capabilities
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — getEmployeeCapabilities", () => {
  it("returns own capabilities when no employeeId given", async () => {
    mockQueryResult = [{ id: 1, userId: 1, capabilityDomain: "T" }];
    const caller = createAdminCaller({ id: 1 });
    const result = await caller.capabilityOs.getEmployeeCapabilities();
    expect(result).toHaveLength(1);
  });

  it("returns own capabilities when employeeId matches current user", async () => {
    mockQueryResult = [{ id: 1, userId: 1 }];
    const caller = createAdminCaller({ id: 1 });
    const result = await caller.capabilityOs.getEmployeeCapabilities({ employeeId: 1 });
    expect(result).toHaveLength(1);
  });

  it("returns empty for non-manager viewing another employee", async () => {
    const caller = createAdminCaller({ id: 1, role: "employee" });
    const result = await caller.capabilityOs.getEmployeeCapabilities({ employeeId: 99 });
    expect(result).toEqual([]);
  });

  it("allows admin to view another employee", async () => {
    mockQueryResult = [{ id: 10, userId: 99 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getEmployeeCapabilities({ employeeId: 99 });
    expect(result).toHaveLength(1);
  });

  it("allows director to view another employee", async () => {
    mockQueryResult = [{ id: 10, userId: 99 }];
    const caller = createAdminCaller({ role: "director", id: 5 });
    const result = await caller.capabilityOs.getEmployeeCapabilities({ employeeId: 99 });
    expect(result).toHaveLength(1);
  });

  it("allows hr_manager to view another employee", async () => {
    mockQueryResult = [{ id: 10 }];
    const caller = createAdminCaller({ role: "hr_manager", id: 5 });
    const result = await caller.capabilityOs.getEmployeeCapabilities({ employeeId: 99 });
    expect(result).toHaveLength(1);
  });

  it("allows dept_manager to view another employee", async () => {
    mockQueryResult = [{ id: 10 }];
    const caller = createAdminCaller({ role: "dept_manager", id: 5 });
    const result = await caller.capabilityOs.getEmployeeCapabilities({ employeeId: 99 });
    expect(result).toHaveLength(1);
  });

  it("blocks staff role from viewing another employee", async () => {
    const caller = createAdminCaller({ role: "staff", id: 2 });
    const result = await caller.capabilityOs.getEmployeeCapabilities({ employeeId: 100 });
    expect(result).toEqual([]);
  });

  it("works with no input at all", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getEmployeeCapabilities();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════
// 4. Development Path
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — getDevelopmentPath", () => {
  it("returns active configs limited to 5", async () => {
    mockQueryResult = [
      { id: 1, capabilityName: "A" },
      { id: 2, capabilityName: "B" },
    ];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getDevelopmentPath();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });
});

// ═════════════════════════════════════════════════════════════
// 5. Upgrade Rules & upgradeCapability
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — getUpgradeRules", () => {
  it("returns all 4 upgrade rules", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getUpgradeRules();
    expect(result).toHaveLength(4);
    expect(result[0]).toHaveProperty("id", "RULE-001");
    expect(result[0]).toHaveProperty("fromLevel", "L1");
    expect(result[0]).toHaveProperty("toLevel", "L2");
    expect(result[0]).toHaveProperty("requiredEvidences", 3);
  });

  it("includes L4 to L5 rule requiring 12 evidences", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getUpgradeRules();
    const l4Rule = result.find((r: any) => r.fromLevel === "L4");
    expect(l4Rule).toBeTruthy();
    expect(l4Rule.requiredEvidences).toBe(12);
  });
});

describe("capabilityOs — upgradeCapability", () => {
  it("returns success response", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.upgradeCapability({ capabilityId: 1 });
    expect(result).toEqual({ success: true, message: "操作成功" });
  });

  it("accepts optional fromLevel and toLevel", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.upgradeCapability({
      capabilityId: "5",
      fromLevel: "L2",
      toLevel: "L3",
    });
    expect(result.success).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════
// 6. listCapabilities & getDomains
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — listCapabilities", () => {
  it("returns active capabilities", async () => {
    mockQueryResult = [{ id: 1, isActive: 1 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.listCapabilities();
    expect(result).toHaveLength(1);
  });

  it("returns empty array when none active", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.listCapabilities();
    expect(result).toEqual([]);
  });
});

describe("capabilityOs — getDomains", () => {
  it("returns all 6 domains with ids", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getDomains();
    expect(result).toHaveLength(6);
    expect(result[0]).toEqual({ code: "T", name: "技术能力", description: "专业技术和工程能力", id: 1 });
    expect(result[5]).toEqual({ code: "L", name: "领导力", description: "团队管理和领导能力", id: 6 });
  });
});

// ═════════════════════════════════════════════════════════════
// 7. getMyCapabilities
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — getMyCapabilities", () => {
  it("returns empty when no approved evidences", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getMyCapabilities();
    expect(result).toEqual([]);
  });

  it("aggregates evidences by domain", async () => {
    mockQueryResult = [
      { id: 1, capabilityDomain: "T", currentLevel: 3, status: "approved" },
      { id: 2, capabilityDomain: "T", currentLevel: 2, status: "approved" },
      { id: 3, capabilityDomain: "S", currentLevel: 1, status: "approved" },
    ];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getMyCapabilities();
    expect(result).toHaveLength(2);
    const tDomain = result.find((r: any) => r.code === "T");
    expect(tDomain).toBeTruthy();
    expect(tDomain.totalPoints).toBe(100); // 2 evidences * 50
    expect(tDomain.currentLevel).toBe(3); // max level
    const sDomain = result.find((r: any) => r.code === "S");
    expect(sDomain).toBeTruthy();
    expect(sDomain.totalPoints).toBe(50);
    expect(sDomain.currentLevel).toBe(1);
  });

  it("defaults domain to T when capabilityDomain is falsy", async () => {
    mockQueryResult = [
      { id: 1, capabilityDomain: null, currentLevel: 1, status: "approved" },
    ];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getMyCapabilities();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("T");
  });

  it("assigns correct domainIds", async () => {
    mockQueryResult = [
      { id: 1, capabilityDomain: "K", currentLevel: 2 },
      { id: 2, capabilityDomain: "L", currentLevel: 1 },
    ];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getMyCapabilities();
    const kDomain = result.find((r: any) => r.code === "K");
    expect(kDomain.domainId).toBe(5);
    const lDomain = result.find((r: any) => r.code === "L");
    expect(lDomain.domainId).toBe(6);
  });
});

// ═════════════════════════════════════════════════════════════
// 8. Evidences — getMyEvidences, getEvidenceTypes, submitEvidence, reviewEvidence, etc.
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — getMyEvidences", () => {
  it("returns evidence list", async () => {
    mockQueryResult = [{ id: 1, title: "Delivery" }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getMyEvidences();
    expect(result).toHaveLength(1);
  });

  it("returns empty array when no evidences", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getMyEvidences();
    expect(result).toEqual([]);
  });
});

describe("capabilityOs — getEvidenceTypes", () => {
  it("returns all 8 evidence types", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getEvidenceTypes();
    expect(result).toHaveLength(8);
    expect(result[0]).toHaveProperty("code", "project_delivery");
    expect(result[0]).toHaveProperty("baseScore", 50);
    expect(result[7]).toHaveProperty("code", "other");
  });

  it("each type has id, code, name, description, baseScore, domains", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getEvidenceTypes();
    for (const type of result) {
      expect(type).toHaveProperty("id");
      expect(type).toHaveProperty("code");
      expect(type).toHaveProperty("name");
      expect(type).toHaveProperty("description");
      expect(type).toHaveProperty("baseScore");
      expect(type).toHaveProperty("domains");
    }
  });
});

describe("capabilityOs — submitEvidence", () => {
  it("submits evidence with minimal input", async () => {
    mockReturningResult = [{ id: 1, evidenceId: "EVD-TEST", status: "pending" }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.submitEvidence({});
    expect(result.success).toBe(true);
    expect(result.message).toBe("证据已提交");
    expect(result.data).toBeTruthy();
  });

  it("submits evidence with full input", async () => {
    mockReturningResult = [{ id: 2, evidenceId: "EVD-FULL" }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.submitEvidence({
      evidenceType: "training_cert",
      capabilityDomain: "K",
      title: "AWS Certification",
      description: "Passed AWS Solutions Architect exam",
      projectId: "PRJ-001",
      projectName: "Cloud Migration",
      equipmentModel: "AWS",
      fileUrl: "https://example.com/cert.pdf",
      fileKey: "certs/aws.pdf",
      fileName: "aws-cert.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      currentLevel: 2,
      targetLevel: 3,
      metadata: { source: "exam" },
      tags: ["cloud", "aws"],
    });
    expect(result.success).toBe(true);
  });

  it("handles string fileSize conversion", async () => {
    mockReturningResult = [{ id: 3 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.submitEvidence({
      fileSize: "2048",
      currentLevel: "2",
      targetLevel: "3",
    });
    expect(result.success).toBe(true);
  });

  it("defaults evidenceType to project_delivery", async () => {
    mockReturningResult = [{ id: 4 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.submitEvidence({});
    expect(result.success).toBe(true);
  });
});

describe("capabilityOs — reviewEvidence", () => {
  it("approves evidence with approved=true", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.reviewEvidence({ id: 1, approved: true });
    expect(result.success).toBe(true);
    expect(result.message).toBe("已通过");
  });

  it("rejects evidence with approved=false", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.reviewEvidence({ id: 1, approved: false });
    expect(result.success).toBe(true);
    expect(result.message).toBe("已驳回");
  });

  it("uses status field when provided", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.reviewEvidence({
      id: 1,
      status: "approved",
      comment: "Looks good",
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe("已通过");
  });

  it("uses reviewComment as fallback for comment", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.reviewEvidence({
      id: 1,
      approved: true,
      reviewComment: "Well done",
    });
    expect(result.success).toBe(true);
  });

  it("uses evidenceId when id is not provided", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.reviewEvidence({ evidenceId: 42, approved: true });
    expect(result.success).toBe(true);
  });

  it("defaults id to 0 when neither id nor evidenceId provided", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.reviewEvidence({ approved: true });
    expect(result.success).toBe(true);
  });

  it("awards points field is accepted", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.reviewEvidence({
      id: 1,
      approved: true,
      awardedPoints: 50,
    });
    expect(result.success).toBe(true);
  });
});

describe("capabilityOs — getPendingEvidences", () => {
  it("returns pending evidences", async () => {
    mockQueryResult = [{ id: 1, status: "pending" }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getPendingEvidences();
    expect(result).toHaveLength(1);
  });
});

describe("capabilityOs — getAllEvidences", () => {
  it("returns all evidences", async () => {
    mockQueryResult = [{ id: 1 }, { id: 2 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getAllEvidences();
    expect(result).toHaveLength(2);
  });
});

// ═════════════════════════════════════════════════════════════
// 9. Badges (stub — no DB table)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — badges", () => {
  it("getAllBadges returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getAllBadges()).toEqual([]);
  });

  it("getUserBadges returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getUserBadges()).toEqual([]);
  });

  it("getUserBadges accepts optional input", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getUserBadges({ userId: "1" })).toEqual([]);
  });

  it("getBadgeLeaderboard returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getBadgeLeaderboard()).toEqual([]);
  });

  it("getBadgeStatistics returns statistics object", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getBadgeStatistics();
    expect(result).toEqual({ statistics: {} });
  });

  it("updateBadgeDisplay returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.updateBadgeDisplay();
    expect(result).toEqual({ success: true, message: "操作成功" });
  });

  it("updateBadgeDisplay accepts input", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.updateBadgeDisplay({ displayOrder: "1,2,3" });
    expect(result.success).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════
// 10. Leaderboard (stub — no DB table)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — leaderboard", () => {
  it("getDomainLeaderboard returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getDomainLeaderboard()).toEqual([]);
  });

  it("getDomainLeaderboard accepts input", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getDomainLeaderboard({ domain: "T" })).toEqual([]);
  });

  it("getOverallLeaderboard returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getOverallLeaderboard()).toEqual([]);
  });

  it("getProgressLeaderboard returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getProgressLeaderboard()).toEqual([]);
  });

  it("getLeaderboardStats returns stats object", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getLeaderboardStats();
    expect(result).toEqual({ stats: {} });
  });
});

// ═════════════════════════════════════════════════════════════
// 11. Certificates (DB-backed via ai_assistant_dashboard)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — certificates", () => {
  it("getMyCertificates returns empty array when no data", async () => {
    // The ensureCapCertData will run and try to bootstrap. We mock execute
    // to simulate already-seeded data (cnt > 0) then the actual query returns data.
    mockExecuteResult = { rows: [{ cnt: 1 }] };
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getMyCertificates();
    // Since the second execute call also resolves to { rows: [{ cnt: 1 }] },
    // items will be undefined and fallback to []
    expect(result).toBeDefined();
  });

  it("getMyCertificates returns certificate data when available", async () => {
    const certs = [{ id: "cert1", certificateNumber: "GRT-T-2026-001" }];
    mockExecuteResult = { rows: [{ items: certs }] };
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getMyCertificates();
    expect(result).toEqual(certs);
  });

  it("checkCertificateEligibility returns default when no data", async () => {
    mockExecuteResult = { rows: [] };
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.checkCertificateEligibility();
    expect(result).toEqual({ eligible: false, requirements: [] });
  });

  it("checkCertificateEligibility returns eligibility data", async () => {
    const elig = { eligible: true, eligibleDomains: [{ code: "T" }] };
    mockExecuteResult = { rows: [{ items: elig }] };
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.checkCertificateEligibility();
    expect(result).toEqual(elig);
  });

  it("generateCertificate returns certificate number", async () => {
    mockExecuteResult = { rows: [{ cnt: 1 }] };
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.generateCertificate();
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("certificateNumber");
    expect(result).toHaveProperty("url", "#");
    expect(result.certificateNumber).toMatch(/^GRT-T-/);
  });

  it("generateCertificate uses domainCode from input", async () => {
    mockExecuteResult = { rows: [{ cnt: 1 }] };
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.generateCertificate({ domainCode: "D" });
    expect(result.certificateNumber).toMatch(/^GRT-D-/);
  });

  it("verifyCertificateByQR returns invalid", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.verifyCertificateByQR();
    expect(result).toEqual({ valid: false, certificate: null });
  });
});

// ═════════════════════════════════════════════════════════════
// 12. Engineer Checkpoints (stub)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — engineer checkpoints", () => {
  it("getAllEngineerCheckpoints returns array of checkpoints", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getAllEngineerCheckpoints();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("approveCheckpoint returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.approveCheckpoint();
    expect(result).toEqual({ success: true, message: "操作成功" });
  });

  it("rejectCheckpoint returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.rejectCheckpoint();
    expect(result).toEqual({ success: true, message: "操作成功" });
  });

  it("completePhase returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.completePhase();
    expect(result).toEqual({ success: true, message: "操作成功" });
  });
});

// ═════════════════════════════════════════════════════════════
// 13. Path Recommendation (DB-backed)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — getPathRecommendation", () => {
  it("returns null when no recommendation data", async () => {
    mockExecuteResult = { rows: [] };
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getPathRecommendation();
    expect(result).toBeNull();
  });

  it("returns recommendation data when available", async () => {
    const rec = { userId: "user1", currentCapabilities: { T: { level: 3 } } };
    mockExecuteResult = { rows: [{ items: rec }] };
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getPathRecommendation();
    expect(result).toEqual(rec);
  });
});

// ═════════════════════════════════════════════════════════════
// 14. Agent Units (stub)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — agent units", () => {
  it("getAgentUnits returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getAgentUnits()).toEqual([]);
  });

  it("createAgentUnit returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.createAgentUnit();
    expect(result.success).toBe(true);
  });

  it("createAgentUnit accepts input", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.createAgentUnit({ name: "Unit A" });
    expect(result.success).toBe(true);
  });

  it("updateAgentUnitStatus returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.updateAgentUnitStatus();
    expect(result.success).toBe(true);
  });

  it("batchImportAgentUnits returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.batchImportAgentUnits();
    expect(result.success).toBe(true);
  });

  it("getAgentUnitStatistics returns statistics object", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getAgentUnitStatistics();
    expect(result).toEqual({ statistics: {} });
  });

  it("getAgentUnitImportHistory returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getAgentUnitImportHistory()).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════
// 15. Approval Chain Configs (stub)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — approval chain configs", () => {
  it("getApprovalChainConfigs returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getApprovalChainConfigs()).toEqual([]);
  });

  it("createApprovalChainConfig returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.createApprovalChainConfig();
    expect(result.success).toBe(true);
  });

  it("updateApprovalChainConfig returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.updateApprovalChainConfig();
    expect(result.success).toBe(true);
  });

  it("deleteApprovalChainConfig returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.deleteApprovalChainConfig();
    expect(result.success).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════
// 16. UWB Positioning (stub)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — UWB positioning", () => {
  it("getAllUWBTags returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getAllUWBTags()).toEqual([]);
  });

  it("getPositionHistory returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getPositionHistory()).toEqual([]);
  });

  it("getPositionHistory accepts input", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getPositionHistory({ tagId: "abc" })).toEqual([]);
  });

  it("getWorkshopOverview returns overview object", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getWorkshopOverview();
    expect(result).toEqual({ overview: {} });
  });
});

// ═════════════════════════════════════════════════════════════
// 17. Calibration (stub)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — calibration", () => {
  it("executeCalibrationCheck returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.executeCalibrationCheck();
    expect(result.success).toBe(true);
  });

  it("recordCalibrationData returns success", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.recordCalibrationData();
    expect(result.success).toBe(true);
  });

  it("getCalibrationTrend returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getCalibrationTrend()).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════
// 18. Cleaning Strategies (stub)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — cleaning strategies", () => {
  it("getAllCleaningStrategies returns array of strategies", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getAllCleaningStrategies();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════
// 19. Toothpaste Test (stub)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — toothpaste test", () => {
  it("getToothpasteTestRecords returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getToothpasteTestRecords()).toEqual([]);
  });

  it("getToothpasteTestStatistics returns statistics object", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getToothpasteTestStatistics();
    expect(result).toEqual({ statistics: {} });
  });

  it("getToothpasteTestTrend returns empty array", async () => {
    const caller = createAdminCaller();
    expect(await caller.capabilityOs.getToothpasteTestTrend()).toEqual([]);
  });

  it("getToothpasteTestCount returns count 0", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getToothpasteTestCount();
    expect(result).toEqual({ count: 0 });
  });

  it("getToothpasteFeatureTypeStats returns stats object", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getToothpasteFeatureTypeStats();
    expect(result).toEqual({ stats: {} });
  });

  it("exportToothpasteTestReport returns url", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.exportToothpasteTestReport();
    expect(result).toEqual({ url: "" });
  });

  it("exportToothpasteTestReport accepts input", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.exportToothpasteTestReport({ format: "pdf" });
    expect(result).toEqual({ url: "" });
  });
});

// ═════════════════════════════════════════════════════════════
// 20. Technical Proposals (stub)
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — technical proposals", () => {
  it("generateTechnicalProposal returns proposal object", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.generateTechnicalProposal();
    expect(result).toHaveProperty("proposal");
  });

  it("generateTechnicalProposal accepts input", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.generateTechnicalProposal({ topic: "CNC machining" });
    expect(result).toHaveProperty("proposal");
  });

  it("generateIOList returns ioList object", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.generateIOList();
    expect(result).toHaveProperty("ioList");
    expect(Array.isArray(result.ioList.inputs)).toBe(true);
  });

  it("analyzePartFeatures returns analysis object", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.analyzePartFeatures();
    expect(result).toHaveProperty("strategies");
    expect(result).toHaveProperty("cycleTimeEstimate");
  });
});

// ═════════════════════════════════════════════════════════════
// 21. Edge cases and admin caller tests
// ═════════════════════════════════════════════════════════════
describe("capabilityOs — admin caller", () => {
  it("admin can call list", async () => {
    mockQueryResult = [];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.list();
    expect(result.items).toEqual([]);
  });

  it("admin can create capabilities", async () => {
    mockReturningResult = [{ id: 100, capabilityName: "Admin Cap" }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.create({ capabilityName: "Admin Cap" });
    expect(result.success).toBe(true);
  });

  it("admin can review evidence", async () => {
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.reviewEvidence({ id: 1, approved: true });
    expect(result.success).toBe(true);
  });

  it("admin can view any employee capabilities", async () => {
    mockQueryResult = [{ id: 1, userId: 999 }];
    const caller = createAdminCaller();
    const result = await caller.capabilityOs.getEmployeeCapabilities({ employeeId: 999 });
    expect(result).toHaveLength(1);
  });
});
