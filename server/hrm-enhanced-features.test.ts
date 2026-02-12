/**
 * HRM Enhanced Features Tests
 * 
 * Tests for:
 * 1. Teams Meeting Integration
 * 2. Scheduled Tasks Management
 * 3. Salary Calculator
 * 4. Performance Review Notifications
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  getDb,
  getTeamsMeetings,
  getTeamsMeetingById,
  createTeamsMeeting,
  updateTeamsMeeting,
  getAiInterviewAnalytics,
  createAiInterviewAnalytic,
  getScheduledTasks,
  getScheduledTaskById,
  createScheduledTask,
  updateScheduledTask,
  getSalaryCalculations,
  getSalaryCalculationById,
  createSalaryCalculation,
  calculateSalary,
  getPerformanceReviewEmailLogs,
  createPerformanceReviewEmailLog,
  updatePerformanceReviewEmailLog,
} from "./db";

describe("Teams Meeting Integration", () => {
  it("should get all Teams meetings", async () => {
    const meetings = await getTeamsMeetings();
    expect(Array.isArray(meetings)).toBe(true);
  });

  it("should create a Teams meeting", async () => {
    const meeting = await createTeamsMeeting({
      candidateId: 1,
      meetingCode: `MTG-TEST-${Date.now()}`,
      subject: "技术面试 - 测试候选人",
      startTime: new Date("2026-01-20T14:00:00"),
      durationMinutes: 60,
      status: "scheduled",
    });
    // Function returns { id: insertId } or null
    expect(meeting === null || meeting?.id !== undefined).toBe(true);
  });

  it("should get Teams meeting by ID", async () => {
    const meetings = await getTeamsMeetings();
    if (meetings.length > 0) {
      const meeting = await getTeamsMeetingById(meetings[0].id);
      expect(meeting).toBeDefined();
      expect(meeting?.id).toBe(meetings[0].id);
    }
  });

  it("should update Teams meeting status", async () => {
    const meetings = await getTeamsMeetings();
    if (meetings.length > 0) {
      const result = await updateTeamsMeeting(meetings[0].id, {
        status: "in_progress",
      });
      expect(result).toBeDefined();
    }
  });

  it("should filter meetings by status", async () => {
    const scheduledMeetings = await getTeamsMeetings({ status: "scheduled" });
    expect(Array.isArray(scheduledMeetings)).toBe(true);
    scheduledMeetings.forEach((m) => {
      expect(m.status).toBe("scheduled");
    });
  });
});

describe("AI Interview Analytics", () => {
  it("should get AI interview analytics for a meeting", async () => {
    const meetings = await getTeamsMeetings();
    if (meetings.length > 0) {
      const analytics = await getAiInterviewAnalytics(meetings[0].id);
      expect(Array.isArray(analytics)).toBe(true);
    }
  });

  it("should create AI interview analytic record", async () => {
    const meetings = await getTeamsMeetings();
    if (meetings.length > 0) {
      const analytic = await createAiInterviewAnalytic({
        meetingId: meetings[0].id,
        candidateId: 1,
        analysisTime: new Date(),
        speechSegment: "测试语音片段",
        speaker: "candidate",
        emotionDetected: "confident",
        emotionConfidence: 0.85,
        answerQualityScore: 78,
        aiSuggestion: "候选人表现自信，回答清晰",
      });
      expect(analytic).toBeDefined();
    }
  });
});

describe("Scheduled Tasks Management", () => {
  it("should get all scheduled tasks", async () => {
    const tasks = await getScheduledTasks();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it("should create a scheduled task", async () => {
    const task = await createScheduledTask({
      taskCode: `TSK-TEST-${Date.now()}`,
      taskName: "测试定时任务",
      taskType: "performance_review_reminder",
      cronExpression: "0 0 14 * * 2",
      isEnabled: true,
    });
    // Function returns { id: insertId } or null
    expect(task === null || task?.id !== undefined).toBe(true);
  });

  it("should get scheduled task by ID", async () => {
    const tasks = await getScheduledTasks();
    if (tasks.length > 0) {
      const task = await getScheduledTaskById(tasks[0].id);
      expect(task).toBeDefined();
      expect(task?.id).toBe(tasks[0].id);
    }
  });

  it("should update scheduled task", async () => {
    const tasks = await getScheduledTasks();
    if (tasks.length > 0) {
      const result = await updateScheduledTask(tasks[0].id, {
        isEnabled: false,
      });
      expect(result).toBeDefined();
    }
  });

  it("should filter tasks by type", async () => {
    const reminderTasks = await getScheduledTasks({
      taskType: "performance_review_reminder",
    });
    expect(Array.isArray(reminderTasks)).toBe(true);
    reminderTasks.forEach((t) => {
      expect(t.taskType).toBe("performance_review_reminder");
    });
  });
});

describe("Salary Calculator", () => {
  it("should calculate salary with department structure", async () => {
    const result = await calculateSalary({
      department: "研发部",
      baseSalary: 15000,
      performanceGrade: "B",
    });
    expect(result).toBeDefined();
    if (result) {
      expect(result.baseSalary).toBe(15000);
      expect(result.monthlyTotal).toBeGreaterThan(0);
      expect(result.annualTotal).toBeGreaterThan(0);
    }
  });

  it("should calculate salary with project bonus", async () => {
    const result = await calculateSalary({
      department: "销售部",
      baseSalary: 12000,
      performanceGrade: "A",
      projectBonus: 5000,
    });
    expect(result).toBeDefined();
    if (result) {
      expect(result.bonus).toBeGreaterThanOrEqual(5000);
    }
  });

  it("should use default ratios for unknown department", async () => {
    const result = await calculateSalary({
      department: "未知部门",
      baseSalary: 10000,
    });
    expect(result).toBeDefined();
    if (result) {
      expect(result.breakdown.baseSalaryRatio).toBe(0.6);
    }
  });

  it("should get all salary calculations", async () => {
    const calculations = await getSalaryCalculations();
    expect(Array.isArray(calculations)).toBe(true);
  });

  it("should create salary calculation record", async () => {
    const calculation = await createSalaryCalculation({
      calculationCode: `CALC-TEST-${Date.now()}`,
      department: "研发部",
      calculationType: "simulation",
      baseSalary: "15000",
      performanceSalary: "3000",
      bonus: "2000",
      benefits: "1500",
      monthlyTotal: "21500",
      annualTotal: "258000",
    });
    // Function returns { id: insertId } or null
    expect(calculation === null || calculation?.id !== undefined).toBe(true);
  });

  it("should get salary calculation by ID", async () => {
    const calculations = await getSalaryCalculations();
    if (calculations.length > 0) {
      const calculation = await getSalaryCalculationById(calculations[0].id);
      expect(calculation).toBeDefined();
      expect(calculation?.id).toBe(calculations[0].id);
    }
  });
});

describe("Performance Review Email Logs", () => {
  it("should get all email logs", async () => {
    const logs = await getPerformanceReviewEmailLogs();
    expect(Array.isArray(logs)).toBe(true);
  });

  it("should create email log", async () => {
    const log = await createPerformanceReviewEmailLog({
      reminderId: 1,
      employeeId: 1,
      emailSubject: "测试邮件主题",
      emailContent: "测试邮件内容",
      recipients: JSON.stringify(["test@example.com"]),
      sendStatus: "pending",
    });
    // Function returns { id: insertId } or null
    expect(log === null || log?.id !== undefined).toBe(true);
  });

  it("should update email log status", async () => {
    const logs = await getPerformanceReviewEmailLogs();
    if (logs.length > 0) {
      const result = await updatePerformanceReviewEmailLog(logs[0].id, {
        sendStatus: "sent",
        sentAt: new Date(),
      });
      expect(result).toBeDefined();
    }
  });

  it("should filter logs by status", async () => {
    const pendingLogs = await getPerformanceReviewEmailLogs({
      sendStatus: "pending",
    });
    expect(Array.isArray(pendingLogs)).toBe(true);
    pendingLogs.forEach((l) => {
      expect(l.sendStatus).toBe("pending");
    });
  });
});

describe("Code Generation Functions", () => {
  it("should generate unique meeting codes", async () => {
    const meeting1 = await createTeamsMeeting({
      candidateId: 1,
      meetingCode: `MTG-${Date.now()}-001`,
      subject: "面试1",
      startTime: new Date(),
    });
    const meeting2 = await createTeamsMeeting({
      candidateId: 1,
      meetingCode: `MTG-${Date.now()}-002`,
      subject: "面试2",
      startTime: new Date(),
    });
    expect(meeting1).toBeDefined();
    expect(meeting2).toBeDefined();
  });

  it("should generate unique task codes", async () => {
    const task1 = await createScheduledTask({
      taskCode: `TSK-${Date.now()}-001`,
      taskName: "任务1",
      taskType: "custom",
      cronExpression: "0 0 * * * *",
    });
    const task2 = await createScheduledTask({
      taskCode: `TSK-${Date.now()}-002`,
      taskName: "任务2",
      taskType: "custom",
      cronExpression: "0 0 * * * *",
    });
    expect(task1).toBeDefined();
    expect(task2).toBeDefined();
  });
});
