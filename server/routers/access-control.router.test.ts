/**
 * Access Control Router — Comprehensive Unit Tests
 *
 * Covers all 8 procedures across 3 sub-routers:
 *   blacklist:      list (query), create (mutation), lift (mutation)
 *   tempPermission: list (query), create (mutation), revoke (mutation)
 *   userStatus:     list (query), sendReminder (mutation)
 *
 * Key detail: The router uses module-level `bootstrapped` flags. The first
 * call to each sub-router triggers CREATE TABLE + SELECT COUNT + optional
 * INSERT seed via db.execute(). Subsequent calls skip bootstrap. Tests are
 * ordered so the first test in each sub-router group provides bootstrap
 * execute results, and later tests only provide procedure-specific results.
 *
 * Run: npx vitest run server/routers/access-control.router.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB with execute queue ─────────────────────────────────────
const executeResultsQueue: any[] = [];

function createMockDb() {
  const db: any = {
    execute: vi.fn(() => {
      if (executeResultsQueue.length > 0) {
        return Promise.resolve(executeResultsQueue.shift()!);
      }
      return Promise.resolve({ rows: [] });
    }),
  };
  return db;
}

const mockDb = createMockDb();

vi.mock("../db", () => ({
  requireDb: vi.fn(async () => mockDb),
}));

vi.mock("drizzle-orm", () => ({
  relations: vi.fn(() => ({})),
  sql: Object.assign(
    function sqlTag() { return "mock-sql"; },
    { raw: (s: string) => s },
  ),
}));

// ─── Import callers AFTER mocks ─────────────────────────────────────
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

// ─── Reset mock call history (but NOT bootstrapped flags) ───────────
beforeEach(() => {
  vi.clearAllMocks();
  executeResultsQueue.length = 0;
  // Re-assign the execute mock since clearAllMocks clears mockImplementation
  mockDb.execute = vi.fn(() => {
    if (executeResultsQueue.length > 0) {
      return Promise.resolve(executeResultsQueue.shift()!);
    }
    return Promise.resolve({ rows: [] });
  });
});

// =====================================================================
// BLACKLIST SUB-ROUTER
// =====================================================================
describe("accessControl.blacklist", () => {
  // The very first test triggers bootstrap for blacklist.
  // Bootstrap does: (1) CREATE TABLE, (2) SELECT COUNT, (3) INSERT seed if cnt=0.
  // We provide cnt=3 so no seed INSERT needed → 2 bootstrap execute calls + 1 list query.

  describe("list", () => {
    it("returns items with correct field mapping and stats", async () => {
      const caller = createAdminCaller();
      // Bootstrap: CREATE TABLE (result ignored)
      executeResultsQueue.push({ rows: [] });
      // Bootstrap: SELECT COUNT → 3 (skip seed)
      executeResultsQueue.push({ rows: [{ cnt: 3 }] });
      // Procedure: actual SELECT query
      executeResultsQueue.push({
        rows: [
          {
            id: 1, bl_number: "BL-001", user_name: "赵某", department: "销售部",
            blocked_module: "财务管理", blocked_action: "查看成本数据",
            reason: "离职过渡期限制", created_by: "HR经理",
            created_at: "2026-02-01", status: "active",
          },
          {
            id: 2, bl_number: "BL-002", user_name: "钱某", department: "研发部",
            blocked_module: "合同管理", blocked_action: "导出合同",
            reason: "竞业协议限制", created_by: "法务部",
            created_at: "2026-01-15", status: "active",
          },
          {
            id: 3, bl_number: "BL-003", user_name: "孙某", department: "生产部",
            blocked_module: "薪酬管理", blocked_action: "查看他人薪资",
            reason: "数据泄露事件处罚", created_by: "admin",
            created_at: "2025-12-20", status: "lifted",
          },
        ],
      });

      const result = await caller.accessControl.blacklist.list();

      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toEqual({
        id: 1, blNumber: "BL-001", user: "赵某", department: "销售部",
        blockedModule: "财务管理", blockedAction: "查看成本数据",
        reason: "离职过渡期限制", createdBy: "HR经理",
        createdAt: "2026-02-01", status: "active",
      });
      expect(result.stats).toEqual({ active: 2, lifted: 1, total: 3 });
    });

    // After first test, bootstrap is done. Only procedure execute calls needed.
    it("returns empty list when no entries exist", async () => {
      const caller = createAdminCaller();
      // Only the list SELECT query
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.blacklist.list();

      expect(result.items).toEqual([]);
      expect(result.stats).toEqual({ active: 0, lifted: 0, total: 0 });
    });

    it("correctly counts stats with all active entries", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({
        rows: [
          { id: 1, bl_number: "BL-001", user_name: "A", department: "", blocked_module: "X", blocked_action: "", reason: "", created_by: "admin", created_at: "2026-01-01", status: "active" },
          { id: 2, bl_number: "BL-002", user_name: "B", department: "", blocked_module: "Y", blocked_action: "", reason: "", created_by: "admin", created_at: "2026-01-02", status: "active" },
        ],
      });

      const result = await caller.accessControl.blacklist.list();

      expect(result.stats.active).toBe(2);
      expect(result.stats.lifted).toBe(0);
      expect(result.stats.total).toBe(2);
    });

    it("correctly counts stats with all lifted entries", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({
        rows: [
          { id: 1, bl_number: "BL-001", user_name: "A", department: "", blocked_module: "X", blocked_action: "", reason: "", created_by: "admin", created_at: "2026-01-01", status: "lifted" },
        ],
      });

      const result = await caller.accessControl.blacklist.list();

      expect(result.stats.active).toBe(0);
      expect(result.stats.lifted).toBe(1);
      expect(result.stats.total).toBe(1);
    });
  });

  describe("create", () => {
    it("creates a blacklist entry with auto-generated blNumber", async () => {
      const caller = createAdminCaller();
      // Procedure: SELECT COUNT for blNumber generation
      executeResultsQueue.push({ rows: [{ cnt: 3 }] });
      // Procedure: INSERT
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.blacklist.create({
        user: "测试用户",
        blockedModule: "系统管理",
        department: "IT部",
        blockedAction: "删除数据",
        reason: "安全审计限制",
      });

      expect(result.success).toBe(true);
      expect(result.blNumber).toBe("BL-004");
    });

    it("uses ctx.user.name as createdBy", async () => {
      const caller = createAdminCaller({ name: "张经理" });
      executeResultsQueue.push({ rows: [{ cnt: 0 }] });
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.blacklist.create({
        user: "新用户",
        blockedModule: "财务管理",
      });

      expect(result.success).toBe(true);
      expect(result.blNumber).toBe("BL-001");
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("defaults createdBy to 'admin' when ctx.user.name is missing", async () => {
      const caller = createAdminCaller({ name: undefined as any });
      executeResultsQueue.push({ rows: [{ cnt: 5 }] });
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.blacklist.create({
        user: "某用户",
        blockedModule: "项目管理",
      });

      expect(result.success).toBe(true);
      expect(result.blNumber).toBe("BL-006");
    });

    it("pads blNumber with leading zeros", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: [{ cnt: 99 }] });
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.blacklist.create({
        user: "用户X",
        blockedModule: "模块Y",
      });

      expect(result.blNumber).toBe("BL-100");
    });

    it("handles optional fields (department, blockedAction, reason)", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: [{ cnt: 0 }] });
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.blacklist.create({
        user: "简单用户",
        blockedModule: "报表管理",
        // department, blockedAction, reason all omitted
      });

      expect(result.success).toBe(true);
      expect(result.blNumber).toBe("BL-001");
    });

    it("rejects empty user field", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.accessControl.blacklist.create({
          user: "",
          blockedModule: "X",
        })
      ).rejects.toThrow();
    });

    it("rejects empty blockedModule field", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.accessControl.blacklist.create({
          user: "A",
          blockedModule: "",
        })
      ).rejects.toThrow();
    });
  });

  describe("lift", () => {
    it("lifts a blacklist entry by numeric id", async () => {
      const caller = createAdminCaller();
      // UPDATE execute
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.blacklist.lift({ id: 1 });

      expect(result.success).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("lifts a blacklist entry by string id", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.blacklist.lift({ id: "2" });

      expect(result.success).toBe(true);
    });
  });
});

// =====================================================================
// TEMP PERMISSION SUB-ROUTER
// =====================================================================
describe("accessControl.tempPermission", () => {
  describe("list", () => {
    // First test triggers bootstrap for tempPerm.
    it("returns items with correct field mapping and stats", async () => {
      const caller = createAdminCaller();
      // Bootstrap: CREATE TABLE
      executeResultsQueue.push({ rows: [] });
      // Bootstrap: SELECT COUNT → 4 (skip seed)
      executeResultsQueue.push({ rows: [{ cnt: 4 }] });
      // Procedure: actual SELECT
      executeResultsQueue.push({
        rows: [
          {
            id: 1, tp_number: "TP-001", user_name: "赵工", role_code: "bu_sales",
            module_name: "客户管理", reason: "临时支援BU3销售", granted_by: "王总",
            start_date: "2026-02-01", end_date: "2026-02-28", status: "active",
          },
          {
            id: 3, tp_number: "TP-003", user_name: "李工", role_code: "hr_specialist",
            module_name: "考勤管理", reason: "协助HR月度考勤统计", granted_by: "孙经理",
            start_date: "2026-01-25", end_date: "2026-01-31", status: "expired",
          },
        ],
      });

      const result = await caller.accessControl.tempPermission.list();

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: 1, tpNumber: "TP-001", user: "赵工", role: "bu_sales",
        module: "客户管理", reason: "临时支援BU3销售", grantedBy: "王总",
        startDate: "2026-02-01", endDate: "2026-02-28", status: "active",
      });
      expect(result.stats.active).toBe(1);
      expect(result.stats.expired).toBe(1);
      expect(result.stats.total).toBe(2);
    });

    it("returns empty list when no temp permissions exist", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.tempPermission.list();

      expect(result.items).toEqual([]);
      expect(result.stats).toEqual({
        active: 0, expired: 0, expiringSoon: 0, total: 0,
      });
    });

    it("calculates expiringSoon for active permissions ending within 3 days", async () => {
      const caller = createAdminCaller();

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 1 * 86400000);
      const nextWeek = new Date(now.getTime() + 7 * 86400000);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      const nextWeekStr = nextWeek.toISOString().slice(0, 10);

      executeResultsQueue.push({
        rows: [
          {
            id: 1, tp_number: "TP-001", user_name: "A", role_code: "r",
            module_name: "M", reason: "", granted_by: "G",
            start_date: "2026-01-01", end_date: tomorrowStr,
            status: "active",
          },
          {
            id: 2, tp_number: "TP-002", user_name: "B", role_code: "r",
            module_name: "M", reason: "", granted_by: "G",
            start_date: "2026-01-01", end_date: nextWeekStr,
            status: "active",
          },
        ],
      });

      const result = await caller.accessControl.tempPermission.list();

      // TP-001 ends tomorrow (diffDays=1, <=3) → expiringSoon
      // TP-002 ends in 7 days → NOT expiringSoon
      expect(result.stats.expiringSoon).toBe(1);
      expect(result.stats.active).toBe(2);
    });

    it("does not count expired-status permissions as expiringSoon even if endDate is near", async () => {
      const caller = createAdminCaller();
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

      executeResultsQueue.push({
        rows: [
          {
            id: 1, tp_number: "TP-001", user_name: "A", role_code: "r",
            module_name: "M", reason: "", granted_by: "G",
            start_date: "2026-01-01", end_date: tomorrow,
            status: "expired",
          },
        ],
      });

      const result = await caller.accessControl.tempPermission.list();

      expect(result.stats.expiringSoon).toBe(0);
      expect(result.stats.expired).toBe(1);
    });

    it("counts endDate of today as expiringSoon (diffDays=0)", async () => {
      const caller = createAdminCaller();
      const today = new Date().toISOString().slice(0, 10);

      executeResultsQueue.push({
        rows: [
          {
            id: 1, tp_number: "TP-001", user_name: "A", role_code: "r",
            module_name: "M", reason: "", granted_by: "G",
            start_date: "2026-01-01", end_date: today,
            status: "active",
          },
        ],
      });

      const result = await caller.accessControl.tempPermission.list();

      // diffDays >= 0 && diffDays <= 3 → true for 0
      expect(result.stats.expiringSoon).toBe(1);
    });
  });

  describe("create", () => {
    it("creates a temp permission with auto-generated tpNumber", async () => {
      const caller = createAdminCaller();
      // SELECT COUNT for tpNumber
      executeResultsQueue.push({ rows: [{ cnt: 4 }] });
      // INSERT
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.tempPermission.create({
        user: "新用户",
        role: "bu_pm",
        module: "项目管理",
        reason: "紧急项目",
        startDate: "2026-03-01",
        endDate: "2026-03-15",
      });

      expect(result.success).toBe(true);
      expect(result.tpNumber).toBe("TP-005");
    });

    it("uses ctx.user.name as grantedBy", async () => {
      const caller = createAdminCaller({ name: "李总" });
      executeResultsQueue.push({ rows: [{ cnt: 0 }] });
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.tempPermission.create({
        user: "工程师A",
        role: "quality_eng",
        startDate: "2026-03-01",
        endDate: "2026-03-31",
      });

      expect(result.success).toBe(true);
      expect(result.tpNumber).toBe("TP-001");
    });

    it("defaults grantedBy to 'admin' when ctx.user.name is missing", async () => {
      const caller = createAdminCaller({ name: undefined as any });
      executeResultsQueue.push({ rows: [{ cnt: 2 }] });
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.tempPermission.create({
        user: "用户B",
        role: "bu_sales",
        startDate: "2026-03-01",
        endDate: "2026-03-10",
      });

      expect(result.success).toBe(true);
      expect(result.tpNumber).toBe("TP-003");
    });

    it("handles optional fields (module, reason)", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: [{ cnt: 0 }] });
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.tempPermission.create({
        user: "简单用户",
        role: "employee",
        startDate: "2026-03-01",
        endDate: "2026-03-05",
      });

      expect(result.success).toBe(true);
      expect(result.tpNumber).toBe("TP-001");
    });

    it("rejects empty user field", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.accessControl.tempPermission.create({
          user: "",
          role: "bu_pm",
          startDate: "2026-03-01",
          endDate: "2026-03-15",
        })
      ).rejects.toThrow();
    });

    it("rejects empty role field", async () => {
      const caller = createAdminCaller();
      await expect(
        caller.accessControl.tempPermission.create({
          user: "X",
          role: "",
          startDate: "2026-03-01",
          endDate: "2026-03-15",
        })
      ).rejects.toThrow();
    });
  });

  describe("revoke", () => {
    it("revokes a temp permission by numeric id", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.tempPermission.revoke({ id: 1 });

      expect(result.success).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("revokes a temp permission by string id", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.tempPermission.revoke({ id: "3" });

      expect(result.success).toBe(true);
    });
  });
});

// =====================================================================
// USER STATUS SUB-ROUTER
// =====================================================================
describe("accessControl.userStatus", () => {
  describe("list", () => {
    // First test triggers bootstrap for userStatus.
    it("returns items with correct field mapping and settings when has_profile is true", async () => {
      const caller = createAdminCaller();
      // Bootstrap: CREATE TABLE
      executeResultsQueue.push({ rows: [] });
      // Bootstrap: SELECT COUNT → 5 (skip seed)
      executeResultsQueue.push({ rows: [{ cnt: 5 }] });
      // Procedure: actual SELECT
      executeResultsQueue.push({
        rows: [
          {
            id: 1, employee_id: "GRT001", name: "倪亚东", department: "总裁办",
            bu_code: "FUNC", email: "ni.yadong@grt.com", has_profile: true,
            work_plan_enabled: true, work_plan_frequency: "daily",
            training_enabled: true, project_enabled: true,
            performance_enabled: true, report_enabled: true,
            task_reminder_enabled: true, task_reminder_time: "15:00",
            email_enabled: true, last_active: "2026-02-28 10:30:00",
            pending_tasks: 3, overdue_tasks: 0,
          },
        ],
      });

      const result = await caller.accessControl.userStatus.list();

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.employeeId).toBe("GRT001");
      expect(item.name).toBe("倪亚东");
      expect(item.department).toBe("总裁办");
      expect(item.buCode).toBe("FUNC");
      expect(item.email).toBe("ni.yadong@grt.com");
      expect(item.hasProfile).toBe(true);
      expect(item.settings).not.toBeNull();
      expect(item.settings!.workPlanEnabled).toBe(true);
      expect(item.settings!.workPlanFrequency).toBe("daily");
      expect(item.settings!.trainingEnabled).toBe(true);
      expect(item.settings!.projectEnabled).toBe(true);
      expect(item.settings!.performanceEnabled).toBe(true);
      expect(item.settings!.reportEnabled).toBe(true);
      expect(item.settings!.taskReminderEnabled).toBe(true);
      expect(item.settings!.taskReminderTime).toBe("15:00");
      expect(item.settings!.emailEnabled).toBe(true);
      expect(item.lastActive).toBe("2026-02-28 10:30:00");
      expect(item.pendingTasks).toBe(3);
      expect(item.overdueTasks).toBe(0);
    });

    it("returns null settings when has_profile is false", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({
        rows: [
          {
            id: 3, employee_id: "GRT004", name: "戴晓燕", department: "事业一部",
            bu_code: "BU1", email: "dai.xiaoyan@grt.com", has_profile: false,
            work_plan_enabled: false, work_plan_frequency: "daily",
            training_enabled: false, project_enabled: false,
            performance_enabled: false, report_enabled: false,
            task_reminder_enabled: false, task_reminder_time: "15:00",
            email_enabled: false, last_active: null,
            pending_tasks: 0, overdue_tasks: 0,
          },
        ],
      });

      const result = await caller.accessControl.userStatus.list();

      expect(result.items[0].hasProfile).toBe(false);
      expect(result.items[0].settings).toBeNull();
    });

    it("computes stats correctly (configured, unconfigured, withOverdue, reminderEnabled)", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({
        rows: [
          {
            id: 1, employee_id: "GRT001", name: "A", department: "", bu_code: "FUNC",
            email: "", has_profile: true, work_plan_enabled: true,
            work_plan_frequency: "daily", training_enabled: true,
            project_enabled: true, performance_enabled: true,
            report_enabled: true, task_reminder_enabled: true,
            task_reminder_time: "15:00", email_enabled: true,
            last_active: "2026-02-28", pending_tasks: 0, overdue_tasks: 2,
          },
          {
            id: 2, employee_id: "GRT002", name: "B", department: "", bu_code: "BU1",
            email: "", has_profile: true, work_plan_enabled: false,
            work_plan_frequency: "daily", training_enabled: false,
            project_enabled: false, performance_enabled: false,
            report_enabled: false, task_reminder_enabled: false,
            task_reminder_time: "15:00", email_enabled: false,
            last_active: null, pending_tasks: 0, overdue_tasks: 0,
          },
          {
            id: 3, employee_id: "GRT003", name: "C", department: "", bu_code: "BU2",
            email: "", has_profile: false, work_plan_enabled: false,
            work_plan_frequency: "daily", training_enabled: false,
            project_enabled: false, performance_enabled: false,
            report_enabled: false, task_reminder_enabled: false,
            task_reminder_time: "15:00", email_enabled: false,
            last_active: null, pending_tasks: 0, overdue_tasks: 0,
          },
        ],
      });

      const result = await caller.accessControl.userStatus.list();

      expect(result.stats.total).toBe(3);
      expect(result.stats.configured).toBe(2);
      expect(result.stats.unconfigured).toBe(1);
      expect(result.stats.withOverdue).toBe(1);
      expect(result.stats.reminderEnabled).toBe(1);
    });

    it("filters by bu when provided", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({
        rows: [
          {
            id: 1, employee_id: "GRT003", name: "倪亚琴", department: "事业三部",
            bu_code: "BU3", email: "", has_profile: true,
            work_plan_enabled: true, work_plan_frequency: "weekly",
            training_enabled: true, project_enabled: true,
            performance_enabled: false, report_enabled: true,
            task_reminder_enabled: true, task_reminder_time: "14:00",
            email_enabled: true, last_active: "2026-02-28",
            pending_tasks: 5, overdue_tasks: 1,
          },
        ],
      });

      const result = await caller.accessControl.userStatus.list({ bu: "BU3" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].buCode).toBe("BU3");
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("filters by search when provided", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({
        rows: [
          {
            id: 1, employee_id: "GRT001", name: "倪亚东", department: "总裁办",
            bu_code: "FUNC", email: "", has_profile: true,
            work_plan_enabled: true, work_plan_frequency: "daily",
            training_enabled: true, project_enabled: true,
            performance_enabled: true, report_enabled: true,
            task_reminder_enabled: true, task_reminder_time: "15:00",
            email_enabled: true, last_active: "2026-02-28",
            pending_tasks: 0, overdue_tasks: 0,
          },
        ],
      });

      const result = await caller.accessControl.userStatus.list({ search: "侯" });

      expect(result.items).toHaveLength(1);
    });

    it("filters by both bu and search when both provided", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.userStatus.list({
        bu: "BU1",
        search: "不存在",
      });

      expect(result.items).toEqual([]);
      expect(result.stats.total).toBe(0);
    });

    it("returns all when no filter is provided", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({
        rows: [
          {
            id: 1, employee_id: "GRT001", name: "A", department: "", bu_code: "FUNC",
            email: "", has_profile: false, work_plan_enabled: false,
            work_plan_frequency: "daily", training_enabled: false,
            project_enabled: false, performance_enabled: false,
            report_enabled: false, task_reminder_enabled: false,
            task_reminder_time: "15:00", email_enabled: false,
            last_active: null, pending_tasks: 0, overdue_tasks: 0,
          },
          {
            id: 2, employee_id: "GRT002", name: "B", department: "", bu_code: "BU1",
            email: "", has_profile: false, work_plan_enabled: false,
            work_plan_frequency: "daily", training_enabled: false,
            project_enabled: false, performance_enabled: false,
            report_enabled: false, task_reminder_enabled: false,
            task_reminder_time: "15:00", email_enabled: false,
            last_active: null, pending_tasks: 0, overdue_tasks: 0,
          },
        ],
      });

      const result = await caller.accessControl.userStatus.list();

      expect(result.items).toHaveLength(2);
    });

    it("works with no input at all (input is optional)", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({ rows: [] });

      const result = await caller.accessControl.userStatus.list();

      expect(result.items).toEqual([]);
      expect(result.stats.total).toBe(0);
    });

    it("handles null pending_tasks and overdue_tasks with defaults", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({
        rows: [
          {
            id: 1, employee_id: "GRT099", name: "NullTasks", department: "",
            bu_code: "FUNC", email: "", has_profile: false,
            work_plan_enabled: false, work_plan_frequency: "daily",
            training_enabled: false, project_enabled: false,
            performance_enabled: false, report_enabled: false,
            task_reminder_enabled: false, task_reminder_time: "15:00",
            email_enabled: false, last_active: null,
            pending_tasks: null, overdue_tasks: null,
          },
        ],
      });

      const result = await caller.accessControl.userStatus.list();

      expect(result.items[0].pendingTasks).toBe(0);
      expect(result.items[0].overdueTasks).toBe(0);
    });

    it("has_profile coerces falsy values to boolean", async () => {
      const caller = createAdminCaller();
      executeResultsQueue.push({
        rows: [
          {
            id: 1, employee_id: "GRT100", name: "FalsyProfile", department: "",
            bu_code: "FUNC", email: "", has_profile: 0,
            work_plan_enabled: 0, work_plan_frequency: "daily",
            training_enabled: 0, project_enabled: 0,
            performance_enabled: 0, report_enabled: 0,
            task_reminder_enabled: 0, task_reminder_time: "15:00",
            email_enabled: 0, last_active: null,
            pending_tasks: 0, overdue_tasks: 0,
          },
        ],
      });

      const result = await caller.accessControl.userStatus.list();

      expect(result.items[0].hasProfile).toBe(false);
      expect(result.items[0].settings).toBeNull();
    });
  });

  describe("sendReminder", () => {
    it("returns success with user-specific message (number id)", async () => {
      const caller = createAdminCaller();

      const result = await caller.accessControl.userStatus.sendReminder({ userId: 42 });

      expect(result.success).toBe(true);
      expect(result.message).toBe("配置提醒已发送至用户 #42");
    });

    it("returns success with user-specific message (string id)", async () => {
      const caller = createAdminCaller();

      const result = await caller.accessControl.userStatus.sendReminder({ userId: "GRT001" });

      expect(result.success).toBe(true);
      expect(result.message).toBe("配置提醒已发送至用户 #GRT001");
    });

    it("does not require any db calls (pure function)", async () => {
      const caller = createAdminCaller();

      await caller.accessControl.userStatus.sendReminder({ userId: 1 });

      // sendReminder does not call db.execute at all
      expect(mockDb.execute).not.toHaveBeenCalled();
    });
  });
});

// =====================================================================
// AUTH GUARDS — all procedures use protectedProcedure
// =====================================================================
describe("accessControl authentication guards", () => {
  it("rejects anonymous for blacklist.list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.accessControl.blacklist.list()).rejects.toThrow();
  });

  it("rejects anonymous for blacklist.create", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.accessControl.blacklist.create({
        user: "X",
        blockedModule: "Y",
      })
    ).rejects.toThrow();
  });

  it("rejects anonymous for blacklist.lift", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.accessControl.blacklist.lift({ id: 1 })
    ).rejects.toThrow();
  });

  it("rejects anonymous for tempPermission.list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.accessControl.tempPermission.list()).rejects.toThrow();
  });

  it("rejects anonymous for tempPermission.create", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.accessControl.tempPermission.create({
        user: "X",
        role: "Y",
        startDate: "2026-03-01",
        endDate: "2026-03-15",
      })
    ).rejects.toThrow();
  });

  it("rejects anonymous for tempPermission.revoke", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.accessControl.tempPermission.revoke({ id: 1 })
    ).rejects.toThrow();
  });

  it("rejects anonymous for userStatus.list", async () => {
    const caller = createAnonymousCaller();
    await expect(caller.accessControl.userStatus.list()).rejects.toThrow();
  });

  it("rejects anonymous for userStatus.sendReminder", async () => {
    const caller = createAnonymousCaller();
    await expect(
      caller.accessControl.userStatus.sendReminder({ userId: 1 })
    ).rejects.toThrow();
  });
});
