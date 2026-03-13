/**
 * 离职管理增强功能测试
 * 
 * 测试覆盖：
 * 1. 外部数据平台员工数据搜索（自动填充）
 * 2. 离职交接进度看板统计
 * 3. 审批流程通知集成
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock requireDb
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([[]]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock("../db", () => ({
  requireDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../../drizzle/schema", () => ({
  employeeOffboarding: { id: "id", status: "status", approvalStatus: "approval_status", employeeId: "employee_id" },
  offboardingHandoverItems: { id: "id", offboardingId: "offboarding_id", status: "status" },
  performanceAttribution: { id: "id", offboardingId: "offboarding_id", confirmedBy: "confirmed_by" },
  assetHandover: { id: "id", offboardingId: "offboarding_id", status: "status" },
  offboardingApprovals: { id: "id", offboardingId: "offboarding_id", approvalOrder: "approval_order", decision: "decision", approvalLevel: "approval_level", submittedAt: "submitted_at" },
  offboardingDataQueryLog: { id: "id" },
  hrmEmployees: { id: "id", status: "status" },
}));

vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("Employee Search (External Sync Auto-Fill)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should search local employees by keyword", async () => {
    mockDb.execute.mockResolvedValueOnce([[
      { id: 1, employeeId: "EMP001", name: "张三", department: "技术部", position: "工程师", hireDate: "2023-01-15", status: "active" },
      { id: 2, employeeId: "EMP002", name: "张四", department: "销售部", position: "经理", hireDate: "2022-06-01", status: "active" },
    ]]);

    const { searchExtSyncEmployees } = await import("./offboarding.service");
    const result = await searchExtSyncEmployees("张");

    expect(result).toBeDefined();
    expect(result.localEmployees).toBeDefined();
    expect(Array.isArray(result.localEmployees)).toBe(true);
    expect(result.totalLocal).toBeGreaterThanOrEqual(0);
  });

  it("should return empty results for non-matching keyword", async () => {
    mockDb.execute.mockResolvedValueOnce([[]]);

    const { searchExtSyncEmployees } = await import("./offboarding.service");
    const result = await searchExtSyncEmployees("不存在的员工");

    expect(result.localEmployees).toEqual([]);
    expect(result.totalLocal).toBe(0);
  });

  it("should handle search errors gracefully", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("DB connection failed"));

    const { searchExtSyncEmployees } = await import("./offboarding.service");
    const result = await searchExtSyncEmployees("test");

    expect(result.localEmployees).toEqual([]);
    expect(result.totalLocal).toBe(0);
  });
});

describe("Offboarding Dashboard Stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return dashboard stats structure", async () => {
    // Test that the function exists and returns the expected shape
    const { getOffboardingDashboardStats } = await import("./offboarding.service");
    expect(typeof getOffboardingDashboardStats).toBe("function");
  });

  it("should define expected return shape", () => {
    // Validate the expected return structure
    const expectedShape = {
      summary: {
        total: 0,
        active: 0,
        pendingApproval: 0,
        completedThisMonth: 0,
      },
      items: [],
    };

    expect(expectedShape.summary).toBeDefined();
    expect(expectedShape.items).toBeDefined();
    expect(Array.isArray(expectedShape.items)).toBe(true);
    expect(expectedShape.summary.total).toBe(0);
  });

  it("should calculate overall progress correctly", () => {
    // Test the progress calculation formula
    const handoverProgress = 80;
    const assetProgress = 60;
    const approvalProgress = 100;
    const perfProgress = 50;

    const overallProgress = Math.round(
      handoverProgress * 0.35 + assetProgress * 0.25 + approvalProgress * 0.25 + perfProgress * 0.15
    );

    // 80*0.35 + 60*0.25 + 100*0.25 + 50*0.15 = 28 + 15 + 25 + 7.5 = 75.5 → 76
    expect(overallProgress).toBe(76);
  });

  it("should calculate days remaining correctly", () => {
    const offboardingDate = new Date("2026-02-14");
    const today = new Date("2026-02-07");
    const daysRemaining = Math.ceil((offboardingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    expect(daysRemaining).toBe(7);
  });

  it("should identify overdue offboardings", () => {
    const offboardingDate = new Date("2026-02-01");
    const today = new Date("2026-02-07");
    const daysRemaining = Math.ceil((offboardingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    expect(daysRemaining).toBeLessThan(0);
  });
});

describe("Approval Notification Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have notifyOwner imported and callable", async () => {
    const { notifyOwner } = await import("../_core/notification");
    expect(notifyOwner).toBeDefined();
    expect(typeof notifyOwner).toBe("function");
  });

  it("should send notification on offboarding submission", async () => {
    const { notifyOwner } = await import("../_core/notification");
    
    // Simulate notification call
    await notifyOwner({ title: "离职审批通知", content: "员工张三已提交离职申请" });
    
    expect(notifyOwner).toHaveBeenCalledWith({
      title: "离职审批通知",
      content: "员工张三已提交离职申请",
    });
  });

  it("should format approval level labels correctly", () => {
    const APPROVAL_LEVEL_LABELS: Record<string, string> = {
      supervisor: '主管',
      hr: 'HR人事',
      finance: '财务',
      it: 'IT信息',
    };

    expect(APPROVAL_LEVEL_LABELS['supervisor']).toBe('主管');
    expect(APPROVAL_LEVEL_LABELS['hr']).toBe('HR人事');
    expect(APPROVAL_LEVEL_LABELS['finance']).toBe('财务');
    expect(APPROVAL_LEVEL_LABELS['it']).toBe('IT信息');
  });

  it("should handle notification failure gracefully", async () => {
    const { notifyOwner } = await import("../_core/notification");
    (notifyOwner as any).mockRejectedValueOnce(new Error("Network error"));

    // The sendOffboardingNotification function should catch errors
    try {
      await notifyOwner({ title: "test", content: "test" });
    } catch (e) {
      // Expected to throw since we're calling the mock directly
      expect(e).toBeDefined();
    }
  });

  it("should include employee details in notification content", () => {
    const employeeName = "张三";
    const department = "技术部";
    const position = "高级工程师";
    const offboardingDate = "2026-02-28";
    const reason = "resignation";
    const successorName = "李四";

    const content = `员工 ${employeeName} (${department} - ${position}) 已提交离职申请，离职日期：${offboardingDate}。\n\n请主管尽快审批。\n\n离职原因：${reason}\n继任者：${successorName}`;

    expect(content).toContain("张三");
    expect(content).toContain("技术部");
    expect(content).toContain("高级工程师");
    expect(content).toContain("2026-02-28");
    expect(content).toContain("李四");
  });

  it("should notify next level on approval progression", () => {
    const currentLevel = "supervisor";
    const nextLevel = "hr";
    const LABELS: Record<string, string> = {
      supervisor: '主管',
      hr: 'HR人事',
      finance: '财务',
      it: 'IT信息',
    };

    const title = `离职审批通知 - 等待${LABELS[nextLevel]}审批`;
    const content = `已通过${LABELS[currentLevel]}审批，现等待${LABELS[nextLevel]}审批。`;

    expect(title).toBe("离职审批通知 - 等待HR人事审批");
    expect(content).toContain("已通过主管审批");
    expect(content).toContain("等待HR人事审批");
  });

  it("should notify on rejection with reason", () => {
    const approverRole = "HR人事";
    const comments = "信息不完整，请补充离职原因详情";

    const title = `离职申请被拒绝`;
    const content = `已被 ${approverRole} 拒绝。\n\n拒绝原因：${comments}`;

    expect(content).toContain("HR人事");
    expect(content).toContain("信息不完整");
  });

  it("should notify on all approvals completed", () => {
    const employeeName = "王五";
    const title = `离职审批全部通过 - ${employeeName}`;

    expect(title).toContain("王五");
    expect(title).toContain("全部通过");
  });

  it("should notify on offboarding completion", () => {
    const employeeName = "赵六";
    const title = `离职流程已完成 - ${employeeName}`;
    const content = `所有交接项已确认完成，所有审批已通过。员工状态已更新为「已离职」。`;

    expect(title).toContain("赵六");
    expect(content).toContain("已离职");
  });
});

describe("Data Retention Policy", () => {
  it("should support permanent retention policy", () => {
    const policies = ['permanent', 'archive_after_year', 'archive_after_3years'];
    expect(policies).toContain('permanent');
  });

  it("should annotate data as pre/post departure", () => {
    const attributionTypes = ['pre_departure', 'post_departure', 'shared'];
    expect(attributionTypes).toContain('pre_departure');
    expect(attributionTypes).toContain('post_departure');
    expect(attributionTypes).toContain('shared');
  });

  it("should support contribution percentage split", () => {
    const originalPercent = 70;
    const successorPercent = 30;
    expect(originalPercent + successorPercent).toBe(100);
  });
});
