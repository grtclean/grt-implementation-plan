/**
 * AI Training Closed-Loop — Automated Test Suite
 * Phase 3.1 — AI-Driven Performance → Training → Unlock Pipeline
 *
 * Proves the FULL closed-loop:
 *   1. shouldTriggerQualityIntervention: >3 defects → trigger
 *   2. shouldTriggerCollaborationIntervention: <60 score → trigger
 *   3. findQualityModule: matches machine code to training module
 *   4. findCollaborationModule: finds communication training
 *   5. runNightlyInterventionScan: defects + scores → new interventions
 *   6. verifyOperatorAccess (THE INTERLOCK): PENDING/IN_PROGRESS → BLOCKED
 *   7. completeIntervention: pass → COMPLETED, fail → retry
 *   8. Full closed-loop: defects → scan → block → complete → unblock
 *   9. Edge cases: empty inputs, already-blocked users, no modules
 *
 * Run: pnpm test -- server/routers/ai-intervention.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  shouldTriggerQualityIntervention,
  shouldTriggerCollaborationIntervention,
  findQualityModule,
  findCollaborationModule,
  runNightlyInterventionScan,
  verifyOperatorAccess,
  completeIntervention,
  type DefectRecord,
  type MeetingScoreRecord,
  type TrainingModule,
  type ActiveIntervention,
} from "./ai-intervention.router";

// ─── Helpers ────────────────────────────────────────────────────────

const NOW = new Date("2026-02-25T12:00:00Z");

function makeDefectRecord(overrides?: Partial<DefectRecord>): DefectRecord {
  return {
    userId: 1002,
    userName: "李明 (Li Ming)",
    machineId: 101,
    machineCode: "CNC-001",
    defectCount: 4,
    defectDates: ["2026-02-24", "2026-02-23", "2026-02-22", "2026-02-21"],
    failureMode: "Dimensional tolerance exceeded ±0.05mm",
    ...overrides,
  };
}

function makeMeetingScore(overrides?: Partial<MeetingScoreRecord>): MeetingScoreRecord {
  return {
    userId: 1006,
    userName: "周伟 (Zhou Wei)",
    meetingScore: 45,
    month: "2026-02",
    ...overrides,
  };
}

const MODULES: TrainingModule[] = [
  {
    id: 1, moduleCode: "TM-CNC-001", title: "CNC Precision Tuning & Defect Prevention",
    titleZh: "CNC精密调整与缺陷预防", category: "PROCESS_QUALITY", durationMinutes: 45,
    passingScore: 80, relatedMachineTypes: ["CNC-001", "CNC-002", "CNC-003"],
  },
  {
    id: 2, moduleCode: "TM-HYD-001", title: "Hydraulic Assembly Safety & Quality",
    titleZh: "液压装配安全与质量", category: "PROCESS_QUALITY", durationMinutes: 60,
    passingScore: 85, relatedMachineTypes: ["HYD-BENCH-001", "HYD-BENCH-002"],
  },
  {
    id: 4, moduleCode: "TM-COMM-001", title: "Effective Communication & Meeting Skills",
    titleZh: "高效沟通与会议技巧", category: "EFFECTIVE_COMMUNICATION", durationMinutes: 30,
    passingScore: 70, relatedMachineTypes: [],
  },
  {
    id: 6, moduleCode: "TM-NZL-001", title: "Nozzle Calibration & Spray Quality",
    titleZh: "喷嘴校准与喷洒质量", category: "PROCESS_QUALITY", durationMinutes: 35,
    passingScore: 80, relatedMachineTypes: ["NZL-CAL-001", "NZL-CAL-002"],
  },
];

function makeIntervention(overrides?: Partial<ActiveIntervention>): ActiveIntervention {
  return {
    id: 1,
    userId: 1002,
    userName: "李明 (Li Ming)",
    triggerType: "QUALITY_DEFECT",
    triggerReason: "4 defects on CNC-001 this week",
    assignedModuleId: 1,
    assignedModuleTitle: "CNC Precision Tuning & Defect Prevention",
    blockedMachineId: 101,
    blockedMachineCode: "CNC-001",
    blockedTaskLevel: "high",
    status: "PENDING_TRAINING",
    progressPercent: 0,
    dueDate: "2026-03-04T12:00:00.000Z",
    createdAt: "2026-02-25T12:00:00.000Z",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ① shouldTriggerQualityIntervention — boundary tests
// ═══════════════════════════════════════════════════════════════════

describe("shouldTriggerQualityIntervention", () => {
  it("returns false for 0 defects", () => {
    expect(shouldTriggerQualityIntervention(makeDefectRecord({ defectCount: 0 }))).toBe(false);
  });

  it("returns false for exactly 3 defects (threshold is >3)", () => {
    expect(shouldTriggerQualityIntervention(makeDefectRecord({ defectCount: 3 }))).toBe(false);
  });

  it("returns true for 4 defects (first crossing)", () => {
    expect(shouldTriggerQualityIntervention(makeDefectRecord({ defectCount: 4 }))).toBe(true);
  });

  it("returns true for 10 defects (well above threshold)", () => {
    expect(shouldTriggerQualityIntervention(makeDefectRecord({ defectCount: 10 }))).toBe(true);
  });

  it("returns false for negative defect count", () => {
    expect(shouldTriggerQualityIntervention(makeDefectRecord({ defectCount: -1 }))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ② shouldTriggerCollaborationIntervention — boundary tests
// ═══════════════════════════════════════════════════════════════════

describe("shouldTriggerCollaborationIntervention", () => {
  it("returns true for score 0 (lowest possible)", () => {
    expect(shouldTriggerCollaborationIntervention(0)).toBe(true);
  });

  it("returns true for score 59 (just below threshold)", () => {
    expect(shouldTriggerCollaborationIntervention(59)).toBe(true);
  });

  it("returns false for score 60 (exactly at threshold)", () => {
    expect(shouldTriggerCollaborationIntervention(60)).toBe(false);
  });

  it("returns false for score 85 (well above threshold)", () => {
    expect(shouldTriggerCollaborationIntervention(85)).toBe(false);
  });

  it("returns true for score 45 (realistic low performer)", () => {
    expect(shouldTriggerCollaborationIntervention(45)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ③ findQualityModule — machine-to-module matching
// ═══════════════════════════════════════════════════════════════════

describe("findQualityModule", () => {
  it("finds CNC module for CNC-001", () => {
    const m = findQualityModule("CNC-001", MODULES);
    expect(m).not.toBeNull();
    expect(m!.moduleCode).toBe("TM-CNC-001");
  });

  it("finds Hydraulic module for HYD-BENCH-001", () => {
    const m = findQualityModule("HYD-BENCH-001", MODULES);
    expect(m).not.toBeNull();
    expect(m!.moduleCode).toBe("TM-HYD-001");
  });

  it("finds Nozzle module for NZL-CAL-002", () => {
    const m = findQualityModule("NZL-CAL-002", MODULES);
    expect(m).not.toBeNull();
    expect(m!.moduleCode).toBe("TM-NZL-001");
  });

  it("falls back to first PROCESS_QUALITY module for unknown machine", () => {
    const m = findQualityModule("UNKNOWN-999", MODULES);
    expect(m).not.toBeNull();
    expect(m!.category).toBe("PROCESS_QUALITY");
  });

  it("returns null when no PROCESS_QUALITY modules exist", () => {
    const commOnly = MODULES.filter(m => m.category === "EFFECTIVE_COMMUNICATION");
    expect(findQualityModule("CNC-001", commOnly)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// ④ findCollaborationModule
// ═══════════════════════════════════════════════════════════════════

describe("findCollaborationModule", () => {
  it("finds the communication module", () => {
    const m = findCollaborationModule(MODULES);
    expect(m).not.toBeNull();
    expect(m!.moduleCode).toBe("TM-COMM-001");
    expect(m!.category).toBe("EFFECTIVE_COMMUNICATION");
  });

  it("returns null when no communication modules exist", () => {
    const qualityOnly = MODULES.filter(m => m.category === "PROCESS_QUALITY");
    expect(findCollaborationModule(qualityOnly)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑤ runNightlyInterventionScan — the AI brain
// ═══════════════════════════════════════════════════════════════════

describe("runNightlyInterventionScan", () => {
  it("generates quality intervention for user with 4 defects on CNC-001", () => {
    const defects = [makeDefectRecord({ userId: 2001, userName: "Test User", defectCount: 4 })];
    const result = runNightlyInterventionScan(defects, [], MODULES, [], NOW);
    expect(result.qualityTriggers).toBe(1);
    expect(result.newInterventions).toHaveLength(1);
    const intv = result.newInterventions[0];
    expect(intv.triggerType).toBe("QUALITY_DEFECT");
    expect(intv.status).toBe("PENDING_TRAINING");
    expect(intv.blockedMachineCode).toBe("CNC-001");
    expect(intv.assignedModuleTitle).toContain("CNC");
  });

  it("generates collaboration intervention for user with score 45", () => {
    const scores = [makeMeetingScore({ userId: 2002, userName: "Test Collab" })];
    const result = runNightlyInterventionScan([], scores, MODULES, [], NOW);
    expect(result.collaborationTriggers).toBe(1);
    expect(result.newInterventions).toHaveLength(1);
    const intv = result.newInterventions[0];
    expect(intv.triggerType).toBe("COLLABORATION_LOW");
    expect(intv.blockedMachineId).toBeNull(); // not machine-specific
    expect(intv.assignedModuleTitle).toContain("Communication");
  });

  it("generates both quality AND collaboration interventions for different users", () => {
    const defects = [makeDefectRecord({ userId: 2001, userName: "Defect User", defectCount: 5 })];
    const scores = [makeMeetingScore({ userId: 2002, userName: "Score User", meetingScore: 30 })];
    const result = runNightlyInterventionScan(defects, scores, MODULES, [], NOW);
    expect(result.qualityTriggers).toBe(1);
    expect(result.collaborationTriggers).toBe(1);
    expect(result.newInterventions).toHaveLength(2);
  });

  it("skips users who already have an active blocking intervention", () => {
    const defects = [makeDefectRecord({ userId: 1002, defectCount: 10 })];
    const existing = [makeIntervention({ userId: 1002, status: "IN_PROGRESS" })];
    const result = runNightlyInterventionScan(defects, [], MODULES, existing, NOW);
    expect(result.qualityTriggers).toBe(0);
    expect(result.newInterventions).toHaveLength(0);
  });

  it("does NOT skip users who have COMPLETED interventions", () => {
    const defects = [makeDefectRecord({ userId: 1003, userName: "Relapsed", defectCount: 5 })];
    const existing = [makeIntervention({ userId: 1003, status: "COMPLETED" })];
    const result = runNightlyInterventionScan(defects, [], MODULES, existing, NOW);
    expect(result.qualityTriggers).toBe(1);
    expect(result.newInterventions).toHaveLength(1);
  });

  it("does NOT skip users who have OVERRIDDEN interventions", () => {
    const defects = [makeDefectRecord({ userId: 1007, userName: "Overridden", defectCount: 6 })];
    const existing = [makeIntervention({ userId: 1007, status: "OVERRIDDEN" })];
    const result = runNightlyInterventionScan(defects, [], MODULES, existing, NOW);
    expect(result.qualityTriggers).toBe(1);
  });

  it("sets 7-day due date for quality interventions", () => {
    const defects = [makeDefectRecord({ userId: 2001, defectCount: 4 })];
    const result = runNightlyInterventionScan(defects, [], MODULES, [], NOW);
    const due = new Date(result.newInterventions[0].dueDate!);
    const diffDays = (due.getTime() - NOW.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(7);
  });

  it("sets 14-day due date for collaboration interventions", () => {
    const scores = [makeMeetingScore({ userId: 2002 })];
    const result = runNightlyInterventionScan([], scores, MODULES, [], NOW);
    const due = new Date(result.newInterventions[0].dueDate!);
    const diffDays = (due.getTime() - NOW.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(14);
  });

  it("returns empty when no defects exceed threshold and all scores above 60", () => {
    const defects = [makeDefectRecord({ defectCount: 2 })];
    const scores = [makeMeetingScore({ meetingScore: 75 })];
    const result = runNightlyInterventionScan(defects, scores, MODULES, [], NOW);
    expect(result.newInterventions).toHaveLength(0);
    expect(result.qualityTriggers).toBe(0);
    expect(result.collaborationTriggers).toBe(0);
  });

  it("returns correct totalScanned count", () => {
    const defects = [makeDefectRecord(), makeDefectRecord({ userId: 2002 })];
    const scores = [makeMeetingScore()];
    const result = runNightlyInterventionScan(defects, scores, MODULES, [], NOW);
    expect(result.totalScanned).toBe(3);
  });

  it("prevents duplicate interventions for same user in one scan", () => {
    // Same user with quality AND collaboration issues — only first one wins
    const defects = [makeDefectRecord({ userId: 2001, defectCount: 5 })];
    const scores = [makeMeetingScore({ userId: 2001, meetingScore: 40 })];
    const result = runNightlyInterventionScan(defects, scores, MODULES, [], NOW);
    // User gets quality intervention first, then blocked from collab
    expect(result.newInterventions).toHaveLength(1);
    expect(result.newInterventions[0].triggerType).toBe("QUALITY_DEFECT");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑥ verifyOperatorAccess — THE INTERLOCK (critical safety test)
// ═══════════════════════════════════════════════════════════════════

describe("verifyOperatorAccess (THE INTERLOCK)", () => {
  it("BLOCKS user with PENDING_TRAINING intervention on that machine", () => {
    const interventions = [makeIntervention({ userId: 1002, blockedMachineId: 101, status: "PENDING_TRAINING" })];
    const result = verifyOperatorAccess(1002, 101, "CNC-001", interventions);
    expect(result.accessGranted).toBe(false);
    expect(result.blockedByIntervention).not.toBeNull();
    expect(result.reason).toContain("AI Training Required");
  });

  it("BLOCKS user with IN_PROGRESS intervention on that machine", () => {
    const interventions = [makeIntervention({ userId: 1002, blockedMachineId: 101, status: "IN_PROGRESS" })];
    const result = verifyOperatorAccess(1002, 101, "CNC-001", interventions);
    expect(result.accessGranted).toBe(false);
    expect(result.reason).toContain("AI Training Required");
  });

  it("BLOCKS user with null blockedMachineId (blocks ALL machines)", () => {
    const interventions = [makeIntervention({
      userId: 1006, blockedMachineId: null, status: "PENDING_TRAINING",
      triggerType: "COLLABORATION_LOW",
    })];
    const result = verifyOperatorAccess(1006, 999, "ANY-MACHINE", interventions);
    expect(result.accessGranted).toBe(false);
    expect(result.reason).toContain("AI Training Required");
  });

  it("GRANTS access after intervention is COMPLETED", () => {
    const interventions = [makeIntervention({ userId: 1003, blockedMachineId: 101, status: "COMPLETED" })];
    const result = verifyOperatorAccess(1003, 101, "CNC-001", interventions);
    expect(result.accessGranted).toBe(true);
    expect(result.blockedByIntervention).toBeNull();
    expect(result.reason).toContain("access permitted");
  });

  it("GRANTS access after intervention is OVERRIDDEN by manager", () => {
    const interventions = [makeIntervention({ userId: 1007, blockedMachineId: 101, status: "OVERRIDDEN" })];
    const result = verifyOperatorAccess(1007, 101, "CNC-001", interventions);
    expect(result.accessGranted).toBe(true);
  });

  it("GRANTS access when intervention blocks a DIFFERENT machine", () => {
    const interventions = [makeIntervention({ userId: 1002, blockedMachineId: 101 })];
    const result = verifyOperatorAccess(1002, 201, "HYD-BENCH-001", interventions);
    expect(result.accessGranted).toBe(true); // blocked on 101, accessing 201 — OK
  });

  it("GRANTS access when no interventions exist", () => {
    const result = verifyOperatorAccess(1002, 101, "CNC-001", []);
    expect(result.accessGranted).toBe(true);
    expect(result.reason).toContain("access permitted");
  });

  it("GRANTS access for a different user (intervention targets user 1002)", () => {
    const interventions = [makeIntervention({ userId: 1002, blockedMachineId: 101 })];
    const result = verifyOperatorAccess(9999, 101, "CNC-001", interventions);
    expect(result.accessGranted).toBe(true); // different user
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑦ completeIntervention — training pass / fail
// ═══════════════════════════════════════════════════════════════════

describe("completeIntervention", () => {
  it("marks COMPLETED when score meets passing threshold", () => {
    const intv = makeIntervention({ progressPercent: 80 });
    const result = completeIntervention(intv, 85, 80);
    expect(result.completed).toBe(true);
    expect(result.updatedIntervention.status).toBe("COMPLETED");
    expect(result.updatedIntervention.progressPercent).toBe(100);
    expect(result.reason).toContain("Access restored");
  });

  it("keeps IN_PROGRESS when score below passing threshold", () => {
    const intv = makeIntervention({ progressPercent: 50 });
    const result = completeIntervention(intv, 60, 80);
    expect(result.completed).toBe(false);
    expect(result.updatedIntervention.status).toBe("IN_PROGRESS");
    expect(result.reason).toContain("Retry required");
  });

  it("increments progress by 10 on failed attempt", () => {
    const intv = makeIntervention({ progressPercent: 50 });
    const result = completeIntervention(intv, 60, 80);
    expect(result.updatedIntervention.progressPercent).toBe(60);
  });

  it("caps progress at 95 on repeated failures", () => {
    const intv = makeIntervention({ progressPercent: 90 });
    const result = completeIntervention(intv, 60, 80);
    expect(result.updatedIntervention.progressPercent).toBe(95);
  });

  it("marks COMPLETED at exact passing score", () => {
    const intv = makeIntervention({ progressPercent: 70 });
    const result = completeIntervention(intv, 80, 80);
    expect(result.completed).toBe(true);
    expect(result.updatedIntervention.status).toBe("COMPLETED");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑧ FULL CLOSED-LOOP INTEGRATION TEST
//    defects → scan → BLOCK → train → COMPLETE → UNBLOCK
// ═══════════════════════════════════════════════════════════════════

describe("FULL CLOSED-LOOP: Defect → Intervention → Block → Complete → Unblock", () => {
  it("proves Li Ming cycle: 4 defects → AI blocks CNC-001 → training pass → access restored", () => {
    // STEP 1: Li Ming causes 4 defects on CNC-001
    const defects: DefectRecord[] = [{
      userId: 1002, userName: "李明 (Li Ming)", machineId: 101,
      machineCode: "CNC-001", defectCount: 4,
      defectDates: ["2026-02-24", "2026-02-23", "2026-02-22", "2026-02-21"],
      failureMode: "Dimensional tolerance exceeded ±0.05mm",
    }];

    // STEP 2: Nightly scan detects and creates intervention
    const scan = runNightlyInterventionScan(defects, [], MODULES, [], NOW);
    expect(scan.qualityTriggers).toBe(1);
    expect(scan.newInterventions).toHaveLength(1);

    const intervention = scan.newInterventions[0];
    expect(intervention.status).toBe("PENDING_TRAINING");
    expect(intervention.blockedMachineCode).toBe("CNC-001");
    expect(intervention.assignedModuleTitle).toContain("CNC");

    // STEP 3: Li Ming tries to access CNC-001 → BLOCKED
    const accessCheck1 = verifyOperatorAccess(1002, 101, "CNC-001", [intervention]);
    expect(accessCheck1.accessGranted).toBe(false);
    expect(accessCheck1.reason).toContain("AI Training Required");
    expect(accessCheck1.reason).toContain("CNC Precision Tuning");

    // STEP 4: Li Ming completes training with passing score
    const completion = completeIntervention(intervention, 85, 80);
    expect(completion.completed).toBe(true);
    expect(completion.updatedIntervention.status).toBe("COMPLETED");

    // STEP 5: Li Ming tries to access CNC-001 again → GRANTED
    const accessCheck2 = verifyOperatorAccess(1002, 101, "CNC-001", [completion.updatedIntervention]);
    expect(accessCheck2.accessGranted).toBe(true);
    expect(accessCheck2.reason).toContain("access permitted");
  });

  it("proves Zhou Wei cycle: low meeting score → blocks ALL machines → communication training", () => {
    // STEP 1: Zhou Wei has meeting score 45
    const scores: MeetingScoreRecord[] = [{
      userId: 1006, userName: "周伟 (Zhou Wei)", meetingScore: 45, month: "2026-02",
    }];

    // STEP 2: Scan detects collaboration issue
    const scan = runNightlyInterventionScan([], scores, MODULES, [], NOW);
    expect(scan.collaborationTriggers).toBe(1);
    const intervention = scan.newInterventions[0];
    expect(intervention.triggerType).toBe("COLLABORATION_LOW");
    expect(intervention.blockedMachineId).toBeNull(); // blocks ALL

    // STEP 3: Zhou Wei tries ANY machine → BLOCKED
    const check1 = verifyOperatorAccess(1006, 101, "CNC-001", [intervention]);
    expect(check1.accessGranted).toBe(false);
    const check2 = verifyOperatorAccess(1006, 201, "HYD-BENCH-001", [intervention]);
    expect(check2.accessGranted).toBe(false);

    // STEP 4: Fails first training attempt
    const attempt1 = completeIntervention(intervention, 50, 70);
    expect(attempt1.completed).toBe(false);
    expect(attempt1.updatedIntervention.status).toBe("IN_PROGRESS");

    // STEP 5: Still blocked
    const check3 = verifyOperatorAccess(1006, 101, "CNC-001", [attempt1.updatedIntervention]);
    expect(check3.accessGranted).toBe(false);

    // STEP 6: Passes second attempt
    const attempt2 = completeIntervention(attempt1.updatedIntervention, 75, 70);
    expect(attempt2.completed).toBe(true);

    // STEP 7: Access restored to ALL machines
    const check4 = verifyOperatorAccess(1006, 101, "CNC-001", [attempt2.updatedIntervention]);
    expect(check4.accessGranted).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ⑨ Edge cases
// ═══════════════════════════════════════════════════════════════════

describe("Edge cases", () => {
  it("scan handles empty inputs gracefully", () => {
    const result = runNightlyInterventionScan([], [], MODULES, [], NOW);
    expect(result.newInterventions).toHaveLength(0);
    expect(result.totalScanned).toBe(0);
  });

  it("scan handles no available modules gracefully", () => {
    const defects = [makeDefectRecord({ defectCount: 10 })];
    const result = runNightlyInterventionScan(defects, [], [], [], NOW);
    expect(result.newInterventions).toHaveLength(0);
    expect(result.qualityTriggers).toBe(0);
  });

  it("trigger reason contains defect count and machine code", () => {
    const defects = [makeDefectRecord({ userId: 2001, defectCount: 7, machineCode: "HYD-BENCH-001" })];
    const result = runNightlyInterventionScan(defects, [], MODULES, [], NOW);
    expect(result.newInterventions[0].triggerReason).toContain("7 defects");
    expect(result.newInterventions[0].triggerReason).toContain("HYD-BENCH-001");
  });

  it("trigger reason contains meeting score for collaboration triggers", () => {
    const scores = [makeMeetingScore({ userId: 2002, meetingScore: 35 })];
    const result = runNightlyInterventionScan([], scores, MODULES, [], NOW);
    expect(result.newInterventions[0].triggerReason).toContain("35");
    expect(result.newInterventions[0].triggerReason).toContain("60");
  });

  it("all new interventions have PENDING_TRAINING status", () => {
    const defects = [
      makeDefectRecord({ userId: 2001, defectCount: 5 }),
      makeDefectRecord({ userId: 2002, defectCount: 8, machineCode: "HYD-BENCH-001", machineId: 201 }),
    ];
    const scores = [makeMeetingScore({ userId: 2003, meetingScore: 20 })];
    const result = runNightlyInterventionScan(defects, scores, MODULES, [], NOW);
    for (const intv of result.newInterventions) {
      expect(intv.status).toBe("PENDING_TRAINING");
      expect(intv.progressPercent).toBe(0);
    }
  });
});
