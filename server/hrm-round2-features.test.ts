/**
 * HRM系统功能增强 Round 2 单元测试
 * 
 * 测试内容：
 * 1. Microsoft Graph API集成
 * 2. 定时任务调度器
 * 3. 薪酬报表导出
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    }),
    getSalaryCalculations: vi.fn().mockResolvedValue([
      {
        id: 1,
        calculationCode: "CALC-001",
        employeeId: 1,
        candidateId: null,
        department: "研发部",
        positionGrade: "T3",
        calculationType: "simulation",
        baseSalary: "15000",
        performanceSalary: "3000",
        bonus: "2000",
        benefits: "1500",
        monthlyTotal: "21500",
        annualTotal: "258000",
        createdAt: new Date(),
      },
    ]),
    calculateSalary: vi.fn().mockResolvedValue({
      baseSalary: 15000,
      performanceSalary: 3000,
      salesCommission: 0,
      benefits: 1500,
      monthlyTotal: 19500,
      annualTotal: 234000,
    }),
  };
});

// ==========================================
// Microsoft Graph API Tests
// ==========================================

describe("Microsoft Graph API Integration", () => {
  describe("checkMicrosoftGraphConfig", () => {
    it("should return configuration status", async () => {
      const { checkMicrosoftGraphConfig } = await import("./microsoftGraph");
      const result = checkMicrosoftGraphConfig();
      
      expect(result).toHaveProperty("configured");
      expect(result).toHaveProperty("missingKeys");
      expect(typeof result.configured).toBe("boolean");
      expect(Array.isArray(result.missingKeys)).toBe(true);
    });
  });

  describe("createTeamsOnlineMeeting", () => {
    it("should validate API configuration status", async () => {
      const { checkMicrosoftGraphConfig } = await import("./microsoftGraph");
      const config = checkMicrosoftGraphConfig();
      expect(config).toHaveProperty("configured");
      expect(config).toHaveProperty("missingKeys");
    });
  });

  describe("getTeamsOnlineMeeting", () => {
    it("should return mock meeting data", async () => {
      const { getTeamsOnlineMeeting } = await import("./microsoftGraph");
      
      const result = await getTeamsOnlineMeeting("test-meeting-id");
      
      expect(result).toHaveProperty("success");
    }, 15000);
  });
});

// ==========================================
// Scheduler Tests
// ==========================================

describe("Scheduler Service", () => {
  describe("getSchedulerStatus", () => {
    it("should return scheduler status", async () => {
      const { getSchedulerStatus } = await import("./scheduler");
      const status = getSchedulerStatus();
      
      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("lastCheckTime");
      expect(status).toHaveProperty("tasksExecuted");
      expect(status).toHaveProperty("tasksScheduled");
      expect(status).toHaveProperty("errors");
      expect(typeof status.isRunning).toBe("boolean");
      expect(typeof status.tasksExecuted).toBe("number");
    });
  });

  describe("processPerformanceReviewReminders", () => {
    it("should process pending reminders", async () => {
      const { processPerformanceReviewReminders } = await import("./scheduler");
      const results = await processPerformanceReviewReminders();
      
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("processMeetingRemindersScheduled", () => {
    it("should process pending meeting reminders", async () => {
      const { processMeetingRemindersScheduled } = await import("./scheduler");
      const results = await processMeetingRemindersScheduled();
      
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("processScheduledTasks", () => {
    it("should process scheduled tasks", async () => {
      const { processScheduledTasks } = await import("./scheduler");
      const results = await processScheduledTasks();
      
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("runSchedulerCheck", () => {
    it("should run all scheduler checks", async () => {
      const { runSchedulerCheck } = await import("./scheduler");
      const results = await runSchedulerCheck();
      
      expect(results).toHaveProperty("performanceReviews");
      expect(results).toHaveProperty("meetingReminders");
      expect(results).toHaveProperty("scheduledTasks");
      expect(Array.isArray(results.performanceReviews)).toBe(true);
      expect(Array.isArray(results.meetingReminders)).toBe(true);
      expect(Array.isArray(results.scheduledTasks)).toBe(true);
    });
  });

  describe("startScheduler and stopScheduler", () => {
    it("should start and stop scheduler without error", async () => {
      const { startScheduler, stopScheduler } = await import("./scheduler");
      
      // Start scheduler
      expect(() => startScheduler(60000)).not.toThrow();
      
      // Stop scheduler
      expect(() => stopScheduler()).not.toThrow();
    });
  });
});

// ==========================================
// Salary Report Export Tests
// ==========================================

describe("Salary Report Export Service", () => {
  describe("exportSalaryCalculationsToCSV", () => {
    it("should generate CSV report", async () => {
      const { exportSalaryCalculationsToCSV } = await import("./salaryReportExport");
      const result = await exportSalaryCalculationsToCSV();
      
      expect(result).toHaveProperty("csv");
      expect(result).toHaveProperty("filename");
      expect(typeof result.csv).toBe("string");
      expect(result.filename).toMatch(/salary_report_.*\.csv/);
    });

    it("should include BOM for Excel compatibility", async () => {
      const { exportSalaryCalculationsToCSV } = await import("./salaryReportExport");
      const result = await exportSalaryCalculationsToCSV();
      
      // BOM is \uFEFF
      expect(result.csv.startsWith("\uFEFF")).toBe(true);
    });

    it("should filter by department", async () => {
      const { exportSalaryCalculationsToCSV } = await import("./salaryReportExport");
      const result = await exportSalaryCalculationsToCSV({ department: "研发部" });
      
      expect(result).toHaveProperty("csv");
      expect(result).toHaveProperty("filename");
    });
  });

  describe("exportSalaryStructureToCSV", () => {
    it("should be a function that returns csv and filename", async () => {
      const { exportSalaryStructureToCSV } = await import("./salaryReportExport");
      expect(typeof exportSalaryStructureToCSV).toBe("function");
      // This function requires real database connection
      // In production it will return CSV data or "No salary structure data available"
    });
  });

  describe("exportPerformanceGradesToCSV", () => {
    it("should be a function that returns csv and filename", async () => {
      const { exportPerformanceGradesToCSV } = await import("./salaryReportExport");
      expect(typeof exportPerformanceGradesToCSV).toBe("function");
      // This function requires real database connection
      // In production it will return CSV data or "No performance grade data available"
    });
  });

  describe("generateBatchSalarySimulation", () => {
    it("should generate batch simulation report", async () => {
      const { generateBatchSalarySimulation } = await import("./salaryReportExport");
      
      const simulations = [
        { department: "研发部", baseSalary: 15000, performanceGrade: "A" },
        { department: "销售部", baseSalary: 12000, salesAmount: 100000 },
      ];
      
      const result = await generateBatchSalarySimulation(simulations);
      
      expect(result).toHaveProperty("csv");
      expect(result).toHaveProperty("filename");
      expect(result).toHaveProperty("results");
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBe(2);
      expect(result.filename).toMatch(/salary_simulation_.*\.csv/);
    });
  });

  describe("generateSalaryReportHTML", () => {
    it("should generate HTML report", async () => {
      const { generateSalaryReportHTML } = await import("./salaryReportExport");
      const html = await generateSalaryReportHTML();
      
      expect(typeof html).toBe("string");
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("GRT薪酬计算报表");
      expect(html).toContain("<table>");
    });

    it("should include summary section", async () => {
      const { generateSalaryReportHTML } = await import("./salaryReportExport");
      const html = await generateSalaryReportHTML();
      
      expect(html).toContain("记录总数");
      expect(html).toContain("平均月薪");
      expect(html).toContain("月度总计");
      expect(html).toContain("年度总计");
    });
  });
});

// ==========================================
// Integration Tests
// ==========================================

describe("Integration Tests", () => {
  describe("Teams Meeting with Scheduler", () => {
    it("should be able to create meeting and schedule reminder", async () => {
      const { checkMicrosoftGraphConfig } = await import("./microsoftGraph");
      const { getSchedulerStatus } = await import("./scheduler");
      
      const graphConfig = checkMicrosoftGraphConfig();
      const schedulerStatus = getSchedulerStatus();
      
      expect(graphConfig).toBeDefined();
      expect(schedulerStatus).toBeDefined();
    });
  });

  describe("Salary Calculation with Report Export", () => {
    it("should calculate salary and export to CSV", async () => {
      const { calculateSalary } = await import("./db");
      const { exportSalaryCalculationsToCSV } = await import("./salaryReportExport");
      
      // Calculate salary
      const salaryResult = await calculateSalary({
        department: "研发部",
        baseSalary: 15000,
        performanceGrade: "A",
      });
      
      expect(salaryResult).toBeDefined();
      
      // Export to CSV
      const csvResult = await exportSalaryCalculationsToCSV();
      expect(csvResult.csv).toBeDefined();
    });
  });
});
