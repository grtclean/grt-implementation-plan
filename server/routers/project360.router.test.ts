/**
 * Project 360 Cockpit Router — Unit Tests
 *
 * Tests the single `overview` procedure which aggregates 6 DB slices
 * via Promise.allSettled + safeSlice (try/catch returning null).
 *
 * The overview procedure queries:
 *   Slice 1 (project): 1 query  — project header
 *   Slice 2 (cost):    2 queries — costEstimates sum, costRecords sum
 *   Slice 3 (production): 1 query — projectProcessInstances
 *   Slice 4 (vault):   2 queries — grtVaultFiles groupBy, engineeringChangeOrders groupBy
 *   Slice 5 (quality): 4 queries — fmeaDocuments count, fmeaItems innerJoin, eightDReports count, capaRecords count
 *   Slice 6 (acceptance): 1 query — fatTestPlans groupBy
 *   Total: 11 queries
 *
 * Because Promise.allSettled runs all 6 slices concurrently and each slice
 * awaits its queries sequentially, the selectResultsQueue is consumed in
 * a specific interleaved order determined by microtask scheduling:
 *   #1  project rows        (slice 1, query 1)
 *   #2  costEstimates sum   (slice 2, query 1)
 *   #3  production stages   (slice 3, query 1)
 *   #4  vault fileRows      (slice 4, query 1)
 *   #5  fmea doc count      (slice 5, query 1)
 *   #6  acceptance FAT/SAT  (slice 6, query 1)
 *   #7  costRecords sum     (slice 2, query 2)
 *   #8  ECO rows            (slice 4, query 2)
 *   #9  fmeaItems RPN       (slice 5, query 2)
 *   #10 8D count            (slice 5, query 3)
 *   #11 CAPA count          (slice 5, query 4)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ── Hoisted mocks ──
const { selectResultsQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  return { selectResultsQueue };
});

// Mock DB
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
      groupBy: vi.fn(() => chain),
      innerJoin: vi.fn(() => chain),
      returning: vi.fn(() => {
        return Object.assign(Promise.resolve([{ id: 1 }]), {
          then: (resolve: any) => Promise.resolve([{ id: 1 }]).then(resolve),
          catch: () => Promise.resolve([{ id: 1 }]),
        });
      }),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
  desc: vi.fn((col: any) => col),
  count: vi.fn(() => "count"),
  ne: vi.fn((...args: any[]) => args),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

// Mock schema imports
vi.mock("../../drizzle/schema", () => ({
  projects: {},
  costEstimates: {},
  costRecords: {},
  fmeaDocuments: {},
  fmeaItems: {},
  eightDReports: {},
  capaRecords: {},
  fatTestPlans: {},
}));

vi.mock("../../drizzle/digital-thread-schema", () => ({
  grtVaultFiles: {},
  engineeringChangeOrders: {},
}));

vi.mock("../../drizzle/production-process-schema", () => ({
  projectProcessInstances: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
});

const caller = () => createAdminCaller();

// ── Sample data ──
const sampleProject = {
  id: 42,
  name: "GRT-2026-RobotArm",
  status: "active",
  currentPhase: "M3",
  healthStatus: "green",
  budget: 500000,
  actualCost: 120000,
  completionPercent: 35,
};

/**
 * Push 11 entries into the selectResultsQueue in the exact interleaved
 * order that Promise.allSettled microtask scheduling will consume them.
 */
function pushFullOverviewQueue(overrides?: {
  project?: any[];
  costBudget?: any[];
  costSpent?: any[];
  stages?: any[];
  fileRows?: any[];
  ecoRows?: any[];
  fmeaCount?: any[];
  fmeaRpn?: any[];
  eightDCount?: any[];
  capaCount?: any[];
  acceptance?: any[];
}) {
  const o = overrides ?? {};
  // #1  project rows
  selectResultsQueue.push(o.project ?? [sampleProject]);
  // #2  costEstimates sum
  selectResultsQueue.push(o.costBudget ?? [{ budget: 500000 }]);
  // #3  production stages
  selectResultsQueue.push(o.stages ?? []);
  // #4  vault file rows (groupBy fileType)
  selectResultsQueue.push(o.fileRows ?? []);
  // #5  fmea doc count
  selectResultsQueue.push(o.fmeaCount ?? [{ cnt: 0 }]);
  // #6  acceptance FAT/SAT rows
  selectResultsQueue.push(o.acceptance ?? []);
  // #7  costRecords sum
  selectResultsQueue.push(o.costSpent ?? [{ spent: 120000 }]);
  // #8  ECO rows (groupBy status)
  selectResultsQueue.push(o.ecoRows ?? []);
  // #9  fmeaItems maxRpn (innerJoin)
  selectResultsQueue.push(o.fmeaRpn ?? [{ maxRpn: 0 }]);
  // #10 8D open count
  selectResultsQueue.push(o.eightDCount ?? [{ cnt: 0 }]);
  // #11 CAPA overdue count
  selectResultsQueue.push(o.capaCount ?? [{ cnt: 0 }]);
}

describe("project360 router", () => {

  // ═══════════════════════════════════════════════════════════════════
  //  Authentication Guard
  // ═══════════════════════════════════════════════════════════════════
  describe("authentication", () => {
    it("rejects anonymous callers for overview", async () => {
      await expect(
        createAnonymousCaller().project360.overview({ projectId: 1 }),
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Input Validation
  // ═══════════════════════════════════════════════════════════════════
  describe("input validation", () => {
    it("rejects missing projectId", async () => {
      await expect(
        caller().project360.overview({} as any),
      ).rejects.toThrow();
    });

    it("rejects string projectId", async () => {
      await expect(
        caller().project360.overview({ projectId: "abc" } as any),
      ).rejects.toThrow();
    });

    it("accepts numeric projectId (z.number allows floats)", async () => {
      // z.number() does not enforce integer — floats are valid input
      pushFullOverviewQueue();
      const result = await caller().project360.overview({ projectId: 1.5 } as any);
      expect(result).toHaveProperty("project");
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Happy path — all slices return data
  // ═══════════════════════════════════════════════════════════════════
  describe("overview — happy path", () => {
    it("returns all 6 slices with correct data", async () => {
      pushFullOverviewQueue({
        project: [sampleProject],
        costBudget: [{ budget: 500000 }],
        costSpent: [{ spent: 120000 }],
        stages: [
          { code: "T1", status: "COMPLETED", completion: 100 },
          { code: "T2", status: "IN_PROGRESS", completion: 60 },
          { code: "T3", status: "BLOCKED", completion: 10 },
        ],
        fileRows: [
          { fileType: "CAD", cnt: 15 },
          { fileType: "PDF", cnt: 8 },
        ],
        ecoRows: [
          { status: "draft", cnt: 3 },
          { status: "approved", cnt: 2 },
        ],
        fmeaCount: [{ cnt: 5 }],
        fmeaRpn: [{ maxRpn: 280 }],
        eightDCount: [{ cnt: 2 }],
        capaCount: [{ cnt: 1 }],
        acceptance: [
          { planType: "FAT", status: "completed", cnt: 4 },
          { planType: "FAT", status: "in_progress", cnt: 2 },
          { planType: "SAT", status: "completed", cnt: 1 },
          { planType: "SAT", status: "pending", cnt: 3 },
        ],
      });

      const result = await caller().project360.overview({ projectId: 42 });

      // Project slice
      expect(result.project).toEqual(sampleProject);

      // Cost slice
      expect(result.cost).toEqual({
        budget: 500000,
        spent: 120000,
        remaining: 380000,
      });

      // Production slice
      expect(result.production).toBeDefined();
      expect(result.production!.stages).toHaveLength(3);
      expect(result.production!.completed).toBe(1);
      expect(result.production!.inProgress).toBe(1);
      expect(result.production!.blocked).toBe(1);

      // Vault slice
      expect(result.vault).toBeDefined();
      expect(result.vault!.totalFiles).toBe(23);
      expect(result.vault!.byType).toEqual({ CAD: 15, PDF: 8 });
      expect(result.vault!.ecoTotal).toBe(5);
      expect(result.vault!.ecoDraft).toBe(3);

      // Quality slice
      expect(result.quality).toBeDefined();
      expect(result.quality!.fmeaCount).toBe(5);
      expect(result.quality!.maxRpn).toBe(280);
      expect(result.quality!.open8Ds).toBe(2);
      expect(result.quality!.overdueCapas).toBe(1);

      // Acceptance slice
      expect(result.acceptance).toBeDefined();
      expect(result.acceptance!.fatTotal).toBe(6);
      expect(result.acceptance!.fatCompleted).toBe(4);
      expect(result.acceptance!.satTotal).toBe(4);
      expect(result.acceptance!.satCompleted).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Project slice
  // ═══════════════════════════════════════════════════════════════════
  describe("overview — project slice", () => {
    it("returns null when no project found", async () => {
      pushFullOverviewQueue({ project: [] });
      const result = await caller().project360.overview({ projectId: 999 });
      expect(result.project).toBeNull();
    });

    it("returns first row from project query", async () => {
      const proj = { ...sampleProject, id: 7, name: "Project-7" };
      pushFullOverviewQueue({ project: [proj] });
      const result = await caller().project360.overview({ projectId: 7 });
      expect(result.project).toEqual(proj);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Cost slice
  // ═══════════════════════════════════════════════════════════════════
  describe("overview — cost slice", () => {
    it("computes budget - spent = remaining", async () => {
      pushFullOverviewQueue({
        costBudget: [{ budget: 200000 }],
        costSpent: [{ spent: 75000 }],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.cost).toEqual({
        budget: 200000,
        spent: 75000,
        remaining: 125000,
      });
    });

    it("handles zero budget and zero spent", async () => {
      pushFullOverviewQueue({
        costBudget: [{ budget: 0 }],
        costSpent: [{ spent: 0 }],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.cost).toEqual({ budget: 0, spent: 0, remaining: 0 });
    });

    it("handles negative remaining (over budget)", async () => {
      pushFullOverviewQueue({
        costBudget: [{ budget: 100000 }],
        costSpent: [{ spent: 150000 }],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.cost!.remaining).toBe(-50000);
    });

    it("handles null budget/spent from DB (coalesce to 0)", async () => {
      pushFullOverviewQueue({
        costBudget: [{ budget: null }],
        costSpent: [{ spent: null }],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.cost).toEqual({ budget: 0, spent: 0, remaining: 0 });
    });

    it("handles undefined budget row", async () => {
      pushFullOverviewQueue({
        costBudget: [undefined],
        costSpent: [undefined],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.cost).toEqual({ budget: 0, spent: 0, remaining: 0 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Production slice
  // ═══════════════════════════════════════════════════════════════════
  describe("overview — production slice", () => {
    it("counts COMPLETED, IN_PROGRESS, BLOCKED stages", async () => {
      pushFullOverviewQueue({
        stages: [
          { code: "T1", status: "COMPLETED", completion: 100 },
          { code: "T2", status: "COMPLETED", completion: 100 },
          { code: "T3", status: "IN_PROGRESS", completion: 40 },
          { code: "T4", status: "BLOCKED", completion: 0 },
          { code: "T5", status: "ON_HOLD", completion: 20 },
        ],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.production!.completed).toBe(2);
      expect(result.production!.inProgress).toBe(1);
      expect(result.production!.blocked).toBe(2); // BLOCKED + ON_HOLD
    });

    it("returns empty stages array when no production data", async () => {
      pushFullOverviewQueue({ stages: [] });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.production!.stages).toHaveLength(0);
      expect(result.production!.completed).toBe(0);
      expect(result.production!.inProgress).toBe(0);
      expect(result.production!.blocked).toBe(0);
    });

    it("handles stages with only COMPLETED status", async () => {
      pushFullOverviewQueue({
        stages: [
          { code: "T1", status: "COMPLETED", completion: 100 },
          { code: "T2", status: "COMPLETED", completion: 100 },
        ],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.production!.completed).toBe(2);
      expect(result.production!.inProgress).toBe(0);
      expect(result.production!.blocked).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Vault slice
  // ═══════════════════════════════════════════════════════════════════
  describe("overview — vault slice", () => {
    it("aggregates file counts by type", async () => {
      pushFullOverviewQueue({
        fileRows: [
          { fileType: "CAD", cnt: 10 },
          { fileType: "BOM", cnt: 5 },
          { fileType: "SPEC", cnt: 3 },
        ],
        ecoRows: [],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.vault!.totalFiles).toBe(18);
      expect(result.vault!.byType).toEqual({ CAD: 10, BOM: 5, SPEC: 3 });
    });

    it("counts ECO total and draft", async () => {
      pushFullOverviewQueue({
        fileRows: [],
        ecoRows: [
          { status: "draft", cnt: 5 },
          { status: "approved", cnt: 3 },
          { status: "rejected", cnt: 1 },
        ],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.vault!.ecoTotal).toBe(9);
      expect(result.vault!.ecoDraft).toBe(5);
    });

    it("returns zero when no files and no ECOs", async () => {
      pushFullOverviewQueue({ fileRows: [], ecoRows: [] });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.vault!.totalFiles).toBe(0);
      expect(result.vault!.byType).toEqual({});
      expect(result.vault!.ecoTotal).toBe(0);
      expect(result.vault!.ecoDraft).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Quality slice
  // ═══════════════════════════════════════════════════════════════════
  describe("overview — quality slice", () => {
    it("returns FMEA count, maxRPN, open 8Ds, overdue CAPAs", async () => {
      pushFullOverviewQueue({
        fmeaCount: [{ cnt: 3 }],
        fmeaRpn: [{ maxRpn: 450 }],
        eightDCount: [{ cnt: 7 }],
        capaCount: [{ cnt: 4 }],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.quality).toEqual({
        fmeaCount: 3,
        maxRpn: 450,
        open8Ds: 7,
        overdueCapas: 4,
      });
    });

    it("returns zeros when no quality data", async () => {
      pushFullOverviewQueue({
        fmeaCount: [{ cnt: 0 }],
        fmeaRpn: [{ maxRpn: 0 }],
        eightDCount: [{ cnt: 0 }],
        capaCount: [{ cnt: 0 }],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.quality).toEqual({
        fmeaCount: 0,
        maxRpn: 0,
        open8Ds: 0,
        overdueCapas: 0,
      });
    });

    it("handles null cnt values with coalesce to 0", async () => {
      pushFullOverviewQueue({
        fmeaCount: [{ cnt: null }],
        fmeaRpn: [{ maxRpn: null }],
        eightDCount: [{ cnt: null }],
        capaCount: [{ cnt: null }],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.quality).toEqual({
        fmeaCount: 0,
        maxRpn: 0,
        open8Ds: 0,
        overdueCapas: 0,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Acceptance slice
  // ═══════════════════════════════════════════════════════════════════
  describe("overview — acceptance slice", () => {
    it("separates FAT and SAT counts", async () => {
      pushFullOverviewQueue({
        acceptance: [
          { planType: "FAT", status: "completed", cnt: 3 },
          { planType: "FAT", status: "in_progress", cnt: 2 },
          { planType: "SAT", status: "completed", cnt: 1 },
          { planType: "SAT", status: "pending", cnt: 5 },
        ],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.acceptance!.fatTotal).toBe(5);
      expect(result.acceptance!.fatCompleted).toBe(3);
      expect(result.acceptance!.satTotal).toBe(6);
      expect(result.acceptance!.satCompleted).toBe(1);
    });

    it("returns zeros when no test plans", async () => {
      pushFullOverviewQueue({ acceptance: [] });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.acceptance).toEqual({
        fatTotal: 0,
        fatCompleted: 0,
        satTotal: 0,
        satCompleted: 0,
      });
    });

    it("handles only FAT plans with no SAT", async () => {
      pushFullOverviewQueue({
        acceptance: [
          { planType: "FAT", status: "completed", cnt: 10 },
        ],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.acceptance!.fatTotal).toBe(10);
      expect(result.acceptance!.fatCompleted).toBe(10);
      expect(result.acceptance!.satTotal).toBe(0);
      expect(result.acceptance!.satCompleted).toBe(0);
    });

    it("handles only SAT plans with no FAT", async () => {
      pushFullOverviewQueue({
        acceptance: [
          { planType: "SAT", status: "completed", cnt: 2 },
          { planType: "SAT", status: "pending", cnt: 1 },
        ],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.acceptance!.fatTotal).toBe(0);
      expect(result.acceptance!.fatCompleted).toBe(0);
      expect(result.acceptance!.satTotal).toBe(3);
      expect(result.acceptance!.satCompleted).toBe(2);
    });

    it("ignores plan types other than FAT/SAT", async () => {
      pushFullOverviewQueue({
        acceptance: [
          { planType: "FAT", status: "completed", cnt: 1 },
          { planType: "OTHER", status: "completed", cnt: 99 },
        ],
      });
      const result = await caller().project360.overview({ projectId: 42 });
      expect(result.acceptance!.fatTotal).toBe(1);
      expect(result.acceptance!.satTotal).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  safeSlice resilience — individual slice failure returns null
  // ═══════════════════════════════════════════════════════════════════
  describe("overview — safeSlice resilience", () => {
    it("returns complete response shape even when all slices have empty data", async () => {
      pushFullOverviewQueue({
        project: [],
        costBudget: [{ budget: 0 }],
        costSpent: [{ spent: 0 }],
        stages: [],
        fileRows: [],
        ecoRows: [],
        fmeaCount: [{ cnt: 0 }],
        fmeaRpn: [{ maxRpn: 0 }],
        eightDCount: [{ cnt: 0 }],
        capaCount: [{ cnt: 0 }],
        acceptance: [],
      });

      const result = await caller().project360.overview({ projectId: 999 });

      // All keys present
      expect(result).toHaveProperty("project");
      expect(result).toHaveProperty("cost");
      expect(result).toHaveProperty("production");
      expect(result).toHaveProperty("vault");
      expect(result).toHaveProperty("quality");
      expect(result).toHaveProperty("acceptance");

      // Project returns null (empty array → rows[0] ?? null)
      expect(result.project).toBeNull();

      // Other slices return valid (possibly zero) objects
      expect(result.cost).toEqual({ budget: 0, spent: 0, remaining: 0 });
      expect(result.production!.stages).toHaveLength(0);
    });

    it("response always has all 6 keys", async () => {
      pushFullOverviewQueue();
      const result = await caller().project360.overview({ projectId: 42 });
      const keys = Object.keys(result).sort();
      expect(keys).toEqual(["acceptance", "cost", "production", "project", "quality", "vault"]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Edge cases
  // ═══════════════════════════════════════════════════════════════════
  describe("overview — edge cases", () => {
    it("handles string numeric values from DB (Number coercion)", async () => {
      pushFullOverviewQueue({
        costBudget: [{ budget: "300000" }],
        costSpent: [{ spent: "100000" }],
        fmeaCount: [{ cnt: "12" }],
        fmeaRpn: [{ maxRpn: "350" }],
        eightDCount: [{ cnt: "3" }],
        capaCount: [{ cnt: "2" }],
        fileRows: [{ fileType: "CAD", cnt: "7" }],
        ecoRows: [{ status: "draft", cnt: "4" }],
        acceptance: [{ planType: "FAT", status: "completed", cnt: "5" }],
      });
      const result = await caller().project360.overview({ projectId: 42 });

      // Number() coercion converts strings to numbers
      expect(result.cost!.budget).toBe(300000);
      expect(result.cost!.spent).toBe(100000);
      expect(result.cost!.remaining).toBe(200000);
      expect(result.quality!.fmeaCount).toBe(12);
      expect(result.quality!.maxRpn).toBe(350);
      expect(result.vault!.totalFiles).toBe(7);
      expect(result.vault!.ecoTotal).toBe(4);
      expect(result.vault!.ecoDraft).toBe(4);
      expect(result.acceptance!.fatTotal).toBe(5);
      expect(result.acceptance!.fatCompleted).toBe(5);
    });

    it("handles very large projectId", async () => {
      pushFullOverviewQueue();
      const result = await caller().project360.overview({ projectId: 999999 });
      expect(result).toHaveProperty("project");
    });
  });
});
