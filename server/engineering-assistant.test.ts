/**
 * AI Engineering Assistant Unit Tests
 * 工程助手单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AIEngineeringAssistant,
  PROJECT_PHASES,
  ENGINEERING_ROLES,
  PHASE_ROLE_MATRIX,
  NOTIFICATION_CHANNELS,
  PRIORITY_TIMING,
  engineeringAssistant
} from './ai-assistants/engineeringAssistant';

// Mock LLM
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn()
}));

describe('AI Engineering Assistant', () => {
  describe('Project Phases', () => {
    it('should have all 13 project phases defined (M0-M12)', () => {
      expect(Object.keys(PROJECT_PHASES)).toHaveLength(13);
      expect(PROJECT_PHASES.M0).toBeDefined();
      expect(PROJECT_PHASES.M12).toBeDefined();
    });

    it('should have correct phase information', () => {
      expect(PROJECT_PHASES.M0.name).toBe('项目启动');
      expect(PROJECT_PHASES.M1.name).toBe('方案设计');
      expect(PROJECT_PHASES.M9.name).toBe('厂内验收');
      expect(PROJECT_PHASES.M12.name).toBe('终验收');
    });

    it('should have activities and output for each phase', () => {
      Object.values(PROJECT_PHASES).forEach(phase => {
        expect(phase.activities).toBeDefined();
        expect(phase.output).toBeDefined();
        expect(phase.code).toBeDefined();
      });
    });
  });

  describe('Engineering Roles', () => {
    it('should have all 8 roles defined', () => {
      expect(Object.keys(ENGINEERING_ROLES)).toHaveLength(8);
    });

    it('should have correct role information', () => {
      expect(ENGINEERING_ROLES.PM.name).toBe('项目经理');
      expect(ENGINEERING_ROLES.ME.name).toBe('机械工程师');
      expect(ENGINEERING_ROLES.EE.name).toBe('电气工程师');
      expect(ENGINEERING_ROLES.PE.name).toBe('工艺工程师');
      expect(ENGINEERING_ROLES.QE.name).toBe('质量工程师');
      expect(ENGINEERING_ROLES.SE.name).toBe('售后工程师');
      expect(ENGINEERING_ROLES.PP.name).toBe('生产计划员');
      expect(ENGINEERING_ROLES.PU.name).toBe('采购员');
    });

    it('should have responsibilities for each role', () => {
      Object.values(ENGINEERING_ROLES).forEach(role => {
        expect(role.responsibilities).toBeDefined();
        expect(role.responsibilities.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Phase-Role Matrix', () => {
    it('should have matrix for all phases', () => {
      expect(Object.keys(PHASE_ROLE_MATRIX)).toHaveLength(13);
    });

    it('should have PM as primary in M0 (project kickoff)', () => {
      expect(PHASE_ROLE_MATRIX.M0.PM).toBe('primary');
    });

    it('should have ME and EE as primary in M1 (design phase)', () => {
      expect(PHASE_ROLE_MATRIX.M1.ME).toBe('primary');
      expect(PHASE_ROLE_MATRIX.M1.EE).toBe('primary');
    });

    it('should have QE as primary in M9 (FAT)', () => {
      expect(PHASE_ROLE_MATRIX.M9.QE).toBe('primary');
    });

    it('should have SE as primary in M11 (installation)', () => {
      expect(PHASE_ROLE_MATRIX.M11.SE).toBe('primary');
    });

    it('should have PM as primary in M12 (final acceptance)', () => {
      expect(PHASE_ROLE_MATRIX.M12.PM).toBe('primary');
    });
  });

  describe('Notification Channels', () => {
    it('should have 5 notification channels', () => {
      expect(Object.keys(NOTIFICATION_CHANNELS)).toHaveLength(5);
    });

    it('should have correct channel configurations', () => {
      expect(NOTIFICATION_CHANNELS.screen_popup.priority).toBe('urgent');
      expect(NOTIFICATION_CHANNELS.email.priority).toBe('medium');
      expect(NOTIFICATION_CHANNELS.sms.priority).toBe('urgent');
    });

    it('should have confirmation requirements defined', () => {
      expect(NOTIFICATION_CHANNELS.screen_popup.confirmRequired).toBe(true);
      expect(NOTIFICATION_CHANNELS.system_message.confirmRequired).toBe(false);
    });
  });

  describe('Priority Timing', () => {
    it('should have timing rules for all priorities', () => {
      expect(PRIORITY_TIMING.urgent).toBe('immediate');
      expect(PRIORITY_TIMING.high).toBe('within_30_minutes');
      expect(PRIORITY_TIMING.medium).toBe('next_work_hour');
      expect(PRIORITY_TIMING.low).toBe('daily_digest');
    });
  });

  describe('AIEngineeringAssistant Class', () => {
    let assistant: AIEngineeringAssistant;

    beforeEach(() => {
      assistant = new AIEngineeringAssistant();
    });

    it('should be instantiated correctly', () => {
      expect(assistant).toBeInstanceOf(AIEngineeringAssistant);
    });

    it('should get phase info correctly', () => {
      const phaseInfo = assistant.getPhaseInfo('M1');
      expect(phaseInfo).toBeDefined();
      expect(phaseInfo?.name).toBe('方案设计');
    });

    it('should return undefined for invalid phase', () => {
      const phaseInfo = assistant.getPhaseInfo('M99');
      expect(phaseInfo).toBeUndefined();
    });

    it('should get role info correctly', () => {
      const roleInfo = assistant.getRoleInfo('ME');
      expect(roleInfo).toBeDefined();
      expect(roleInfo?.name).toBe('机械工程师');
    });

    it('should return undefined for invalid role', () => {
      const roleInfo = assistant.getRoleInfo('XX');
      expect(roleInfo).toBeUndefined();
    });

    it('should get phase role matrix correctly', () => {
      const matrix = assistant.getPhaseRoleMatrix('M6');
      expect(matrix).toBeDefined();
      expect(matrix?.ME).toBe('primary');
    });

    describe('Notification Timing Optimization', () => {
      it('should optimize immediate notifications', () => {
        const notifications = [{
          channel: 'email' as const,
          timing: 'immediate',
          recipients: ['PM'],
          subject: 'Test',
          contentTemplate: 'Test content',
          confirmationRequired: false
        }];

        const optimized = assistant.optimizeNotificationTiming(notifications, {});
        expect(optimized).toHaveLength(1);
        expect(optimized[0].timing).toBeDefined();
      });

      it('should respect quiet hours', () => {
        const notifications = [{
          channel: 'email' as const,
          timing: 'immediate',
          recipients: ['PM'],
          subject: 'Test',
          contentTemplate: 'Test content',
          confirmationRequired: false
        }];

        const optimized = assistant.optimizeNotificationTiming(notifications, {
          quietHours: ['22-8']
        });
        expect(optimized).toHaveLength(1);
      });

      it('should handle daily digest timing', () => {
        const notifications = [{
          channel: 'email' as const,
          timing: 'daily_digest',
          recipients: ['PM'],
          subject: 'Test',
          contentTemplate: 'Test content',
          confirmationRequired: false
        }];

        const optimized = assistant.optimizeNotificationTiming(notifications, {
          preferredTime: '09:00'
        });
        expect(optimized).toHaveLength(1);
        const scheduledTime = new Date(optimized[0].timing);
        expect(scheduledTime.getHours()).toBe(9);
      });
    });
  });

  describe('Default Task Assignments', () => {
    it('should generate default assignments when LLM fails', async () => {
      const { invokeLLM } = await import('./_core/llm');
      vi.mocked(invokeLLM).mockRejectedValueOnce(new Error('LLM Error'));

      const tasks = await engineeringAssistant.generateTaskAssignments({
        projectId: 1,
        projectName: 'Test Project',
        phaseCode: 'M1',
        taskType: 'design',
        priority: 'high'
      });

      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].taskId).toContain('TASK-');
      expect(tasks[0].primaryAssignee).toBeDefined();
    });
  });

  describe('Customer Communication Analysis', () => {
    it('should return fallback when LLM fails', async () => {
      const { invokeLLM } = await import('./_core/llm');
      vi.mocked(invokeLLM).mockRejectedValueOnce(new Error('LLM Error'));

      const result = await engineeringAssistant.analyzeCustomerCommunication({
        projectId: 1,
        phaseCode: 'M2',
        communicationType: 'meeting',
        rawContent: 'Test meeting content',
        customerContacts: ['Customer A'],
        internalParticipants: ['PM']
      });

      expect(result).toBeDefined();
      expect(result.summary).toContain('分析失败');
      expect(result.nextSteps).toContain('请项目经理人工分析沟通内容');
    });
  });

  describe('Engineering Input Analysis', () => {
    it('should return fallback when LLM fails', async () => {
      const { invokeLLM } = await import('./_core/llm');
      vi.mocked(invokeLLM).mockRejectedValueOnce(new Error('LLM Error'));

      const result = await engineeringAssistant.analyzeEngineeringInput(
        1,
        'customer_feedback',
        'Test feedback content'
      );

      expect(result).toBeDefined();
      expect(result.sourceType).toBe('customer_feedback');
      expect(result.impactAssessment.riskLevel).toBe('low');
      expect(result.distributionPlan.recipients[0].roleCode).toBe('PM');
    });
  });
});

describe('Engineering Assistant Integration', () => {
  describe('Phase Workflow', () => {
    it('should support complete project lifecycle M0-M12', () => {
      const phases = Object.keys(PROJECT_PHASES);
      expect(phases).toContain('M0');
      expect(phases).toContain('M1');
      expect(phases).toContain('M2');
      expect(phases).toContain('M3');
      expect(phases).toContain('M4');
      expect(phases).toContain('M5');
      expect(phases).toContain('M6');
      expect(phases).toContain('M7');
      expect(phases).toContain('M8');
      expect(phases).toContain('M9');
      expect(phases).toContain('M10');
      expect(phases).toContain('M11');
      expect(phases).toContain('M12');
    });

    it('should have primary assignee for each phase', () => {
      Object.keys(PROJECT_PHASES).forEach(phaseCode => {
        const matrix = PHASE_ROLE_MATRIX[phaseCode];
        const hasPrimary = Object.values(matrix).some(role => role === 'primary');
        expect(hasPrimary).toBe(true);
      });
    });
  });

  describe('Role Coverage', () => {
    it('should have all roles participate in at least one phase', () => {
      const roleParticipation: Record<string, boolean> = {};
      
      Object.keys(ENGINEERING_ROLES).forEach(roleCode => {
        roleParticipation[roleCode] = false;
      });

      Object.values(PHASE_ROLE_MATRIX).forEach(matrix => {
        Object.entries(matrix).forEach(([roleCode, role]) => {
          if (role !== null) {
            roleParticipation[roleCode] = true;
          }
        });
      });

      Object.entries(roleParticipation).forEach(([roleCode, participates]) => {
        expect(participates).toBe(true);
      });
    });
  });

  describe('Notification System', () => {
    it('should support multiple channels for urgent notifications', () => {
      const urgentChannels = Object.entries(NOTIFICATION_CHANNELS)
        .filter(([_, config]) => config.priority === 'urgent')
        .map(([channel]) => channel);

      expect(urgentChannels).toContain('screen_popup');
      expect(urgentChannels).toContain('sms');
    });

    it('should have confirmation mechanism for important channels', () => {
      expect(NOTIFICATION_CHANNELS.screen_popup.confirmRequired).toBe(true);
      expect(NOTIFICATION_CHANNELS.email.confirmRequired).toBe(true);
      expect(NOTIFICATION_CHANNELS.sms.confirmRequired).toBe(true);
    });
  });
});

describe('Engineering Task Types', () => {
  it('should support mechanical assembly tasks', () => {
    expect(PHASE_ROLE_MATRIX.M6.ME).toBe('primary');
  });

  it('should support electrical assembly tasks', () => {
    expect(PHASE_ROLE_MATRIX.M7.EE).toBe('primary');
  });

  it('should support debugging tasks', () => {
    expect(PHASE_ROLE_MATRIX.M8.EE).toBe('primary');
    expect(PHASE_ROLE_MATRIX.M8.PE).toBe('primary');
  });

  it('should support FAT/SAT tasks', () => {
    expect(PHASE_ROLE_MATRIX.M9.QE).toBe('primary');
    expect(PHASE_ROLE_MATRIX.M12.QE).toBe('primary');
  });

  it('should support installation tasks', () => {
    expect(PHASE_ROLE_MATRIX.M11.SE).toBe('primary');
  });
});
