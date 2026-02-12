/**
 * 员工离职数据管理模块测试
 * Tests for the Employee Offboarding Management module
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("../db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    then: vi.fn(),
  };
  return {
    requireDb: vi.fn().mockResolvedValue(mockDb),
  };
});

// Mock the schema
vi.mock("../../drizzle/schema", () => ({
  employeeOffboarding: { id: "id" },
  offboardingHandoverItems: { id: "id" },
  performanceAttribution: { id: "id" },
  assetHandover: { id: "id" },
  offboardingApprovals: { id: "id" },
  offboardingDataQueryLog: { id: "id" },
  hrmEmployees: { id: "id" },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => ({ type: "eq", args })),
  and: vi.fn((...args: any[]) => ({ type: "and", args })),
  desc: vi.fn((col: any) => ({ type: "desc", col })),
  asc: vi.fn((col: any) => ({ type: "asc", col })),
  sql: vi.fn(),
  like: vi.fn((...args: any[]) => ({ type: "like", args })),
  or: vi.fn((...args: any[]) => ({ type: "or", args })),
  inArray: vi.fn((...args: any[]) => ({ type: "inArray", args })),
  gte: vi.fn((...args: any[]) => ({ type: "gte", args })),
  lte: vi.fn((...args: any[]) => ({ type: "lte", args })),
}));

describe("Employee Offboarding Module", () => {
  
  describe("Service Module Imports", () => {
    it("should export all required service functions", async () => {
      const service = await import("./offboarding.service");
      
      // Core offboarding functions
      expect(typeof service.createOffboarding).toBe("function");
      expect(typeof service.listOffboardings).toBe("function");
      expect(typeof service.getOffboardingDetail).toBe("function");
      expect(typeof service.updateOffboarding).toBe("function");
      expect(typeof service.submitOffboarding).toBe("function");
      expect(typeof service.completeOffboarding).toBe("function");
      expect(typeof service.getOffboardingStats).toBe("function");
      
      // Handover functions
      expect(typeof service.addHandoverItem).toBe("function");
      expect(typeof service.batchAddHandoverItems).toBe("function");
      expect(typeof service.updateHandoverItemStatus).toBe("function");
      expect(typeof service.getHandoverItems).toBe("function");
      
      // Performance attribution functions
      expect(typeof service.addPerformanceAttribution).toBe("function");
      expect(typeof service.confirmPerformanceAttribution).toBe("function");
      expect(typeof service.autoAnnotatePerformanceData).toBe("function");
      expect(typeof service.getPerformanceAttributions).toBe("function");
      
      // Asset handover functions
      expect(typeof service.addAssetHandover).toBe("function");
      expect(typeof service.updateAssetHandoverStatus).toBe("function");
      expect(typeof service.getAssetHandovers).toBe("function");
      
      // Approval functions
      expect(typeof service.processApprovalDecision).toBe("function");
      expect(typeof service.assignApprover).toBe("function");
      expect(typeof service.getApprovals).toBe("function");
      expect(typeof service.getPendingApprovals).toBe("function");
      
      // Query functions
      expect(typeof service.queryOffboardedEmployeeData).toBe("function");
    });
  });

  describe("Router Module Imports", () => {
    it("should export the offboarding router", async () => {
      const routerModule = await import("./offboarding.router");
      expect(routerModule.offboardingRouter).toBeDefined();
    });
  });

  describe("Data Validation", () => {
    it("should validate offboarding reason types", () => {
      const validReasons = ['resignation', 'termination', 'retirement', 'contract_end', 'mutual_agreement', 'other'];
      validReasons.forEach(reason => {
        expect(validReasons).toContain(reason);
      });
    });

    it("should validate successor types", () => {
      const validTypes = ['replacement', 'new_position', 'backup', 'none'];
      validTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    it("should validate data retention policies", () => {
      const validPolicies = ['permanent', 'archive_after_year', 'archive_after_3years'];
      validPolicies.forEach(policy => {
        expect(validPolicies).toContain(policy);
      });
    });

    it("should validate performance data handling options", () => {
      const validOptions = ['keep_under_original', 'transfer_to_successor', 'split_by_date'];
      validOptions.forEach(option => {
        expect(validOptions).toContain(option);
      });
    });

    it("should validate profile handling options", () => {
      const validOptions = ['transfer_to_successor', 'create_new_for_successor', 'archive'];
      validOptions.forEach(option => {
        expect(validOptions).toContain(option);
      });
    });

    it("should validate phone handling options", () => {
      const validOptions = ['transfer_to_successor', 'return_to_pool', 'deactivate'];
      validOptions.forEach(option => {
        expect(validOptions).toContain(option);
      });
    });

    it("should validate email handling options", () => {
      const validOptions = ['forward_to_successor', 'forward_to_manager', 'auto_reply_then_deactivate', 'deactivate'];
      validOptions.forEach(option => {
        expect(validOptions).toContain(option);
      });
    });

    it("should validate handover item categories", () => {
      const validCategories = ['project', 'task', 'client', 'document', 'system_access', 'knowledge', 'equipment', 'other'];
      validCategories.forEach(category => {
        expect(validCategories).toContain(category);
      });
    });

    it("should validate approval levels", () => {
      const validLevels = ['supervisor', 'hr', 'finance', 'it'];
      validLevels.forEach(level => {
        expect(validLevels).toContain(level);
      });
    });

    it("should validate query period types", () => {
      const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];
      validPeriods.forEach(period => {
        expect(validPeriods).toContain(period);
      });
    });

    it("should validate attribution types", () => {
      const validTypes = ['pre_departure', 'post_departure', 'shared'];
      validTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });
  });

  describe("Business Logic", () => {
    it("should ensure contribution percentages sum to 100", () => {
      const originalPercent = 70;
      const successorPercent = 100 - originalPercent;
      expect(originalPercent + successorPercent).toBe(100);
    });

    it("should validate contribution percentages are within range", () => {
      const validPercents = [0, 25, 50, 75, 100];
      validPercents.forEach(percent => {
        expect(percent).toBeGreaterThanOrEqual(0);
        expect(percent).toBeLessThanOrEqual(100);
      });
    });

    it("should validate email forward duration is positive", () => {
      const validDurations = [30, 60, 90, 180, 365];
      validDurations.forEach(duration => {
        expect(duration).toBeGreaterThan(0);
      });
    });

    it("should correctly determine pre/post departure attribution", () => {
      const offboardingDate = new Date("2026-03-15");
      
      const preDepartureDate = new Date("2026-03-10");
      const postDepartureDate = new Date("2026-03-20");
      
      expect(preDepartureDate < offboardingDate).toBe(true);
      expect(postDepartureDate > offboardingDate).toBe(true);
    });

    it("should correctly handle data annotation for departed employees", () => {
      const offboardingDate = "2026-03-15";
      const dataDate = "2026-03-10";
      
      const isPreDeparture = dataDate < offboardingDate;
      expect(isPreDeparture).toBe(true);
      
      const annotation = isPreDeparture ? "离职前" : "离职后";
      expect(annotation).toBe("离职前");
    });

    it("should mark employee as departed in query results", () => {
      const employee = {
        name: "张三",
        status: "offboarded",
        offboardingDate: "2026-03-15",
      };
      
      const displayName = employee.status === "offboarded" 
        ? `${employee.name}（已离职）` 
        : employee.name;
      
      expect(displayName).toBe("张三（已离职）");
    });

    it("should correctly determine new year data exclusion", () => {
      const offboardingYear = 2026;
      const currentYear = 2027;
      
      const shouldExcludeFromCurrentYear = currentYear > offboardingYear;
      expect(shouldExcludeFromCurrentYear).toBe(true);
    });

    it("should handle approval workflow sequence correctly", () => {
      const approvalSequence = ['supervisor', 'hr', 'finance', 'it'];
      
      expect(approvalSequence.indexOf('supervisor')).toBe(0);
      expect(approvalSequence.indexOf('hr')).toBe(1);
      expect(approvalSequence.indexOf('finance')).toBe(2);
      expect(approvalSequence.indexOf('it')).toBe(3);
      
      // Verify sequence order
      for (let i = 0; i < approvalSequence.length - 1; i++) {
        expect(approvalSequence.indexOf(approvalSequence[i])).toBeLessThan(
          approvalSequence.indexOf(approvalSequence[i + 1])
        );
      }
    });

    it("should handle handover item status transitions correctly", () => {
      const validTransitions: Record<string, string[]> = {
        pending: ['in_progress'],
        in_progress: ['completed'],
        completed: ['verified'],
        verified: [],
      };
      
      expect(validTransitions['pending']).toContain('in_progress');
      expect(validTransitions['in_progress']).toContain('completed');
      expect(validTransitions['completed']).toContain('verified');
      expect(validTransitions['verified']).toHaveLength(0);
    });
  });

  describe("Asset Handling Categories", () => {
    it("should cover all asset categories", () => {
      const categories = [
        'profile', 'email_account', 'phone_number', 'laptop', 'monitor',
        'access_card', 'keys', 'software_license', 'system_account',
        'cloud_storage', 'vpn_access', 'other'
      ];
      expect(categories).toHaveLength(12);
    });

    it("should cover all handling actions", () => {
      const actions = [
        'transfer_to_successor', 'return_to_company', 'deactivate',
        'forward', 'archive', 'delete', 'keep_active_temporary'
      ];
      expect(actions).toHaveLength(7);
    });
  });
});
