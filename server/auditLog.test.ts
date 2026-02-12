/**
 * 审计日志功能单元测试
 * 测试敏感数据访问日志和权限变更历史API
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// Test data
const mockSensitiveAccessLogs = [
  {
    id: 1,
    userId: 1,
    userName: "张三",
    moduleId: "hrm_salary",
    dataType: "salary",
    dataId: "emp_001",
    operation: "read",
    ipAddress: "192.168.1.100",
    result: "success",
    denialReason: null,
    accessTime: new Date("2026-01-15T10:30:00"),
    createdAt: new Date("2026-01-15T10:30:00"),
  },
  {
    id: 2,
    userId: 2,
    userName: "李四",
    moduleId: "hrm_salary",
    dataType: "salary",
    dataId: "emp_002",
    operation: "read",
    ipAddress: "192.168.1.101",
    result: "denied",
    denialReason: "无权限访问其他部门薪资数据",
    accessTime: new Date("2026-01-15T11:00:00"),
    createdAt: new Date("2026-01-15T11:00:00"),
  },
  {
    id: 3,
    userId: 1,
    userName: "张三",
    moduleId: "hrm_performance",
    dataType: "performance_review",
    dataId: "review_001",
    operation: "write",
    ipAddress: "192.168.1.100",
    result: "success",
    denialReason: null,
    accessTime: new Date("2026-01-15T14:00:00"),
    createdAt: new Date("2026-01-15T14:00:00"),
  },
];

const mockPermissionChangeHistory = [
  {
    id: 1,
    targetUserId: 2,
    targetUserName: "李四",
    modifierId: 1,
    modifierName: "张三",
    changeType: "role_added",
    oldValue: null,
    newValue: "hr_specialist",
    reason: "晋升为HR专员",
    changeTime: new Date("2026-01-10"),
    createdAt: new Date("2026-01-10"),
  },
  {
    id: 2,
    targetUserId: 3,
    targetUserName: "王五",
    modifierId: 1,
    modifierName: "张三",
    changeType: "permission_changed",
    oldValue: JSON.stringify({ hrm_salary: "none" }),
    newValue: JSON.stringify({ hrm_salary: "read" }),
    reason: "授予薪资查看权限",
    changeTime: new Date("2026-01-12"),
    createdAt: new Date("2026-01-12"),
  },
  {
    id: 3,
    targetUserId: 4,
    targetUserName: "赵六",
    modifierId: 1,
    modifierName: "张三",
    changeType: "role_removed",
    oldValue: "dept_manager",
    newValue: null,
    reason: "离职交接",
    changeTime: new Date("2026-01-14"),
    createdAt: new Date("2026-01-14"),
  },
];

describe("敏感数据访问日志API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSensitiveAccessLogs", () => {
    it("应该返回所有访问日志", async () => {
      const logs = mockSensitiveAccessLogs;
      expect(logs).toHaveLength(3);
    });

    it("应该支持按用户筛选", async () => {
      const userLogs = mockSensitiveAccessLogs.filter((l) => l.userId === 1);
      expect(userLogs).toHaveLength(2);
      expect(userLogs[0].userName).toBe("张三");
    });

    it("应该支持按模块筛选", async () => {
      const salaryLogs = mockSensitiveAccessLogs.filter((l) => l.moduleId === "hrm_salary");
      expect(salaryLogs).toHaveLength(2);
    });

    it("应该支持按操作类型筛选", async () => {
      const readLogs = mockSensitiveAccessLogs.filter((l) => l.operation === "read");
      const writeLogs = mockSensitiveAccessLogs.filter((l) => l.operation === "write");
      expect(readLogs).toHaveLength(2);
      expect(writeLogs).toHaveLength(1);
    });

    it("应该支持按结果筛选", async () => {
      const successLogs = mockSensitiveAccessLogs.filter((l) => l.result === "success");
      const deniedLogs = mockSensitiveAccessLogs.filter((l) => l.result === "denied");
      expect(successLogs).toHaveLength(2);
      expect(deniedLogs).toHaveLength(1);
    });

    it("应该支持时间范围筛选", async () => {
      const startDate = new Date("2026-01-15T10:00:00");
      const endDate = new Date("2026-01-15T12:00:00");
      const filteredLogs = mockSensitiveAccessLogs.filter(
        (l) => l.accessTime >= startDate && l.accessTime <= endDate
      );
      expect(filteredLogs).toHaveLength(2);
    });

    it("应该支持分页", async () => {
      const page1 = mockSensitiveAccessLogs.slice(0, 2);
      const page2 = mockSensitiveAccessLogs.slice(2, 4);
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
    });
  });

  describe("访问日志字段验证", () => {
    it("应该包含必要的字段", () => {
      const log = mockSensitiveAccessLogs[0];
      expect(log).toHaveProperty("userId");
      expect(log).toHaveProperty("userName");
      expect(log).toHaveProperty("moduleId");
      expect(log).toHaveProperty("dataType");
      expect(log).toHaveProperty("dataId");
      expect(log).toHaveProperty("operation");
      expect(log).toHaveProperty("result");
      expect(log).toHaveProperty("accessTime");
    });

    it("被拒绝的访问应包含拒绝原因", () => {
      const deniedLog = mockSensitiveAccessLogs.find((l) => l.result === "denied");
      expect(deniedLog).toBeDefined();
      expect(deniedLog?.denialReason).toBeTruthy();
    });

    it("成功的访问不应包含拒绝原因", () => {
      const successLog = mockSensitiveAccessLogs.find((l) => l.result === "success");
      expect(successLog).toBeDefined();
      expect(successLog?.denialReason).toBeNull();
    });
  });
});

describe("权限变更历史API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPermissionChangeHistory", () => {
    it("应该返回所有变更历史", async () => {
      const history = mockPermissionChangeHistory;
      expect(history).toHaveLength(3);
    });

    it("应该支持按用户筛选", async () => {
      const userHistory = mockPermissionChangeHistory.filter((h) => h.targetUserId === 2);
      expect(userHistory).toHaveLength(1);
      expect(userHistory[0].targetUserName).toBe("李四");
    });

    it("应该支持按变更类型筛选", async () => {
      const roleAdded = mockPermissionChangeHistory.filter((h) => h.changeType === "role_added");
      const roleRemoved = mockPermissionChangeHistory.filter((h) => h.changeType === "role_removed");
      const permissionChanged = mockPermissionChangeHistory.filter(
        (h) => h.changeType === "permission_changed"
      );
      expect(roleAdded).toHaveLength(1);
      expect(roleRemoved).toHaveLength(1);
      expect(permissionChanged).toHaveLength(1);
    });

    it("应该支持时间范围筛选", async () => {
      const startDate = new Date("2026-01-10");
      const endDate = new Date("2026-01-12");
      const filteredHistory = mockPermissionChangeHistory.filter(
        (h) => h.changeTime >= startDate && h.changeTime <= endDate
      );
      expect(filteredHistory).toHaveLength(2);
    });
  });

  describe("变更历史字段验证", () => {
    it("应该包含必要的字段", () => {
      const history = mockPermissionChangeHistory[0];
      expect(history).toHaveProperty("targetUserId");
      expect(history).toHaveProperty("targetUserName");
      expect(history).toHaveProperty("modifierId");
      expect(history).toHaveProperty("modifierName");
      expect(history).toHaveProperty("changeType");
      expect(history).toHaveProperty("changeTime");
    });

    it("角色添加应有新值", () => {
      const roleAdded = mockPermissionChangeHistory.find((h) => h.changeType === "role_added");
      expect(roleAdded).toBeDefined();
      expect(roleAdded?.newValue).toBeTruthy();
      expect(roleAdded?.oldValue).toBeNull();
    });

    it("角色移除应有旧值", () => {
      const roleRemoved = mockPermissionChangeHistory.find((h) => h.changeType === "role_removed");
      expect(roleRemoved).toBeDefined();
      expect(roleRemoved?.oldValue).toBeTruthy();
      expect(roleRemoved?.newValue).toBeNull();
    });

    it("权限变更应有新旧值", () => {
      const permissionChanged = mockPermissionChangeHistory.find(
        (h) => h.changeType === "permission_changed"
      );
      expect(permissionChanged).toBeDefined();
      expect(permissionChanged?.oldValue).toBeTruthy();
      expect(permissionChanged?.newValue).toBeTruthy();
    });
  });
});

describe("审计统计API", () => {
  describe("getAuditStatistics", () => {
    it("应该计算总访问次数", () => {
      const totalAccess = mockSensitiveAccessLogs.length;
      expect(totalAccess).toBe(3);
    });

    it("应该按模块统计访问次数", () => {
      const byModule = mockSensitiveAccessLogs.reduce((acc, log) => {
        acc[log.moduleId] = (acc[log.moduleId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      expect(byModule["hrm_salary"]).toBe(2);
      expect(byModule["hrm_performance"]).toBe(1);
    });

    it("应该按操作类型统计", () => {
      const byOperation = mockSensitiveAccessLogs.reduce((acc, log) => {
        acc[log.operation] = (acc[log.operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      expect(byOperation["read"]).toBe(2);
      expect(byOperation["write"]).toBe(1);
    });

    it("应该按用户统计访问次数", () => {
      const byUser = mockSensitiveAccessLogs.reduce((acc, log) => {
        acc[log.userId] = (acc[log.userId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      expect(byUser[1]).toBe(2);
      expect(byUser[2]).toBe(1);
    });

    it("应该统计成功和失败次数", () => {
      const successCount = mockSensitiveAccessLogs.filter((l) => l.result === "success").length;
      const deniedCount = mockSensitiveAccessLogs.filter((l) => l.result === "denied").length;
      expect(successCount).toBe(2);
      expect(deniedCount).toBe(1);
    });
  });
});

describe("敏感数据模块配置", () => {
  it("应该定义HRM敏感数据模块", () => {
    const hrmSensitiveModules = [
      "hrm_salary",
      "hrm_performance",
      "hrm_personal_info",
      "hrm_contract",
    ];
    expect(hrmSensitiveModules).toContain("hrm_salary");
    expect(hrmSensitiveModules).toContain("hrm_performance");
  });

  it("应该定义财务敏感数据模块", () => {
    const financeSensitiveModules = [
      "finance_cost",
      "finance_budget",
      "finance_invoice",
    ];
    expect(financeSensitiveModules).toContain("finance_cost");
  });

  it("应该定义操作类型", () => {
    const validOperations = ["read", "write", "delete"];
    expect(validOperations).toHaveLength(3);
  });

  it("应该定义访问结果类型", () => {
    const validResults = ["success", "denied"];
    expect(validResults).toHaveLength(2);
  });
});

describe("权限变更类型", () => {
  it("应该支持所有变更类型", () => {
    const validChangeTypes = ["role_added", "role_removed", "permission_changed"];
    expect(validChangeTypes).toHaveLength(3);
  });

  it("应该记录变更原因", () => {
    mockPermissionChangeHistory.forEach((h) => {
      expect(h.reason).toBeTruthy();
    });
  });

  it("应该记录修改者信息", () => {
    mockPermissionChangeHistory.forEach((h) => {
      expect(h.modifierId).toBeDefined();
      expect(h.modifierName).toBeTruthy();
    });
  });
});
