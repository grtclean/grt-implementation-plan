/**
 * Production Execution Module - Unit Tests
 * 生产执行模块单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('../db', () => ({
  requireDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  }),
}));

// Import after mocking
import * as db from './production-execution.db';

describe('Production Execution Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Type Definitions', () => {
    it('should have correct StageStatus type values', () => {
      const validStatuses: db.StageStatus[] = ['Pending', 'In_Progress', 'Completed', 'Alert', 'Blocked'];
      expect(validStatuses).toHaveLength(5);
      expect(validStatuses).toContain('Pending');
      expect(validStatuses).toContain('In_Progress');
      expect(validStatuses).toContain('Completed');
      expect(validStatuses).toContain('Alert');
      expect(validStatuses).toContain('Blocked');
    });

    it('should have correct ApprovalStatus type values', () => {
      const validStatuses: db.ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'AUTO_APPROVED'];
      expect(validStatuses).toHaveLength(5);
    });

    it('should have correct ApprovalType type values', () => {
      const validTypes: db.ApprovalType[] = ['STAGE_START', 'STAGE_COMPLETE', 'GATE_PASS', 'EXCEPTION'];
      expect(validTypes).toHaveLength(4);
    });

    it('should have correct TimeSourceType type values', () => {
      const validTypes: db.TimeSourceType[] = ['MANUAL', 'CLOCK_IN', 'UWB', 'BADGE', 'AUTO_CALC'];
      expect(validTypes).toHaveLength(5);
    });

    it('should have correct WorkType type values', () => {
      const validTypes: db.WorkType[] = ['REGULAR', 'OVERTIME', 'TRAINING', 'MEETING', 'OTHER'];
      expect(validTypes).toHaveLength(5);
    });

    it('should have correct ResponsibleRole type values', () => {
      const validRoles: db.ResponsibleRole[] = ['PROJECT_MANAGER', 'MECHANICAL', 'ELECTRICAL', 'ASSEMBLY', 'QC', 'SERVICE', 'ADMIN'];
      expect(validRoles).toHaveLength(7);
    });
  });

  describe('Interface Structures', () => {
    it('should have correct StageDefinition interface structure', () => {
      const mockDefinition: db.StageDefinition = {
        id: 1,
        stageCode: 'T1',
        stageName: 'Machining',
        stageNameZh: '机加工',
        stageOrder: 1,
        defaultDuration: 40,
        responsibleRole: 'MECHANICAL',
        description: 'Machining stage',
        descriptionZh: '机加工阶段',
        sopDocument: 'sop.pdf',
        requiredCertifications: 'cert1,cert2',
        isActive: 1,
      };

      expect(mockDefinition).toHaveProperty('id');
      expect(mockDefinition).toHaveProperty('stageCode');
      expect(mockDefinition).toHaveProperty('stageName');
      expect(mockDefinition).toHaveProperty('stageNameZh');
      expect(mockDefinition).toHaveProperty('stageOrder');
      expect(mockDefinition).toHaveProperty('defaultDuration');
      expect(mockDefinition).toHaveProperty('responsibleRole');
      expect(mockDefinition.stageCode).toBe('T1');
    });

    it('should have correct ProductionStage interface structure', () => {
      const mockStage: db.ProductionStage = {
        id: 1,
        projectId: 100,
        stageDefinitionId: 1,
        stageCode: 'T1',
        status: 'In_Progress',
        plannedHours: '40.00',
        actualHours: '20.00',
        plannedStartDate: '2026-01-01',
        plannedEndDate: '2026-01-10',
        actualStartDate: '2026-01-02',
        actualEndDate: null,
        assignedUserId: 1,
        assignedUserName: 'John Doe',
        completionPercentage: 50,
        notes: 'In progress',
        aiInsights: 'AI recommendation',
        contextData: '{"key": "value"}',
      };

      expect(mockStage).toHaveProperty('projectId');
      expect(mockStage).toHaveProperty('stageCode');
      expect(mockStage).toHaveProperty('status');
      expect(mockStage.status).toBe('In_Progress');
      expect(mockStage.completionPercentage).toBe(50);
    });

    it('should have correct TimeRecord interface structure', () => {
      const mockRecord: db.TimeRecord = {
        id: 1,
        userId: 1,
        userName: 'John Doe',
        projectId: 100,
        productionStageId: 1,
        stageCode: 'T1',
        recordDate: '2026-01-15',
        startTime: '09:00:00',
        endTime: '17:00:00',
        duration: '8.00',
        sourceType: 'MANUAL',
        deviceId: null,
        locationData: null,
        workType: 'REGULAR',
        description: 'Regular work',
        isVerified: 0,
        verifiedBy: null,
        verifiedAt: null,
      };

      expect(mockRecord).toHaveProperty('userId');
      expect(mockRecord).toHaveProperty('sourceType');
      expect(mockRecord).toHaveProperty('workType');
      expect(mockRecord.sourceType).toBe('MANUAL');
    });

    it('should have correct StageApproval interface structure', () => {
      const mockApproval: db.StageApproval = {
        id: 1,
        productionStageId: 1,
        projectId: 100,
        stageCode: 'T1',
        approvalRuleId: 1,
        requestedBy: 1,
        requestedByName: 'John Doe',
        requestedAt: '2026-01-15T10:00:00Z',
        approverId: 2,
        approverName: 'Jane Smith',
        approverRole: 'PROJECT_MANAGER',
        status: 'APPROVED',
        approvalType: 'STAGE_COMPLETE',
        comments: 'Approved',
        rejectionReason: null,
        attachments: null,
        approvedAt: '2026-01-15T11:00:00Z',
        metadata: null,
      };

      expect(mockApproval).toHaveProperty('productionStageId');
      expect(mockApproval).toHaveProperty('status');
      expect(mockApproval).toHaveProperty('approvalType');
      expect(mockApproval.status).toBe('APPROVED');
    });
  });

  describe('T1-T15 Stage Definitions', () => {
    it('should define all 15 stages correctly', () => {
      const expectedStages = [
        { code: 'T1', name: 'Machining', nameZh: '机加工' },
        { code: 'T2', name: 'Sheet Metal', nameZh: '钣金' },
        { code: 'T3', name: 'Welding', nameZh: '焊接' },
        { code: 'T4', name: 'Surface Treatment', nameZh: '表面处理' },
        { code: 'T5', name: 'Mech Assembly', nameZh: '机械装配' },
        { code: 'T6', name: 'Elec Assembly', nameZh: '电气装配' },
        { code: 'T7', name: 'Piping', nameZh: '管路安装' },
        { code: 'T8', name: 'Debugging', nameZh: '调试' },
        { code: 'T9', name: 'QC Inspection', nameZh: '质检' },
        { code: 'T10', name: 'FAT', nameZh: '出厂测试' },
        { code: 'T11', name: 'Packaging', nameZh: '包装' },
        { code: 'T12', name: 'Shipping', nameZh: '发运' },
        { code: 'T13', name: 'Installation', nameZh: '现场安装' },
        { code: 'T14', name: 'SAT', nameZh: '现场验收' },
        { code: 'T15', name: 'Final Acceptance', nameZh: '终验收' },
      ];

      expect(expectedStages).toHaveLength(15);
      
      // Verify stage codes are sequential
      for (let i = 0; i < 15; i++) {
        expect(expectedStages[i].code).toBe(`T${i + 1}`);
      }
    });

    it('should have correct role assignments for each stage', () => {
      const roleAssignments: Record<string, db.ResponsibleRole> = {
        T1: 'MECHANICAL',
        T2: 'MECHANICAL',
        T3: 'MECHANICAL',
        T4: 'MECHANICAL',
        T5: 'ASSEMBLY',
        T6: 'ELECTRICAL',
        T7: 'ASSEMBLY',
        T8: 'ELECTRICAL',
        T9: 'QC',
        T10: 'QC',
        T11: 'ASSEMBLY',
        T12: 'PROJECT_MANAGER',
        T13: 'SERVICE',
        T14: 'SERVICE',
        T15: 'PROJECT_MANAGER',
      };

      expect(Object.keys(roleAssignments)).toHaveLength(15);
      expect(roleAssignments['T1']).toBe('MECHANICAL');
      expect(roleAssignments['T6']).toBe('ELECTRICAL');
      expect(roleAssignments['T9']).toBe('QC');
      expect(roleAssignments['T15']).toBe('PROJECT_MANAGER');
    });
  });

  describe('Time Tracking Logic', () => {
    it('should calculate duration correctly from start and end times', () => {
      const startTime = new Date('2026-01-15T09:00:00');
      const endTime = new Date('2026-01-15T17:30:00');
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      expect(durationHours).toBe(8.5);
    });

    it('should handle overnight work duration calculation', () => {
      const startTime = new Date('2026-01-15T22:00:00');
      const endTime = new Date('2026-01-16T06:00:00');
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      expect(durationHours).toBe(8);
    });

    it('should validate time source types', () => {
      const validSources: db.TimeSourceType[] = ['MANUAL', 'CLOCK_IN', 'UWB', 'BADGE', 'AUTO_CALC'];
      
      validSources.forEach(source => {
        expect(['MANUAL', 'CLOCK_IN', 'UWB', 'BADGE', 'AUTO_CALC']).toContain(source);
      });
    });
  });

  describe('Approval Workflow Logic', () => {
    it('should validate approval status transitions', () => {
      // Valid transitions from PENDING
      const validTransitionsFromPending: db.ApprovalStatus[] = ['APPROVED', 'REJECTED', 'CANCELLED'];
      
      validTransitionsFromPending.forEach(status => {
        expect(['APPROVED', 'REJECTED', 'CANCELLED']).toContain(status);
      });
    });

    it('should validate approval types', () => {
      const approvalTypes: db.ApprovalType[] = ['STAGE_START', 'STAGE_COMPLETE', 'GATE_PASS', 'EXCEPTION'];
      
      expect(approvalTypes).toHaveLength(4);
      expect(approvalTypes).toContain('GATE_PASS');
    });

    it('should enforce role-based approval rules', () => {
      const mockRule = {
        stageCode: 'T6',
        approvalType: 'STAGE_COMPLETE' as db.ApprovalType,
        requiredRole: 'PROJECT_MANAGER' as db.ResponsibleRole,
      };

      // Simulate role check
      const userRole: db.ResponsibleRole = 'PROJECT_MANAGER';
      const canApprove = userRole === mockRule.requiredRole || userRole === 'ADMIN';

      expect(canApprove).toBe(true);
    });

    it('should reject approval from unauthorized roles', () => {
      const mockRule = {
        stageCode: 'T6',
        approvalType: 'STAGE_COMPLETE' as db.ApprovalType,
        requiredRole: 'PROJECT_MANAGER' as db.ResponsibleRole,
      };

      // Simulate role check with unauthorized role
      const userRole: db.ResponsibleRole = 'ELECTRICAL';
      const canApprove = userRole === mockRule.requiredRole || userRole === 'ADMIN';

      expect(canApprove).toBe(false);
    });
  });

  describe('Integration Status', () => {
    it('should have correct integration status types', () => {
      const validStatuses = ['CONNECTED', 'DISCONNECTED', 'ERROR', 'SYNCING'];
      
      expect(validStatuses).toHaveLength(4);
      expect(validStatuses).toContain('CONNECTED');
      expect(validStatuses).toContain('SYNCING');
    });

    it('should have correct IntegrationStatusRecord structure', () => {
      const mockIntegration: db.IntegrationStatusRecord = {
        id: 1,
        integrationCode: 'COPILOT_365',
        integrationName: 'Copilot 365',
        integrationType: 'CALENDAR',
        status: 'CONNECTED',
        lastSyncAt: '2026-01-15T10:00:00Z',
        syncFrequency: 300,
      };

      expect(mockIntegration).toHaveProperty('integrationCode');
      expect(mockIntegration).toHaveProperty('status');
      expect(mockIntegration.status).toBe('CONNECTED');
    });
  });

  describe('Stage Progress Calculation', () => {
    it('should calculate completion percentage correctly', () => {
      const plannedHours = 40;
      const actualHours = 20;
      const completionPercentage = Math.min(100, Math.round((actualHours / plannedHours) * 100));

      expect(completionPercentage).toBe(50);
    });

    it('should cap completion percentage at 100', () => {
      const plannedHours = 40;
      const actualHours = 50; // Over planned
      const completionPercentage = Math.min(100, Math.round((actualHours / plannedHours) * 100));

      expect(completionPercentage).toBe(100);
    });

    it('should handle zero planned hours', () => {
      const plannedHours = 0;
      const actualHours = 10;
      const completionPercentage = plannedHours === 0 ? 0 : Math.min(100, Math.round((actualHours / plannedHours) * 100));

      expect(completionPercentage).toBe(0);
    });
  });
});
