/**
 * v1.7.1 Unit Tests
 * Tests for CCD Integration, BOM Import, and Salary Report Visualization
 *
 * mysql2 db.execute returns [rows, fields] for SELECT
 * and [ResultSetHeader, undefined] for INSERT/UPDATE/DELETE
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockExecute } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  return { mockExecute };
});

// Mock the database module
vi.mock("./db", () => ({
  requireDb: vi.fn().mockResolvedValue({ execute: mockExecute }),
  getDb: vi.fn().mockResolvedValue({ execute: mockExecute }),
}));

vi.mock("./utils/db-helpers", () => ({
  requireDb: vi.fn().mockResolvedValue({ execute: mockExecute }),
  getDb: vi.fn().mockResolvedValue({ execute: mockExecute }),
  getDbConnection: vi.fn().mockResolvedValue({ execute: mockExecute }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Also import pure functions directly for unit testing
import { parseBomCsv, detectDuplicates, generateBomTemplate } from "./production-steps/bomImport.service";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Helper: Drizzle/pg execute result — the service accesses .rows
function selectResult(rows: any[]) {
  return { rows };
}

// Helper: Drizzle INSERT result
function insertResult(insertId: number) {
  return { rows: [{ id: insertId }], rowCount: 1 };
}

// Helper: Drizzle UPDATE/DELETE result
function updateResult(affectedRows: number = 1) {
  return { rows: [], rowCount: affectedRows };
}

function createAuthContext(overrides?: Partial<AuthenticatedUser>): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@grt.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };

  return { ctx };
}

// ==========================================
// 功能1: CCD检测集成
// ==========================================
describe("ccdIntegration", () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe("getConfig", () => {
    it("should return project-specific config when found", async () => {
      const configRow = {
        id: 1,
        project_id: "PRJ-001",
        auto_trigger_enabled: 1,
        severity_threshold_critical: 30,
        severity_threshold_major: 60,
        severity_threshold_minor: 85,
        process_mapping: '{"CCD-T5":"T5"}',
        auto_lock_on_critical: 1,
        auto_lock_on_major: 1,
        auto_notify_on_minor: 1,
        cooldown_minutes: 5,
      };
      mockExecute.mockResolvedValueOnce(selectResult([configRow]));

      const result = await caller.ccdIntegration.getConfig({ projectId: "PRJ-001" });
      expect(result).toBeDefined();
      expect(result.auto_trigger_enabled).toBe(1);
    });

    it("should return default config when no config exists", async () => {
      // First query (project-specific) returns empty
      mockExecute.mockResolvedValueOnce(selectResult([]));
      // Second query (global) returns empty
      mockExecute.mockResolvedValueOnce(selectResult([]));

      const result = await caller.ccdIntegration.getConfig({ projectId: "PRJ-999" });
      expect(result).toBeDefined();
      expect(result.id).toBeNull();
      expect(result.auto_trigger_enabled).toBe(1);
      expect(result.severity_threshold_critical).toBe(30);
    });
  });

  describe("saveConfig", () => {
    it("should create new config when none exists", async () => {
      // Check existing: empty
      mockExecute.mockResolvedValueOnce(selectResult([]));
      // Insert new config
      mockExecute.mockResolvedValueOnce(insertResult(1));

      const result = await caller.ccdIntegration.saveConfig({
        autoTriggerEnabled: true,
        severityThresholdCritical: 25,
        severityThresholdMajor: 55,
        severityThresholdMinor: 80,
        cooldownMinutes: 10,
      });
      expect(result.created).toBe(true);
      expect(result.id).toBe(1);
    });

    it("should update existing config", async () => {
      // Check existing: found
      mockExecute.mockResolvedValueOnce(selectResult([{ id: 5 }]));
      // Update
      mockExecute.mockResolvedValueOnce(updateResult());

      const result = await caller.ccdIntegration.saveConfig({
        projectId: "PRJ-001",
        severityThresholdCritical: 20,
      });
      expect(result.updated).toBe(true);
      expect(result.id).toBe(5);
    });
  });

  describe("submitDetection", () => {
    it("should process a passing detection without triggering interlock", async () => {
      // getCcdConfig: project query returns empty, global query returns empty (uses defaults)
      mockExecute.mockResolvedValueOnce(selectResult([]));
      mockExecute.mockResolvedValueOnce(selectResult([]));
      // Cooldown check: no recent triggers
      mockExecute.mockResolvedValueOnce(selectResult([]));
      // Insert detection log
      mockExecute.mockResolvedValueOnce(insertResult(100));

      const result = await caller.ccdIntegration.submitDetection({
        detectionId: "DET-001",
        stationId: "CCD-T5",
        projectId: "PRJ-001",
        overallScore: 95, // pass (>= 85)
        defects: [],
      });

      expect(result.processed).toBe(true);
      expect(result.severity).toBe("pass");
      expect(result.triggeredInterlock).toBe(false);
    });

    it("should return not processed when auto trigger is disabled", async () => {
      // getCcdConfig: returns config with auto_trigger_enabled = 0
      mockExecute.mockResolvedValueOnce(selectResult([{
        id: 1,
        auto_trigger_enabled: 0,
        severity_threshold_critical: 30,
        severity_threshold_major: 60,
        severity_threshold_minor: 85,
        process_mapping: '{"CCD-T5":"T5"}',
        auto_lock_on_critical: 1,
        auto_lock_on_major: 1,
        auto_notify_on_minor: 1,
        cooldown_minutes: 5,
      }]));

      const result = await caller.ccdIntegration.submitDetection({
        detectionId: "DET-002",
        stationId: "CCD-T5",
        projectId: "PRJ-001",
        overallScore: 10,
        defects: [{ defectType: "crack", location: "surface", confidence: 0.95 }],
      });

      expect(result.processed).toBe(false);
      expect(result.reason).toContain("关闭");
    });

    it("should return not processed for unmapped station", async () => {
      // getCcdConfig: returns default config (no mapping for CCD-UNKNOWN)
      mockExecute.mockResolvedValueOnce(selectResult([]));
      mockExecute.mockResolvedValueOnce(selectResult([]));

      const result = await caller.ccdIntegration.submitDetection({
        detectionId: "DET-003",
        stationId: "CCD-UNKNOWN",
        projectId: "PRJ-001",
        overallScore: 10,
        defects: [],
      });

      expect(result.processed).toBe(false);
      expect(result.reason).toContain("未找到");
    });
  });

  describe("getLogs", () => {
    it("should return detection logs for a project", async () => {
      const logs = [
        { id: 1, detection_id: "DET-001", severity: "pass", overall_score: 95 },
        { id: 2, detection_id: "DET-002", severity: "critical", overall_score: 15 },
      ];
      mockExecute.mockResolvedValueOnce(selectResult(logs));

      const result = await caller.ccdIntegration.getLogs({ projectId: "PRJ-001" });
      expect(result).toHaveLength(2);
    });

    it("should filter triggered-only logs", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 2, detection_id: "DET-002", triggered_interlock: 1 },
      ]));

      const result = await caller.ccdIntegration.getLogs({
        projectId: "PRJ-001",
        triggeredOnly: true,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("getStats", () => {
    it("should return detection statistics", async () => {
      // Summary stats
      mockExecute.mockResolvedValueOnce(selectResult([{
        total_detections: 100,
        critical_count: 5,
        major_count: 10,
        minor_count: 20,
        pass_count: 65,
        avg_score: 78.5,
        min_score: 12,
        max_score: 99,
        total_defects: 45,
        interlock_triggers: 8,
        cooldown_skips: 2,
      }]));
      // Station stats
      mockExecute.mockResolvedValueOnce(selectResult([
        { station_id: "CCD-T5", process_code: "T5", total: 50, avg_score: 80 },
      ]));
      // Trend data
      mockExecute.mockResolvedValueOnce(selectResult([
        { detection_date: "2026-02-01", total: 10, avg_score: 75 },
      ]));

      const result = await caller.ccdIntegration.getStats({ projectId: "PRJ-001" });
      expect(result.summary.total_detections).toBe(100);
      expect(result.byStation).toHaveLength(1);
      expect(result.trend).toHaveLength(1);
    });
  });

  describe("getInterlockHistory", () => {
    it("should return interlock history records", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, detection_id: "DET-002", triggered_interlock: 1, lock_status: "locked" },
      ]));

      const result = await caller.ccdIntegration.getInterlockHistory({ projectId: "PRJ-001" });
      expect(result).toHaveLength(1);
    });
  });
});

// ==========================================
// 功能2: BOM数据批量导入
// ==========================================
describe("bomImport", () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    mockExecute.mockReset();
  });

  // --- Pure function tests (no DB needed) ---
  describe("generateBomTemplate (pure)", () => {
    it("should generate a valid CSV template with headers and sample rows", () => {
      const csv = generateBomTemplate();
      expect(csv).toContain("物料编码");
      expect(csv).toContain("物料名称");
      expect(csv).toContain("MAT-001");
      const lines = csv.split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(2); // header + at least 1 sample
    });
  });

  describe("parseBomCsv (pure)", () => {
    it("should parse valid CSV data correctly", () => {
      const csv = `物料编码,物料名称,物料规格,需求数量,是否关键物料,工序代码,供应商,备注
MAT-001,清洗喷嘴,DN50,4,Y,T3,上海精密,核心部件
MAT-002,传动链条,08B-1,2,N,T4,东莞链条,`;
      const { rows, errors } = parseBomCsv(csv);
      expect(rows).toHaveLength(2);
      expect(errors).toHaveLength(0);
      expect(rows[0].materialCode).toBe("MAT-001");
      expect(rows[0].isCritical).toBe(true);
      expect(rows[1].isCritical).toBe(false);
    });

    it("should report errors for missing required fields", () => {
      const csv = `物料编码,物料名称,物料规格,需求数量,是否关键物料,工序代码,供应商,备注
,缺少编码,DN50,4,N,T3,,
MAT-003,,DN50,4,N,T3,,`;
      const { rows, errors } = parseBomCsv(csv);
      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(2);
      expect(errors[0].field).toBe("物料编码");
      expect(errors[1].field).toBe("物料名称");
    });

    it("should report errors for invalid quantity", () => {
      const csv = `物料编码,物料名称,物料规格,需求数量,是否关键物料,工序代码,供应商,备注
MAT-001,喷嘴,DN50,-1,N,T3,,`;
      const { rows, errors } = parseBomCsv(csv);
      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("需求数量");
    });

    it("should report errors for invalid process code", () => {
      const csv = `物料编码,物料名称,物料规格,需求数量,是否关键物料,工序代码,供应商,备注
MAT-001,喷嘴,DN50,4,N,T99,,`;
      const { rows, errors } = parseBomCsv(csv);
      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe("工序代码");
    });

    it("should handle empty CSV", () => {
      const { rows, errors } = parseBomCsv("header only");
      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(1);
    });
  });

  describe("detectDuplicates (pure)", () => {
    it("should detect duplicate material codes", () => {
      const rows = [
        { materialCode: "MAT-001", rowNumber: 2 },
        { materialCode: "MAT-002", rowNumber: 3 },
        { materialCode: "MAT-001", rowNumber: 4 },
      ];
      const dups = detectDuplicates(rows);
      expect(dups).toHaveLength(1);
      expect(dups[0].materialCode).toBe("MAT-001");
      expect(dups[0].duplicateOf).toBe(2);
    });

    it("should return empty for no duplicates", () => {
      const rows = [
        { materialCode: "MAT-001", rowNumber: 2 },
        { materialCode: "MAT-002", rowNumber: 3 },
      ];
      const dups = detectDuplicates(rows);
      expect(dups).toHaveLength(0);
    });
  });

  // --- Router tests (with DB mocks) ---
  describe("getTemplate", () => {
    it("should return CSV template", async () => {
      const result = await caller.bomImport.getTemplate();
      expect(result.csv).toContain("物料编码");
      expect(result.filename).toContain("BOM");
    });
  });

  describe("previewCsv", () => {
    it("should preview valid CSV data", async () => {
      const csv = `物料编码,物料名称,物料规格,需求数量,是否关键物料,工序代码,供应商,备注
MAT-001,清洗喷嘴,DN50,4,Y,T3,上海精密,核心部件`;
      const result = await caller.bomImport.previewCsv({ csvText: csv });
      expect(result.validRows).toBe(1);
      expect(result.errorCount).toBe(0);
    });

    it("should report errors in preview", async () => {
      const csv = `物料编码,物料名称,物料规格,需求数量,是否关键物料,工序代码,供应商,备注
,缺少编码,DN50,4,N,T3,,`;
      const result = await caller.bomImport.previewCsv({ csvText: csv });
      expect(result.validRows).toBe(0);
      expect(result.errorCount).toBe(1);
    });
  });

  describe("importCsv", () => {
    it("should import valid CSV data successfully", async () => {
      const csv = `物料编码,物料名称,物料规格,需求数量,是否关键物料,工序代码,供应商,备注
MAT-001,清洗喷嘴,DN50,4,Y,T3,上海精密,核心部件`;

      // Check existing in DB for MAT-001: not found
      mockExecute.mockResolvedValueOnce(selectResult([]));
      // addBomChecklistItems: insert
      mockExecute.mockResolvedValueOnce(insertResult(1));
      // Record import history
      mockExecute.mockResolvedValueOnce(insertResult(1));

      const result = await caller.bomImport.importCsv({
        projectId: "PRJ-001",
        verificationId: 1,
        csvText: csv,
      });
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });

    it("should fail when all rows have errors", async () => {
      const csv = `物料编码,物料名称,物料规格,需求数量,是否关键物料,工序代码,供应商,备注
,缺少编码,DN50,4,N,T3,,`;

      const result = await caller.bomImport.importCsv({
        projectId: "PRJ-001",
        verificationId: 1,
        csvText: csv,
      });
      expect(result.success).toBe(false);
      expect(result.imported).toBe(0);
    });
  });

  describe("getHistory", () => {
    it("should return import history", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, project_id: "PRJ-001", imported_rows: 10, import_status: "completed" },
      ]));

      const result = await caller.bomImport.getHistory({ projectId: "PRJ-001" });
      expect(result).toHaveLength(1);
    });
  });

  describe("rollback", () => {
    it("should rollback an import successfully", async () => {
      // Get import record
      mockExecute.mockResolvedValueOnce(selectResult([{
        id: 1,
        verification_id: 1,
        import_status: "completed",
        created_at: Date.now(),
      }]));
      // Delete checklist items
      mockExecute.mockResolvedValueOnce(updateResult(5));
      // Update import status
      mockExecute.mockResolvedValueOnce(updateResult());

      const result = await caller.bomImport.rollback({ importId: 1 });
      expect(result.success).toBe(true);
    });

    it("should throw error for non-existent import", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([]));

      await expect(
        caller.bomImport.rollback({ importId: 999 })
      ).rejects.toThrow("导入记录不存在");
    });

    it("should throw error for already rolled back import", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([{
        id: 1,
        import_status: "rolled_back",
        created_at: Date.now(),
      }]));

      await expect(
        caller.bomImport.rollback({ importId: 1 })
      ).rejects.toThrow("已被回滚");
    });
  });
});

// ==========================================
// 功能3: 薪酬报表可视化
// ==========================================
describe("salaryReport", () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe("bonusDistribution", () => {
    it("should return bonus distribution data", async () => {
      // Distribution query
      mockExecute.mockResolvedValueOnce(selectResult([
        { bonus_range: "0-500", worker_count: 5, avg_bonus: 300, total_amount: 1500 },
        { bonus_range: "500-1000", worker_count: 10, avg_bonus: 750, total_amount: 7500 },
      ]));
      // Composition query
      mockExecute.mockResolvedValueOnce(selectResult([{
        total_efficiency: 5000,
        total_quality: 3000,
        total_attendance: 2000,
        total_special: 1000,
        total_penalty: 500,
        grand_total: 10500,
        worker_count: 15,
      }]));
      // Top workers
      mockExecute.mockResolvedValueOnce(selectResult([
        { worker_id: "W001", worker_name: "张三", total_bonus: 3000 },
      ]));
      // Bottom workers
      mockExecute.mockResolvedValueOnce(selectResult([
        { worker_id: "W010", worker_name: "李四", total_bonus: 200 },
      ]));

      const result = await caller.salaryReport.bonusDistribution({
        periodStart: Date.now() - 86400000 * 30,
        periodEnd: Date.now(),
      });
      expect(result.distribution).toHaveLength(2);
      expect(result.composition.grand_total).toBe(10500);
      expect(result.topWorkers).toHaveLength(1);
      expect(result.bottomWorkers).toHaveLength(1);
    });
  });

  describe("processComparison", () => {
    it("should return process comparison data", async () => {
      // Process stats
      mockExecute.mockResolvedValueOnce(selectResult([
        {
          process_code: "T3", worker_count: 5, avg_bonus: 1200,
          min_bonus: 800, max_bonus: 1600, total_bonus: 6000,
          avg_efficiency: 85, avg_quality_rate: 92, avg_score: 78,
        },
        {
          process_code: "T5", worker_count: 8, avg_bonus: 1500,
          min_bonus: 1000, max_bonus: 2000, total_bonus: 12000,
          avg_efficiency: 88, avg_quality_rate: 95, avg_score: 82,
        },
      ]));
      // Overall avg
      mockExecute.mockResolvedValueOnce(selectResult([{ overall_avg: 1350 }]));

      const result = await caller.salaryReport.processComparison({
        periodStart: Date.now() - 86400000 * 30,
        periodEnd: Date.now(),
      });
      expect(result.processStats).toHaveLength(2);
      expect(result.overallAvgBonus).toBeDefined();
    });
  });

  describe("correlation", () => {
    it("should return correlation data for overall metric", async () => {
      // Scatter data
      mockExecute.mockResolvedValueOnce(selectResult([
        { worker_id: "W001", worker_name: "张三", composite_score: 85, total_bonus: 2000, rank_position: 1 },
        { worker_id: "W002", worker_name: "李四", composite_score: 70, total_bonus: 1200, rank_position: 2 },
        { worker_id: "W003", worker_name: "王五", composite_score: 60, total_bonus: 800, rank_position: 3 },
      ]));

      const result = await caller.salaryReport.correlation({
        periodStart: Date.now() - 86400000 * 30,
        periodEnd: Date.now(),
        metric: "overall",
      });
      expect(result.scatterData).toHaveLength(3);
      expect(result.correlation).toBeDefined();
      expect(result.correlation.coefficient).toBeDefined();
      expect(result.regression).toBeDefined();
      expect(result.dataPoints).toBe(3);
    });

    it("should handle empty data gracefully", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([]));

      const result = await caller.salaryReport.correlation({
        periodStart: Date.now() - 86400000 * 30,
        periodEnd: Date.now(),
      });
      expect(result.scatterData).toHaveLength(0);
      expect(result.dataPoints).toBe(0);
    });
  });

  describe("trend", () => {
    it("should return trend data for monthly period", async () => {
      // For each of 12 periods, the service makes one query per period
      // But the actual implementation may vary - let's mock generously
      for (let i = 0; i < 12; i++) {
        mockExecute.mockResolvedValueOnce(selectResult([{
          total_bonus: 15000,
          avg_bonus: 1500,
          worker_count: 10,
          avg_efficiency: 85,
          avg_quality_rate: 92,
          avg_score: 78,
        }]));
      }

      const result = await caller.salaryReport.trend({
        periodType: "monthly",
        periodsCount: 12,
      });
      expect(result.trend).toBeDefined();
      expect(result.periodType).toBe("monthly");
    });
  });

  describe("workerTrend", () => {
    it("should return worker salary trend", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { period_start: Date.now() - 86400000 * 60, total_bonus: 1200, status: "approved" },
        { period_start: Date.now() - 86400000 * 30, total_bonus: 1500, status: "approved" },
      ]));

      const result = await caller.salaryReport.workerTrend({
        workerId: "W001",
        limit: 12,
      });
      expect(result.workerId).toBe("W001");
      expect(result.trend).toHaveLength(2);
      expect(result.periodsCount).toBe(2);
    });
  });

  describe("dashboard", () => {
    it("should return dashboard summary data", async () => {
      // Summary
      mockExecute.mockResolvedValueOnce(selectResult([{
        total_records: 50,
        unique_workers: 20,
        total_bonus_amount: 75000,
        avg_bonus: 1500,
        max_bonus: 3000,
        min_bonus: 200,
        avg_score: 78,
        total_penalties: 2000,
      }]));
      // Status distribution
      mockExecute.mockResolvedValueOnce(selectResult([
        { status: "calculated", count: 10, amount: 15000 },
        { status: "approved", count: 30, amount: 45000 },
        { status: "paid", count: 10, amount: 15000 },
      ]));
      // Rank distribution
      mockExecute.mockResolvedValueOnce(selectResult([
        { rank_label: "A", count: 5 },
        { rank_label: "B", count: 10 },
        { rank_label: "C", count: 5 },
      ]));

      const result = await caller.salaryReport.dashboard({
        periodStart: Date.now() - 86400000 * 30,
        periodEnd: Date.now(),
      });
      expect(result.summary.total_records).toBe(50);
      expect(result.statusDistribution).toHaveLength(3);
      expect(result.rankDistribution).toHaveLength(3);
    });
  });
});
