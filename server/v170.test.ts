/**
 * v1.7.0 Unit Tests
 * Tests the tRPC router layer with mocked database calls.
 *
 * mysql2 db.execute returns [rows, fields] for SELECT
 * and [ResultSetHeader, undefined] for INSERT/UPDATE/DELETE
 * where ResultSetHeader = { insertId, affectedRows, ... }
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

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Helper: mysql2 SELECT result
function selectResult(rows: any[]) {
  return [rows, undefined]; // [rows, fields]
}

// Helper: mysql2 INSERT result
function insertResult(insertId: number) {
  return [{ insertId, affectedRows: 1 }, undefined];
}

// Helper: mysql2 UPDATE/DELETE result
function updateResult(affectedRows: number = 1) {
  return [{ affectedRows, insertId: 0 }, undefined];
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
// 功能1: 质量检查与工序联动
// ==========================================
describe("qualityInterlock", () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe("triggerLock", () => {
    it("should trigger a process lock successfully for major severity", async () => {
      // major: only lock next downstream (1 process)
      // For each process: check existing (SELECT), insert lock (INSERT), insert alert (INSERT)
      mockExecute.mockResolvedValueOnce(selectResult([])); // no existing lock
      mockExecute.mockResolvedValueOnce(insertResult(1));   // insert lock
      mockExecute.mockResolvedValueOnce(insertResult(10));  // insert alert

      const result = await caller.qualityInterlock.triggerLock({
        projectId: "PRJ-001",
        processCode: "T3",
        severity: "major",
        reason: "CCD检测发现表面缺陷",
      });

      expect(result).toBeDefined();
      expect(mockExecute).toHaveBeenCalled();
    });

    it("should trigger lock with critical severity locking all downstream", async () => {
      // T3 downstream: T4..T15 = 12 processes
      for (let i = 0; i < 12; i++) {
        mockExecute.mockResolvedValueOnce(selectResult([]));  // no existing lock
        mockExecute.mockResolvedValueOnce(insertResult(i + 1)); // insert lock
        mockExecute.mockResolvedValueOnce(insertResult(100 + i)); // insert alert
      }

      const result = await caller.qualityInterlock.triggerLock({
        projectId: "PRJ-001",
        processCode: "T3",
        severity: "critical",
        reason: "严重尺寸偏差",
        checkResultId: 1,
        defectId: 1,
      });

      expect(result).toBeDefined();
      expect(mockExecute.mock.calls.length).toBeGreaterThan(3);
    });
  });

  describe("getLocks", () => {
    it("should return locks for a project", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, project_id: "PRJ-001", locked_process_code: "T4", status: "locked" },
        { id: 2, project_id: "PRJ-001", locked_process_code: "T5", status: "locked" },
      ]));

      const result = await caller.qualityInterlock.getLocks({ projectId: "PRJ-001" });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it("should filter locks by status", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, project_id: "PRJ-001", locked_process_code: "T4", status: "locked" },
      ]));

      const result = await caller.qualityInterlock.getLocks({ projectId: "PRJ-001", status: "locked" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("checkLocked", () => {
    it("should return locked status when process is locked", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, status: "locked", lock_reason: "缺陷" },
      ]));

      const result = await caller.qualityInterlock.checkLocked({ projectId: "PRJ-001", processCode: "T4" });
      expect(result).toHaveProperty("locked");
      expect(result.locked).toBe(true);
    });

    it("should return not locked when process has no locks", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([]));

      const result = await caller.qualityInterlock.checkLocked({ projectId: "PRJ-001", processCode: "T2" });
      expect(result).toHaveProperty("locked");
      expect(result.locked).toBe(false);
    });
  });

  describe("lockSummary", () => {
    it("should return lock summary for a project", async () => {
      // First query: summary stats
      mockExecute.mockResolvedValueOnce(selectResult([
        { total_locks: 10, active_locks: 3, pending_requests: 1, approved_unlocks: 5, rejected_unlocks: 1, critical_locks: 2 },
      ]));
      // Second query: process status
      mockExecute.mockResolvedValueOnce(selectResult([
        { locked_process_code: "T4", status: "locked", severity: "critical" },
        { locked_process_code: "T5", status: "locked", severity: "major" },
      ]));

      const result = await caller.qualityInterlock.lockSummary({ projectId: "PRJ-001" });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("lockedProcesses");
    });
  });

  describe("requestUnlock", () => {
    it("should request unlock for a locked process", async () => {
      // First: SELECT lock record
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, project_id: "PRJ-001", locked_process_code: "T4", status: "locked", lock_reason: "缺陷" },
      ]));
      // Second: UPDATE lock status
      mockExecute.mockResolvedValueOnce(updateResult(1));
      // Third: INSERT alert notification
      mockExecute.mockResolvedValueOnce(insertResult(20));

      const result = await caller.qualityInterlock.requestUnlock({
        lockId: 1,
        unlockReason: "缺陷已修复，经确认可继续",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });
  });

  describe("approveUnlock", () => {
    it("should approve unlock request", async () => {
      // First: UPDATE lock status
      mockExecute.mockResolvedValueOnce(updateResult(1));
      // Second: SELECT lock record for alert
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, project_id: "PRJ-001", locked_process_code: "T4", status: "approved" },
      ]));
      // Third: INSERT alert notification
      mockExecute.mockResolvedValueOnce(insertResult(30));

      const result = await caller.qualityInterlock.approveUnlock({
        lockId: 1,
        approved: true,
        comments: "确认修复完成",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });

    it("should reject unlock request", async () => {
      mockExecute.mockResolvedValueOnce(updateResult(1));
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 2, project_id: "PRJ-001", locked_process_code: "T5", status: "rejected" },
      ]));
      mockExecute.mockResolvedValueOnce(insertResult(31));

      const result = await caller.qualityInterlock.approveUnlock({
        lockId: 2,
        approved: false,
        comments: "需要重新检查",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });
  });

  describe("quality alerts", () => {
    it("should return alerts for a project", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, alert_type: "process_locked", severity: "critical", is_read: 0 },
        { id: 2, alert_type: "defect_detected", severity: "major", is_read: 1 },
      ]));

      const result = await caller.qualityInterlock.getAlerts({ projectId: "PRJ-001", limit: 10 });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it("should return unread count", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([{ count: 5 }]));

      const result = await caller.qualityInterlock.unreadCount({ projectId: "PRJ-001" });
      // The service returns (rows as any[])[0]?.count || 0, which is a number
      expect(typeof result).toBe("number");
      expect(result).toBe(5);
    });

    it("should mark all alerts as read", async () => {
      mockExecute.mockResolvedValueOnce(updateResult(3));

      const result = await caller.qualityInterlock.markAllRead({ projectId: "PRJ-001" });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });

    it("should mark a single alert as read", async () => {
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.qualityInterlock.markRead({ alertId: 1 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });

    it("should mark alert as actioned", async () => {
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.qualityInterlock.markActioned({ alertId: 1, actionTaken: "已安排返工" });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });
  });

  describe("onCheckCompleted", () => {
    it("should handle quality check with pass result (no lock)", async () => {
      const result = await caller.qualityInterlock.onCheckCompleted({
        projectId: "PRJ-001",
        processCode: "T2",
        checkResultId: 100,
        result: "pass",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("triggered");
      expect(result.triggered).toBe(false);
    });

    it("should handle quality check with fail result and critical defects", async () => {
      // T4 critical: downstream T5..T15 = 11 processes
      // For each: SELECT existing lock + INSERT lock
      for (let i = 0; i < 11; i++) {
        mockExecute.mockResolvedValueOnce(selectResult([]));      // no existing lock
        mockExecute.mockResolvedValueOnce(insertResult(i + 1));   // insert lock
      }
      // Then 1 INSERT for the alert notification
      mockExecute.mockResolvedValueOnce(insertResult(100));

      const result = await caller.qualityInterlock.onCheckCompleted({
        projectId: "PRJ-001",
        processCode: "T4",
        checkResultId: 101,
        result: "fail",
        defects: [{ id: 10, severity: "critical", description: "裂纹" }],
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("triggered");
      expect(result.triggered).toBe(true);
    });
  });
});

// ==========================================
// 功能2: BOM校验管理
// ==========================================
describe("bomVerification", () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe("create", () => {
    it("should create a BOM verification record", async () => {
      mockExecute.mockResolvedValueOnce(insertResult(1));

      const result = await caller.bomVerification.create({
        projectId: "PRJ-001",
        fromProcess: "T1",
        toProcess: "T2",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("id");
      expect(result.id).toBe(1);
    });
  });

  describe("list", () => {
    it("should list BOM verifications for a project", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, project_id: "PRJ-001", from_process: "T1", to_process: "T2", status: "pending" },
        { id: 2, project_id: "PRJ-001", from_process: "T2", to_process: "T3", status: "passed" },
      ]));

      const result = await caller.bomVerification.list({ projectId: "PRJ-001" });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it("should filter by status", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, project_id: "PRJ-001", status: "pending" },
      ]));

      const result = await caller.bomVerification.list({ projectId: "PRJ-001", status: "pending" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("addItems", () => {
    it("should add checklist items to a verification", async () => {
      // 2 items: 2 INSERT + 1 UPDATE for total_items
      mockExecute.mockResolvedValueOnce(insertResult(1));  // insert item 1
      mockExecute.mockResolvedValueOnce(insertResult(2));  // insert item 2
      mockExecute.mockResolvedValueOnce(updateResult(1));  // update total_items

      const result = await caller.bomVerification.addItems({
        verificationId: 1,
        items: [
          { projectId: "PRJ-001", processCode: "T2", materialCode: "MAT-001", materialName: "不锈钢螺栓", materialSpec: "M8x30", requiredQty: 10, isCritical: true },
          { projectId: "PRJ-001", processCode: "T2", materialCode: "MAT-002", materialName: "密封垫片", requiredQty: 5, isCritical: false },
        ],
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("added");
      expect(result.added).toBe(2);
    });
  });

  describe("getItems", () => {
    it("should return checklist items for a verification", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, material_code: "MAT-001", material_name: "不锈钢螺栓", required_qty: 10, check_status: "pending" },
        { id: 2, material_code: "MAT-002", material_name: "密封垫片", required_qty: 5, check_status: "pending" },
      ]));

      const result = await caller.bomVerification.getItems({ verificationId: 1 });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe("updateItemStatus", () => {
    it("should update a checklist item status to present", async () => {
      // UPDATE item, SELECT verification_id, recalculate: SELECT stats, UPDATE record
      mockExecute.mockResolvedValueOnce(updateResult(1));  // update item
      mockExecute.mockResolvedValueOnce(selectResult([{ verification_id: 1 }])); // get verification_id
      mockExecute.mockResolvedValueOnce(selectResult([{ total: 2, verified: 1, missing: 0, extra: 0 }])); // recalc stats
      mockExecute.mockResolvedValueOnce(updateResult(1));  // update record stats

      const result = await caller.bomVerification.updateItemStatus({ itemId: 1, checkStatus: "present", actualQty: 10 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });

    it("should update item with missing status", async () => {
      mockExecute.mockResolvedValueOnce(updateResult(1));
      mockExecute.mockResolvedValueOnce(selectResult([{ verification_id: 1 }]));
      mockExecute.mockResolvedValueOnce(selectResult([{ total: 2, verified: 1, missing: 1, extra: 0 }]));
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.bomVerification.updateItemStatus({ itemId: 2, checkStatus: "missing", remarks: "物料未到货" });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });
  });

  describe("batchUpdateItems", () => {
    it("should batch update multiple items", async () => {
      // For each item: UPDATE, then first item also gets SELECT verification_id
      // Item 1: UPDATE
      mockExecute.mockResolvedValueOnce(updateResult(1));
      // Item 1: SELECT verification_id (only first item)
      mockExecute.mockResolvedValueOnce(selectResult([{ verification_id: 1 }]));
      // Item 2: UPDATE
      mockExecute.mockResolvedValueOnce(updateResult(1));
      // recalculate: SELECT stats, UPDATE record
      mockExecute.mockResolvedValueOnce(selectResult([{ total: 2, verified: 2, missing: 0, extra: 0 }]));
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.bomVerification.batchUpdateItems({
        items: [
          { id: 1, checkStatus: "present", actualQty: 10 },
          { id: 2, checkStatus: "present", actualQty: 5 },
        ],
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("updated");
      expect(result.updated).toBe(2);
    });
  });

  describe("detail", () => {
    it("should return verification detail with items", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, project_id: "PRJ-001", from_process: "T1", to_process: "T2", status: "pending" },
      ]));
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, material_code: "MAT-001", check_status: "present" },
      ]));

      const result = await caller.bomVerification.detail({ verificationId: 1 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("items");
    });
  });

  describe("execute", () => {
    it("should execute BOM verification and return result", async () => {
      // SELECT items
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, check_status: "present", required_qty: 10, actual_qty: 10, is_critical: 0 },
        { id: 2, check_status: "present", required_qty: 5, actual_qty: 5, is_critical: 0 },
      ]));
      // UPDATE verification record status
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.bomVerification.execute({
        verificationId: 1,
        projectId: "PRJ-001",
        fromProcess: "T1",
        toProcess: "T2",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("message");
    });
  });

  describe("waive", () => {
    it("should waive a failed verification", async () => {
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.bomVerification.waive({
        verificationId: 1,
        waivedReason: "紧急生产需要，经主管批准放行",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });
  });

  describe("stats", () => {
    it("should return BOM verification stats", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { total: 10, passed: 7, failed: 2, pending: 1 },
      ]));
      mockExecute.mockResolvedValueOnce(selectResult([
        { process_pair: "T1→T2", count: 5 },
        { process_pair: "T2→T3", count: 5 },
      ]));

      const result = await caller.bomVerification.stats({ projectId: "PRJ-001" });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("byProcess");
    });
  });
});

// ==========================================
// 功能3: 薪酬奖金管理
// ==========================================
describe("salaryBonus", () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe("createRule", () => {
    it("should create a salary calculation rule", async () => {
      mockExecute.mockResolvedValueOnce(insertResult(1));

      const result = await caller.salaryBonus.createRule({
        ruleName: "测试月度奖金规则",
        ruleCode: "TEST_MONTHLY_001",
        description: "测试用月度奖金计算规则",
        efficiencyBaseAmount: 500,
        efficiencyWeight: 0.40,
        qualityBaseAmount: 400,
        qualityWeight: 0.35,
        attendanceBaseAmount: 300,
        attendanceWeight: 0.25,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("id");
      expect(result.id).toBe(1);
    });
  });

  describe("getRules", () => {
    it("should return all rules", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, rule_name: "月度奖金", rule_code: "MONTHLY_001", is_active: 1 },
        { id: 2, rule_name: "季度奖金", rule_code: "QUARTERLY_001", is_active: 0 },
      ]));

      const result = await caller.salaryBonus.getRules({});
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it("should filter active rules only", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, rule_name: "月度奖金", rule_code: "MONTHLY_001", is_active: 1 },
      ]));

      const result = await caller.salaryBonus.getRules({ activeOnly: true });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });
  });

  describe("getRule", () => {
    it("should return a specific rule", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, rule_name: "月度奖金", rule_code: "MONTHLY_001", is_active: 1 },
      ]));

      const result = await caller.salaryBonus.getRule({ ruleId: 1 });
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });
  });

  describe("updateRule", () => {
    it("should update a rule", async () => {
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.salaryBonus.updateRule({
        ruleId: 1,
        ruleName: "更新后的月度奖金规则",
        efficiencyBaseAmount: 600,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });
  });

  describe("calculate", () => {
    it("should calculate salary bonus for a worker", async () => {
      const now = Date.now();
      // 1. SELECT active rule
      mockExecute.mockResolvedValueOnce(selectResult([{
        id: 1, rule_name: "月度奖金", rule_code: "MONTHLY_001",
        efficiency_base_amount: 500, efficiency_threshold: 100, efficiency_max_multiplier: 2,
        efficiency_weight: 0.4, quality_base_amount: 400, quality_threshold: 95, quality_max_multiplier: 1.5,
        quality_weight: 0.35, attendance_base_amount: 300, attendance_threshold: 90, attendance_weight: 0.25,
        rank_top1_bonus: 1000, rank_top3_bonus: 500, rank_top5_bonus: 200,
        defect_penalty_per_count: 50, critical_defect_penalty: 500,
      }]));
      // 2. SELECT worker performance data
      mockExecute.mockResolvedValueOnce(selectResult([{
        efficiency_rate: 110, quality_pass_rate: 98, attendance_rate: 95,
        defect_count: 1, critical_defect_count: 0,
      }]));
      // 3. SELECT rank info
      mockExecute.mockResolvedValueOnce(selectResult([{ performance_rank: 2 }]));
      // 4. INSERT salary bonus record
      mockExecute.mockResolvedValueOnce(insertResult(1));

      const result = await caller.salaryBonus.calculate({
        workerId: "W001",
        workerName: "张三",
        periodType: "monthly",
        periodStart: now - 30 * 24 * 60 * 60 * 1000,
        periodEnd: now,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("id");
    });
  });

  describe("batchCalculate", () => {
    it("should execute batch calculation", async () => {
      const now = Date.now();
      // 1. SELECT all workers
      mockExecute.mockResolvedValueOnce(selectResult([
        { worker_id: "W001", worker_name: "张三" },
        { worker_id: "W002", worker_name: "李四" },
      ]));
      // Worker 1: rule, performance, insert
      mockExecute.mockResolvedValueOnce(selectResult([{ id: 1, rule_name: "月度奖金", efficiency_base_amount: 500, efficiency_threshold: 100, efficiency_max_multiplier: 2, efficiency_weight: 0.4, quality_base_amount: 400, quality_threshold: 95, quality_max_multiplier: 1.5, quality_weight: 0.35, attendance_base_amount: 300, attendance_threshold: 90, attendance_weight: 0.25, rank_top1_bonus: 1000, rank_top3_bonus: 500, rank_top5_bonus: 200, defect_penalty_per_count: 50, critical_defect_penalty: 500 }]));
      mockExecute.mockResolvedValueOnce(selectResult([{ efficiency_score: 110, quality_score: 98, attendance_rate: 95, rank_position: 1, defect_count: 0, critical_defect_count: 0 }]));
      mockExecute.mockResolvedValueOnce(insertResult(1));
      // Worker 2: rule, performance, insert
      mockExecute.mockResolvedValueOnce(selectResult([{ id: 1, rule_name: "月度奖金", efficiency_base_amount: 500, efficiency_threshold: 100, efficiency_max_multiplier: 2, efficiency_weight: 0.4, quality_base_amount: 400, quality_threshold: 95, quality_max_multiplier: 1.5, quality_weight: 0.35, attendance_base_amount: 300, attendance_threshold: 90, attendance_weight: 0.25, rank_top1_bonus: 1000, rank_top3_bonus: 500, rank_top5_bonus: 200, defect_penalty_per_count: 50, critical_defect_penalty: 500 }]));
      mockExecute.mockResolvedValueOnce(selectResult([{ efficiency_score: 90, quality_score: 92, attendance_rate: 88, rank_position: 5, defect_count: 2, critical_defect_count: 0 }]));
      mockExecute.mockResolvedValueOnce(insertResult(2));

      const result = await caller.salaryBonus.batchCalculate({
        periodType: "monthly",
        periodStart: now - 30 * 24 * 60 * 60 * 1000,
        periodEnd: now,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("calculated");
    });
  });

  describe("list", () => {
    it("should list salary bonus records", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, worker_id: "W001", worker_name: "张三", total_bonus: 1200, status: "calculated" },
        { id: 2, worker_id: "W002", worker_name: "李四", total_bonus: 800, status: "calculated" },
      ]));

      const result = await caller.salaryBonus.list({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it("should filter by status", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, worker_id: "W001", status: "reviewed" },
      ]));

      const result = await caller.salaryBonus.list({ status: "reviewed", limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("detail", () => {
    it("should return salary bonus detail", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([{
        id: 1, worker_id: "W001", worker_name: "张三",
        efficiency_bonus: 500, quality_bonus: 400, attendance_bonus: 300,
        rank_bonus: 500, penalty_amount: 50, total_bonus: 1650,
        status: "calculated",
      }]));

      const result = await caller.salaryBonus.detail({ recordId: 1 });
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.worker_name).toBe("张三");
    });
  });

  describe("updateStatus", () => {
    it("should update record status to reviewed", async () => {
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.salaryBonus.updateStatus({ recordId: 1, status: "reviewed" });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    });

    it("should update record status to approved", async () => {
      mockExecute.mockResolvedValueOnce(updateResult(1));

      const result = await caller.salaryBonus.updateStatus({ recordId: 1, status: "approved", notes: "批准发放" });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });
  });

  describe("stats", () => {
    it("should return salary bonus stats", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { total_records: 50, total_amount: 65000, avg_bonus: 1300, max_bonus: 2500, min_bonus: 500 },
      ]));

      const result = await caller.salaryBonus.stats({});
      expect(result).toBeDefined();
      expect(result).toHaveProperty("total_records");
      expect(result.total_records).toBe(50);
    });
  });

  describe("exportCSV", () => {
    it("should export salary bonus records as CSV", async () => {
      mockExecute.mockResolvedValueOnce(selectResult([
        { id: 1, worker_id: "W001", worker_name: "张三", total_bonus: 1650, status: "approved" },
        { id: 2, worker_id: "W002", worker_name: "李四", total_bonus: 800, status: "reviewed" },
      ]));

      const result = await caller.salaryBonus.exportCSV({});
      expect(result).toBeDefined();
      expect(result).toHaveProperty("csv");
      expect(result).toHaveProperty("count");
      expect(typeof result.csv).toBe("string");
      expect(result.csv).toContain("员工ID");
    });
  });
});
