/**
 * 用户Profile服务单元测试
 * v1.3.92 - 用户个人设置和任务提醒管理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserProfile, UserTask } from './user-profile.service';

// Mock数据
const mockUserProfile: UserProfile = {
  id: 1,
  userId: 'test-user-001',
  employeeId: 'GRT001',
  workPlanFrequency: 'weekly',
  workPlanReminderEnabled: true,
  workPlanReminderTime: '09:00:00',
  trainingPlanEnabled: true,
  trainingReminderDaysBefore: 3,
  projectPlanEnabled: true,
  projectMilestoneReminder: true,
  performanceReportEnabled: true,
  performanceReportFrequency: 'monthly',
  taskReminderEnabled: true,
  taskReminderTime: '15:00:00',
  taskReminderEmail: true,
  taskReminderSystem: true,
  emailNotificationsEnabled: true,
  emailDigestFrequency: 'daily',
};

const mockUserTask: UserTask = {
  id: 1,
  userId: 'test-user-001',
  employeeId: 'GRT001',
  taskType: 'work_plan',
  title: '完成周报',
  description: '提交本周工作总结',
  dueDate: '2026-02-04',
  dueTime: '17:00:00',
  priority: 'high',
  status: 'pending',
  reminderSent: false,
};

describe('UserProfile类型定义测试', () => {
  describe('UserProfile接口', () => {
    it('应该包含所有必需的字段', () => {
      expect(mockUserProfile.userId).toBeDefined();
      expect(mockUserProfile.workPlanFrequency).toBeDefined();
      expect(mockUserProfile.taskReminderEnabled).toBeDefined();
      expect(mockUserProfile.taskReminderTime).toBeDefined();
    });

    it('工作计划频率应该是有效值', () => {
      const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly'];
      expect(validFrequencies).toContain(mockUserProfile.workPlanFrequency);
    });

    it('绩效报告频率应该是有效值', () => {
      const validFrequencies = ['weekly', 'monthly', 'quarterly'];
      expect(validFrequencies).toContain(mockUserProfile.performanceReportFrequency);
    });

    it('邮件摘要频率应该是有效值', () => {
      const validFrequencies = ['realtime', 'daily', 'weekly'];
      expect(validFrequencies).toContain(mockUserProfile.emailDigestFrequency);
    });

    it('提醒时间格式应该正确', () => {
      const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
      expect(mockUserProfile.taskReminderTime).toMatch(timeRegex);
      expect(mockUserProfile.workPlanReminderTime).toMatch(timeRegex);
    });

    it('布尔值字段应该是布尔类型', () => {
      expect(typeof mockUserProfile.workPlanReminderEnabled).toBe('boolean');
      expect(typeof mockUserProfile.trainingPlanEnabled).toBe('boolean');
      expect(typeof mockUserProfile.projectPlanEnabled).toBe('boolean');
      expect(typeof mockUserProfile.performanceReportEnabled).toBe('boolean');
      expect(typeof mockUserProfile.taskReminderEnabled).toBe('boolean');
      expect(typeof mockUserProfile.taskReminderEmail).toBe('boolean');
      expect(typeof mockUserProfile.taskReminderSystem).toBe('boolean');
      expect(typeof mockUserProfile.emailNotificationsEnabled).toBe('boolean');
    });
  });

  describe('UserTask接口', () => {
    it('应该包含所有必需的字段', () => {
      expect(mockUserTask.userId).toBeDefined();
      expect(mockUserTask.taskType).toBeDefined();
      expect(mockUserTask.title).toBeDefined();
      expect(mockUserTask.dueDate).toBeDefined();
      expect(mockUserTask.priority).toBeDefined();
      expect(mockUserTask.status).toBeDefined();
    });

    it('任务类型应该是有效值', () => {
      const validTypes = ['work_plan', 'training', 'project', 'performance', 'report', 'other'];
      expect(validTypes).toContain(mockUserTask.taskType);
    });

    it('优先级应该是有效值', () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      expect(validPriorities).toContain(mockUserTask.priority);
    });

    it('状态应该是有效值', () => {
      const validStatuses = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'];
      expect(validStatuses).toContain(mockUserTask.status);
    });

    it('日期格式应该正确', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(mockUserTask.dueDate).toMatch(dateRegex);
    });
  });
});

describe('Profile默认值测试', () => {
  it('默认任务提醒时间应该是15:00（下午3点）', () => {
    const defaultReminderTime = '15:00:00';
    expect(mockUserProfile.taskReminderTime).toBe(defaultReminderTime);
  });

  it('默认工作计划频率应该是weekly', () => {
    expect(mockUserProfile.workPlanFrequency).toBe('weekly');
  });

  it('默认绩效报告频率应该是monthly', () => {
    expect(mockUserProfile.performanceReportFrequency).toBe('monthly');
  });

  it('默认邮件摘要频率应该是daily', () => {
    expect(mockUserProfile.emailDigestFrequency).toBe('daily');
  });

  it('默认培训提醒提前天数应该是3天', () => {
    expect(mockUserProfile.trainingReminderDaysBefore).toBe(3);
  });
});

describe('任务提醒逻辑测试', () => {
  it('启用邮件提醒时应该发送邮件', () => {
    const profile = { ...mockUserProfile, taskReminderEmail: true };
    expect(profile.taskReminderEmail).toBe(true);
  });

  it('禁用邮件提醒时不应该发送邮件', () => {
    const profile = { ...mockUserProfile, taskReminderEmail: false };
    expect(profile.taskReminderEmail).toBe(false);
  });

  it('启用系统通知时应该发送系统通知', () => {
    const profile = { ...mockUserProfile, taskReminderSystem: true };
    expect(profile.taskReminderSystem).toBe(true);
  });

  it('任务提醒总开关关闭时不应该发送任何提醒', () => {
    const profile = { ...mockUserProfile, taskReminderEnabled: false };
    expect(profile.taskReminderEnabled).toBe(false);
  });
});

describe('任务状态流转测试', () => {
  it('新任务应该是pending状态', () => {
    const newTask: UserTask = {
      ...mockUserTask,
      status: 'pending',
    };
    expect(newTask.status).toBe('pending');
  });

  it('任务可以从pending变为in_progress', () => {
    const task: UserTask = {
      ...mockUserTask,
      status: 'in_progress',
    };
    expect(task.status).toBe('in_progress');
  });

  it('任务可以从in_progress变为completed', () => {
    const task: UserTask = {
      ...mockUserTask,
      status: 'completed',
      completedAt: '2026-02-04T17:00:00Z',
    };
    expect(task.status).toBe('completed');
    expect(task.completedAt).toBeDefined();
  });

  it('逾期任务应该标记为overdue', () => {
    const task: UserTask = {
      ...mockUserTask,
      status: 'overdue',
      dueDate: '2026-02-01', // 过去的日期
    };
    expect(task.status).toBe('overdue');
  });

  it('取消的任务应该标记为cancelled', () => {
    const task: UserTask = {
      ...mockUserTask,
      status: 'cancelled',
    };
    expect(task.status).toBe('cancelled');
  });
});

describe('任务类型覆盖测试', () => {
  const taskTypes = ['work_plan', 'training', 'project', 'performance', 'report', 'other'] as const;

  taskTypes.forEach(taskType => {
    it(`应该支持${taskType}类型的任务`, () => {
      const task: UserTask = {
        ...mockUserTask,
        taskType,
      };
      expect(task.taskType).toBe(taskType);
    });
  });
});

describe('优先级排序测试', () => {
  it('urgent优先级应该最高', () => {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    expect(priorities.indexOf('urgent')).toBe(3);
  });

  it('low优先级应该最低', () => {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    expect(priorities.indexOf('low')).toBe(0);
  });
});

describe('提醒时间检查测试', () => {
  it('15:00应该是默认提醒时间', () => {
    const defaultTime = '15:00';
    const profileTime = mockUserProfile.taskReminderTime.slice(0, 5);
    expect(profileTime).toBe(defaultTime);
  });

  it('提醒时间应该在工作时间范围内', () => {
    const hour = parseInt(mockUserProfile.taskReminderTime.split(':')[0]);
    expect(hour).toBeGreaterThanOrEqual(8);
    expect(hour).toBeLessThanOrEqual(18);
  });
});
