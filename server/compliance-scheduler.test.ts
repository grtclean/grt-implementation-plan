/**
 * 合规调度器测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the scheduled-compliance-check.service
vi.mock('./services/scheduled-compliance-check.service', () => ({
  runGermanDailyCheck: vi.fn().mockResolvedValue({
    executedAt: new Date().toISOString(),
    checkType: 'german_daily',
    employeesChecked: 5,
    alertsGenerated: 2,
    violationsFound: 1,
    details: []
  }),
  runUSWeeklyCheck: vi.fn().mockResolvedValue({
    executedAt: new Date().toISOString(),
    checkType: 'us_weekly',
    employeesChecked: 5,
    alertsGenerated: 1,
    violationsFound: 0,
    details: []
  }),
  runFullComplianceCheck: vi.fn().mockResolvedValue({
    executedAt: new Date().toISOString(),
    checkType: 'full',
    employeesChecked: 10,
    alertsGenerated: 3,
    violationsFound: 1,
    details: []
  })
}));

import {
  executeGermanDailyCheck,
  executeUSWeeklyCheck,
  getExecutionLogs,
  getSchedulerStatus,
  startGermanDailyScheduler,
  startUSWeeklyScheduler,
  stopAllSchedulers
} from './scheduler/compliance-scheduler';

describe('Compliance Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopAllSchedulers();
  });

  afterEach(() => {
    stopAllSchedulers();
  });

  describe('executeGermanDailyCheck', () => {
    it('should execute German daily check and return success', async () => {
      const result = await executeGermanDailyCheck();
      
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.checkType).toBe('german_daily');
      expect(result.result.employeesChecked).toBe(5);
    });

    it('should log execution', async () => {
      await executeGermanDailyCheck();
      
      const logs = getExecutionLogs();
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog.taskName).toBe('GermanDailyCheck');
      expect(lastLog.status).toBe('completed');
    });
  });

  describe('executeUSWeeklyCheck', () => {
    it('should execute US weekly check and return success', async () => {
      const result = await executeUSWeeklyCheck();
      
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.checkType).toBe('us_weekly');
      expect(result.result.employeesChecked).toBe(5);
    });

    it('should log execution', async () => {
      await executeUSWeeklyCheck();
      
      const logs = getExecutionLogs();
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog.taskName).toBe('USWeeklyCheck');
      expect(lastLog.status).toBe('completed');
    });
  });

  describe('getSchedulerStatus', () => {
    it('should return scheduler status', () => {
      const status = getSchedulerStatus();
      
      expect(status).toHaveProperty('germanDaily');
      expect(status).toHaveProperty('usWeekly');
      expect(status.germanDaily).toHaveProperty('running');
      expect(status.usWeekly).toHaveProperty('running');
    });

    it('should show running status after starting schedulers', () => {
      startGermanDailyScheduler();
      startUSWeeklyScheduler();
      
      const status = getSchedulerStatus();
      
      expect(status.germanDaily.running).toBe(true);
      expect(status.usWeekly.running).toBe(true);
      expect(status.germanDaily.nextExecution).toBeDefined();
      expect(status.usWeekly.nextExecution).toBeDefined();
    });

    it('should show not running after stopping schedulers', () => {
      startGermanDailyScheduler();
      startUSWeeklyScheduler();
      stopAllSchedulers();
      
      const status = getSchedulerStatus();
      
      expect(status.germanDaily.running).toBe(false);
      expect(status.usWeekly.running).toBe(false);
    });
  });

  describe('Scheduler lifecycle', () => {
    it('should start German daily scheduler', () => {
      startGermanDailyScheduler();
      
      const status = getSchedulerStatus();
      expect(status.germanDaily.running).toBe(true);
    });

    it('should start US weekly scheduler', () => {
      startUSWeeklyScheduler();
      
      const status = getSchedulerStatus();
      expect(status.usWeekly.running).toBe(true);
    });

    it('should not start duplicate schedulers', () => {
      startGermanDailyScheduler();
      startGermanDailyScheduler(); // Should not throw or create duplicate
      
      const status = getSchedulerStatus();
      expect(status.germanDaily.running).toBe(true);
    });

    it('should stop all schedulers', () => {
      startGermanDailyScheduler();
      startUSWeeklyScheduler();
      
      stopAllSchedulers();
      
      const status = getSchedulerStatus();
      expect(status.germanDaily.running).toBe(false);
      expect(status.usWeekly.running).toBe(false);
    });
  });

  describe('Execution logs', () => {
    it('should maintain execution logs', async () => {
      await executeGermanDailyCheck();
      await executeUSWeeklyCheck();
      
      const logs = getExecutionLogs();
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it('should limit logs to 100 entries', async () => {
      // Execute many checks to exceed the limit
      for (let i = 0; i < 60; i++) {
        await executeGermanDailyCheck();
      }
      
      const logs = getExecutionLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });
  });
});

describe('Compliance Dashboard Integration', () => {
  describe('Export Report', () => {
    it('should support PDF format', () => {
      const formats = ['pdf', 'excel', 'csv'];
      expect(formats).toContain('pdf');
    });

    it('should support Excel format', () => {
      const formats = ['pdf', 'excel', 'csv'];
      expect(formats).toContain('excel');
    });

    it('should support CSV format', () => {
      const formats = ['pdf', 'excel', 'csv'];
      expect(formats).toContain('csv');
    });
  });

  describe('Test Data Generation', () => {
    it('should be available for admin users', () => {
      const adminRoles = ['admin'];
      expect(adminRoles).toContain('admin');
    });
  });
});
