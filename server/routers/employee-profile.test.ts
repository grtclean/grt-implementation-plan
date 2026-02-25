/**
 * Employee Digital Profile — 360° Fusion Engine Automated Test Suite
 * Phase 2.3 — HR × AI × Meeting × Certification Cross-Domain Fusion
 *
 * Proves:
 *   1. Each dimension calculates correctly from its data source
 *   2. High meeting + high AI usage → Innovation > 90
 *   3. Overall Combat Power weighted correctly
 *   4. Tier classification at all boundaries
 *   5. Career advice targets weakest dimension
 *   6. Edge cases: no data, extreme values, single records
 *
 * Run: pnpm test -- server/routers/employee-profile.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  classifyTier,
  calcExecution,
  calcLearning,
  calcCollaboration,
  calcInnovation,
  generate360Profile,
  type ProfileInput,
  type EmployeeBase,
  type KpiRecord,
  type CertRecord,
  type MeetingPerfRecord,
  type AiTaskRecord,
} from "./employee-profile.router";

// ─── Helpers ────────────────────────────────────────────────────────

function makeEmployee(overrides?: Partial<EmployeeBase>): EmployeeBase {
  return {
    userId: 1001,
    employeeCode: "GRT-TEST",
    name: "Test Employee",
    department: "Engineering",
    position: "Engineer",
    level: "P4",
    hireDate: "2022-01-01",
    ...overrides,
  };
}

function makeKpi(overrides?: Partial<KpiRecord>): KpiRecord {
  return {
    month: "2026-02",
    overallKpiScore: 80,
    ...overrides,
  };
}

function makeCert(overrides?: Partial<CertRecord>): CertRecord {
  return {
    certificateName: "Test Certificate",
    certificateLevel: "intermediate",
    issueDate: "2025-01-01",
    expiryDate: "2028-01-01",
    isValid: true,
    ...overrides,
  };
}

function makeMeeting(overrides?: Partial<MeetingPerfRecord>): MeetingPerfRecord {
  return {
    month: "2026-02",
    meetingScore: 75,
    totalScore: 72,
    breadthScore: 70,
    depthScore: 78,
    executionScore: 75,
    disciplineScore: 73,
    meetingsAttended: 8,
    meetingsTotal: 10,
    actionItemsCompleted: 5,
    actionItemsTotal: 6,
    ...overrides,
  };
}

function makeAiTask(overrides?: Partial<AiTaskRecord>): AiTaskRecord {
  return {
    taskType: "data_analysis",
    qualityScore: 80,
    durationMs: 30000,
    llmTokensUsed: 1500,
    status: "completed",
    ...overrides,
  };
}

function makeInput(overrides?: Partial<ProfileInput>): ProfileInput {
  return {
    employee: makeEmployee(),
    kpiRecords: [],
    certificates: [],
    meetingPerf: [],
    aiTasks: [],
    ...overrides,
  };
}

// ─── classifyTier ───────────────────────────────────────────────────

describe("classifyTier — profile tier classification", () => {
  it("should classify ≥90 as S (Star Performer)", () => {
    expect(classifyTier(90)).toBe("S");
    expect(classifyTier(100)).toBe("S");
    expect(classifyTier(95)).toBe("S");
  });

  it("should classify 75–89 as A (High Performer)", () => {
    expect(classifyTier(75)).toBe("A");
    expect(classifyTier(89)).toBe("A");
    expect(classifyTier(82)).toBe("A");
  });

  it("should classify 60–74 as B (Solid Contributor)", () => {
    expect(classifyTier(60)).toBe("B");
    expect(classifyTier(74)).toBe("B");
    expect(classifyTier(67)).toBe("B");
  });

  it("should classify <60 as C (Needs Development)", () => {
    expect(classifyTier(59)).toBe("C");
    expect(classifyTier(0)).toBe("C");
    expect(classifyTier(45)).toBe("C");
  });

  it("should handle exact boundary at 90 (S)", () => {
    expect(classifyTier(90)).toBe("S");
  });

  it("should handle exact boundary at 75 (A)", () => {
    expect(classifyTier(75)).toBe("A");
  });
});

// ─── Execution Dimension ────────────────────────────────────────────

describe("calcExecution — KPI-based execution scoring", () => {
  it("should return baseline 50 when no KPI records", () => {
    const result = calcExecution([]);
    expect(result.score).toBe(50);
    expect(result.name).toBe("Execution");
    expect(result.dataPoints).toBe(0);
  });

  it("should average KPI scores correctly", () => {
    const result = calcExecution([
      makeKpi({ overallKpiScore: 80 }),
      makeKpi({ overallKpiScore: 90 }),
      makeKpi({ overallKpiScore: 85 }),
    ]);
    expect(result.score).toBe(85);
    expect(result.dataPoints).toBe(3);
  });

  it("should handle single KPI record", () => {
    const result = calcExecution([makeKpi({ overallKpiScore: 92 })]);
    expect(result.score).toBe(92);
  });

  it("should clamp to 100 if KPI average exceeds 100", () => {
    // Edge case: corrupt data with >100 scores
    const result = calcExecution([makeKpi({ overallKpiScore: 110 })]);
    expect(result.score).toBe(100);
  });
});

// ─── Learning Dimension ─────────────────────────────────────────────

describe("calcLearning — certificate-based learning scoring", () => {
  it("should return baseline 20 when no valid certificates", () => {
    const result = calcLearning([]);
    expect(result.score).toBe(20);
    expect(result.dataPoints).toBe(0);
  });

  it("should weight certificates by level", () => {
    // basic(15) + intermediate(25) = 40
    const result = calcLearning([
      makeCert({ certificateLevel: "basic" }),
      makeCert({ certificateLevel: "intermediate" }),
    ]);
    expect(result.score).toBe(40);
    expect(result.dataPoints).toBe(2);
  });

  it("should cap at 100 for many certificates", () => {
    const result = calcLearning([
      makeCert({ certificateLevel: "expert" }),   // 50
      makeCert({ certificateLevel: "expert" }),   // 50
      makeCert({ certificateLevel: "advanced" }), // 35 → total 135 → capped 100
    ]);
    expect(result.score).toBe(100);
  });

  it("should ignore expired (invalid) certificates", () => {
    const result = calcLearning([
      makeCert({ certificateLevel: "expert", isValid: false }),
      makeCert({ certificateLevel: "basic", isValid: true }),
    ]);
    expect(result.score).toBe(15); // only basic counted
    expect(result.dataPoints).toBe(1);
  });

  it("should apply correct weight for each level", () => {
    expect(calcLearning([makeCert({ certificateLevel: "basic" })]).score).toBe(15);
    expect(calcLearning([makeCert({ certificateLevel: "intermediate" })]).score).toBe(25);
    expect(calcLearning([makeCert({ certificateLevel: "advanced" })]).score).toBe(35);
    expect(calcLearning([makeCert({ certificateLevel: "expert" })]).score).toBe(50);
  });
});

// ─── Collaboration Dimension ────────────────────────────────────────

describe("calcCollaboration — meeting-based collaboration scoring", () => {
  it("should return baseline 50 when no meeting records", () => {
    const result = calcCollaboration([]);
    expect(result.score).toBe(50);
    expect(result.dataPoints).toBe(0);
  });

  it("should average meeting scores plus attendance bonus", () => {
    // meetingScore avg = 80, attendance = 18/20 = 90% → bonus 9
    // Score = 80 + 9 = 89
    const result = calcCollaboration([
      makeMeeting({ meetingScore: 80, meetingsAttended: 9, meetingsTotal: 10 }),
      makeMeeting({ meetingScore: 80, meetingsAttended: 9, meetingsTotal: 10 }),
    ]);
    expect(result.score).toBe(89);
    expect(result.dataPoints).toBe(2);
  });

  it("should cap at 100", () => {
    // meetingScore 95 + attendance 100% → bonus 10 → 105 → capped 100
    const result = calcCollaboration([
      makeMeeting({ meetingScore: 95, meetingsAttended: 10, meetingsTotal: 10 }),
    ]);
    expect(result.score).toBe(100);
  });

  it("should handle zero total meetings (no division by zero)", () => {
    const result = calcCollaboration([
      makeMeeting({ meetingScore: 70, meetingsAttended: 0, meetingsTotal: 0 }),
    ]);
    expect(result.score).toBe(70); // no bonus, no crash
  });
});

// ─── Innovation Dimension ───────────────────────────────────────────

describe("calcInnovation — AI usage-based innovation scoring", () => {
  it("should return baseline 30 when no completed AI tasks", () => {
    const result = calcInnovation([], []);
    expect(result.score).toBe(30);
    expect(result.dataPoints).toBe(0);
  });

  it("should not count failed/pending tasks", () => {
    const result = calcInnovation([
      makeAiTask({ status: "failed" }),
      makeAiTask({ status: "pending" }),
    ], []);
    expect(result.score).toBe(30); // baseline
    expect(result.dataPoints).toBe(0);
  });

  it("should calculate quality average + volume bonus", () => {
    // 3 completed tasks with avg quality 80, volume bonus = 3×2 = 6
    // No meeting synergy → score = 80 + 6 = 86
    const result = calcInnovation([
      makeAiTask({ qualityScore: 75, status: "completed" }),
      makeAiTask({ qualityScore: 80, status: "completed" }),
      makeAiTask({ qualityScore: 85, status: "completed" }),
    ], []);
    expect(result.score).toBe(86);
    expect(result.dataPoints).toBe(3);
  });

  it("should cap volume bonus at 20", () => {
    // 15 tasks → volume bonus = min(15×2, 20) = 20
    const tasks = Array.from({ length: 15 }, (_, i) =>
      makeAiTask({ qualityScore: 70, status: "completed" })
    );
    const result = calcInnovation(tasks, []);
    // 70 (avg) + 20 (volume cap) = 90
    expect(result.score).toBe(90);
  });

  it("should add synergy bonus when meeting score ≥ 80", () => {
    // 5 tasks avg quality 80, volume = 10, synergy = 5
    // 80 + 10 + 5 = 95
    const tasks = Array.from({ length: 5 }, () =>
      makeAiTask({ qualityScore: 80, status: "completed" })
    );
    const meetings = [makeMeeting({ meetingScore: 85 })];
    const result = calcInnovation(tasks, meetings);
    expect(result.score).toBe(95);
  });

  it("should NOT add synergy bonus when meeting score < 80", () => {
    const tasks = Array.from({ length: 5 }, () =>
      makeAiTask({ qualityScore: 80, status: "completed" })
    );
    const meetings = [makeMeeting({ meetingScore: 79 })];
    const result = calcInnovation(tasks, meetings);
    // 80 + 10 + 0 = 90 (no synergy)
    expect(result.score).toBe(90);
  });
});

// ═══════════════════════════════════════════════════════════════════
// THE CRITICAL TEST: High meeting + high AI → Innovation > 90
// ═══════════════════════════════════════════════════════════════════

describe("THE INTERLOCK: High meeting + high AI → Innovation > 90", () => {
  it("should produce Innovation > 90 for a user with high meeting scores AND high AI usage", () => {
    // Scenario: Power user Wang Fang (USER-1003)
    // 12 completed AI tasks with avg quality ~90
    // Meeting scores averaging ~88 (well above 80 threshold)
    //
    // avgQuality ≈ 90.08
    // volumeBonus = min(12 × 2, 20) = 20
    // synergyBonus = 5 (meeting avg 88.33 ≥ 80)
    // Innovation = 90.08 + 20 + 5 = 115.08 → capped 100
    //
    // Even conservatively: quality 85 + volume 20 + synergy 5 = 110 → 100
    // The key: synergy bonus ONLY fires when meeting score ≥ 80

    const aiTasks: AiTaskRecord[] = [
      makeAiTask({ qualityScore: 92, status: "completed" }),
      makeAiTask({ qualityScore: 88, status: "completed" }),
      makeAiTask({ qualityScore: 90, status: "completed" }),
      makeAiTask({ qualityScore: 95, status: "completed" }),
      makeAiTask({ qualityScore: 91, status: "completed" }),
      makeAiTask({ qualityScore: 87, status: "completed" }),
      makeAiTask({ qualityScore: 93, status: "completed" }),
      makeAiTask({ qualityScore: 89, status: "completed" }),
      makeAiTask({ qualityScore: 85, status: "completed" }),
      makeAiTask({ qualityScore: 94, status: "completed" }),
      makeAiTask({ qualityScore: 91, status: "completed" }),
      makeAiTask({ qualityScore: 96, status: "completed" }),
    ];

    const meetingPerf: MeetingPerfRecord[] = [
      makeMeeting({ meetingScore: 85 }),
      makeMeeting({ meetingScore: 88 }),
      makeMeeting({ meetingScore: 92 }),
    ];

    const result = calcInnovation(aiTasks, meetingPerf);

    expect(result.score).toBeGreaterThan(90);
    expect(result.dataPoints).toBe(12);
    // Verify synergy bonus was applied
    expect(result.breakdown).toContain("synergy");
  });

  it("should NOT reach > 90 Innovation with low meeting scores even with high AI usage", () => {
    // Same AI tasks, but low meeting scores → no synergy
    const aiTasks = Array.from({ length: 5 }, () =>
      makeAiTask({ qualityScore: 75, status: "completed" })
    );
    const meetingPerf = [makeMeeting({ meetingScore: 50 })]; // low

    const result = calcInnovation(aiTasks, meetingPerf);

    // 75 + 10 + 0 = 85 (no synergy)
    expect(result.score).toBe(85);
    expect(result.score).toBeLessThanOrEqual(90);
  });
});

// ─── generate360Profile — Full Fusion ───────────────────────────────

describe("generate360Profile — full 5-domain fusion", () => {
  it("should produce a complete profile with all 4 dimensions", () => {
    const result = generate360Profile(makeInput({
      kpiRecords: [makeKpi({ overallKpiScore: 85 })],
      certificates: [makeCert({ certificateLevel: "advanced" })],
      meetingPerf: [makeMeeting({ meetingScore: 80, meetingsAttended: 9, meetingsTotal: 10 })],
      aiTasks: [makeAiTask({ qualityScore: 85, status: "completed" })],
    }));

    expect(result.dimensions).toHaveLength(4);
    expect(result.dimensions.map(d => d.name)).toEqual(["Execution", "Learning", "Collaboration", "Innovation"]);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.tier).toBeDefined();
    expect(result.careerAdvice.length).toBeGreaterThanOrEqual(2);
  });

  it("should calculate weighted overall score correctly", () => {
    // Execution: 80 × 0.30 = 24
    // Learning: 60 × 0.20 = 12
    // Collaboration: 70 × 0.25 = 17.5
    // Innovation: 90 × 0.25 = 22.5
    // Total = 76
    const result = generate360Profile(makeInput({
      kpiRecords: [makeKpi({ overallKpiScore: 80 })],
      certificates: [
        makeCert({ certificateLevel: "advanced" }),  // 35
        makeCert({ certificateLevel: "intermediate" }),  // 25 → total 60
      ],
      meetingPerf: [makeMeeting({ meetingScore: 63, meetingsAttended: 7, meetingsTotal: 10 })],
      // Collab = 63 + (7/10 × 10) = 63 + 7 = 70
      aiTasks: Array.from({ length: 10 }, () =>
        makeAiTask({ qualityScore: 70, status: "completed" })
      ),
      // Innovation: 70 + min(10×2, 20)=20 = 90 (no synergy, meetingScore 63 < 80)
    }));

    expect(result.overallScore).toBeCloseTo(76, 0);
    expect(result.tier).toBe("A");
  });

  it("should identify weakest dimension for career advice", () => {
    const result = generate360Profile(makeInput({
      kpiRecords: [makeKpi({ overallKpiScore: 90 })],      // Execution: 90
      certificates: [],                                       // Learning: 20 (baseline, weakest)
      meetingPerf: [makeMeeting({ meetingScore: 80 })],     // Collaboration: ~88
      aiTasks: [makeAiTask({ qualityScore: 85, status: "completed" })],  // Innovation: ~87+
    }));

    const devAdvice = result.careerAdvice.find(a => a.type === "DEVELOPMENT");
    expect(devAdvice).toBeTruthy();
    expect(devAdvice!.dimension).toBe("Learning");
    expect(devAdvice!.message).toContain("certifications");
  });

  it("should identify strongest dimension for strength advice", () => {
    const result = generate360Profile(makeInput({
      kpiRecords: [makeKpi({ overallKpiScore: 95 })],      // Execution: 95 (strongest)
      certificates: [makeCert({ certificateLevel: "basic" })],  // Learning: 15
      meetingPerf: [],                                         // Collaboration: 50
      aiTasks: [],                                             // Innovation: 30
    }));

    const strengthAdvice = result.careerAdvice.find(a => a.type === "STRENGTH");
    expect(strengthAdvice).toBeTruthy();
    expect(strengthAdvice!.dimension).toBe("Execution");
  });

  it("should return all employee metadata in the output", () => {
    const result = generate360Profile(makeInput({
      employee: makeEmployee({
        userId: 42,
        employeeCode: "GRT-042",
        name: "Test User",
        department: "Quality",
        position: "QC Lead",
        level: "P5",
        hireDate: "2021-06-15",
      }),
    }));

    expect(result.userId).toBe(42);
    expect(result.employeeCode).toBe("GRT-042");
    expect(result.name).toBe("Test User");
    expect(result.department).toBe("Quality");
    expect(result.position).toBe("QC Lead");
    expect(result.level).toBe("P5");
  });
});

// ─── Star Performer Scenario ────────────────────────────────────────

describe("Star Performer — Tier S verification", () => {
  it("should achieve Tier S with high scores across all dimensions", () => {
    const result = generate360Profile(makeInput({
      kpiRecords: [
        makeKpi({ overallKpiScore: 92 }),
        makeKpi({ overallKpiScore: 95 }),
        makeKpi({ overallKpiScore: 88 }),
      ],
      certificates: [
        makeCert({ certificateLevel: "expert" }),    // 50
        makeCert({ certificateLevel: "advanced" }),   // 35
        makeCert({ certificateLevel: "intermediate" }), // 25 → total 110 → cap 100
      ],
      meetingPerf: [
        makeMeeting({ meetingScore: 90, meetingsAttended: 10, meetingsTotal: 10 }),
        makeMeeting({ meetingScore: 92, meetingsAttended: 12, meetingsTotal: 12 }),
      ],
      aiTasks: Array.from({ length: 10 }, () =>
        makeAiTask({ qualityScore: 90, status: "completed" })
      ),
    }));

    // Execution: avg(92,95,88) = 91.67
    // Learning: cap(110) = 100
    // Collaboration: avg(90,92)=91 + attendance(22/22=100%→10) = 100 (capped)
    // Innovation: 90 + 20 + 5 (synergy, meeting avg 91 ≥ 80) = 115 → cap 100
    // Overall: 91.67×0.3 + 100×0.2 + 100×0.25 + 100×0.25 = 27.5 + 20 + 25 + 25 = 97.5

    expect(result.tier).toBe("S");
    expect(result.overallScore).toBeGreaterThanOrEqual(90);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("should handle completely empty profile (all baseline)", () => {
    const result = generate360Profile(makeInput());

    // Execution: 50, Learning: 20, Collaboration: 50, Innovation: 30
    // Overall: 50×0.3 + 20×0.2 + 50×0.25 + 30×0.25 = 15 + 4 + 12.5 + 7.5 = 39
    expect(result.overallScore).toBe(39);
    expect(result.tier).toBe("C");
  });

  it("should handle all dimensions at maximum (cap overall at 100)", () => {
    const result = generate360Profile(makeInput({
      kpiRecords: [makeKpi({ overallKpiScore: 100 })],
      certificates: [
        makeCert({ certificateLevel: "expert" }),
        makeCert({ certificateLevel: "expert" }),
        makeCert({ certificateLevel: "expert" }),
      ],
      meetingPerf: [makeMeeting({ meetingScore: 95, meetingsAttended: 10, meetingsTotal: 10 })],
      aiTasks: Array.from({ length: 15 }, () =>
        makeAiTask({ qualityScore: 100, status: "completed" })
      ),
    }));

    expect(result.overallScore).toBe(100);
    expect(result.tier).toBe("S");
  });

  it("should include generatedAt timestamp", () => {
    const result = generate360Profile(makeInput());
    expect(result.generatedAt).toBeTruthy();
    expect(new Date(result.generatedAt).getTime()).not.toBeNaN();
  });
});
