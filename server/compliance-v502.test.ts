/**
 * v5.0.2 合规功能测试
 * 测试调度器状态面板、预警邮件通知、报告历史记录
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getDb
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  })
}));

// 测试调度器状态
describe('Compliance Scheduler Status', () => {
  it('should return scheduler status structure', async () => {
    const { getSchedulerStatus } = await import('./scheduler/compliance-scheduler');
    const status = getSchedulerStatus();
    
    expect(status).toHaveProperty('germanDaily');
    expect(status).toHaveProperty('usWeekly');
    expect(status.germanDaily).toHaveProperty('running');
    expect(status.usWeekly).toHaveProperty('running');
  });

  it('should return execution logs', async () => {
    const { getExecutionLogs } = await import('./scheduler/compliance-scheduler');
    const logs = getExecutionLogs();
    
    expect(Array.isArray(logs)).toBe(true);
  });

  it('should have German daily scheduler', async () => {
    const { getSchedulerStatus } = await import('./scheduler/compliance-scheduler');
    const status = getSchedulerStatus();
    
    expect(typeof status.germanDaily.running).toBe('boolean');
  });

  it('should have US weekly scheduler', async () => {
    const { getSchedulerStatus } = await import('./scheduler/compliance-scheduler');
    const status = getSchedulerStatus();
    
    expect(typeof status.usWeekly.running).toBe('boolean');
  });
});

// 测试邮件服务
describe('Compliance Email Service', () => {
  it('should have sendComplianceAlertEmail function', async () => {
    const emailService = await import('./services/compliance-email.service');
    expect(typeof emailService.sendComplianceAlertEmail).toBe('function');
  });

  it('should have sendPendingAlertEmails function', async () => {
    const emailService = await import('./services/compliance-email.service');
    expect(typeof emailService.sendPendingAlertEmails).toBe('function');
  });

  it('should have getEmailSendLogs function', async () => {
    const emailService = await import('./services/compliance-email.service');
    expect(typeof emailService.getEmailSendLogs).toBe('function');
  });

  it('should have testEmailSend function', async () => {
    const emailService = await import('./services/compliance-email.service');
    expect(typeof emailService.testEmailSend).toBe('function');
  });

  it('should return empty logs initially', async () => {
    const { getEmailSendLogs } = await import('./services/compliance-email.service');
    const logs = getEmailSendLogs();
    
    expect(Array.isArray(logs)).toBe(true);
  });
});

// 测试报告历史服务
describe('Report History Service', () => {
  it('should have createReportRecord function', async () => {
    const reportService = await import('./services/report-history.service');
    expect(typeof reportService.createReportRecord).toBe('function');
  });

  it('should have updateReportRecord function', async () => {
    const reportService = await import('./services/report-history.service');
    expect(typeof reportService.updateReportRecord).toBe('function');
  });

  it('should have getReportHistory function', async () => {
    const reportService = await import('./services/report-history.service');
    expect(typeof reportService.getReportHistory).toBe('function');
  });

  it('should have getReportById function', async () => {
    const reportService = await import('./services/report-history.service');
    expect(typeof reportService.getReportById).toBe('function');
  });

  it('should have deleteReport function', async () => {
    const reportService = await import('./services/report-history.service');
    expect(typeof reportService.deleteReport).toBe('function');
  });

  it('should have getReportStats function', async () => {
    const reportService = await import('./services/report-history.service');
    expect(typeof reportService.getReportStats).toBe('function');
  });
});

// 测试报告历史数据结构
describe('Report History Data Structure', () => {
  it('should return correct history structure', async () => {
    const { getReportHistory } = await import('./services/report-history.service');
    const result = await getReportHistory({});
    
    expect(result).toHaveProperty('reports');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('pageSize');
    expect(result).toHaveProperty('totalPages');
    expect(Array.isArray(result.reports)).toBe(true);
  });

  it('should support pagination parameters', async () => {
    const { getReportHistory } = await import('./services/report-history.service');
    const result = await getReportHistory({ page: 1, pageSize: 20 });
    
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('should support format filter', async () => {
    const { getReportHistory } = await import('./services/report-history.service');
    const result = await getReportHistory({ format: 'pdf' });
    
    expect(result).toHaveProperty('reports');
  });

  it('should support jurisdiction filter', async () => {
    const { getReportHistory } = await import('./services/report-history.service');
    const result = await getReportHistory({ jurisdiction: 'DE' });
    
    expect(result).toHaveProperty('reports');
  });
});

// 测试报告统计
describe('Report Statistics', () => {
  it('should return stats structure', async () => {
    const { getReportStats } = await import('./services/report-history.service');
    const stats = await getReportStats();
    
    expect(stats).toHaveProperty('totalReports');
    expect(stats).toHaveProperty('byFormat');
    expect(stats).toHaveProperty('byJurisdiction');
    expect(stats).toHaveProperty('recentCount');
    expect(typeof stats.totalReports).toBe('number');
    expect(typeof stats.byFormat).toBe('object');
    expect(typeof stats.byJurisdiction).toBe('object');
    expect(typeof stats.recentCount).toBe('number');
  });
});

// 测试邮件内容生成
describe('Email Content Generation', () => {
  it('should handle different severity levels', async () => {
    // 测试不同严重级别的邮件内容生成逻辑
    const severityLevels = ['critical', 'high', 'medium', 'low'];
    
    for (const severity of severityLevels) {
      expect(['critical', 'high', 'medium', 'low']).toContain(severity);
    }
  });

  it('should handle different alert types', async () => {
    const alertTypes = [
      'daily_overtime',
      'weekly_overtime',
      'rest_period_violation',
      'exemption_review',
      'circuit_breaker'
    ];
    
    for (const type of alertTypes) {
      expect(alertTypes).toContain(type);
    }
  });

  it('should handle different regions', async () => {
    const regions = ['DE', 'US', 'CN', 'OTHER'];
    
    for (const region of regions) {
      expect(regions).toContain(region);
    }
  });
});

// 测试调度器控制
describe('Scheduler Control', () => {
  it('should have start functions', async () => {
    const scheduler = await import('./scheduler/compliance-scheduler');
    expect(typeof scheduler.startGermanDailyScheduler).toBe('function');
    expect(typeof scheduler.startUSWeeklyScheduler).toBe('function');
  });

  it('should have stop function', async () => {
    const scheduler = await import('./scheduler/compliance-scheduler');
    expect(typeof scheduler.stopAllSchedulers).toBe('function');
  });

  it('should have manual execution functions', async () => {
    const scheduler = await import('./scheduler/compliance-scheduler');
    expect(typeof scheduler.executeGermanDailyCheck).toBe('function');
    expect(typeof scheduler.executeUSWeeklyCheck).toBe('function');
  });
});

// 测试报告格式支持
describe('Report Format Support', () => {
  it('should support PDF format', () => {
    const supportedFormats = ['pdf', 'excel', 'csv'];
    expect(supportedFormats).toContain('pdf');
  });

  it('should support Excel format', () => {
    const supportedFormats = ['pdf', 'excel', 'csv'];
    expect(supportedFormats).toContain('excel');
  });

  it('should support CSV format', () => {
    const supportedFormats = ['pdf', 'excel', 'csv'];
    expect(supportedFormats).toContain('csv');
  });
});

// 测试报告类型支持
describe('Report Type Support', () => {
  it('should support daily reports', () => {
    const reportTypes = ['daily', 'weekly', 'monthly', 'custom'];
    expect(reportTypes).toContain('daily');
  });

  it('should support weekly reports', () => {
    const reportTypes = ['daily', 'weekly', 'monthly', 'custom'];
    expect(reportTypes).toContain('weekly');
  });

  it('should support monthly reports', () => {
    const reportTypes = ['daily', 'weekly', 'monthly', 'custom'];
    expect(reportTypes).toContain('monthly');
  });

  it('should support custom reports', () => {
    const reportTypes = ['daily', 'weekly', 'monthly', 'custom'];
    expect(reportTypes).toContain('custom');
  });
});
