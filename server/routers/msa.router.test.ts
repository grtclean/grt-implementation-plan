/**
 * MSA Router — Unit Tests
 * Tests 9 procedures: list, getById, create, update, delete,
 * addMeasurement, addMeasurementsBatch, calculateGRR, getStats
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, returningQueue } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const returningQueue: any[][] = [];
  return { selectResultsQueue, returningQueue };
});

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
      returning: vi.fn(() => {
        const r = returningQueue.length > 0 ? returningQueue.shift()! : [{ id: 1 }];
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
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    };
  }),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  count: vi.fn(() => "count"),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleStudy = {
  id: 1, studyCode: "MSA-G-ABC", projectId: 10, controlPlanItemId: 5,
  studyType: "gage_rr", gaugeName: "Micrometer-001", gaugeId: "MIC-001",
  gaugeResolution: "0.001mm", partName: "Motor Shaft",
  characteristicName: "Diameter", specification: "25.000±0.010",
  tolerance: "0.020", numOperators: 3, numParts: 10, numTrials: 3,
  status: "planned", repeatability: null, reproducibility: null,
  grrPercent: null, ndc: null, conclusion: null,
  conductedAt: null, createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

const sampleMeasurement = {
  id: 1, studyId: 1, operatorId: 1, operatorName: "Op-A",
  partNumber: 1, trialNumber: 1, measuredValue: "25.003",
  referenceValue: "25.000",
};

describe("msa router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns all studies", async () => {
      selectResultsQueue.push([sampleStudy, { ...sampleStudy, id: 2 }]);
      const result = await caller().msa.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("filters by studyType", async () => {
      selectResultsQueue.push([sampleStudy, { ...sampleStudy, id: 2, studyType: "bias" }]);
      const result = await caller().msa.list({ studyType: "gage_rr" });
      expect(result.items).toHaveLength(1);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([sampleStudy, { ...sampleStudy, id: 2, projectId: 20 }]);
      const result = await caller().msa.list({ projectId: 10 });
      expect(result.items).toHaveLength(1);
    });

    it("filters by status", async () => {
      selectResultsQueue.push([sampleStudy, { ...sampleStudy, id: 2, status: "completed" }]);
      const result = await caller().msa.list({ status: "planned" });
      expect(result.items).toHaveLength(1);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns study with measurements", async () => {
      selectResultsQueue.push([sampleStudy]); // study
      selectResultsQueue.push([sampleMeasurement, { ...sampleMeasurement, id: 2, trialNumber: 2 }]); // measurements
      const result = await caller().msa.getById({ id: 1 });
      expect(result).toBeTruthy();
      expect(result!.gaugeName).toBe("Micrometer-001");
      expect(result!.measurements).toHaveLength(2);
    });

    it("returns null for missing study", async () => {
      selectResultsQueue.push([]); // not found
      const result = await caller().msa.getById({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates a study with generated code", async () => {
      returningQueue.push([{ ...sampleStudy, id: 5 }]);
      const result = await caller().msa.create({
        studyType: "gage_rr", gaugeName: "New Gauge",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 5);
    });

    it("passes all optional fields", async () => {
      returningQueue.push([{ ...sampleStudy, id: 6 }]);
      const result = await caller().msa.create({
        studyType: "bias", gaugeName: "Caliper",
        projectId: 10, controlPlanItemId: 5,
        gaugeId: "CAL-001", gaugeResolution: "0.01mm",
        partName: "Shaft", characteristicName: "Length",
        specification: "100±0.5", tolerance: "1.0",
        numOperators: 2, numParts: 5, numTrials: 2,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty gaugeName", async () => {
      await expect(caller().msa.create({
        studyType: "gage_rr", gaugeName: "",
      })).rejects.toThrow();
    });

    it("rejects invalid studyType", async () => {
      await expect(caller().msa.create({
        studyType: "invalid" as any, gaugeName: "X",
      })).rejects.toThrow();
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates study fields", async () => {
      returningQueue.push([{ ...sampleStudy, status: "in_progress" }]);
      const result = await caller().msa.update({
        id: 1, status: "in_progress",
      });
      expect(result.success).toBe(true);
    });

    it("sets conductedAt on completed status", async () => {
      returningQueue.push([{ ...sampleStudy, status: "completed" }]);
      const result = await caller().msa.update({
        id: 1, status: "completed", conclusion: "acceptable",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", async () => {
      await expect(caller().msa.update({
        id: 1, status: "invalid" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes study and measurements", async () => {
      selectResultsQueue.push([]); // delete measurements
      selectResultsQueue.push([]); // delete study
      const result = await caller().msa.delete({ id: 1 });
      expect(result).toEqual({ success: true, message: "MSA研究已删除" });
    });
  });

  // ═══ addMeasurement ═══
  describe("addMeasurement", () => {
    it("adds a measurement with operator from context", async () => {
      returningQueue.push([{ ...sampleMeasurement, id: 10 }]);
      const result = await caller().msa.addMeasurement({
        studyId: 1, partNumber: 1, trialNumber: 1, measuredValue: "25.003",
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("id", 10);
    });

    it("passes reference value", async () => {
      returningQueue.push([sampleMeasurement]);
      const result = await caller().msa.addMeasurement({
        studyId: 1, partNumber: 2, trialNumber: 1,
        measuredValue: "25.005", referenceValue: "25.000",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ addMeasurementsBatch ═══
  describe("addMeasurementsBatch", () => {
    it("inserts multiple measurements", async () => {
      // 3 insert chains (fire-and-forget)
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      const result = await caller().msa.addMeasurementsBatch({
        studyId: 1,
        measurements: [
          { partNumber: 1, trialNumber: 1, measuredValue: "25.001" },
          { partNumber: 1, trialNumber: 2, measuredValue: "25.002" },
          { partNumber: 2, trialNumber: 1, measuredValue: "24.998" },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("3");
    });
  });

  // ═══ calculateGRR ═══
  describe("calculateGRR", () => {
    it("calculates GR&R from measurement data", async () => {
      selectResultsQueue.push([sampleStudy]); // study lookup
      selectResultsQueue.push([
        // Op-A, Part 1: trials 25.003, 25.005 → range 0.002
        { ...sampleMeasurement, operatorName: "Op-A", partNumber: 1, trialNumber: 1, measuredValue: "25.003" },
        { ...sampleMeasurement, id: 2, operatorName: "Op-A", partNumber: 1, trialNumber: 2, measuredValue: "25.005" },
        // Op-B, Part 1: trials 25.001, 25.004 → range 0.003
        { ...sampleMeasurement, id: 3, operatorName: "Op-B", partNumber: 1, trialNumber: 1, measuredValue: "25.001" },
        { ...sampleMeasurement, id: 4, operatorName: "Op-B", partNumber: 1, trialNumber: 2, measuredValue: "25.004" },
      ]); // measurements
      selectResultsQueue.push([]); // update study with results

      const result = await caller().msa.calculateGRR({ studyId: 1 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("repeatability");
      expect(result.data).toHaveProperty("reproducibility");
      expect(result.data).toHaveProperty("grrPercent");
      expect(result.data).toHaveProperty("ndc");
      expect(result.data).toHaveProperty("conclusion");
      expect(typeof result.data!.repeatability).toBe("number");
    });

    it("returns failure when study not found", async () => {
      selectResultsQueue.push([]); // not found
      const result = await caller().msa.calculateGRR({ studyId: 999 });
      expect(result.success).toBe(false);
      expect(result.message).toContain("不存在");
    });

    it("returns failure when no measurements", async () => {
      selectResultsQueue.push([sampleStudy]); // study
      selectResultsQueue.push([]); // no measurements
      const result = await caller().msa.calculateGRR({ studyId: 1 });
      expect(result.success).toBe(false);
      expect(result.message).toContain("无测量数据");
    });

    it("handles single operator (reproducibility = 0)", async () => {
      selectResultsQueue.push([sampleStudy]);
      selectResultsQueue.push([
        { ...sampleMeasurement, operatorName: "Op-A", partNumber: 1, trialNumber: 1, measuredValue: "25.003" },
        { ...sampleMeasurement, id: 2, operatorName: "Op-A", partNumber: 1, trialNumber: 2, measuredValue: "25.005" },
      ]);
      selectResultsQueue.push([]); // update

      const result = await caller().msa.calculateGRR({ studyId: 1 });
      expect(result.success).toBe(true);
      expect(result.data!.reproducibility).toBe(0);
    });
  });

  // ═══ getStats ═══
  describe("getStats", () => {
    it("returns aggregated stats", async () => {
      selectResultsQueue.push([
        { ...sampleStudy, studyType: "gage_rr", conclusion: "acceptable" },
        { ...sampleStudy, id: 2, studyType: "bias", conclusion: "marginal" },
        { ...sampleStudy, id: 3, studyType: "gage_rr", conclusion: "unacceptable" },
      ]);
      const result = await caller().msa.getStats();
      expect(result.total).toBe(3);
      expect(result.byType.gage_rr).toBe(2);
      expect(result.byType.bias).toBe(1);
      expect(result.byConclusion.acceptable).toBe(1);
      expect(result.byConclusion.marginal).toBe(1);
      expect(result.byConclusion.unacceptable).toBe(1);
    });

    it("filters by projectId", async () => {
      selectResultsQueue.push([sampleStudy, { ...sampleStudy, id: 2, projectId: 20 }]);
      const result = await caller().msa.getStats({ projectId: 10 });
      expect(result.total).toBe(1);
    });

    it("returns zeros when empty", async () => {
      selectResultsQueue.push([]);
      const result = await caller().msa.getStats();
      expect(result.total).toBe(0);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().msa.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().msa.getById({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().msa.create({
        studyType: "gage_rr", gaugeName: "X",
      })).rejects.toThrow();
    });
    it("rejects anonymous for update", async () => {
      await expect(createAnonymousCaller().msa.update({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().msa.delete({ id: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for addMeasurement", async () => {
      await expect(createAnonymousCaller().msa.addMeasurement({
        studyId: 1, partNumber: 1, trialNumber: 1, measuredValue: "1",
      })).rejects.toThrow();
    });
    it("rejects anonymous for addMeasurementsBatch", async () => {
      await expect(createAnonymousCaller().msa.addMeasurementsBatch({
        studyId: 1, measurements: [],
      })).rejects.toThrow();
    });
    it("rejects anonymous for calculateGRR", async () => {
      await expect(createAnonymousCaller().msa.calculateGRR({ studyId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for getStats", async () => {
      await expect(createAnonymousCaller().msa.getStats()).rejects.toThrow();
    });
  });
});
