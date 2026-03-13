/**
 * AI Model Router — Unit Tests
 * Tests 3 procedures: getPerformanceDashboard, getModelTrend, getExplainabilityReport
 *
 * Uses db.execute(sql`...`) for all queries.
 * Has ensureAiModelData() bootstrap that runs once (module-level _aiModelReady flag).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { executeResults } = vi.hoisted(() => {
  const executeResults: any[] = [];
  return { executeResults };
});

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => ({
    execute: vi.fn(async () => {
      return executeResults.length > 0 ? executeResults.shift()! : { rows: [] };
    }),
  })),
}));

vi.mock("drizzle-orm", () => ({
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  executeResults.length = 0;
});

const caller = () => createAdminCaller();

describe("ai-model router", () => {

  // ═══ getPerformanceDashboard ═══
  describe("getPerformanceDashboard", () => {
    it("returns metrics and health data", async () => {
      // ensureAiModelData: CREATE TABLE (1st call), SELECT COUNT (2nd), then dashboard query
      executeResults.push({ rows: [] }); // CREATE TABLE
      executeResults.push({ rows: [{ cnt: 0 }] }); // COUNT → 0 → seeds
      executeResults.push({ rows: [] }); // INSERT seed data
      executeResults.push({
        rows: [
          { category: "performance_metrics", items: [{ modelType: "cost_prediction", totalCalls: 450, accuracy: 0.87 }] },
          { category: "health_status", items: [{ modelType: "cost_prediction", status: "healthy" }] },
        ],
      }); // dashboard query
      const result = await caller().aiModel.getPerformanceDashboard();
      expect(result.metrics).toHaveLength(1);
      expect(result.health).toHaveLength(1);
      expect(result.metrics[0]).toHaveProperty("period", "day");
    });

    it("scales totalCalls by period multiplier", async () => {
      // ensureAiModelData already ran (_aiModelReady = true), so no bootstrap calls
      executeResults.push({
        rows: [
          { category: "performance_metrics", items: [{ modelType: "test", totalCalls: 100, accuracy: 0.9 }] },
          { category: "health_status", items: [] },
        ],
      });
      const result = await caller().aiModel.getPerformanceDashboard({ period: "week" });
      expect(result.metrics[0].totalCalls).toBe(700); // 100 * 7
      expect(result.metrics[0].period).toBe("week");
    });

    it("returns empty arrays when no data", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().aiModel.getPerformanceDashboard();
      expect(result.metrics).toEqual([]);
      expect(result.health).toEqual([]);
    });
  });

  // ═══ getModelTrend ═══
  describe("getModelTrend", () => {
    it("returns trend data for cost_prediction daily", async () => {
      const result = await caller().aiModel.getModelTrend({
        modelType: "cost_prediction", period: "day",
      });
      expect(result).toHaveLength(24);
      expect(result[0]).toHaveProperty("timestamp");
      expect(result[0]).toHaveProperty("calls");
      expect(result[0]).toHaveProperty("accuracy");
      expect(result[0]).toHaveProperty("avgLatency");
    });

    it("returns 7 points for weekly period", async () => {
      const result = await caller().aiModel.getModelTrend({
        modelType: "anomaly_detection", period: "week",
      });
      expect(result).toHaveLength(7);
    });

    it("returns 30 points for monthly period", async () => {
      const result = await caller().aiModel.getModelTrend({
        modelType: "quality_prediction", period: "month",
      });
      expect(result).toHaveLength(30);
    });

    it("returns 12 points for hourly period", async () => {
      const result = await caller().aiModel.getModelTrend({
        modelType: "resource_allocation", period: "hour",
      });
      expect(result).toHaveLength(12);
    });

    it("uses default 24 for unknown period", async () => {
      const result = await caller().aiModel.getModelTrend({
        modelType: "test", period: "custom",
      });
      expect(result).toHaveLength(24);
    });
  });

  // ═══ getExplainabilityReport ═══
  describe("getExplainabilityReport", () => {
    it("returns report with visualization data", async () => {
      executeResults.push({
        rows: [{
          items: {
            selectedModel: { id: "linear", name: "线性回归" },
            selectionReason: { confidenceScore: 0.87 },
            featureImportances: [{ feature: "时间序列", importance: 0.45 }],
            modelComparisons: [],
            visualizationData: { metricsComparison: {} },
          },
        }],
      });
      const result = await caller().aiModel.getExplainabilityReport({ projectId: "1" });
      expect(result).toHaveProperty("selectedModel");
      expect(result).toHaveProperty("generatedAt");
      expect(result!.visualizationData).toHaveProperty("predictionComparison");
    });

    it("returns null when no report data", async () => {
      executeResults.push({ rows: [] });
      const result = await caller().aiModel.getExplainabilityReport({ projectId: "999" });
      expect(result).toBeNull();
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    it("rejects anonymous for getPerformanceDashboard", async () => {
      await expect(createAnonymousCaller().aiModel.getPerformanceDashboard()).rejects.toThrow();
    });
    it("rejects anonymous for getModelTrend", async () => {
      await expect(createAnonymousCaller().aiModel.getModelTrend({
        modelType: "x", period: "day",
      })).rejects.toThrow();
    });
    it("rejects anonymous for getExplainabilityReport", async () => {
      await expect(createAnonymousCaller().aiModel.getExplainabilityReport({
        projectId: "1",
      })).rejects.toThrow();
    });
  });
});
