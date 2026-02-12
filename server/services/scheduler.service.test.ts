/**
 * 定时任务调度服务单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getScheduledTasksStatus,
  setTaskEnabled,
  triggerTask,
  updateTaskCron,
  checkAndRunScheduledTasks,
} from "./scheduler.service";

describe("Scheduler Service", () => {
  describe("getScheduledTasksStatus", () => {
    it("should return all scheduled tasks with their status", () => {
      const status = getScheduledTasksStatus();
      
      expect(status).toBeDefined();
      expect(status.tasks).toBeDefined();
      expect(Array.isArray(status.tasks)).toBe(true);
      expect(status.tasks.length).toBeGreaterThan(0);
    });

    it("should include daily-task-reminder task", () => {
      const status = getScheduledTasksStatus();
      const dailyTask = status.tasks.find(t => t.id === "daily-task-reminder");
      
      expect(dailyTask).toBeDefined();
      expect(dailyTask?.cronExpression).toBe("0 0 15 * * *");
      expect(dailyTask?.enabled).toBe(true);
    });

    it("should have valid nextRun time for all tasks", () => {
      const status = getScheduledTasksStatus();
      
      for (const task of status.tasks) {
        expect(task.nextRun).toBeDefined();
        const nextRunDate = new Date(task.nextRun!);
        expect(nextRunDate.getTime()).toBeGreaterThan(Date.now());
      }
    });
  });

  describe("setTaskEnabled", () => {
    it("should enable a task", () => {
      const result = setTaskEnabled("daily-task-reminder", true);
      expect(result).toBe(true);
      
      const status = getScheduledTasksStatus();
      const task = status.tasks.find(t => t.id === "daily-task-reminder");
      expect(task?.enabled).toBe(true);
    });

    it("should disable a task", () => {
      const result = setTaskEnabled("daily-task-reminder", false);
      expect(result).toBe(true);
      
      const status = getScheduledTasksStatus();
      const task = status.tasks.find(t => t.id === "daily-task-reminder");
      expect(task?.enabled).toBe(false);
      
      // Re-enable for other tests
      setTaskEnabled("daily-task-reminder", true);
    });

    it("should return false for non-existent task", () => {
      const result = setTaskEnabled("non-existent-task", true);
      expect(result).toBe(false);
    });
  });

  describe("updateTaskCron", () => {
    it("should update cron expression for existing task", () => {
      const newCron = "0 30 14 * * *"; // 2:30 PM
      const result = updateTaskCron("daily-task-reminder", newCron);
      expect(result).toBe(true);
      
      const status = getScheduledTasksStatus();
      const task = status.tasks.find(t => t.id === "daily-task-reminder");
      expect(task?.cronExpression).toBe(newCron);
      
      // Reset to original
      updateTaskCron("daily-task-reminder", "0 0 15 * * *");
    });

    it("should return false for non-existent task", () => {
      const result = updateTaskCron("non-existent-task", "0 0 12 * * *");
      expect(result).toBe(false);
    });

    it("should update nextRun time after cron change", () => {
      const status1 = getScheduledTasksStatus();
      const task1 = status1.tasks.find(t => t.id === "daily-task-reminder");
      expect(task1?.nextRun).toBeDefined();
      
      updateTaskCron("daily-task-reminder", "0 0 16 * * *"); // 4:00 PM
      
      const status2 = getScheduledTasksStatus();
      const task2 = status2.tasks.find(t => t.id === "daily-task-reminder");
      expect(task2?.nextRun).toBeDefined();
      expect(task2?.cronExpression).toBe("0 0 16 * * *");
      
      // Reset to original
      updateTaskCron("daily-task-reminder", "0 0 15 * * *");
    });
  });

  describe("triggerTask", () => {
    it("should return error for non-existent task", async () => {
      const result = await triggerTask("non-existent-task");
      expect(result.success).toBe(false);
      expect(result.message).toContain("不存在");
    });
  });

  describe("checkAndRunScheduledTasks", () => {
    it("should return execution results", async () => {
      const result = await checkAndRunScheduledTasks();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.executed)).toBe(true);
      expect(Array.isArray(result.skipped)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should skip disabled tasks", async () => {
      // Disable the task
      setTaskEnabled("daily-task-reminder", false);
      
      const result = await checkAndRunScheduledTasks();
      
      // Task should be skipped (using task name, not id)
      expect(result.skipped).toContain("每日任务提醒");
      expect(result.executed).not.toContain("每日任务提醒");
      
      // Re-enable
      setTaskEnabled("daily-task-reminder", true);
    });
  });

  describe("Cron Expression Parsing", () => {
    it("should calculate correct next run time for 3:00 PM", () => {
      updateTaskCron("daily-task-reminder", "0 0 15 * * *");
      
      const status = getScheduledTasksStatus();
      const task = status.tasks.find(t => t.id === "daily-task-reminder");
      
      expect(task?.nextRun).toBeDefined();
      const nextRun = new Date(task!.nextRun!);
      
      // Should be at 3:00 PM (15:00)
      expect(nextRun.getHours()).toBe(15);
      expect(nextRun.getMinutes()).toBe(0);
      expect(nextRun.getSeconds()).toBe(0);
    });

    it("should set next run to tomorrow if time has passed today", () => {
      const now = new Date();
      const pastHour = now.getHours() - 1;
      
      if (pastHour >= 0) {
        updateTaskCron("daily-task-reminder", `0 0 ${pastHour} * * *`);
        
        const status = getScheduledTasksStatus();
        const task = status.tasks.find(t => t.id === "daily-task-reminder");
        const nextRun = new Date(task!.nextRun!);
        
        // Should be tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        expect(nextRun.getDate()).toBe(tomorrow.getDate());
      }
      
      // Reset to original
      updateTaskCron("daily-task-reminder", "0 0 15 * * *");
    });
  });
});
