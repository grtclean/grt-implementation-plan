/**
 * Skill Recommendation Router — Unit Tests
 * Tests 4 procedures: getRecommendations, getLearningPath,
 * recordRecommendationFeedback, getRecommendationStats
 *
 * Uses getDb (not requireDb) and invokeLLM — both mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { selectResultsQueue, mockInvokeLLM } = vi.hoisted(() => {
  const selectResultsQueue: any[][] = [];
  const mockInvokeLLM = vi.fn();
  return { selectResultsQueue, mockInvokeLLM };
});

vi.mock("../db", () => ({
  getDb: vi.fn(async () => {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      then(resolve: any) {
        const result = selectResultsQueue.length > 0 ? selectResultsQueue.shift()! : [];
        return Promise.resolve(result).then(resolve);
      },
      catch() { return chain; },
    };
    return {
      select: vi.fn(() => chain),
    };
  }),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: mockInvokeLLM,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: any[]) => a),
  desc: vi.fn((c: any) => c),
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
  and: vi.fn((...a: any[]) => a),
  count: vi.fn(() => "count"),
  ne: vi.fn((...a: any[]) => a),
  asc: vi.fn((c: any) => c),
  or: vi.fn((...a: any[]) => a),
  inArray: vi.fn((...a: any[]) => a),
  isNull: vi.fn((c: any) => c),
  gte: vi.fn((...a: any[]) => a),
  lte: vi.fn((...a: any[]) => a),
  like: vi.fn((...a: any[]) => a),
  between: vi.fn((...a: any[]) => a),
  sum: vi.fn(() => "sum"),
  avg: vi.fn(() => "avg"),
  max: vi.fn(() => "max"),
  min: vi.fn(() => "min"),
}));

beforeEach(() => {
  vi.clearAllMocks();
  selectResultsQueue.length = 0;
});

const caller = () => createAuthenticatedCaller();

const sampleSkill = {
  id: 1, employeeId: 1, skillName: "TypeScript", currentLevel: 3,
};

const sampleLearningRecord = {
  id: 1, employeeId: 1, contentCategory: "programming",
  learningSource: "online-course",
};

describe("skill-recommendation router", () => {

  // ═══ getRecommendations ═══
  describe("getRecommendations", () => {
    it("returns AI-generated recommendations", async () => {
      selectResultsQueue.push([sampleSkill]); // current skills
      selectResultsQueue.push([sampleLearningRecord]); // learning records
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendations: [
                { name: "React", description: "Frontend", currentLevel: 2, targetLevel: 4, priority: "high", confidenceScore: 0.9 },
              ],
            }),
          },
        }],
      });
      const result = await caller().skillRecommendation.getRecommendations({});
      expect(result.success).toBe(true);
      expect(result.recommendations).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it("handles LLM returning non-JSON gracefully", async () => {
      selectResultsQueue.push([]); // no skills
      selectResultsQueue.push([]); // no learning records
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { content: "not json" } }],
      });
      const result = await caller().skillRecommendation.getRecommendations({});
      expect(result.success).toBe(true);
      expect(result.recommendations).toEqual([]);
    });

    it("respects limit parameter", async () => {
      selectResultsQueue.push([sampleSkill]);
      selectResultsQueue.push([]);
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({ recommendations: [{ name: "Go" }] }),
          },
        }],
      });
      const result = await caller().skillRecommendation.getRecommendations({ limit: 5 });
      expect(result.success).toBe(true);
    });

    it("throws on LLM error", async () => {
      selectResultsQueue.push([]);
      selectResultsQueue.push([]);
      mockInvokeLLM.mockRejectedValueOnce(new Error("LLM unavailable"));
      await expect(caller().skillRecommendation.getRecommendations({})).rejects.toThrow("Failed to get recommendations");
    });
  });

  // ═══ getLearningPath ═══
  describe("getLearningPath", () => {
    it("returns AI-generated learning path", async () => {
      selectResultsQueue.push([sampleSkill]); // current skill
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              learningPath: {
                skillName: "TypeScript",
                targetLevel: 5,
                stages: [{ stage: 1, level: 4, duration: "2 weeks" }],
              },
            }),
          },
        }],
      });
      const result = await caller().skillRecommendation.getLearningPath({
        skillName: "TypeScript", targetLevel: 5,
      });
      expect(result.success).toBe(true);
      expect(result.learningPath).toHaveProperty("skillName", "TypeScript");
    });

    it("returns null learningPath on parse failure", async () => {
      selectResultsQueue.push([]);
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { content: "invalid" } }],
      });
      const result = await caller().skillRecommendation.getLearningPath({
        skillName: "Rust", targetLevel: 3,
      });
      expect(result.success).toBe(true);
      expect(result.learningPath).toBeNull();
    });

    it("rejects targetLevel > 5", async () => {
      await expect(caller().skillRecommendation.getLearningPath({
        skillName: "X", targetLevel: 6,
      })).rejects.toThrow();
    });

    it("rejects targetLevel < 1", async () => {
      await expect(caller().skillRecommendation.getLearningPath({
        skillName: "X", targetLevel: 0,
      })).rejects.toThrow();
    });
  });

  // ═══ recordRecommendationFeedback ═══
  describe("recordRecommendationFeedback", () => {
    it("records positive feedback", async () => {
      const result = await caller().skillRecommendation.recordRecommendationFeedback({
        skillName: "TypeScript", helpful: true,
      });
      expect(result.success).toBe(true);
    });

    it("records negative feedback with notes", async () => {
      const result = await caller().skillRecommendation.recordRecommendationFeedback({
        skillName: "Go", helpful: false, notes: "Not relevant to my role",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ getRecommendationStats ═══
  describe("getRecommendationStats", () => {
    it("returns skill statistics", async () => {
      selectResultsQueue.push([
        { ...sampleSkill, currentLevel: 4 },
        { ...sampleSkill, id: 2, skillName: "React", currentLevel: 3 },
        { ...sampleSkill, id: 3, skillName: "Go", currentLevel: 1 },
      ]);
      const result = await caller().skillRecommendation.getRecommendationStats();
      expect(result.success).toBe(true);
      expect(result.stats.totalSkills).toBe(3);
      expect(result.stats.masterSkills).toBe(1); // level >= 4
      expect(result.stats.developingSkills).toBe(1); // level 2-3
      expect(result.stats.beginnerSkills).toBe(1); // level < 2
      expect(result.stats.averageLevel).toBe(2.7); // (4+3+1)/3
    });

    it("returns zeros when no skills", async () => {
      selectResultsQueue.push([]);
      const result = await caller().skillRecommendation.getRecommendationStats();
      expect(result.stats.totalSkills).toBe(0);
      expect(result.stats.averageLevel).toBe(0);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getRecommendations", async () => {
      await expect(createAnonymousCaller().skillRecommendation.getRecommendations({})).rejects.toThrow();
    });
    it("rejects anonymous for getLearningPath", async () => {
      await expect(createAnonymousCaller().skillRecommendation.getLearningPath({
        skillName: "X", targetLevel: 3,
      })).rejects.toThrow();
    });
    it("rejects anonymous for recordRecommendationFeedback", async () => {
      await expect(createAnonymousCaller().skillRecommendation.recordRecommendationFeedback({
        skillName: "X", helpful: true,
      })).rejects.toThrow();
    });
    it("rejects anonymous for getRecommendationStats", async () => {
      await expect(createAnonymousCaller().skillRecommendation.getRecommendationStats()).rejects.toThrow();
    });
  });
});
