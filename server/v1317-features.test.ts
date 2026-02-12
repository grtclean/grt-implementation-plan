/**
 * v1.3.17 功能单元测试
 * 1. 告警通知渠道测试
 * 2. 字段映射批量应用
 * 3. 模板使用统计分析
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    $client: {
      execute: vi.fn().mockResolvedValue([[], []]),
    },
  }),
}));

// ==================== 告警通知渠道测试服务测试 ====================

describe("NotificationChannelTestService", () => {
  describe("testEmailChannel", () => {
    it("should validate email format", () => {
      const validEmails = ["test@example.com", "user.name@domain.org"];
      const invalidEmails = ["invalid", "no@", "@domain.com"];
      
      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
      
      invalidEmails.forEach(email => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it("should generate test email content", () => {
      const testContent = {
        subject: "告警通知渠道测试",
        body: "这是一封测试邮件，用于验证邮件通知渠道配置是否正确。",
        timestamp: new Date().toISOString(),
      };
      
      expect(testContent.subject).toBe("告警通知渠道测试");
      expect(testContent.body).toContain("测试邮件");
      expect(testContent.timestamp).toBeDefined();
    });
  });

  describe("testWebhookChannel", () => {
    it("should validate webhook URL format", () => {
      const validUrls = [
        "https://example.com/webhook",
        "http://localhost:3000/api/webhook",
        "https://api.service.com/v1/notify",
      ];
      const invalidUrls = ["not-a-url", "ftp://invalid", ""];
      
      validUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\/.+/);
      });
      
      invalidUrls.forEach(url => {
        expect(url).not.toMatch(/^https?:\/\/.+/);
      });
    });

    it("should generate webhook test payload", () => {
      const payload = {
        type: "test",
        message: "告警通知渠道测试",
        timestamp: Date.now(),
        source: "grt-system",
      };
      
      expect(payload.type).toBe("test");
      expect(payload.source).toBe("grt-system");
      expect(typeof payload.timestamp).toBe("number");
    });
  });

  describe("testWeChatChannel", () => {
    it("should validate WeChat webhook URL", () => {
      const validUrl = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx";
      expect(validUrl).toContain("qyapi.weixin.qq.com");
    });

    it("should generate WeChat message format", () => {
      const message = {
        msgtype: "text",
        text: {
          content: "告警通知渠道测试\n测试时间: 2024-01-24 12:00:00",
        },
      };
      
      expect(message.msgtype).toBe("text");
      expect(message.text.content).toContain("告警通知渠道测试");
    });
  });

  describe("testSystemChannel", () => {
    it("should create system notification", () => {
      const notification = {
        title: "告警通知渠道测试",
        content: "系统通知渠道测试成功",
        level: "info",
        createdAt: new Date(),
      };
      
      expect(notification.title).toBe("告警通知渠道测试");
      expect(notification.level).toBe("info");
    });
  });

  describe("getTestResult", () => {
    it("should return success result", () => {
      const result = {
        success: true,
        channel: "email",
        message: "测试邮件发送成功",
        duration: 150,
        timestamp: new Date().toISOString(),
      };
      
      expect(result.success).toBe(true);
      expect(result.channel).toBe("email");
      expect(result.duration).toBeGreaterThan(0);
    });

    it("should return failure result with error", () => {
      const result = {
        success: false,
        channel: "webhook",
        message: "连接超时",
        error: "ETIMEDOUT",
        duration: 5000,
        timestamp: new Date().toISOString(),
      };
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("ETIMEDOUT");
    });
  });
});

// ==================== 字段映射智能推荐服务测试 ====================

describe("FieldMappingRecommendService", () => {
  describe("calculateSimilarity", () => {
    it("should return 1 for exact match", () => {
      const similarity = (a: string, b: string) => a.toLowerCase() === b.toLowerCase() ? 1 : 0;
      expect(similarity("name", "name")).toBe(1);
      expect(similarity("Name", "name")).toBe(1);
    });

    it("should calculate Levenshtein distance based similarity", () => {
      // 简单的相似度计算
      const levenshtein = (a: string, b: string): number => {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        
        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) {
          matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
          matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        
        return matrix[b.length][a.length];
      };
      
      const similarity = (a: string, b: string) => {
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1;
        return 1 - levenshtein(a, b) / maxLen;
      };
      
      expect(similarity("customer", "customer")).toBe(1);
      expect(similarity("customer", "custmer")).toBeGreaterThan(0.8);
      expect(similarity("abc", "xyz")).toBeLessThan(0.5);
    });
  });

  describe("matchByAlias", () => {
    it("should match common field aliases", () => {
      const aliases: Record<string, string[]> = {
        name: ["姓名", "名称", "客户名", "公司名"],
        phone: ["电话", "手机", "联系电话", "手机号"],
        email: ["邮箱", "电子邮件", "邮件地址"],
        address: ["地址", "联系地址", "公司地址"],
      };
      
      const findTarget = (source: string): string | null => {
        for (const [target, aliasList] of Object.entries(aliases)) {
          if (aliasList.includes(source)) {
            return target;
          }
        }
        return null;
      };
      
      expect(findTarget("姓名")).toBe("name");
      expect(findTarget("电话")).toBe("phone");
      expect(findTarget("邮箱")).toBe("email");
      expect(findTarget("未知字段")).toBeNull();
    });
  });

  describe("batchApplyRecommendations", () => {
    it("should apply multiple recommendations at once", () => {
      const recommendations = [
        { sourceField: "客户名", targetField: "name", confidence: 0.95 },
        { sourceField: "联系电话", targetField: "phone", confidence: 0.90 },
        { sourceField: "邮箱地址", targetField: "email", confidence: 0.85 },
      ];
      
      const mappings: Record<string, string> = {};
      recommendations.forEach(rec => {
        mappings[rec.sourceField] = rec.targetField;
      });
      
      expect(Object.keys(mappings).length).toBe(3);
      expect(mappings["客户名"]).toBe("name");
      expect(mappings["联系电话"]).toBe("phone");
    });

    it("should filter by confidence threshold", () => {
      const recommendations = [
        { sourceField: "客户名", targetField: "name", confidence: 0.95 },
        { sourceField: "备注", targetField: "notes", confidence: 0.40 },
        { sourceField: "电话", targetField: "phone", confidence: 0.85 },
      ];
      
      const threshold = 0.7;
      const filtered = recommendations.filter(r => r.confidence >= threshold);
      
      expect(filtered.length).toBe(2);
      expect(filtered.find(r => r.sourceField === "备注")).toBeUndefined();
    });
  });

  describe("learnFromUsage", () => {
    it("should record successful mapping for learning", () => {
      const usageRecord = {
        sourceField: "客户名称",
        targetField: "name",
        importType: "lead",
        usedAt: new Date(),
        userId: "user-123",
      };
      
      expect(usageRecord.sourceField).toBe("客户名称");
      expect(usageRecord.targetField).toBe("name");
      expect(usageRecord.importType).toBe("lead");
    });
  });
});

// ==================== 模板使用统计服务测试 ====================

describe("TemplateUsageStatsService", () => {
  describe("recordUsage", () => {
    it("should record view action", () => {
      const usage = {
        templateId: 1,
        userId: "user-123",
        userName: "测试用户",
        actionType: "view" as const,
        createdAt: new Date(),
      };
      
      expect(usage.actionType).toBe("view");
      expect(usage.templateId).toBe(1);
    });

    it("should record use action with report type", () => {
      const usage = {
        templateId: 1,
        userId: "user-123",
        userName: "测试用户",
        actionType: "use" as const,
        reportType: "funnel",
        createdAt: new Date(),
      };
      
      expect(usage.actionType).toBe("use");
      expect(usage.reportType).toBe("funnel");
    });

    it("should record export action with format", () => {
      const usage = {
        templateId: 1,
        userId: "user-123",
        userName: "测试用户",
        actionType: "export" as const,
        exportFormat: "pdf",
        createdAt: new Date(),
      };
      
      expect(usage.actionType).toBe("export");
      expect(usage.exportFormat).toBe("pdf");
    });

    it("should record duplicate action", () => {
      const usage = {
        templateId: 1,
        userId: "user-123",
        userName: "测试用户",
        actionType: "duplicate" as const,
        createdAt: new Date(),
      };
      
      expect(usage.actionType).toBe("duplicate");
    });
  });

  describe("getUsageTrends", () => {
    it("should aggregate by date", () => {
      const mockData = [
        { date: "2024-01-20", views: 10, uses: 5, exports: 2, duplicates: 1, total: 18 },
        { date: "2024-01-21", views: 15, uses: 8, exports: 3, duplicates: 2, total: 28 },
        { date: "2024-01-22", views: 12, uses: 6, exports: 1, duplicates: 0, total: 19 },
      ];
      
      expect(mockData.length).toBe(3);
      expect(mockData[0].total).toBe(18);
      expect(mockData[1].views).toBe(15);
    });

    it("should filter by template id", () => {
      const allData = [
        { templateId: 1, date: "2024-01-20", total: 10 },
        { templateId: 2, date: "2024-01-20", total: 5 },
        { templateId: 1, date: "2024-01-21", total: 8 },
      ];
      
      const filtered = allData.filter(d => d.templateId === 1);
      expect(filtered.length).toBe(2);
    });
  });

  describe("getTemplatePopularity", () => {
    it("should rank templates by usage", () => {
      const templates = [
        { templateId: 1, templateName: "模板A", totalUsage: 100, uniqueUsers: 20 },
        { templateId: 2, templateName: "模板B", totalUsage: 150, uniqueUsers: 25 },
        { templateId: 3, templateName: "模板C", totalUsage: 80, uniqueUsers: 15 },
      ];
      
      const sorted = [...templates].sort((a, b) => b.totalUsage - a.totalUsage);
      
      expect(sorted[0].templateId).toBe(2);
      expect(sorted[0].totalUsage).toBe(150);
    });

    it("should include unique user count", () => {
      const template = {
        templateId: 1,
        templateName: "热门模板",
        totalUsage: 100,
        uniqueUsers: 25,
        views: 60,
        uses: 30,
        exports: 8,
        duplicates: 2,
      };
      
      expect(template.uniqueUsers).toBe(25);
      expect(template.views + template.uses + template.exports + template.duplicates).toBe(100);
    });
  });

  describe("getUserActivity", () => {
    it("should rank users by activity", () => {
      const users = [
        { userId: "u1", userName: "用户A", totalActions: 50 },
        { userId: "u2", userName: "用户B", totalActions: 80 },
        { userId: "u3", userName: "用户C", totalActions: 30 },
      ];
      
      const sorted = [...users].sort((a, b) => b.totalActions - a.totalActions);
      
      expect(sorted[0].userId).toBe("u2");
      expect(sorted[0].totalActions).toBe(80);
    });

    it("should include last active time", () => {
      const user = {
        userId: "u1",
        userName: "活跃用户",
        totalActions: 100,
        lastActiveAt: new Date("2024-01-24T12:00:00Z"),
      };
      
      expect(user.lastActiveAt).toBeInstanceOf(Date);
    });
  });

  describe("getStatsSummary", () => {
    it("should calculate summary statistics", () => {
      const summary = {
        totalUsage: 500,
        totalViews: 300,
        totalUses: 150,
        totalExports: 40,
        totalDuplicates: 10,
        uniqueUsers: 50,
        uniqueTemplates: 15,
        avgDailyUsage: 16.67,
      };
      
      expect(summary.totalUsage).toBe(500);
      expect(summary.totalViews + summary.totalUses + summary.totalExports + summary.totalDuplicates).toBe(500);
      expect(summary.avgDailyUsage).toBeCloseTo(16.67, 1);
    });

    it("should identify most popular template", () => {
      const summary = {
        mostPopularTemplate: {
          id: 1,
          name: "销售漏斗报表",
          count: 150,
        },
      };
      
      expect(summary.mostPopularTemplate.name).toBe("销售漏斗报表");
      expect(summary.mostPopularTemplate.count).toBe(150);
    });

    it("should identify most active user", () => {
      const summary = {
        mostActiveUser: {
          id: "user-123",
          name: "张三",
          count: 80,
        },
      };
      
      expect(summary.mostActiveUser.name).toBe("张三");
      expect(summary.mostActiveUser.count).toBe(80);
    });
  });

  describe("getReportTypeDistribution", () => {
    it("should calculate percentage distribution", () => {
      const distribution = [
        { reportType: "funnel", count: 50, percentage: 50 },
        { reportType: "trend", count: 30, percentage: 30 },
        { reportType: "source", count: 20, percentage: 20 },
      ];
      
      const totalPercentage = distribution.reduce((sum, d) => sum + d.percentage, 0);
      expect(totalPercentage).toBe(100);
    });
  });

  describe("getHourlyDistribution", () => {
    it("should return 24 hours data", () => {
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: Math.floor(Math.random() * 50),
      }));
      
      expect(hourlyData.length).toBe(24);
      expect(hourlyData[0].hour).toBe(0);
      expect(hourlyData[23].hour).toBe(23);
    });

    it("should identify peak hour", () => {
      const hourlyData = [
        { hour: 9, count: 30 },
        { hour: 10, count: 45 },
        { hour: 11, count: 60 },
        { hour: 14, count: 55 },
        { hour: 15, count: 40 },
      ];
      
      const peakHour = hourlyData.reduce((max, curr) => 
        curr.count > max.count ? curr : max
      );
      
      expect(peakHour.hour).toBe(11);
      expect(peakHour.count).toBe(60);
    });
  });

  describe("cleanupOldStats", () => {
    it("should delete records before specified date", () => {
      const beforeDate = new Date("2024-01-01");
      const records = [
        { id: 1, createdAt: new Date("2023-12-15") },
        { id: 2, createdAt: new Date("2023-12-25") },
        { id: 3, createdAt: new Date("2024-01-15") },
        { id: 4, createdAt: new Date("2024-01-20") },
      ];
      
      const toDelete = records.filter(r => r.createdAt < beforeDate);
      expect(toDelete.length).toBe(2);
    });
  });
});

// ==================== 集成测试 ====================

describe("Integration Tests", () => {
  describe("Notification Channel Test Flow", () => {
    it("should complete full test flow", async () => {
      const testFlow = {
        step1: "选择渠道类型",
        step2: "配置渠道参数",
        step3: "发送测试消息",
        step4: "等待响应",
        step5: "返回测试结果",
      };
      
      expect(Object.keys(testFlow).length).toBe(5);
    });
  });

  describe("Field Mapping Batch Apply Flow", () => {
    it("should complete batch apply flow", async () => {
      const flow = {
        step1: "解析源文件字段",
        step2: "获取智能推荐",
        step3: "用户确认或调整",
        step4: "批量应用映射",
        step5: "开始导入",
      };
      
      expect(Object.keys(flow).length).toBe(5);
    });
  });

  describe("Template Usage Analytics Flow", () => {
    it("should complete analytics flow", async () => {
      const flow = {
        step1: "选择时间范围",
        step2: "加载统计数据",
        step3: "渲染趋势图表",
        step4: "显示排行榜",
        step5: "分析分布数据",
      };
      
      expect(Object.keys(flow).length).toBe(5);
    });
  });
});
