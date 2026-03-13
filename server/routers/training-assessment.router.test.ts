/**
 * Training Assessment Router — Unit Tests
 * Tests 6 procedures: list, getById, create, update, delete, getByTraining
 *
 * Standard DB-backed CRUD for training assessments.
 * getById does 2 queries: assessment + results (join via assessmentId).
 * delete removes both results and assessment (2 delete queries).
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
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
  returningQueue.length = 0;
});

const caller = () => createAdminCaller();

const sampleAssessment = {
  id: 1,
  trainingId: 100,
  assessmentType: "quiz",
  name: "焊接技能评估",
  description: "基础焊接理论考试",
  totalScore: 100,
  passingScore: 60,
  questions: '[{"q":"焊接温度?","a":"300°C"}]',
  status: "draft",
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-15T00:00:00.000Z",
};

const sampleResults = [
  { id: 1, assessmentId: 1, participantId: 10, score: 85, passed: true },
  { id: 2, assessmentId: 1, participantId: 11, score: 55, passed: false },
];

describe("training-assessment router", () => {

  // ═══ list ═══
  describe("list", () => {
    it("returns assessments", async () => {
      selectResultsQueue.push([sampleAssessment, { ...sampleAssessment, id: 2 }]);
      const result = await caller().trainingAssessment.list();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it("returns empty when no assessments", async () => {
      selectResultsQueue.push([]);
      const result = await caller().trainingAssessment.list();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ═══ getById ═══
  describe("getById", () => {
    it("returns assessment with results", async () => {
      selectResultsQueue.push([sampleAssessment]); // assessment
      selectResultsQueue.push(sampleResults);       // results
      const result = await caller().trainingAssessment.getById({ id: "1" });
      expect(result).toBeTruthy();
      expect(result!.name).toBe("焊接技能评估");
      expect(result!.results).toHaveLength(2);
    });

    it("returns null when not found", async () => {
      selectResultsQueue.push([]); // assessment not found
      const result = await caller().trainingAssessment.getById({ id: "999" });
      expect(result).toBeNull();
    });
  });

  // ═══ create ═══
  describe("create", () => {
    it("creates assessment with all fields", async () => {
      returningQueue.push([{ ...sampleAssessment, id: 10 }]);
      const result = await caller().trainingAssessment.create({
        trainingId: 100,
        assessmentType: "quiz",
        name: "新评估",
        description: "描述",
        totalScore: 100,
        passingScore: 70,
        questions: [{ q: "问题1", a: "答案1" }],
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("已创建");
      expect(result.data).toBeTruthy();
    });

    it("creates assessment with minimal fields", async () => {
      returningQueue.push([{ ...sampleAssessment, id: 11 }]);
      const result = await caller().trainingAssessment.create({
        trainingId: 200,
      });
      expect(result.success).toBe(true);
    });

    it("accepts string questions", async () => {
      returningQueue.push([{ ...sampleAssessment, id: 12 }]);
      const result = await caller().trainingAssessment.create({
        trainingId: 300,
        questions: '[{"q":"test"}]',
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ update ═══
  describe("update", () => {
    it("updates assessment fields", async () => {
      returningQueue.push([{ ...sampleAssessment, name: "已更新" }]);
      const result = await caller().trainingAssessment.update({
        id: 1,
        name: "已更新",
        passingScore: 80,
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("更新成功");
    });

    it("accepts string id", async () => {
      returningQueue.push([sampleAssessment]);
      const result = await caller().trainingAssessment.update({ id: "1", name: "test" });
      expect(result.success).toBe(true);
    });

    it("updates status", async () => {
      returningQueue.push([{ ...sampleAssessment, status: "active" }]);
      const result = await caller().trainingAssessment.update({ id: 1, status: "active" });
      expect(result.success).toBe(true);
    });

    it("updates questions as array", async () => {
      returningQueue.push([sampleAssessment]);
      const result = await caller().trainingAssessment.update({
        id: 1,
        questions: [{ q: "新问题" }],
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ delete ═══
  describe("delete", () => {
    it("deletes assessment and results", async () => {
      const result = await caller().trainingAssessment.delete({ id: "1" });
      expect(result.success).toBe(true);
      expect(result.message).toContain("删除成功");
    });
  });

  // ═══ getByTraining ═══
  describe("getByTraining", () => {
    it("returns assessments for a training", async () => {
      selectResultsQueue.push([sampleAssessment, { ...sampleAssessment, id: 2 }]);
      const result = await caller().trainingAssessment.getByTraining({ trainingId: 100 });
      expect(result).toHaveLength(2);
    });

    it("accepts string trainingId", async () => {
      selectResultsQueue.push([sampleAssessment]);
      const result = await caller().trainingAssessment.getByTraining({ trainingId: "100" });
      expect(result).toHaveLength(1);
    });

    it("returns empty when no assessments for training", async () => {
      selectResultsQueue.push([]);
      const result = await caller().trainingAssessment.getByTraining({ trainingId: 999 });
      expect(result).toEqual([]);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for list", async () => {
      await expect(createAnonymousCaller().trainingAssessment.list()).rejects.toThrow();
    });
    it("rejects anonymous for getById", async () => {
      await expect(createAnonymousCaller().trainingAssessment.getById({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for create", async () => {
      await expect(createAnonymousCaller().trainingAssessment.create({ trainingId: 1 })).rejects.toThrow();
    });
    it("rejects anonymous for delete", async () => {
      await expect(createAnonymousCaller().trainingAssessment.delete({ id: "1" })).rejects.toThrow();
    });
    it("rejects anonymous for getByTraining", async () => {
      await expect(createAnonymousCaller().trainingAssessment.getByTraining({ trainingId: 1 })).rejects.toThrow();
    });
  });
});
