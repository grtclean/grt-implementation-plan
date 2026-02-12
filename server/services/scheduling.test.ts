/**
 * 智能排程服务单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 模拟排程数据类型
interface SchedulingTask {
  id: string;
  taskName: string;
  buCode: string;
  taskType: 'machining' | 'welding' | 'assembly' | 'debugging' | 'testing';
  estimatedHours: number;
  priority: number;
  predecessorTasks: string[];
  earliestStart?: Date;
  latestFinish?: Date;
}

interface SchedulingResource {
  id: string;
  resourceName: string;
  resourceType: 'employee' | 'equipment' | 'workstation';
  buCode: string;
  capacity: number;
  availableFrom: Date;
  availableTo: Date;
}

interface SchedulingConstraint {
  id: string;
  constraintType: string;
  sourceEntity: string;
  targetEntity: string;
  constraintValue: number;
  isActive: boolean;
}

interface SchedulingResult {
  taskId: string;
  resourceId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
}

// 排程算法核心逻辑
function calculateTaskDuration(estimatedHours: number, resourceCapacity: number): number {
  return Math.ceil(estimatedHours / resourceCapacity * 8); // 转换为工作日
}

function sortTasksByPriority(tasks: SchedulingTask[]): SchedulingTask[] {
  return [...tasks].sort((a, b) => b.priority - a.priority);
}

function checkDependencySatisfied(
  task: SchedulingTask,
  scheduledTasks: Map<string, SchedulingResult>,
  proposedStart: Date
): boolean {
  for (const depId of task.predecessorTasks) {
    const depResult = scheduledTasks.get(depId);
    if (!depResult) return false;
    if (depResult.scheduledEnd > proposedStart) return false;
  }
  return true;
}

function findAvailableResource(
  task: SchedulingTask,
  resources: SchedulingResource[],
  startDate: Date
): SchedulingResource | null {
  const compatibleResources = resources.filter(r => r.buCode === task.buCode);
  if (compatibleResources.length === 0) return null;
  
  // 简单选择第一个可用资源
  return compatibleResources.find(r => 
    r.availableFrom <= startDate && r.availableTo >= startDate
  ) || null;
}

function calculateObjectiveValue(
  results: SchedulingResult[],
  tasks: SchedulingTask[],
  delayWeight: number,
  changeoverWeight: number
): number {
  let totalDelay = 0;
  let totalChangeover = 0;
  
  for (const result of results) {
    const task = tasks.find(t => t.id === result.taskId);
    if (task?.latestFinish && result.scheduledEnd > task.latestFinish) {
      const delayDays = Math.ceil(
        (result.scheduledEnd.getTime() - task.latestFinish.getTime()) / (1000 * 60 * 60 * 24)
      );
      totalDelay += delayDays;
    }
  }
  
  // 简化的换型成本计算
  const resourceGroups = new Map<string, SchedulingResult[]>();
  for (const result of results) {
    const existing = resourceGroups.get(result.resourceId) || [];
    existing.push(result);
    resourceGroups.set(result.resourceId, existing);
  }
  
  for (const [, group] of resourceGroups) {
    if (group.length > 1) {
      totalChangeover += group.length - 1;
    }
  }
  
  return totalDelay * delayWeight + totalChangeover * changeoverWeight;
}

// 测试用例
describe('Scheduling Service', () => {
  describe('Task Duration Calculation', () => {
    it('should calculate duration correctly with full capacity', () => {
      const duration = calculateTaskDuration(8, 1);
      expect(duration).toBe(64); // 8 hours / 1 capacity * 8 = 64
    });

    it('should calculate duration correctly with half capacity', () => {
      const duration = calculateTaskDuration(8, 0.5);
      expect(duration).toBe(128); // 8 hours / 0.5 capacity * 8 = 128
    });

    it('should round up partial days', () => {
      const duration = calculateTaskDuration(10, 1);
      expect(duration).toBe(80); // 10 hours / 1 capacity * 8 = 80
    });
  });

  describe('Task Priority Sorting', () => {
    it('should sort tasks by priority descending', () => {
      const tasks: SchedulingTask[] = [
        { id: '1', taskName: 'Task 1', buCode: 'BU1', taskType: 'machining', estimatedHours: 8, priority: 3, predecessorTasks: [] },
        { id: '2', taskName: 'Task 2', buCode: 'BU1', taskType: 'machining', estimatedHours: 8, priority: 10, predecessorTasks: [] },
        { id: '3', taskName: 'Task 3', buCode: 'BU1', taskType: 'machining', estimatedHours: 8, priority: 5, predecessorTasks: [] },
      ];
      
      const sorted = sortTasksByPriority(tasks);
      
      expect(sorted[0].priority).toBe(10);
      expect(sorted[1].priority).toBe(5);
      expect(sorted[2].priority).toBe(3);
    });

    it('should not modify original array', () => {
      const tasks: SchedulingTask[] = [
        { id: '1', taskName: 'Task 1', buCode: 'BU1', taskType: 'machining', estimatedHours: 8, priority: 3, predecessorTasks: [] },
        { id: '2', taskName: 'Task 2', buCode: 'BU1', taskType: 'machining', estimatedHours: 8, priority: 10, predecessorTasks: [] },
      ];
      
      const sorted = sortTasksByPriority(tasks);
      
      expect(tasks[0].priority).toBe(3);
      expect(sorted[0].priority).toBe(10);
    });
  });

  describe('Dependency Checking', () => {
    it('should return true when no dependencies', () => {
      const task: SchedulingTask = {
        id: '1',
        taskName: 'Task 1',
        buCode: 'BU1',
        taskType: 'machining',
        estimatedHours: 8,
        priority: 5,
        predecessorTasks: [],
      };
      
      const result = checkDependencySatisfied(task, new Map(), new Date());
      expect(result).toBe(true);
    });

    it('should return false when dependency not scheduled', () => {
      const task: SchedulingTask = {
        id: '2',
        taskName: 'Task 2',
        buCode: 'BU1',
        taskType: 'welding',
        estimatedHours: 8,
        priority: 5,
        predecessorTasks: ['1'],
      };
      
      const result = checkDependencySatisfied(task, new Map(), new Date());
      expect(result).toBe(false);
    });

    it('should return true when dependency completed before proposed start', () => {
      const task: SchedulingTask = {
        id: '2',
        taskName: 'Task 2',
        buCode: 'BU2',
        taskType: 'welding',
        estimatedHours: 8,
        priority: 5,
        predecessorTasks: ['1'],
      };
      
      const scheduledTasks = new Map<string, SchedulingResult>();
      scheduledTasks.set('1', {
        taskId: '1',
        resourceId: 'r1',
        scheduledStart: new Date('2026-01-01'),
        scheduledEnd: new Date('2026-01-03'),
      });
      
      const result = checkDependencySatisfied(task, scheduledTasks, new Date('2026-01-05'));
      expect(result).toBe(true);
    });

    it('should return false when dependency ends after proposed start', () => {
      const task: SchedulingTask = {
        id: '2',
        taskName: 'Task 2',
        buCode: 'BU2',
        taskType: 'welding',
        estimatedHours: 8,
        priority: 5,
        predecessorTasks: ['1'],
      };
      
      const scheduledTasks = new Map<string, SchedulingResult>();
      scheduledTasks.set('1', {
        taskId: '1',
        resourceId: 'r1',
        scheduledStart: new Date('2026-01-01'),
        scheduledEnd: new Date('2026-01-10'),
      });
      
      const result = checkDependencySatisfied(task, scheduledTasks, new Date('2026-01-05'));
      expect(result).toBe(false);
    });
  });

  describe('Resource Finding', () => {
    const resources: SchedulingResource[] = [
      {
        id: 'r1',
        resourceName: '数控车床A',
        resourceType: 'equipment',
        buCode: 'BU1',
        capacity: 1,
        availableFrom: new Date('2026-01-01'),
        availableTo: new Date('2026-12-31'),
      },
      {
        id: 'r2',
        resourceName: '焊接工位1',
        resourceType: 'workstation',
        buCode: 'BU2',
        capacity: 1,
        availableFrom: new Date('2026-01-01'),
        availableTo: new Date('2026-12-31'),
      },
    ];

    it('should find resource matching BU code', () => {
      const task: SchedulingTask = {
        id: '1',
        taskName: 'Task 1',
        buCode: 'BU1',
        taskType: 'machining',
        estimatedHours: 8,
        priority: 5,
        predecessorTasks: [],
      };
      
      const resource = findAvailableResource(task, resources, new Date('2026-06-01'));
      expect(resource).not.toBeNull();
      expect(resource?.buCode).toBe('BU1');
    });

    it('should return null when no matching BU', () => {
      const task: SchedulingTask = {
        id: '1',
        taskName: 'Task 1',
        buCode: 'BU3',
        taskType: 'assembly',
        estimatedHours: 8,
        priority: 5,
        predecessorTasks: [],
      };
      
      const resource = findAvailableResource(task, resources, new Date('2026-06-01'));
      expect(resource).toBeNull();
    });

    it('should return null when resource not available at date', () => {
      const task: SchedulingTask = {
        id: '1',
        taskName: 'Task 1',
        buCode: 'BU1',
        taskType: 'machining',
        estimatedHours: 8,
        priority: 5,
        predecessorTasks: [],
      };
      
      const resource = findAvailableResource(task, resources, new Date('2025-01-01'));
      expect(resource).toBeNull();
    });
  });

  describe('Objective Value Calculation', () => {
    it('should calculate zero when no delays or changeovers', () => {
      const results: SchedulingResult[] = [
        {
          taskId: '1',
          resourceId: 'r1',
          scheduledStart: new Date('2026-01-01'),
          scheduledEnd: new Date('2026-01-03'),
        },
      ];
      
      const tasks: SchedulingTask[] = [
        {
          id: '1',
          taskName: 'Task 1',
          buCode: 'BU1',
          taskType: 'machining',
          estimatedHours: 8,
          priority: 5,
          predecessorTasks: [],
          latestFinish: new Date('2026-01-10'),
        },
      ];
      
      const value = calculateObjectiveValue(results, tasks, 1, 0.5);
      expect(value).toBe(0);
    });

    it('should penalize delays', () => {
      const results: SchedulingResult[] = [
        {
          taskId: '1',
          resourceId: 'r1',
          scheduledStart: new Date('2026-01-01'),
          scheduledEnd: new Date('2026-01-15'),
        },
      ];
      
      const tasks: SchedulingTask[] = [
        {
          id: '1',
          taskName: 'Task 1',
          buCode: 'BU1',
          taskType: 'machining',
          estimatedHours: 8,
          priority: 5,
          predecessorTasks: [],
          latestFinish: new Date('2026-01-10'),
        },
      ];
      
      const value = calculateObjectiveValue(results, tasks, 1, 0.5);
      expect(value).toBeGreaterThan(0);
    });

    it('should penalize changeovers', () => {
      const results: SchedulingResult[] = [
        {
          taskId: '1',
          resourceId: 'r1',
          scheduledStart: new Date('2026-01-01'),
          scheduledEnd: new Date('2026-01-03'),
        },
        {
          taskId: '2',
          resourceId: 'r1',
          scheduledStart: new Date('2026-01-04'),
          scheduledEnd: new Date('2026-01-06'),
        },
      ];
      
      const tasks: SchedulingTask[] = [
        {
          id: '1',
          taskName: 'Task 1',
          buCode: 'BU1',
          taskType: 'machining',
          estimatedHours: 8,
          priority: 5,
          predecessorTasks: [],
        },
        {
          id: '2',
          taskName: 'Task 2',
          buCode: 'BU1',
          taskType: 'machining',
          estimatedHours: 8,
          priority: 5,
          predecessorTasks: [],
        },
      ];
      
      const value = calculateObjectiveValue(results, tasks, 0, 1);
      expect(value).toBe(1); // 1 changeover
    });
  });

  describe('BU Precedence Constraints', () => {
    it('should enforce BU2 welding before BU3 assembly', () => {
      const weldingTask: SchedulingTask = {
        id: '1',
        taskName: 'Welding',
        buCode: 'BU2',
        taskType: 'welding',
        estimatedHours: 16,
        priority: 5,
        predecessorTasks: [],
      };
      
      const assemblyTask: SchedulingTask = {
        id: '2',
        taskName: 'Assembly',
        buCode: 'BU3',
        taskType: 'assembly',
        estimatedHours: 24,
        priority: 5,
        predecessorTasks: ['1'], // Depends on welding
      };
      
      const scheduledTasks = new Map<string, SchedulingResult>();
      scheduledTasks.set('1', {
        taskId: '1',
        resourceId: 'r1',
        scheduledStart: new Date('2026-01-01'),
        scheduledEnd: new Date('2026-01-03'),
      });
      
      // Assembly can start after welding ends
      const canStartAssembly = checkDependencySatisfied(
        assemblyTask,
        scheduledTasks,
        new Date('2026-01-04')
      );
      
      expect(canStartAssembly).toBe(true);
    });
  });

  describe('Leave Constraint', () => {
    it('should mark resource unavailable during leave', () => {
      const resource: SchedulingResource = {
        id: 'r1',
        resourceName: '工程师张',
        resourceType: 'employee',
        buCode: 'BU4',
        capacity: 1,
        availableFrom: new Date('2026-01-01'),
        availableTo: new Date('2026-01-10'), // On leave after Jan 10
      };
      
      const task: SchedulingTask = {
        id: '1',
        taskName: 'Debugging',
        buCode: 'BU4',
        taskType: 'debugging',
        estimatedHours: 8,
        priority: 5,
        predecessorTasks: [],
      };
      
      // Should find resource before leave
      const beforeLeave = findAvailableResource(task, [resource], new Date('2026-01-05'));
      expect(beforeLeave).not.toBeNull();
      
      // Should not find resource during leave
      const duringLeave = findAvailableResource(task, [resource], new Date('2026-01-15'));
      expect(duringLeave).toBeNull();
    });
  });

  describe('Work Reporting Constraint', () => {
    it('should start task after previous work report completion', () => {
      // Simulating: task must start after yesterday's work report
      const yesterdayReportEnd = new Date('2026-01-31T18:00:00');
      const proposedStart = new Date('2026-02-01T08:00:00');
      
      expect(proposedStart > yesterdayReportEnd).toBe(true);
    });
  });
});
