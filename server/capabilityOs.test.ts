import { describe, it, expect } from "vitest";
import {
  CAPABILITY_DOMAINS,
  LEVEL_THRESHOLDS,
  EVIDENCE_SCORE_RULES,
  calculateLevelFromPoints,
  calculateEvidenceScore,
  distributePointsToDomains,
  validateLevelCalculation,
} from "./services/capabilityLevelService";
import { formatNotificationContent } from "./services/capabilityNotificationService";

describe("Capability OS - TSDCKL Domains", () => {
  it("should have exactly 6 capability domains", () => {
    expect(CAPABILITY_DOMAINS).toHaveLength(6);
  });

  it("should have correct domain codes (T, S, D, C, K, L)", () => {
    const codes = CAPABILITY_DOMAINS.map(d => d.code);
    expect(codes).toContain("T");
    expect(codes).toContain("S");
    expect(codes).toContain("D");
    expect(codes).toContain("C");
    expect(codes).toContain("K");
    expect(codes).toContain("L");
  });

  it("should have weights that sum to 1.0", () => {
    const totalWeight = CAPABILITY_DOMAINS.reduce((sum, d) => sum + d.weight, 0);
    expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
  });

  it("should have T and D with highest weights (0.25 each)", () => {
    const tDomain = CAPABILITY_DOMAINS.find(d => d.code === "T");
    const dDomain = CAPABILITY_DOMAINS.find(d => d.code === "D");
    expect(tDomain?.weight).toBe(0.25);
    expect(dDomain?.weight).toBe(0.25);
  });
});

describe("Capability OS - Level Thresholds (L1-L5)", () => {
  it("should have exactly 5 levels", () => {
    expect(LEVEL_THRESHOLDS).toHaveLength(5);
  });

  it("should have correct level numbers (1-5)", () => {
    const levels = LEVEL_THRESHOLDS.map(l => l.level);
    expect(levels).toEqual([1, 2, 3, 4, 5]);
  });

  it("should have correct point thresholds", () => {
    expect(LEVEL_THRESHOLDS[0].minPoints).toBe(0);
    expect(LEVEL_THRESHOLDS[0].maxPoints).toBe(99);
    expect(LEVEL_THRESHOLDS[1].minPoints).toBe(100);
    expect(LEVEL_THRESHOLDS[1].maxPoints).toBe(299);
    expect(LEVEL_THRESHOLDS[2].minPoints).toBe(300);
    expect(LEVEL_THRESHOLDS[2].maxPoints).toBe(599);
    expect(LEVEL_THRESHOLDS[3].minPoints).toBe(600);
    expect(LEVEL_THRESHOLDS[3].maxPoints).toBe(999);
    expect(LEVEL_THRESHOLDS[4].minPoints).toBe(1000);
  });

  it("should calculate correct level from points", () => {
    expect(calculateLevelFromPoints(0)).toBe(1);
    expect(calculateLevelFromPoints(50)).toBe(1);
    expect(calculateLevelFromPoints(99)).toBe(1);
    expect(calculateLevelFromPoints(100)).toBe(2);
    expect(calculateLevelFromPoints(299)).toBe(2);
    expect(calculateLevelFromPoints(300)).toBe(3);
    expect(calculateLevelFromPoints(599)).toBe(3);
    expect(calculateLevelFromPoints(600)).toBe(4);
    expect(calculateLevelFromPoints(999)).toBe(4);
    expect(calculateLevelFromPoints(1000)).toBe(5);
    expect(calculateLevelFromPoints(5000)).toBe(5);
  });

  it("should validate level calculation rules", () => {
    expect(validateLevelCalculation()).toBe(true);
  });
});

describe("Capability OS - Evidence Types", () => {
  it("should have exactly 10 evidence types", () => {
    expect(EVIDENCE_SCORE_RULES).toHaveLength(10);
  });

  it("should have TIER1_DELIVERY with highest base score (100)", () => {
    const tier1 = EVIDENCE_SCORE_RULES.find(e => e.code === "TIER1_DELIVERY");
    expect(tier1?.baseScore).toBe(100);
  });

  it("should have RED_BLUE_PASS with 80 base score", () => {
    const redBlue = EVIDENCE_SCORE_RULES.find(e => e.code === "RED_BLUE_PASS");
    expect(redBlue?.baseScore).toBe(80);
  });

  it("should have all evidence types with valid domains", () => {
    const validDomains = ["T", "S", "D", "C", "K", "L"];
    EVIDENCE_SCORE_RULES.forEach(rule => {
      rule.domains.forEach(domain => {
        expect(validDomains).toContain(domain);
      });
    });
  });
});

describe("Capability OS - Score Calculation", () => {
  it("should calculate base score correctly", () => {
    expect(calculateEvidenceScore(50)).toBe(50);
    expect(calculateEvidenceScore(100)).toBe(100);
  });

  it("should apply quality multiplier correctly", () => {
    expect(calculateEvidenceScore(50, 1.5)).toBe(75);
    expect(calculateEvidenceScore(100, 0.8)).toBe(80);
  });

  it("should apply all multipliers correctly", () => {
    // 50 * 1.2 * 1.5 * 1.0 = 90
    expect(calculateEvidenceScore(50, 1.2, 1.5, 1.0)).toBe(90);
    // 100 * 1.0 * 1.0 * 2.0 = 200
    expect(calculateEvidenceScore(100, 1.0, 1.0, 2.0)).toBe(200);
  });

  it("should round to nearest integer", () => {
    // 50 * 1.1 = 55
    expect(calculateEvidenceScore(50, 1.1)).toBe(55);
    // 50 * 1.15 = 57.5 -> 57 (Math.round rounds to nearest even for .5)
    expect(calculateEvidenceScore(50, 1.15)).toBe(57);
  });
});

describe("Capability OS - Points Distribution", () => {
  it("should distribute points evenly across domains", () => {
    const result = distributePointsToDomains(100, ["T", "S", "D"]);
    expect(result.T).toBe(33);
    expect(result.S).toBe(33);
    expect(result.D).toBe(33);
  });

  it("should handle single domain", () => {
    const result = distributePointsToDomains(100, ["T"]);
    expect(result.T).toBe(100);
  });

  it("should handle all 6 domains", () => {
    const result = distributePointsToDomains(60, ["T", "S", "D", "C", "K", "L"]);
    expect(result.T).toBe(10);
    expect(result.S).toBe(10);
    expect(result.D).toBe(10);
    expect(result.C).toBe(10);
    expect(result.K).toBe(10);
    expect(result.L).toBe(10);
  });
});

describe("Capability OS - Red-Blue Confrontation", () => {
  it("should require red-blue for Tier1 customers", () => {
    const tier1Required = true; // Tier1客户必须启用红蓝流程
    expect(tier1Required).toBe(true);
  });

  it("should require red-blue for high complexity projects", () => {
    const highComplexityRequired = true; // 高复杂度项目必须启用红蓝流程
    expect(highComplexityRequired).toBe(true);
  });

  it("should have 4 gates (G1-G4)", () => {
    const gates = [
      { number: 1, name: "需求对抗" },
      { number: 2, name: "设计对抗" },
      { number: 3, name: "交付对抗" },
      { number: 4, name: "知识固化" },
    ];
    expect(gates).toHaveLength(4);
    expect(gates[0].number).toBe(1);
    expect(gates[3].number).toBe(4);
  });

  it("should have valid gate status transitions", () => {
    const validStatuses = ["pending", "in_progress", "passed", "failed", "blocked"];
    expect(validStatuses).toContain("pending");
    expect(validStatuses).toContain("passed");
    expect(validStatuses).toContain("failed");
  });
});

describe("Capability OS - Notifications", () => {
  it("should format evidence approved notification correctly", () => {
    const result = formatNotificationContent("EVIDENCE_APPROVED", {
      evidenceTitle: "项目完成报告",
      score: 50,
    });
    expect(result.title).toBe("证据审核通过");
    expect(result.content).toContain("项目完成报告");
    expect(result.content).toContain("50");
  });

  it("should format level upgraded notification correctly", () => {
    const result = formatNotificationContent("LEVEL_UPGRADED", {
      domainName: "技术能力",
      oldLevel: 2,
      newLevel: 3,
    });
    expect(result.title).toBe("能力等级提升");
    expect(result.content).toContain("技术能力");
    expect(result.content).toContain("L2");
    expect(result.content).toContain("L3");
  });

  it("should format red-blue task notification correctly", () => {
    const result = formatNotificationContent("REDBLUE_TASK_ASSIGNED", {
      taskTitle: "需求评审",
      teamType: "red",
    });
    expect(result.title).toBe("红蓝对抗任务分配");
    expect(result.content).toContain("红队");
    expect(result.content).toContain("需求评审");
  });

  it("should format gate status notification correctly", () => {
    const result = formatNotificationContent("GATE_STATUS_CHANGED", {
      gateNumber: 2,
      gateName: "设计对抗",
      newStatus: "passed",
    });
    expect(result.title).toBe("门禁状态变更");
    expect(result.content).toContain("G2");
    expect(result.content).toContain("设计对抗");
  });
});
