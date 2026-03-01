/**
 * MES Router — Comprehensive Automated Test Suite
 *
 * Covers all 2 procedures:
 *   - getOperators (query) — fetch distinct operators from employee_competence_assessments
 *   - verifySkill (mutation) — verify worker skill level via mes-quality-guard service
 *
 * Mock strategy:
 *   - DB execute is mocked to return controlled row sets
 *   - mes-quality-guard service (verifyWorkerSkillForStation + InsufficientSkillError) is mocked
 *
 * Run: npx vitest run server/routers/mes.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks (available before module evaluation) ──────────────
const { executeResults, mockVerifySkill, MockInsufficientSkillError } = vi.hoisted(() => {
  class MockInsufficientSkillError extends Error {
    employeeId: number;
    employeeName: string;
    domain: string;
    currentLevel: number;
    requiredLevel: number;
    iatfWarning: string;
    constructor(data: {
      employeeId: number;
      employeeName: string;
      domain: string;
      currentLevel: number;
      requiredLevel: number;
      iatfWarning: string;
    }) {
      super("Insufficient skill");
      this.name = "InsufficientSkillError";
      this.employeeId = data.employeeId;
      this.employeeName = data.employeeName;
      this.domain = data.domain;
      this.currentLevel = data.currentLevel;
      this.requiredLevel = data.requiredLevel;
      this.iatfWarning = data.iatfWarning;
    }
  }
  return {
    executeResults: [] as any[],
    mockVerifySkill: vi.fn(async () => ({
      employeeName: "张三",
      domain: "welding",
      currentLevel: 4,
      requiredLevel: 3,
      score: "85",
    })),
    MockInsufficientSkillError,
  };
});

// ─── Mock DB ─────────────────────────────────────────────────────────
vi.mock("../db", () => ({
  requireDb: vi.fn(async () => ({
    execute: vi.fn(async () => {
      return executeResults.length > 0 ? executeResults.shift()! : { rows: [] };
    }),
  })),
}));

// ─── Mock drizzle-orm sql tag ────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  sql: Object.assign(vi.fn((..._a: any[]) => "sql-tag"), { raw: vi.fn() }),
}));

// ─── Mock mes-quality-guard service ──────────────────────────────────
vi.mock("../services/mes-quality-guard", () => ({
  verifyWorkerSkillForStation: mockVerifySkill,
  InsufficientSkillError: MockInsufficientSkillError,
}));

// ─── Import caller utilities AFTER mocks ─────────────────────────────
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Reset state before each test ────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  executeResults.length = 0;
  mockVerifySkill.mockResolvedValue({
    employeeName: "张三",
    domain: "welding",
    currentLevel: 4,
    requiredLevel: 3,
    score: "85",
  });
});

// =====================================================================
// 1. getOperators
// =====================================================================
describe("mes.getOperators", () => {
  it("should return operators from DB rows", async () => {
    const caller = createAuthenticatedCaller();
    executeResults.push({
      rows: [
        { employeeId: 1, employeeName: "张三", department: "焊接车间", position: "焊工" },
        { employeeId: 2, employeeName: "李四", department: "装配车间", position: "装配工" },
      ],
    });

    const result = await caller.mes.getOperators();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, name: "张三", department: "焊接车间", position: "焊工" });
    expect(result[1]).toEqual({ id: 2, name: "李四", department: "装配车间", position: "装配工" });
  });

  it("should default null department and position to empty string", async () => {
    const caller = createAuthenticatedCaller();
    executeResults.push({
      rows: [
        { employeeId: 10, employeeName: "王五", department: null, position: null },
        { employeeId: 11, employeeName: "赵六", department: undefined, position: undefined },
      ],
    });

    const result = await caller.mes.getOperators();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 10, name: "王五", department: "", position: "" });
    expect(result[1]).toEqual({ id: 11, name: "赵六", department: "", position: "" });
  });

  it("should return empty array when no operators exist", async () => {
    const caller = createAuthenticatedCaller();
    // executeResults is empty, so default { rows: [] } is returned

    const result = await caller.mes.getOperators();

    expect(result).toEqual([]);
  });
});

// =====================================================================
// 2. verifySkill — success path
// =====================================================================
describe("mes.verifySkill", () => {
  it("should return success when skill is sufficient", async () => {
    const caller = createAuthenticatedCaller();
    mockVerifySkill.mockResolvedValue({
      employeeName: "张三",
      domain: "T",
      currentLevel: 4,
      requiredLevel: 3,
      score: "85",
    });

    const result = await caller.mes.verifySkill({
      employeeId: 1,
      domain: "T",
      requiredLevel: 3,
    });

    expect(result.success).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.employeeName).toBe("张三");
    expect(result.domain).toBe("T");
    expect(result.currentLevel).toBe(4);
    expect(result.requiredLevel).toBe(3);
    expect(result.score).toBe("85");
    expect(result.message).toBe(
      "Skill verified. Assembly started. 张三 has L4 in T (required: L3)."
    );

    // Verify the service was called with correct arguments
    expect(mockVerifySkill).toHaveBeenCalledWith(1, "T", 3);
  });

  // ─── InsufficientSkillError path ─────────────────────────────────
  it("should return failure when InsufficientSkillError is thrown", async () => {
    const caller = createAuthenticatedCaller();
    const errorData = {
      employeeId: 5,
      employeeName: "李四",
      domain: "S",
      currentLevel: 1,
      requiredLevel: 3,
      iatfWarning: "[IATF 16949 §7.2 NON-CONFORMANCE] Employee \"李四\" insufficient skill",
    };
    mockVerifySkill.mockRejectedValue(new MockInsufficientSkillError(errorData));

    const result = await caller.mes.verifySkill({
      employeeId: 5,
      domain: "S",
      requiredLevel: 3,
    });

    expect(result.success).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.employeeId).toBe(5);
    expect(result.employeeName).toBe("李四");
    expect(result.domain).toBe("S");
    expect(result.currentLevel).toBe(1);
    expect(result.requiredLevel).toBe(3);
    expect(result.score).toBe("0");
    expect(result.message).toBe(errorData.iatfWarning);
  });

  // ─── Generic error path ──────────────────────────────────────────
  it("should return failure with defaults for generic errors", async () => {
    const caller = createAuthenticatedCaller();
    mockVerifySkill.mockRejectedValue(new Error("DB connection lost"));

    const result = await caller.mes.verifySkill({
      employeeId: 99,
      domain: "D",
      requiredLevel: 2,
    });

    expect(result.success).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.employeeId).toBe(99);
    expect(result.employeeName).toBe("Unknown");
    expect(result.domain).toBe("D");
    expect(result.currentLevel).toBe(0);
    expect(result.requiredLevel).toBe(2);
    expect(result.score).toBe("0");
    expect(result.message).toBe("DB connection lost");
  });
});

// =====================================================================
// 3. Authentication guards
// =====================================================================
describe("mes auth guards", () => {
  it("should reject unauthenticated caller for getOperators", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.mes.getOperators()).rejects.toThrow();
  });

  it("should reject unauthenticated caller for verifySkill", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.mes.verifySkill({ employeeId: 1, domain: "T", requiredLevel: 3 })
    ).rejects.toThrow();
  });
});
