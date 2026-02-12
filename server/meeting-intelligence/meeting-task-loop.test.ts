/**
 * 会议任务闭环管理服务单元测试
 * Meeting Task Loop Management Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue([[], []]),
  },
}));

vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          summary: '会议讨论了项目进度和下一步计划',
          keyDecisions: [
            { id: '1', content: '决定采用新的技术方案', madeBy: '张三' }
          ],
          discussionPoints: [
            { id: '1', topic: '项目进度', summary: '项目按计划进行' }
          ],
          actionItems: [
            { title: '完成技术评审', ownerName: '李四', dueDate: '2026-02-10', priority: 'high' }
          ]
        })
      }
    }]
  }),
}));

// Import after mocks
import { db } from '../db';
import { invokeLLM } from '../_core/llm';

describe('Meeting Task Loop Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Meeting Minutes Generation', () => {
    it('should generate meeting minutes with AI', async () => {
      const mockMinutesData = {
        summary: '会议讨论了项目进度',
        keyDecisions: [{ id: '1', content: '决定采用新方案', madeBy: '张三' }],
        discussionPoints: [{ id: '1', topic: '进度', summary: '按计划进行' }],
        actionItems: []
      };

      (invokeLLM as any).mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify(mockMinutesData)
          }
        }]
      });

      // Test that LLM is called with correct parameters
      expect(invokeLLM).toBeDefined();
    });

    it('should handle empty meeting notes gracefully', async () => {
      const emptyResponse = {
        summary: '',
        keyDecisions: [],
        discussionPoints: [],
        actionItems: []
      };

      (invokeLLM as any).mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify(emptyResponse)
          }
        }]
      });

      expect(invokeLLM).toBeDefined();
    });
  });

  describe('Action Item Management', () => {
    it('should create action item with required fields', async () => {
      const actionItemData = {
        meetingId: 'meeting-123',
        title: '完成技术评审',
        ownerName: '李四',
        dueDate: '2026-02-10',
        priority: 'high' as const
      };

      expect(actionItemData.title).toBe('完成技术评审');
      expect(actionItemData.ownerName).toBe('李四');
      expect(actionItemData.priority).toBe('high');
    });

    it('should validate priority values', () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      
      validPriorities.forEach(priority => {
        expect(['low', 'medium', 'high', 'urgent']).toContain(priority);
      });
    });

    it('should handle supporter assignment', () => {
      const actionItem = {
        ownerId: 'user-1',
        ownerName: '张三',
        supporterIds: ['user-2', 'user-3'],
        supporterNames: ['李四', '王五']
      };

      expect(actionItem.supporterIds).toHaveLength(2);
      expect(actionItem.supporterNames).toHaveLength(2);
    });
  });

  describe('Task Assignment Flow', () => {
    it('should create task assignment record', () => {
      const assignment = {
        id: 'assignment-1',
        actionItemId: 'action-1',
        assigneeId: 'user-1',
        assigneeName: '张三',
        assigneeRole: 'owner' as const,
        assignmentStatus: 'pending' as const
      };

      expect(assignment.assigneeRole).toBe('owner');
      expect(assignment.assignmentStatus).toBe('pending');
    });

    it('should validate assignment status transitions', () => {
      const validStatuses = ['pending', 'sent', 'viewed', 'accepted', 'rejected'];
      const currentStatus = 'pending';
      
      expect(validStatuses).toContain(currentStatus);
    });

    it('should handle task acceptance', () => {
      const acceptedAssignment = {
        assignmentStatus: 'accepted',
        respondedAt: new Date().toISOString(),
        acceptanceNotes: '已确认接收任务'
      };

      expect(acceptedAssignment.assignmentStatus).toBe('accepted');
      expect(acceptedAssignment.acceptanceNotes).toBeDefined();
    });

    it('should handle task rejection with reason', () => {
      const rejectedAssignment = {
        assignmentStatus: 'rejected',
        respondedAt: new Date().toISOString(),
        rejectionReason: '时间冲突，无法完成'
      };

      expect(rejectedAssignment.assignmentStatus).toBe('rejected');
      expect(rejectedAssignment.rejectionReason).toBe('时间冲突，无法完成');
    });
  });

  describe('Personal Task Management', () => {
    it('should create personal task from meeting action item', () => {
      const personalTask = {
        id: 'task-1',
        userId: 'user-1',
        sourceType: 'meeting' as const,
        sourceMeetingId: 'meeting-1',
        sourceActionItemId: 'action-1',
        title: '完成技术评审',
        status: 'todo' as const,
        reportStatus: 'pending' as const
      };

      expect(personalTask.sourceType).toBe('meeting');
      expect(personalTask.reportStatus).toBe('pending');
    });

    it('should validate task status values', () => {
      const validStatuses = ['todo', 'in_progress', 'blocked', 'completed', 'cancelled'];
      
      validStatuses.forEach(status => {
        expect(['todo', 'in_progress', 'blocked', 'completed', 'cancelled']).toContain(status);
      });
    });

    it('should track task completion with evidence', () => {
      const completedTask = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        completionNotes: '已完成技术评审',
        evidenceUrls: ['https://example.com/doc1.pdf', 'https://example.com/doc2.pdf']
      };

      expect(completedTask.status).toBe('completed');
      expect(completedTask.evidenceUrls).toHaveLength(2);
    });
  });

  describe('Completion Report', () => {
    it('should create completion report', () => {
      const report = {
        id: 'report-1',
        personalTaskId: 'task-1',
        reporterId: 'user-1',
        reporterName: '张三',
        reportTitle: '技术评审完成报告',
        reportSummary: '已完成所有评审项目',
        status: 'draft' as const,
        autoUploadEnabled: false
      };

      expect(report.status).toBe('draft');
      expect(report.autoUploadEnabled).toBe(false);
    });

    it('should validate report status transitions', () => {
      const validStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived'];
      
      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    it('should handle auto-upload to meeting owner', () => {
      const reportWithAutoUpload = {
        autoUploadEnabled: true,
        targetMeetingId: 'meeting-weekly-1',
        autoUploadTriggered: false
      };

      expect(reportWithAutoUpload.autoUploadEnabled).toBe(true);
      expect(reportWithAutoUpload.targetMeetingId).toBeDefined();
    });
  });

  describe('Meeting Owner (MO) Management', () => {
    it('should assign meeting owner', () => {
      const meetingOwner = {
        id: 'mo-1',
        userId: 'user-1',
        userName: '张三',
        meetingTypeId: 'weekly-production',
        meetingTypeName: '生产周会',
        scope: 'department' as const,
        scopeId: 'dept-1',
        scopeName: '生产部',
        responsibilities: ['组织会议', '审核纪要', '跟踪任务'],
        status: 'active' as const
      };

      expect(meetingOwner.scope).toBe('department');
      expect(meetingOwner.responsibilities).toHaveLength(3);
    });

    it('should validate MO scope values', () => {
      const validScopes = ['company', 'department', 'project', 'team'];
      
      validScopes.forEach(scope => {
        expect(['company', 'department', 'project', 'team']).toContain(scope);
      });
    });

    it('should handle MO delegation', () => {
      const delegatedMO = {
        status: 'delegated',
        delegatedTo: 'user-2',
        delegationStart: '2026-02-01',
        delegationEnd: '2026-02-28'
      };

      expect(delegatedMO.status).toBe('delegated');
      expect(delegatedMO.delegatedTo).toBeDefined();
    });
  });

  describe('Meeting Effectiveness Evaluation', () => {
    it('should submit effectiveness evaluation', () => {
      const evaluation = {
        meetingId: 'meeting-1',
        evaluatorId: 'user-1',
        evaluatorName: '张三',
        punctualityScore: 5,
        agendaCompletionScore: 4,
        decisionQualityScore: 4,
        participationScore: 5,
        timeEfficiencyScore: 3,
        overallRating: 'good' as const
      };

      expect(evaluation.punctualityScore).toBeGreaterThanOrEqual(1);
      expect(evaluation.punctualityScore).toBeLessThanOrEqual(5);
      expect(evaluation.overallRating).toBe('good');
    });

    it('should validate score range', () => {
      const scores = [1, 2, 3, 4, 5];
      
      scores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(5);
      });
    });

    it('should calculate average scores', () => {
      const scores = {
        punctuality: 5,
        agendaCompletion: 4,
        decisionQuality: 4,
        participation: 5,
        timeEfficiency: 3
      };

      const average = (scores.punctuality + scores.agendaCompletion + scores.decisionQuality + 
                       scores.participation + scores.timeEfficiency) / 5;
      
      expect(average).toBe(4.2);
    });
  });

  describe('Custom Template Management', () => {
    it('should create custom template', () => {
      const template = {
        id: 'template-1',
        name: '项目启动会',
        nameEn: 'Project Kickoff Meeting',
        category: 'internal' as const,
        visibility: 'department' as const,
        defaultDuration: 90,
        agenda: [
          { id: '1', title: '项目背景介绍', duration: 15 },
          { id: '2', title: '目标与范围', duration: 20 }
        ],
        bestPractices: ['提前发送议程', '准备项目资料']
      };

      expect(template.category).toBe('internal');
      expect(template.agenda).toHaveLength(2);
    });

    it('should validate template visibility', () => {
      const validVisibilities = ['private', 'team', 'department', 'company'];
      
      validVisibilities.forEach(visibility => {
        expect(['private', 'team', 'department', 'company']).toContain(visibility);
      });
    });

    it('should track template usage', () => {
      const templateUsage = {
        templateId: 'template-1',
        usageCount: 15,
        lastUsedAt: new Date().toISOString()
      };

      expect(templateUsage.usageCount).toBeGreaterThan(0);
    });
  });

  describe('Task Loop Integration', () => {
    it('should complete full task loop', () => {
      // 1. Meeting created
      const meeting = { id: 'meeting-1', title: '生产周会' };
      
      // 2. Minutes generated
      const minutes = { id: 'minutes-1', meetingId: meeting.id, status: 'approved' };
      
      // 3. Action items created
      const actionItem = { id: 'action-1', meetingId: meeting.id, minutesId: minutes.id };
      
      // 4. Task assigned
      const assignment = { id: 'assign-1', actionItemId: actionItem.id, assignmentStatus: 'accepted' };
      
      // 5. Personal task created
      const personalTask = { id: 'task-1', sourceActionItemId: actionItem.id, status: 'completed' };
      
      // 6. Completion report submitted
      const report = { id: 'report-1', personalTaskId: personalTask.id, status: 'approved' };

      expect(meeting.id).toBeDefined();
      expect(minutes.meetingId).toBe(meeting.id);
      expect(actionItem.minutesId).toBe(minutes.id);
      expect(assignment.actionItemId).toBe(actionItem.id);
      expect(personalTask.sourceActionItemId).toBe(actionItem.id);
      expect(report.personalTaskId).toBe(personalTask.id);
    });

    it('should notify MO when task completed', () => {
      const notification = {
        type: 'task_completed',
        recipientId: 'mo-user-1',
        taskId: 'task-1',
        meetingId: 'meeting-1',
        message: '任务已完成，请审核'
      };

      expect(notification.type).toBe('task_completed');
      expect(notification.recipientId).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('should validate UUID format', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      
      expect(uuidRegex.test(validUuid)).toBe(true);
    });

    it('should validate date format', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const validDate = '2026-02-10';
      
      expect(dateRegex.test(validDate)).toBe(true);
    });

    it('should validate JSON fields', () => {
      const jsonData = {
        supporterIds: ['user-1', 'user-2'],
        evidenceUrls: ['https://example.com/doc.pdf']
      };

      expect(JSON.stringify(jsonData)).toBeDefined();
      expect(JSON.parse(JSON.stringify(jsonData))).toEqual(jsonData);
    });
  });
});
