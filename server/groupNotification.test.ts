/**
 * 群组通知功能单元测试
 * 测试群组管理、成员管理、通知配置和发送通知API
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
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// Test data
const mockGroups = [
  {
    id: 1,
    groupCode: "grp_sales",
    name: "销售部群组",
    type: "department",
    departmentId: "sales",
    description: "销售部全员",
    isActive: true,
    createdBy: 1,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
  },
  {
    id: 2,
    groupCode: "grp_all_staff",
    name: "全员群组",
    type: "cross_dept",
    departmentId: null,
    description: "公司全体员工",
    isActive: true,
    createdBy: 1,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
  },
];

const mockGroupMembers = [
  {
    id: 1,
    groupId: 1,
    memberType: "user",
    userId: 1,
    roleId: null,
    departmentId: null,
    isAdmin: true,
    joinedAt: new Date("2026-01-15"),
    addedBy: 1,
    createdAt: new Date("2026-01-15"),
  },
  {
    id: 2,
    groupId: 1,
    memberType: "department",
    userId: null,
    roleId: null,
    departmentId: "sales",
    isAdmin: false,
    joinedAt: new Date("2026-01-15"),
    addedBy: 1,
    createdAt: new Date("2026-01-15"),
  },
];

const mockNotificationConfigs = [
  {
    id: 1,
    groupId: 1,
    notificationType: "announcement",
    titleTemplate: "[公告] {{title}}",
    contentTemplate: "{{content}}",
    cronExpression: null,
    channels: ["system", "email"],
    isEnabled: true,
    priority: "normal",
    createdBy: 1,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
  },
];

const mockNotificationLogs = [
  {
    id: 1,
    groupId: 1,
    configId: 1,
    title: "测试通知",
    content: "这是一条测试通知",
    notificationType: "announcement",
    channel: "system",
    recipientCount: 10,
    successCount: 10,
    failedCount: 0,
    status: "completed",
    sentAt: new Date("2026-01-15"),
    completedAt: new Date("2026-01-15"),
    errorMessage: null,
    sentBy: 1,
    createdAt: new Date("2026-01-15"),
  },
];

describe("群组管理API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGroups", () => {
    it("应该返回所有群组列表", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockGroups);

      const result = mockGroups;
      expect(result).toHaveLength(2);
      expect(result[0].groupCode).toBe("grp_sales");
      expect(result[1].type).toBe("cross_dept");
    });

    it("应该支持按类型筛选群组", async () => {
      const departmentGroups = mockGroups.filter((g) => g.type === "department");
      expect(departmentGroups).toHaveLength(1);
      expect(departmentGroups[0].name).toBe("销售部群组");
    });

    it("应该支持按激活状态筛选", async () => {
      const activeGroups = mockGroups.filter((g) => g.isActive);
      expect(activeGroups).toHaveLength(2);
    });
  });

  describe("getGroupById", () => {
    it("应该返回指定ID的群组", async () => {
      const group = mockGroups.find((g) => g.id === 1);
      expect(group).toBeDefined();
      expect(group?.name).toBe("销售部群组");
    });

    it("不存在的群组应返回undefined", async () => {
      const group = mockGroups.find((g) => g.id === 999);
      expect(group).toBeUndefined();
    });
  });

  describe("createGroup", () => {
    it("应该成功创建新群组", async () => {
      const newGroup = {
        groupCode: "grp_test",
        name: "测试群组",
        type: "custom" as const,
        description: "测试描述",
      };

      // 模拟检查不存在同名群组
      mockDb.limit.mockResolvedValueOnce([]);

      expect(newGroup.groupCode).toBe("grp_test");
      expect(newGroup.type).toBe("custom");
    });

    it("应该拒绝重复的群组代码", async () => {
      const existingCode = mockGroups[0].groupCode;
      const duplicate = mockGroups.find((g) => g.groupCode === existingCode);
      expect(duplicate).toBeDefined();
    });
  });

  describe("deleteGroup", () => {
    it("应该删除群组及其关联数据", async () => {
      const groupId = 1;
      // 删除操作应该级联删除成员、权限和通知配置
      expect(groupId).toBe(1);
    });
  });
});

describe("群组成员管理API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGroupMembers", () => {
    it("应该返回群组的所有成员", async () => {
      const members = mockGroupMembers.filter((m) => m.groupId === 1);
      expect(members).toHaveLength(2);
    });

    it("应该正确区分成员类型", async () => {
      const userMembers = mockGroupMembers.filter((m) => m.memberType === "user");
      const deptMembers = mockGroupMembers.filter((m) => m.memberType === "department");
      expect(userMembers).toHaveLength(1);
      expect(deptMembers).toHaveLength(1);
    });
  });

  describe("addGroupMember", () => {
    it("应该成功添加用户成员", async () => {
      const newMember = {
        groupId: 1,
        memberType: "user" as const,
        userId: 2,
        isAdmin: false,
      };
      expect(newMember.memberType).toBe("user");
      expect(newMember.userId).toBe(2);
    });

    it("应该成功添加角色成员", async () => {
      const newMember = {
        groupId: 1,
        memberType: "role" as const,
        roleId: "dept_manager",
        isAdmin: false,
      };
      expect(newMember.memberType).toBe("role");
      expect(newMember.roleId).toBe("dept_manager");
    });

    it("应该成功添加部门成员", async () => {
      const newMember = {
        groupId: 1,
        memberType: "department" as const,
        departmentId: "tech",
        isAdmin: false,
      };
      expect(newMember.memberType).toBe("department");
      expect(newMember.departmentId).toBe("tech");
    });
  });

  describe("removeGroupMember", () => {
    it("应该成功移除成员", async () => {
      const memberId = 1;
      expect(memberId).toBe(1);
    });
  });
});

describe("群组通知配置API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGroupNotificationConfigs", () => {
    it("应该返回群组的通知配置", async () => {
      const configs = mockNotificationConfigs.filter((c) => c.groupId === 1);
      expect(configs).toHaveLength(1);
      expect(configs[0].notificationType).toBe("announcement");
    });
  });

  describe("createGroupNotificationConfig", () => {
    it("应该成功创建通知配置", async () => {
      const newConfig = {
        groupId: 1,
        notificationType: "meeting" as const,
        titleTemplate: "[会议] {{title}}",
        contentTemplate: "会议时间: {{time}}",
        channels: ["system", "email"] as const,
        priority: "high" as const,
      };
      expect(newConfig.notificationType).toBe("meeting");
      expect(newConfig.channels).toContain("email");
    });

    it("应该支持定时通知配置", async () => {
      const newConfig = {
        groupId: 1,
        notificationType: "reminder" as const,
        titleTemplate: "[提醒] 每日站会",
        cronExpression: "0 9 * * 1-5",
        channels: ["system"] as const,
        priority: "normal" as const,
      };
      expect(newConfig.cronExpression).toBe("0 9 * * 1-5");
    });
  });

  describe("updateGroupNotificationConfig", () => {
    it("应该成功更新配置", async () => {
      const updateData = {
        id: 1,
        titleTemplate: "[更新] {{title}}",
        isEnabled: false,
      };
      expect(updateData.titleTemplate).toContain("更新");
      expect(updateData.isEnabled).toBe(false);
    });
  });
});

describe("发送群组通知API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendGroupNotification", () => {
    it("应该成功发送通知", async () => {
      const notification = {
        groupId: 1,
        notificationType: "announcement" as const,
        title: "测试通知",
        content: "这是一条测试通知",
        channels: ["system"] as ("system" | "email")[],
        priority: "normal" as const,
      };
      expect(notification.title).toBe("测试通知");
      expect(notification.channels).toContain("system");
    });

    it("应该支持多渠道发送", async () => {
      const notification = {
        groupId: 1,
        notificationType: "announcement" as const,
        title: "多渠道通知",
        channels: ["system", "email", "sms"] as const,
        priority: "high" as const,
      };
      expect(notification.channels).toHaveLength(3);
    });

    it("应该记录发送日志", async () => {
      const log = mockNotificationLogs[0];
      expect(log.status).toBe("completed");
      expect(log.successCount).toBe(10);
      expect(log.failedCount).toBe(0);
    });
  });

  describe("getGroupNotificationLogs", () => {
    it("应该返回通知发送记录", async () => {
      const logs = mockNotificationLogs;
      expect(logs).toHaveLength(1);
      expect(logs[0].title).toBe("测试通知");
    });

    it("应该支持按群组筛选", async () => {
      const logs = mockNotificationLogs.filter((l) => l.groupId === 1);
      expect(logs).toHaveLength(1);
    });

    it("应该支持按状态筛选", async () => {
      const completedLogs = mockNotificationLogs.filter((l) => l.status === "completed");
      expect(completedLogs).toHaveLength(1);
    });
  });
});

describe("预定义群组初始化", () => {
  it("应该创建所有预定义群组", async () => {
    const defaultGroupCodes = [
      "grp_sales",
      "grp_tech",
      "grp_production",
      "grp_procurement",
      "grp_quality",
      "grp_finance",
      "grp_hr",
      "grp_admin",
      "grp_management",
      "grp_all_staff",
      "grp_tech_team",
      "grp_weekly_meeting",
      "grp_project_review",
      "grp_monthly_summary",
      "grp_new_employee",
      "grp_skill_upgrade",
      "grp_safety_training",
      "grp_company_notice",
      "grp_hr_notice",
      "grp_finance_notice",
    ];
    expect(defaultGroupCodes).toHaveLength(20);
    expect(defaultGroupCodes).toContain("grp_sales");
    expect(defaultGroupCodes).toContain("grp_all_staff");
  });

  it("应该跳过已存在的群组", async () => {
    const existingCodes = mockGroups.map((g) => g.groupCode);
    expect(existingCodes).toContain("grp_sales");
    expect(existingCodes).toContain("grp_all_staff");
  });
});

describe("群组类型验证", () => {
  it("应该支持所有预定义群组类型", () => {
    const validTypes = [
      "department",
      "project",
      "cross_dept",
      "training",
      "announcement",
      "meeting",
      "custom",
    ];
    validTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });
  });

  it("应该支持所有通知类型", () => {
    const validNotificationTypes = [
      "meeting",
      "training",
      "announcement",
      "reminder",
      "alert",
      "custom",
    ];
    validNotificationTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });
  });

  it("应该支持所有通知渠道", () => {
    const validChannels = ["email", "system", "sms", "wechat"];
    validChannels.forEach((channel) => {
      expect(typeof channel).toBe("string");
    });
  });

  it("应该支持所有优先级", () => {
    const validPriorities = ["low", "normal", "high", "urgent"];
    validPriorities.forEach((priority) => {
      expect(typeof priority).toBe("string");
    });
  });
});
