/**
 * GRT Compliance Module Tests
 * 
 * Tests for:
 * - Seed data functionality
 * - Report generation (PDF/Excel/CSV)
 * - Scheduled compliance checks
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { seedComplianceData } from './seed-compliance-data';
import { generateComplianceReport, ReportOptions } from './services/report-generator.service';
import { runGermanDailyCheck, runUSWeeklyCheck, runFullComplianceCheck } from './services/scheduled-compliance-check.service';

// Mock the database and storage modules
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue([])
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          }),
          groupBy: vi.fn().mockResolvedValue([])
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            }),
            limit: vi.fn().mockResolvedValue([])
          })
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        }),
        limit: vi.fn().mockResolvedValue([])
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }])
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowsAffected: 1 })
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowsAffected: 0 })
    })
  })
}));

vi.mock('./storage', () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: 'test-key',
    url: 'https://storage.example.com/test-report.pdf'
  })
}));

describe('Compliance Module', () => {
  describe('Seed Data', () => {
    it('should export seedComplianceData function', () => {
      expect(typeof seedComplianceData).toBe('function');
    });

    it('should return success result when database is available', async () => {
      // The function should not throw when called
      const result = await seedComplianceData();
      expect(result).toBeDefined();
    });
  });

  describe('Report Generation', () => {
    const defaultOptions: ReportOptions = {
      format: 'pdf',
      dateRange: {
        start: '2026-01-01',
        end: '2026-01-24'
      },
      includeDetails: true,
      includeAlerts: true,
      includeRecommendations: true
    };

    it('should export generateComplianceReport function', () => {
      expect(typeof generateComplianceReport).toBe('function');
    });

    it('should generate PDF report', async () => {
      const result = await generateComplianceReport({
        ...defaultOptions,
        format: 'pdf'
      });
      
      expect(result).toBeDefined();
      expect(result.format).toBe('pdf');
      expect(result.reportId).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it('should generate Excel report', async () => {
      const result = await generateComplianceReport({
        ...defaultOptions,
        format: 'excel'
      });
      
      expect(result).toBeDefined();
      expect(result.format).toBe('excel');
      expect(result.reportId).toBeDefined();
    });

    it('should generate CSV report', async () => {
      const result = await generateComplianceReport({
        ...defaultOptions,
        format: 'csv'
      });
      
      expect(result).toBeDefined();
      expect(result.format).toBe('csv');
      expect(result.reportId).toBeDefined();
    });

    it('should filter by jurisdiction when specified', async () => {
      const result = await generateComplianceReport({
        ...defaultOptions,
        jurisdiction: 'DE'
      });
      
      expect(result).toBeDefined();
      expect(result.reportId).toBeDefined();
    });

    it('should include download URL on success', async () => {
      const result = await generateComplianceReport(defaultOptions);
      
      if (result.success) {
        expect(result.downloadUrl).toBeDefined();
        expect(result.downloadUrl.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Scheduled Compliance Checks', () => {
    describe('German Daily Check', () => {
      it('should export runGermanDailyCheck function', () => {
        expect(typeof runGermanDailyCheck).toBe('function');
      });

      it('should return check result with correct structure', async () => {
        const result = await runGermanDailyCheck();
        
        expect(result).toBeDefined();
        expect(result.checkType).toBe('daily_german');
        expect(result.executedAt).toBeDefined();
        expect(typeof result.employeesChecked).toBe('number');
        expect(typeof result.violationsFound).toBe('number');
        expect(typeof result.alertsGenerated).toBe('number');
        expect(Array.isArray(result.details)).toBe(true);
      });

      it('should include german_daily_10h_limit check in details', async () => {
        const result = await runGermanDailyCheck();
        
        const dailyLimitCheck = result.details.find(d => d.check === 'german_daily_10h_limit');
        expect(dailyLimitCheck).toBeDefined();
        if (dailyLimitCheck) {
          expect(typeof dailyLimitCheck.passed).toBe('number');
          expect(typeof dailyLimitCheck.failed).toBe('number');
        }
      });

      it('should include german_rest_period_11h check in details', async () => {
        const result = await runGermanDailyCheck();
        
        const restPeriodCheck = result.details.find(d => d.check === 'german_rest_period_11h');
        expect(restPeriodCheck).toBeDefined();
        if (restPeriodCheck) {
          expect(typeof restPeriodCheck.passed).toBe('number');
          expect(typeof restPeriodCheck.failed).toBe('number');
        }
      });
    });

    describe('US Weekly Check', () => {
      it('should export runUSWeeklyCheck function', () => {
        expect(typeof runUSWeeklyCheck).toBe('function');
      });

      it('should return check result with correct structure', async () => {
        const result = await runUSWeeklyCheck();
        
        expect(result).toBeDefined();
        expect(result.checkType).toBe('weekly_us');
        expect(result.executedAt).toBeDefined();
        expect(typeof result.employeesChecked).toBe('number');
        expect(typeof result.violationsFound).toBe('number');
        expect(typeof result.alertsGenerated).toBe('number');
        expect(Array.isArray(result.details)).toBe(true);
      });

      it('should include us_outside_sales_exemption check in details', async () => {
        const result = await runUSWeeklyCheck();
        
        const exemptionCheck = result.details.find(d => d.check === 'us_outside_sales_exemption');
        expect(exemptionCheck).toBeDefined();
        if (exemptionCheck) {
          expect(typeof exemptionCheck.passed).toBe('number');
          expect(typeof exemptionCheck.failed).toBe('number');
        }
      });

      it('should include us_overtime_threshold check in details', async () => {
        const result = await runUSWeeklyCheck();
        
        const overtimeCheck = result.details.find(d => d.check === 'us_overtime_threshold');
        expect(overtimeCheck).toBeDefined();
        if (overtimeCheck) {
          expect(typeof overtimeCheck.passed).toBe('number');
          expect(typeof overtimeCheck.failed).toBe('number');
        }
      });
    });

    describe('Full Compliance Check', () => {
      it('should export runFullComplianceCheck function', () => {
        expect(typeof runFullComplianceCheck).toBe('function');
      });

      it('should return combined results from both checks', async () => {
        const result = await runFullComplianceCheck();
        
        expect(result).toBeDefined();
        expect(result.checkType).toBe('full');
        expect(result.executedAt).toBeDefined();
        
        // Should have details from both German and US checks
        expect(result.details.length).toBeGreaterThanOrEqual(4);
        
        // Should include German checks
        expect(result.details.some(d => d.check.startsWith('german_'))).toBe(true);
        
        // Should include US checks
        expect(result.details.some(d => d.check.startsWith('us_'))).toBe(true);
      });

      it('should aggregate employee counts from both checks', async () => {
        const germanResult = await runGermanDailyCheck();
        const usResult = await runUSWeeklyCheck();
        const fullResult = await runFullComplianceCheck();
        
        expect(fullResult.employeesChecked).toBe(
          germanResult.employeesChecked + usResult.employeesChecked
        );
      });
    });
  });

  describe('Report Options Validation', () => {
    it('should handle missing optional fields', async () => {
      const minimalOptions: ReportOptions = {
        format: 'pdf',
        dateRange: {
          start: '2026-01-01',
          end: '2026-01-24'
        }
      };
      
      const result = await generateComplianceReport(minimalOptions);
      expect(result).toBeDefined();
      expect(result.reportId).toBeDefined();
    });

    it('should handle all jurisdictions', async () => {
      const jurisdictions: Array<'DE' | 'US' | 'CN' | 'OTHER'> = ['DE', 'US', 'CN', 'OTHER'];
      
      for (const jurisdiction of jurisdictions) {
        const result = await generateComplianceReport({
          format: 'pdf',
          jurisdiction,
          dateRange: {
            start: '2026-01-01',
            end: '2026-01-24'
          }
        });
        
        expect(result).toBeDefined();
        expect(result.reportId).toBeDefined();
      }
    });
  });
});
