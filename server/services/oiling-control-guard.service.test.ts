/**
 * OilingControlGuard — Unit Tests
 *
 * Tests computeVedScore (pure) and checkOilingControl (DB-backed).
 *
 * Run: npx vitest run server/services/oiling-control-guard.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockExecute = vi.fn().mockResolvedValue(undefined);

const mockDb = {
  insert: mockInsert,
  execute: mockExecute,
};

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../../drizzle/robot-fleet-schema", () => ({
  robotConditionAlerts: { name: "robot_condition_alerts" },
}));

vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { computeVedScore, checkOilingControl, type OilingReading } from "./oiling-control-guard.service";

// ── Fixtures ─────────────────────────────────────────────────────────────

function makeReading(overrides: Partial<OilingReading> = {}): OilingReading {
  return {
    robotId: 1,
    stationCode: "ST01",
    torqueActual: 10.0,
    torqueTarget: 10.0,
    poseX: 0,
    poseY: 0,
    poseZ: 0,
    baseX: 0,
    baseY: 0,
    baseZ: 0,
    cycleTime: 25,
    operatorId: "op-001",
    ...overrides,
  };
}

// ── computeVedScore ──────────────────────────────────────────────────────

describe("computeVedScore", () => {
  it("perfect reading → score near 100", () => {
    const score = computeVedScore({
      torqueActual: 10.0,
      torqueTarget: 10.0,
      poseDelta: 0,
      cycleTime: 25,
    });
    // torqueError = 0 → torqueScore = 40
    // poseDelta = 0 → poseScore = 40
    // cycleTime 25/30 <= 1 → cycleScore = 20
    expect(score).toBe(100);
  });

  it("torque 20% off target → torqueScore = 0", () => {
    // torqueError = |12 - 10| / 10 = 0.2 → 40 * (1 - 0.2*5) = 40 * 0 = 0
    const score = computeVedScore({
      torqueActual: 12.0,
      torqueTarget: 10.0,
      poseDelta: 0,
      cycleTime: 25,
    });
    // torqueScore = 0, poseScore = 40, cycleScore = 20
    expect(score).toBe(60);
  });

  it("torque 10% off target → torqueScore = 20", () => {
    // torqueError = |11 - 10| / 10 = 0.1 → 40 * (1 - 0.1*5) = 40 * 0.5 = 20
    const score = computeVedScore({
      torqueActual: 11.0,
      torqueTarget: 10.0,
      poseDelta: 0,
      cycleTime: 25,
    });
    // torqueScore = 20, poseScore = 40, cycleScore = 20
    expect(score).toBe(80);
  });

  it("torque >20% off target → torqueScore clamped to 0", () => {
    // torqueError = |15 - 10| / 10 = 0.5 → 40 * (1 - 0.5*5) = 40 * (-1.5) → clamped 0
    const score = computeVedScore({
      torqueActual: 15.0,
      torqueTarget: 10.0,
      poseDelta: 0,
      cycleTime: 25,
    });
    expect(score).toBe(60);
  });

  it("pose at threshold (0.5mm) → poseScore = 0", () => {
    // poseDelta = 0.5 → 40 * (1 - 0.5/0.5) = 40 * 0 = 0
    const score = computeVedScore({
      torqueActual: 10.0,
      torqueTarget: 10.0,
      poseDelta: 0.5,
      cycleTime: 25,
    });
    // torqueScore = 40, poseScore = 0, cycleScore = 20
    expect(score).toBe(60);
  });

  it("pose beyond threshold (1.0mm) → poseScore clamped to 0", () => {
    // poseDelta = 1.0 → 40 * (1 - 1.0/0.5) = 40 * (-1) → clamped 0
    const score = computeVedScore({
      torqueActual: 10.0,
      torqueTarget: 10.0,
      poseDelta: 1.0,
      cycleTime: 25,
    });
    expect(score).toBe(60);
  });

  it("slow cycle time (60s vs 30s baseline) → reduced cycleScore", () => {
    // ratio = 60/30 = 2 → cycleScore = 20 * (1 - (2-1)) = 20 * 0 = 0
    const score = computeVedScore({
      torqueActual: 10.0,
      torqueTarget: 10.0,
      poseDelta: 0,
      cycleTime: 60,
    });
    // torqueScore = 40, poseScore = 40, cycleScore = 0
    expect(score).toBe(80);
  });

  it("moderate cycle time (45s) → partial cycleScore", () => {
    // ratio = 45/30 = 1.5 → cycleScore = 20 * (1 - (1.5-1)) = 20 * 0.5 = 10
    const score = computeVedScore({
      torqueActual: 10.0,
      torqueTarget: 10.0,
      poseDelta: 0,
      cycleTime: 45,
    });
    // torqueScore = 40, poseScore = 40, cycleScore = 10
    expect(score).toBe(90);
  });

  it("very slow cycle time (90s) → cycleScore clamped to 0", () => {
    // ratio = 90/30 = 3 → cycleScore = 20 * (1 - 2) = 20 * (-1) → clamped 0
    const score = computeVedScore({
      torqueActual: 10.0,
      torqueTarget: 10.0,
      poseDelta: 0,
      cycleTime: 90,
    });
    expect(score).toBe(80);
  });

  it("no cycleTime provided → defaults to full 20 points", () => {
    const score = computeVedScore({
      torqueActual: 10.0,
      torqueTarget: 10.0,
      poseDelta: 0,
    });
    // torqueScore = 40, poseScore = 40, cycleScore = 20 (default)
    expect(score).toBe(100);
  });

  it("torqueTarget=0 → should not divide by zero", () => {
    // safeTorqueTarget = 1, torqueError = |5-1|/1 = 4 → torqueScore = 40*(1-4*5) = 40*(-19) → clamped 0
    const score = computeVedScore({
      torqueActual: 5.0,
      torqueTarget: 0,
      poseDelta: 0,
      cycleTime: 25,
    });
    // Should not throw, score should be a valid number
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("all zeros → uses safeTorqueTarget guard", () => {
    const score = computeVedScore({
      torqueActual: 0,
      torqueTarget: 0,
      poseDelta: 0,
      cycleTime: 0,
    });
    // safeTorqueTarget=1, torqueError=|0-1|/1=1 → torqueScore=40*(1-5)=clamped 0
    // poseDelta=0 → poseScore=40
    // cycleTime=0 → ratio=0/30=0 <=1 → cycleScore=20
    expect(score).toBe(60);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("result is always an integer (Math.round)", () => {
    // Deliberately pick values that would produce fractional intermediate results
    const score = computeVedScore({
      torqueActual: 10.3,
      torqueTarget: 10.0,
      poseDelta: 0.13,
      cycleTime: 33,
    });
    expect(Number.isInteger(score)).toBe(true);
  });

  it("score is clamped between 0 and 100", () => {
    // Worst possible: everything off
    const worst = computeVedScore({
      torqueActual: 100,
      torqueTarget: 1,
      poseDelta: 10,
      cycleTime: 1000,
    });
    expect(worst).toBe(0);

    // Best possible
    const best = computeVedScore({
      torqueActual: 10,
      torqueTarget: 10,
      poseDelta: 0,
      cycleTime: 1,
    });
    expect(best).toBe(100);
  });
});

// ── checkOilingControl ───────────────────────────────────────────────────

describe("checkOilingControl", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockInsertValues.mockClear();
    mockExecute.mockClear();
    // Re-establish chain after clear
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);
    mockExecute.mockResolvedValue(undefined);
  });

  it("both checks pass → no alerts, no penalties", async () => {
    const reading = makeReading({
      torqueActual: 10.0,
      torqueTarget: 10.0,
    });
    const result = await checkOilingControl(reading);

    expect(result.torqueOk).toBe(true);
    expect(result.poseOk).toBe(true);
    expect(result.alerts).toHaveLength(0);
    expect(result.penalties).toHaveLength(0);
    // No DB inserts when both pass
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("torque at exactly 15Nm threshold → passes (<=)", async () => {
    const reading = makeReading({ torqueActual: 15.0 });
    const result = await checkOilingControl(reading);

    expect(result.torqueOk).toBe(true);
    expect(result.alerts).toHaveLength(0);
  });

  it("torque exceeds 15Nm but <=20Nm → creates warning alert", async () => {
    const reading = makeReading({ torqueActual: 17.5 });
    const result = await checkOilingControl(reading);

    expect(result.torqueOk).toBe(false);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toContain("Torque exceeded");
    expect(result.alerts[0]).toContain("17.50Nm");

    // Should insert alert with severity "warning"
    expect(mockInsert).toHaveBeenCalled();
    const insertedValues = mockInsertValues.mock.calls[0][0];
    expect(insertedValues.severity).toBe("warning");
    expect(insertedValues.alertType).toBe("servo_error");
    expect(insertedValues.unit).toBe("Nm");
  });

  it("torque exceeds 20Nm → creates critical alert", async () => {
    const reading = makeReading({ torqueActual: 22.0 });
    const result = await checkOilingControl(reading);

    expect(result.torqueOk).toBe(false);

    const insertedValues = mockInsertValues.mock.calls[0][0];
    expect(insertedValues.severity).toBe("critical");
    expect(insertedValues.robotId).toBe(1);
  });

  it("pose exceeds 0.5mm but <=1.0mm → warning alert", async () => {
    // poseDelta = sqrt((0.6)^2 + 0 + 0) = 0.6mm
    const reading = makeReading({ poseX: 0.6, baseX: 0 });
    const result = await checkOilingControl(reading);

    expect(result.poseOk).toBe(false);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toContain("Pose deviation");

    const insertedValues = mockInsertValues.mock.calls[0][0];
    expect(insertedValues.severity).toBe("warning");
    expect(insertedValues.alertType).toBe("joint_limit");
    expect(insertedValues.unit).toBe("mm");
  });

  it("pose exceeds 1.0mm → critical alert", async () => {
    // poseDelta = sqrt(1.5^2) = 1.5mm
    const reading = makeReading({ poseX: 1.5, baseX: 0 });
    const result = await checkOilingControl(reading);

    expect(result.poseOk).toBe(false);

    const insertedValues = mockInsertValues.mock.calls[0][0];
    expect(insertedValues.severity).toBe("critical");
  });

  it("both fail → two alerts + VED deduction recorded", async () => {
    const reading = makeReading({
      torqueActual: 18.0,
      poseX: 0.8,
      baseX: 0,
    });
    const result = await checkOilingControl(reading);

    expect(result.torqueOk).toBe(false);
    expect(result.poseOk).toBe(false);
    expect(result.alerts).toHaveLength(2);
    // Two alert inserts (torque + pose) + VED deduction + AEI bridge execute calls
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenCalledTimes(2); // VED deduction + AEI contribution log
    expect(result.penalties).toHaveLength(1);
    expect(result.penalties[0]).toContain("VED score:");
  });

  it("returns correct torqueDelta value", async () => {
    // torqueDelta = torqueActual - TORQUE_THRESHOLD(15)
    const reading = makeReading({ torqueActual: 12.0 });
    const result = await checkOilingControl(reading);

    expect(result.torqueDelta).toBeCloseTo(12.0 - 15.0, 5);
    expect(result.torqueDelta).toBe(-3.0);
  });

  it("returns correct poseDelta via Euclidean distance", async () => {
    // (1,0,0) from (0,0,0) → sqrt(1) = 1.0mm
    const reading = makeReading({
      poseX: 1, poseY: 0, poseZ: 0,
      baseX: 0, baseY: 0, baseZ: 0,
    });
    const result = await checkOilingControl(reading);

    expect(result.poseDelta).toBeCloseTo(1.0, 5);
  });

  it("Euclidean distance with all axes: (3,4,0)→(0,0,0) = 5.0mm", async () => {
    const reading = makeReading({
      poseX: 3, poseY: 4, poseZ: 0,
      baseX: 0, baseY: 0, baseZ: 0,
    });
    const result = await checkOilingControl(reading);

    expect(result.poseDelta).toBeCloseTo(5.0, 5);
  });

  it("Euclidean distance 3D: (1,2,2)→(0,0,0) = 3.0mm", async () => {
    const reading = makeReading({
      poseX: 1, poseY: 2, poseZ: 2,
      baseX: 0, baseY: 0, baseZ: 0,
    });
    const result = await checkOilingControl(reading);

    expect(result.poseDelta).toBeCloseTo(3.0, 5);
  });

  it("vedScore is included in result", async () => {
    const reading = makeReading({ torqueActual: 10.0 });
    const result = await checkOilingControl(reading);

    expect(typeof result.vedScore).toBe("number");
    expect(result.vedScore).toBeGreaterThanOrEqual(0);
    expect(result.vedScore).toBeLessThanOrEqual(100);
  });

  it("DB insert failure for alert does not throw", async () => {
    mockInsertValues.mockRejectedValueOnce(new Error("DB failure"));
    const reading = makeReading({ torqueActual: 18.0 });

    // Should not throw even though DB insert fails
    const result = await checkOilingControl(reading);
    expect(result.torqueOk).toBe(false);
    expect(result.alerts).toHaveLength(1);
  });

  it("DB execute failure for VED deduction does not throw", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB failure"));
    const reading = makeReading({ torqueActual: 18.0 });

    const result = await checkOilingControl(reading);
    // penalties won't have VED entry because the execute failed
    expect(result.penalties).toHaveLength(0);
  });

  it("operatorId defaults to 'system' when not provided", async () => {
    const reading = makeReading({ torqueActual: 18.0, operatorId: undefined });
    await checkOilingControl(reading);

    // VED deduction execute is called; verify it doesn't throw
    expect(mockExecute).toHaveBeenCalled();
  });

  it("pose at exactly 0.5mm threshold → passes (<=)", async () => {
    // poseDelta = 0.5 exactly
    const reading = makeReading({ poseX: 0.5, baseX: 0 });
    const result = await checkOilingControl(reading);

    expect(result.poseOk).toBe(true);
  });

  it("alert message includes station code", async () => {
    const reading = makeReading({
      torqueActual: 18.0,
      stationCode: "ST42",
    });
    await checkOilingControl(reading);

    const insertedValues = mockInsertValues.mock.calls[0][0];
    expect(insertedValues.message).toContain("ST42");
    expect(insertedValues.details.stationCode).toBe("ST42");
    expect(insertedValues.details.source).toBe("oiling-control-guard");
  });
});
