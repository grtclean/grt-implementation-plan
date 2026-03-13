import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockDb = {
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 1 }]),
};

const selectResultsQueue: unknown[][] = [];

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("../../drizzle/cross-dept-sla-schema", () => ({
  crossDeptSlaRecords: {
    id: "id",
    requesterDeptCode: "requester_dept_code",
    providerDeptCode: "provider_dept_code",
    requestType: "request_type",
    period: "period",
    requestedAt: "requested_at",
    responseTimeMs: "response_time_ms",
    slaTargetMs: "sla_target_ms",
    qualityScore: "quality_score",
    satisfactionScore: "satisfaction_score",
  },
  slaRequestTypeEnum: vi.fn(),
}));

vi.mock("../lib/logger", () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock("../_core/trpc", () => {
  const passthrough = {
    input: vi.fn().mockReturnThis(),
    query: vi.fn((fn: Function) => fn),
    mutation: vi.fn((fn: Function) => fn),
    use: vi.fn().mockReturnThis(),
  };
  return {
    router: vi.fn((routes: Record<string, unknown>) => routes),
    protectedProcedure: passthrough,
    requirePermission: vi.fn(() => passthrough),
  };
});

import { crossDeptSlaRouter } from "./cross-dept-sla.router";

describe("crossDeptSlaRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResultsQueue.length = 0;
    mockDb.limit.mockImplementation(() => {
      const result = selectResultsQueue.shift() || [];
      return { offset: vi.fn().mockResolvedValue(result), then: (fn: Function) => Promise.resolve(result).then(fn) };
    });
  });

  it("should export all 4 procedures", () => {
    expect(crossDeptSlaRouter).toHaveProperty("recordSlaEvent");
    expect(crossDeptSlaRouter).toHaveProperty("getSlaScores");
    expect(crossDeptSlaRouter).toHaveProperty("getCrossDeptMatrix");
    expect(crossDeptSlaRouter).toHaveProperty("listRecords");
  });

  describe("recordSlaEvent", () => {
    it("should insert an SLA record", async () => {
      const handler = crossDeptSlaRouter.recordSlaEvent as Function;
      const result = await handler({
        input: {
          requesterDeptCode: "MECH",
          providerDeptCode: "PROC",
          requestType: "procurement",
          requestedAt: "2026-03-01T00:00:00Z",
          slaTargetMs: 86400000,
        },
        ctx: { user: { id: 1, name: "test" } },
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id");
    });
  });

  describe("getSlaScores", () => {
    it("should return zero scores when no records", async () => {
      selectResultsQueue.push([]);
      const handler = crossDeptSlaRouter.getSlaScores as Function;
      const result = await handler({
        input: { deptCode: "MECH", period: "2026-03" },
      });

      expect(result.totalRequests).toBe(0);
      expect(result.slaCompliancePercent).toBe(0);
    });

    it("should compute SLA metrics from records", async () => {
      selectResultsQueue.push([
        { responseTimeMs: 3600000, slaTargetMs: 86400000, qualityScore: 80, satisfactionScore: 4 },
        { responseTimeMs: 100000000, slaTargetMs: 86400000, qualityScore: 60, satisfactionScore: 3 },
      ]);
      const handler = crossDeptSlaRouter.getSlaScores as Function;
      const result = await handler({
        input: { deptCode: "PROC", period: "2026-03" },
      });

      expect(result.totalRequests).toBe(2);
      expect(result.slaCompliancePercent).toBe(50);
      expect(result.avgQualityScore).toBe(70);
    });
  });

  describe("getCrossDeptMatrix", () => {
    it("should build NxN matrix", async () => {
      selectResultsQueue.push([
        { requesterDeptCode: "MECH", providerDeptCode: "PROC", responseTimeMs: 1000, slaTargetMs: 86400000, qualityScore: 90 },
        { requesterDeptCode: "MECH", providerDeptCode: "PROC", responseTimeMs: 2000, slaTargetMs: 86400000, qualityScore: 80 },
      ]);
      const handler = crossDeptSlaRouter.getCrossDeptMatrix as Function;
      const result = await handler({
        input: { period: "2026-03" },
      });

      expect(result.totalRecords).toBe(2);
      expect(result.matrix.MECH?.PROC?.count).toBe(2);
    });
  });

  describe("listRecords", () => {
    it("should return paginated records", async () => {
      selectResultsQueue.push([
        { id: 1, requesterDeptCode: "MECH", providerDeptCode: "QA" },
      ]);
      const handler = crossDeptSlaRouter.listRecords as Function;
      const result = await handler({
        input: { limit: 50, offset: 0 },
      });

      expect(result.records).toHaveLength(1);
    });
  });

  // ----------------------------------------------------------------
  // Edge cases: Matrix with multiple dept pairs
  // ----------------------------------------------------------------
  describe("getCrossDeptMatrix — multiple dept pairs", () => {
    it("should build matrix with 3 unique dept pairs", async () => {
      selectResultsQueue.push([
        { requesterDeptCode: "MECH", providerDeptCode: "PROC", responseTimeMs: 1000, slaTargetMs: 86400000, qualityScore: 90 },
        { requesterDeptCode: "MECH", providerDeptCode: "QA", responseTimeMs: 5000, slaTargetMs: 86400000, qualityScore: 85 },
        { requesterDeptCode: "ELEC", providerDeptCode: "PROC", responseTimeMs: 2000, slaTargetMs: 86400000, qualityScore: 70 },
        { requesterDeptCode: "ELEC", providerDeptCode: "PROC", responseTimeMs: 3000, slaTargetMs: 86400000, qualityScore: 80 },
      ]);
      const handler = crossDeptSlaRouter.getCrossDeptMatrix as Function;
      const result = await handler({
        input: { period: "2026-03" },
      });

      expect(result.totalRecords).toBe(4);

      // MECH -> PROC: 1 record
      expect(result.matrix.MECH?.PROC?.count).toBe(1);
      expect(result.matrix.MECH?.PROC?.avgResponseMs).toBe(1000);

      // MECH -> QA: 1 record
      expect(result.matrix.MECH?.QA?.count).toBe(1);
      expect(result.matrix.MECH?.QA?.avgResponseMs).toBe(5000);

      // ELEC -> PROC: 2 records
      expect(result.matrix.ELEC?.PROC?.count).toBe(2);
      expect(result.matrix.ELEC?.PROC?.avgResponseMs).toBe(2500); // (2000+3000)/2
      expect(result.matrix.ELEC?.PROC?.avgQuality).toBe(75); // (70+80)/2
    });

    it("should handle bidirectional dept pairs", async () => {
      selectResultsQueue.push([
        { requesterDeptCode: "MECH", providerDeptCode: "QA", responseTimeMs: 1000, slaTargetMs: 86400000, qualityScore: 90 },
        { requesterDeptCode: "QA", providerDeptCode: "MECH", responseTimeMs: 8000, slaTargetMs: 86400000, qualityScore: 60 },
      ]);
      const handler = crossDeptSlaRouter.getCrossDeptMatrix as Function;
      const result = await handler({
        input: { period: "2026-03" },
      });

      expect(result.totalRecords).toBe(2);
      // MECH -> QA direction
      expect(result.matrix.MECH?.QA?.count).toBe(1);
      // QA -> MECH direction (reverse)
      expect(result.matrix.QA?.MECH?.count).toBe(1);
    });

    it("should handle records with no quality scores", async () => {
      selectResultsQueue.push([
        { requesterDeptCode: "MECH", providerDeptCode: "PROC", responseTimeMs: 1000, slaTargetMs: 86400000, qualityScore: null },
        { requesterDeptCode: "MECH", providerDeptCode: "PROC", responseTimeMs: 2000, slaTargetMs: 86400000, qualityScore: null },
      ]);
      const handler = crossDeptSlaRouter.getCrossDeptMatrix as Function;
      const result = await handler({
        input: { period: "2026-03" },
      });

      expect(result.matrix.MECH?.PROC?.count).toBe(2);
      expect(result.matrix.MECH?.PROC?.avgQuality).toBe(0);
    });
  });

  // ----------------------------------------------------------------
  // Edge cases: SLA compliance calculation boundary
  // ----------------------------------------------------------------
  describe("getSlaScores — compliance boundary", () => {
    it("exactly at target counts as compliant (responseTimeMs = slaTargetMs)", async () => {
      selectResultsQueue.push([
        { responseTimeMs: 86400000, slaTargetMs: 86400000, qualityScore: 80, satisfactionScore: 4 },
      ]);
      const handler = crossDeptSlaRouter.getSlaScores as Function;
      const result = await handler({
        input: { deptCode: "PROC", period: "2026-03" },
      });

      expect(result.totalRequests).toBe(1);
      // Response time equals target — should count as compliant
      expect(result.slaCompliancePercent).toBe(100);
    });

    it("1ms over target counts as non-compliant", async () => {
      selectResultsQueue.push([
        { responseTimeMs: 86400001, slaTargetMs: 86400000, qualityScore: 80, satisfactionScore: 4 },
      ]);
      const handler = crossDeptSlaRouter.getSlaScores as Function;
      const result = await handler({
        input: { deptCode: "PROC", period: "2026-03" },
      });

      expect(result.totalRequests).toBe(1);
      expect(result.slaCompliancePercent).toBe(0);
    });

    it("mixed compliance: 2 compliant + 1 non-compliant = 67%", async () => {
      selectResultsQueue.push([
        { responseTimeMs: 1000, slaTargetMs: 86400000, qualityScore: 90, satisfactionScore: 5 },
        { responseTimeMs: 86400000, slaTargetMs: 86400000, qualityScore: 80, satisfactionScore: 4 },
        { responseTimeMs: 86400001, slaTargetMs: 86400000, qualityScore: 70, satisfactionScore: 3 },
      ]);
      const handler = crossDeptSlaRouter.getSlaScores as Function;
      const result = await handler({
        input: { deptCode: "PROC", period: "2026-03" },
      });

      expect(result.totalRequests).toBe(3);
      expect(result.slaCompliancePercent).toBe(67); // Math.round(2/3 * 100) = 67
    });

    it("records with null responseTimeMs are excluded from compliance calc", async () => {
      selectResultsQueue.push([
        { responseTimeMs: 1000, slaTargetMs: 86400000, qualityScore: 90, satisfactionScore: 5 },
        { responseTimeMs: null, slaTargetMs: 86400000, qualityScore: 80, satisfactionScore: 4 },
      ]);
      const handler = crossDeptSlaRouter.getSlaScores as Function;
      const result = await handler({
        input: { deptCode: "PROC", period: "2026-03" },
      });

      expect(result.totalRequests).toBe(2);
      // Only 1 responded record, and it is compliant
      expect(result.slaCompliancePercent).toBe(100);
    });

    it("satisfaction is averaged with 1 decimal precision", async () => {
      selectResultsQueue.push([
        { responseTimeMs: 1000, slaTargetMs: 86400000, qualityScore: 90, satisfactionScore: 5 },
        { responseTimeMs: 2000, slaTargetMs: 86400000, qualityScore: 80, satisfactionScore: 4 },
        { responseTimeMs: 3000, slaTargetMs: 86400000, qualityScore: 70, satisfactionScore: 3 },
      ]);
      const handler = crossDeptSlaRouter.getSlaScores as Function;
      const result = await handler({
        input: { deptCode: "PROC", period: "2026-03" },
      });

      expect(result.avgSatisfaction).toBe(4); // (5+4+3)/3 = 4.0
      expect(result.avgQualityScore).toBe(80); // (90+80+70)/3 = 80
    });
  });
});
