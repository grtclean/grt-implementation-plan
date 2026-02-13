/**
 * 绩效指标计算引擎 - 单元测试
 */

import { describe, it, expect } from "vitest";
import {
  calculateOperationalScore,
  calculateDeliveryScore,
  calculateCostScore,
  calculateQualityScore,
  calculateCustomerScore,
  calculateHRScore,
  calculateInnovationScore,
  calculateOverallScore,
  getPerformanceRating,
  getRatingDescription,
  calculateDimensionScores,
  comparePerformance,
  identifyImprovementAreas,
  generatePerformanceReport,
  PerformanceMetrics,
} from "./performance-calculator";

describe("Performance Calculator", () => {
  // 测试数据
  const excellentMetrics: PerformanceMetrics = {
    revenueAchievementRate: 120, // 120%
    profitMargin: 25, // 25%
    deliveryOnTimeRate: 95, // 95%
    projectSatisfaction: 90, // 90分
    costVarianceRate: 5, // 5%
    laborCostRatio: 35, // 35%
    qualityScore: 95, // 95分
    defectRate: 1, // 1%
    customerSatisfaction: 92, // 92分
    customerRetentionRate: 88, // 88%
    employeeSatisfaction: 85, // 85分
    employeeTurnoverRate: 5, // 5%
    innovationScore: 80, // 80分
  };

  const poorMetrics: PerformanceMetrics = {
    revenueAchievementRate: 70, // 70%
    profitMargin: 10, // 10%
    deliveryOnTimeRate: 60, // 60%
    projectSatisfaction: 65, // 65分
    costVarianceRate: 20, // 20%
    laborCostRatio: 50, // 50%
    qualityScore: 60, // 60分
    defectRate: 8, // 8%
    customerSatisfaction: 60, // 60分
    customerRetentionRate: 70, // 70%
    employeeSatisfaction: 55, // 55分
    employeeTurnoverRate: 15, // 15%
    innovationScore: 40, // 40分
  };

  describe("Individual Dimension Scores", () => {
    it("should calculate operational score correctly", () => {
      const score = calculateOperationalScore(100, 20);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should calculate delivery score correctly", () => {
      const score = calculateDeliveryScore(90, 85);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should calculate cost score correctly", () => {
      const score = calculateCostScore(5, 35);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should calculate quality score correctly", () => {
      const score = calculateQualityScore(90, 2);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should calculate customer score correctly", () => {
      const score = calculateCustomerScore(90, 85);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should calculate HR score correctly", () => {
      const score = calculateHRScore(85, 5);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should calculate innovation score correctly", () => {
      const score = calculateInnovationScore(80);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe("Overall Score Calculation", () => {
    it("should calculate overall score for excellent metrics", () => {
      const score = calculateOverallScore(excellentMetrics);
      expect(score).toBeGreaterThan(0.8);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should calculate overall score for poor metrics", () => {
      const score = calculateOverallScore(poorMetrics);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.7);
    });

    it("should return score between 0 and 1", () => {
      const score = calculateOverallScore(excellentMetrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe("Performance Rating", () => {
    it("should rate excellent metrics as B+ or higher", () => {
      const score = calculateOverallScore(excellentMetrics);
      const rating = getPerformanceRating(score);
      // Excellent metrics yield ~0.85 overall score, which maps to B+ rating
      expect(["A+", "A", "B+"]).toContain(rating);
    });

    it("should rate poor metrics as B or C", () => {
      const score = calculateOverallScore(poorMetrics);
      const rating = getPerformanceRating(score);
      expect(["B", "C"]).toContain(rating);
    });

    it("should provide correct rating descriptions", () => {
      const descriptions = {
        "A+": "优秀",
        A: "良好",
        "B+": "满意",
        B: "一般",
        C: "较差",
      };

      Object.entries(descriptions).forEach(([rating, keyword]) => {
        const description = getRatingDescription(rating as any);
        expect(description).toContain(keyword);
      });
    });
  });

  describe("Dimension Scores", () => {
    it("should calculate all dimension scores", () => {
      const dimensions = calculateDimensionScores(excellentMetrics);
      expect(dimensions).toHaveProperty("operational");
      expect(dimensions).toHaveProperty("delivery");
      expect(dimensions).toHaveProperty("cost");
      expect(dimensions).toHaveProperty("quality");
      expect(dimensions).toHaveProperty("customer");
      expect(dimensions).toHaveProperty("hr");
      expect(dimensions).toHaveProperty("innovation");

      Object.values(dimensions).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Performance Comparison", () => {
    it("should compare two periods correctly", () => {
      const comparison = comparePerformance(excellentMetrics, poorMetrics);
      expect(comparison).toHaveProperty("currentScore");
      expect(comparison).toHaveProperty("previousScore");
      expect(comparison).toHaveProperty("scoreDifference");
      expect(comparison).toHaveProperty("scoreChangePercentage");
      expect(comparison).toHaveProperty("trend");
      expect(comparison.trend).toBe("up");
    });

    it("should detect downward trend", () => {
      const comparison = comparePerformance(poorMetrics, excellentMetrics);
      expect(comparison.trend).toBe("down");
    });
  });

  describe("Improvement Areas", () => {
    it("should identify improvement areas", () => {
      const areas = identifyImprovementAreas(poorMetrics, 0.7);
      expect(Array.isArray(areas)).toBe(true);
      expect(areas.length).toBeGreaterThan(0);

      areas.forEach((area) => {
        expect(area).toHaveProperty("dimension");
        expect(area).toHaveProperty("score");
        expect(area).toHaveProperty("gap");
        expect(area.score).toBeLessThan(0.7);
      });
    });

    it("should sort improvement areas by gap descending", () => {
      const areas = identifyImprovementAreas(poorMetrics, 0.7);
      for (let i = 0; i < areas.length - 1; i++) {
        expect(areas[i].gap).toBeGreaterThanOrEqual(areas[i + 1].gap);
      }
    });
  });

  describe("Performance Report", () => {
    it("should generate comprehensive performance report", () => {
      const report = generatePerformanceReport(excellentMetrics);
      expect(report).toHaveProperty("overallScore");
      expect(report).toHaveProperty("rating");
      expect(report).toHaveProperty("ratingDescription");
      expect(report).toHaveProperty("dimensions");
      expect(report).toHaveProperty("improvementAreas");
      expect(report).toHaveProperty("strengths");
      expect(report).toHaveProperty("weaknesses");
    });

    it("should identify strengths for excellent metrics", () => {
      const report = generatePerformanceReport(excellentMetrics);
      expect(report.strengths.length).toBeGreaterThan(0);
      expect(report.weaknesses.length).toBeLessThanOrEqual(1);
    });

    it("should identify weaknesses for poor metrics", () => {
      const report = generatePerformanceReport(poorMetrics);
      expect(report.weaknesses.length).toBeGreaterThan(0);
    });

    it("should have valid numeric values in report", () => {
      const report = generatePerformanceReport(excellentMetrics);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(1);

      Object.values(report.dimensions).forEach((score) => {
        expect(typeof score).toBe("number");
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero values", () => {
      const zeroMetrics: PerformanceMetrics = {
        revenueAchievementRate: 0,
        profitMargin: 0,
        deliveryOnTimeRate: 0,
        projectSatisfaction: 0,
        costVarianceRate: 0,
        laborCostRatio: 0,
        qualityScore: 0,
        defectRate: 0,
        customerSatisfaction: 0,
        customerRetentionRate: 0,
        employeeSatisfaction: 0,
        employeeTurnoverRate: 0,
        innovationScore: 0,
      };

      const score = calculateOverallScore(zeroMetrics);
      // Zero inputs still produce a non-zero score because costScore and hrScore
      // use inverse formulas (e.g., costVariance=0 is ideal, turnoverRate=0 is ideal)
      expect(score).toBeCloseTo(0.18, 2);
      expect(getPerformanceRating(score)).toBe("C");
    });

    it("should handle maximum values", () => {
      const maxMetrics: PerformanceMetrics = {
        revenueAchievementRate: 200,
        profitMargin: 50,
        deliveryOnTimeRate: 100,
        projectSatisfaction: 100,
        costVarianceRate: 0,
        laborCostRatio: 30,
        qualityScore: 100,
        defectRate: 0,
        customerSatisfaction: 100,
        customerRetentionRate: 100,
        employeeSatisfaction: 100,
        employeeTurnoverRate: 0,
        innovationScore: 100,
      };

      const score = calculateOverallScore(maxMetrics);
      // revenueAchievementRate is capped at min(200/100, 1.0) = 1.0, and
      // laborCostRatio=30 yields 1 - |30-35|/35 = 0.857, not perfect 1.0,
      // so the overall score is ~0.936 (rating "A", not "A+")
      expect(score).toBeGreaterThan(0.9);
      expect(getPerformanceRating(score)).toBe("A");
    });
  });
});
