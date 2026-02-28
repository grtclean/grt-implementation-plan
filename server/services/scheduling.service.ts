/**
 * 智能排程服务 - 基于约束规划思想的TypeScript实现
 * 
 * 核心功能：
 * 1. 任务调度变量定义
 * 2. 约束条件处理（时间连续性、资源可用性、工序依赖）
 * 3. 目标函数优化（最小化延迟+切换成本）
 */

import { v4 as uuidv4 } from 'uuid';

// ==================== 类型定义 ====================

export interface SchedulingTask {
  id: string;
  projectId?: string;
  buCode: string; // BU1-BU5业务单元（半导体/汽车/医疗/光学/通用）
  taskName: string;
  taskType: 'machining' | 'welding' | 'assembly' | 'debugging' | 'testing';
  estimatedHours: number;
  priority: number; // 1-10
  earliestStart?: Date;
  latestFinish?: Date;
  predecessorTasks: string[]; // 前置任务ID列表
  requiredSkills: string[];
  requiredResources: string[];
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface SchedulingResource {
  id: string;
  resourceType: 'employee' | 'equipment' | 'workstation';
  resourceName: string;
  buCode?: string;
  skills: { skill: string; level: number }[];
  capacityPerDay: number; // 每日可用工时
  costPerHour: number;
  availabilityCalendar: {
    date: string; // YYYY-MM-DD
    available: boolean;
    availableHours?: number;
  }[];
  status: 'available' | 'busy' | 'unavailable' | 'on_leave';
}

export interface SchedulingConstraint {
  id: string;
  constraintType: 'time_window' | 'resource_capacity' | 'task_dependency' | 'bu_sequence' | 'skill_requirement' | 'changeover_time';
  constraintName: string;
  description?: string;
  parameters: Record<string, unknown>;
  priority: number;
  isHardConstraint: boolean;
  penaltyWeight: number;
  isActive: boolean;
}

export interface ScheduledTask {
  taskId: string;
  resourceId?: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  durationHours: number;
  sequenceOrder: number;
  changeoverTime: number;
  delayPenalty: number;
}

export interface SchedulingResult {
  jobId: string;
  scheduledTasks: ScheduledTask[];
  totalDelay: number;
  totalChangeoverCost: number;
  objectiveValue: number;
  solveTimeSeconds: number;
  feasible: boolean;
  message: string;
}

export interface SchedulingInput {
  tasks: SchedulingTask[];
  resources: SchedulingResource[];
  constraints: SchedulingConstraint[];
  objectiveWeights: {
    delayWeight: number;
    changeoverWeight: number;
  };
  solverConfig: {
    maxTimeSeconds: number;
    optimizationLevel: 'fast' | 'balanced' | 'optimal';
  };
  planningHorizon: {
    startDate: Date;
    endDate: Date;
  };
}

// ==================== BU切换成本矩阵 ====================

const BU_CHANGEOVER_COSTS: Record<string, Record<string, number>> = {
  'BU1': { 'BU1': 0, 'BU2': 2, 'BU3': 4, 'BU4': 3, 'BU5': 2 },
  'BU2': { 'BU1': 2, 'BU2': 0, 'BU3': 1.5, 'BU4': 2.5, 'BU5': 1.5 },
  'BU3': { 'BU1': 4, 'BU2': 1.5, 'BU3': 0, 'BU4': 1, 'BU5': 2 },
  'BU4': { 'BU1': 3, 'BU2': 2.5, 'BU3': 1, 'BU4': 0, 'BU5': 1.5 },
  'BU5': { 'BU1': 2, 'BU2': 1.5, 'BU3': 2, 'BU4': 1.5, 'BU5': 0 },
};

// BU业务单元优先级顺序
const BU_SEQUENCE_ORDER: Record<string, number> = {
  'BU1': 1, // 半导体设备清洗
  'BU2': 2, // 汽车零部件清洗
  'BU3': 3, // 医疗器械清洗
  'BU4': 4, // 精密光学清洗
  'BU5': 5, // 工业通用清洗
};

// ==================== 排程算法核心 ====================

export class SchedulingEngine {
  private tasks: SchedulingTask[];
  private resources: SchedulingResource[];
  private constraints: SchedulingConstraint[];
  private objectiveWeights: { delayWeight: number; changeoverWeight: number };
  private planningHorizon: { startDate: Date; endDate: Date };
  private maxTimeSeconds: number;

  constructor(input: SchedulingInput) {
    this.tasks = [...input.tasks];
    this.resources = [...input.resources];
    this.constraints = input.constraints.filter(c => c.isActive);
    this.objectiveWeights = input.objectiveWeights;
    this.planningHorizon = input.planningHorizon;
    this.maxTimeSeconds = input.solverConfig.maxTimeSeconds;
  }

  /**
   * 主求解方法
   */
  solve(): SchedulingResult {
    const startTime = Date.now();
    const jobId = uuidv4();

    try {
      // 1. 预处理：构建任务依赖图
      const dependencyGraph = this.buildDependencyGraph();
      
      // 2. 拓扑排序：确定任务执行顺序
      const sortedTasks = this.topologicalSort(dependencyGraph);
      
      if (!sortedTasks) {
        return {
          jobId,
          scheduledTasks: [],
          totalDelay: 0,
          totalChangeoverCost: 0,
          objectiveValue: Infinity,
          solveTimeSeconds: (Date.now() - startTime) / 1000,
          feasible: false,
          message: '检测到循环依赖，无法生成可行排程'
        };
      }

      // 3. 资源分配：贪心算法 + 启发式优化
      const scheduledTasks = this.scheduleTasksGreedy(sortedTasks);

      // 4. 局部优化：尝试减少切换成本
      const optimizedTasks = this.localOptimization(scheduledTasks);

      // 5. 计算目标函数值
      const { totalDelay, totalChangeoverCost } = this.calculateObjective(optimizedTasks);
      const objectiveValue = 
        this.objectiveWeights.delayWeight * totalDelay + 
        this.objectiveWeights.changeoverWeight * totalChangeoverCost;

      const solveTimeSeconds = (Date.now() - startTime) / 1000;

      return {
        jobId,
        scheduledTasks: optimizedTasks,
        totalDelay,
        totalChangeoverCost,
        objectiveValue,
        solveTimeSeconds,
        feasible: true,
        message: `排程完成，共安排 ${optimizedTasks.length} 个任务`
      };

    } catch (error) {
      return {
        jobId,
        scheduledTasks: [],
        totalDelay: 0,
        totalChangeoverCost: 0,
        objectiveValue: Infinity,
        solveTimeSeconds: (Date.now() - startTime) / 1000,
        feasible: false,
        message: `排程失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 构建任务依赖图
   */
  private buildDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const task of this.tasks) {
      graph.set(task.id, task.predecessorTasks || []);
    }

    // 添加BU工序顺序约束
    const buSequenceConstraint = this.constraints.find(c => c.constraintType === 'bu_sequence');
    if (buSequenceConstraint) {
      // 同一项目内，按BU顺序添加依赖
      const projectTasks = new Map<string, SchedulingTask[]>();
      for (const task of this.tasks) {
        if (task.projectId) {
          if (!projectTasks.has(task.projectId)) {
            projectTasks.set(task.projectId, []);
          }
          projectTasks.get(task.projectId)!.push(task);
        }
      }

      for (const [projectId, tasks] of Array.from(projectTasks)) {
        // 按BU顺序排序
        tasks.sort((a, b) => 
          (BU_SEQUENCE_ORDER[a.buCode] || 99) - (BU_SEQUENCE_ORDER[b.buCode] || 99)
        );
        
        // 添加顺序依赖
        for (let i = 1; i < tasks.length; i++) {
          const deps = graph.get(tasks[i].id) || [];
          if (!deps.includes(tasks[i - 1].id)) {
            deps.push(tasks[i - 1].id);
            graph.set(tasks[i].id, deps);
          }
        }
      }
    }

    return graph;
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(graph: Map<string, string[]>): SchedulingTask[] | null {
    const inDegree = new Map<string, number>();
    const taskMap = new Map<string, SchedulingTask>();

    // 初始化
    for (const task of this.tasks) {
      taskMap.set(task.id, task);
      inDegree.set(task.id, 0);
    }

    // 计算入度
    for (const [taskId, deps] of Array.from(graph)) {
      for (const depId of deps) {
        if (taskMap.has(depId)) {
          inDegree.set(taskId, (inDegree.get(taskId) || 0) + 1);
        }
      }
    }

    // Kahn算法
    const queue: SchedulingTask[] = [];
    const result: SchedulingTask[] = [];

    // 将入度为0的任务加入队列，按优先级排序
    for (const task of this.tasks) {
      if (inDegree.get(task.id) === 0) {
        queue.push(task);
      }
    }
    queue.sort((a, b) => b.priority - a.priority);

    while (queue.length > 0) {
      const task = queue.shift()!;
      result.push(task);

      // 更新后继任务的入度
      for (const [taskId, deps] of Array.from(graph)) {
        if (deps.includes(task.id)) {
          const newDegree = (inDegree.get(taskId) || 0) - 1;
          inDegree.set(taskId, newDegree);
          if (newDegree === 0) {
            const nextTask = taskMap.get(taskId);
            if (nextTask) {
              queue.push(nextTask);
              queue.sort((a, b) => b.priority - a.priority);
            }
          }
        }
      }
    }

    // 检查是否所有任务都被处理
    if (result.length !== this.tasks.length) {
      return null; // 存在循环依赖
    }

    return result;
  }

  /**
   * 贪心调度算法
   */
  private scheduleTasksGreedy(sortedTasks: SchedulingTask[]): ScheduledTask[] {
    const scheduledTasks: ScheduledTask[] = [];
    const resourceSchedule = new Map<string, { endTime: Date; lastBu: string }>();
    const taskEndTimes = new Map<string, Date>();

    // 初始化资源调度表
    for (const resource of this.resources) {
      if (resource.status === 'available') {
        resourceSchedule.set(resource.id, {
          endTime: this.planningHorizon.startDate,
          lastBu: ''
        });
      }
    }

    let sequenceOrder = 0;

    for (const task of sortedTasks) {
      sequenceOrder++;
      
      // 计算最早开始时间（考虑前置任务）
      let earliestStart = task.earliestStart || this.planningHorizon.startDate;
      for (const predId of task.predecessorTasks || []) {
        const predEndTime = taskEndTimes.get(predId);
        if (predEndTime && predEndTime > earliestStart) {
          earliestStart = predEndTime;
        }
      }

      // 找到最佳资源
      const bestResource = this.findBestResource(task, resourceSchedule, earliestStart);

      if (bestResource) {
        const { resourceId, startTime, changeoverTime } = bestResource;
        const endTime = new Date(startTime.getTime() + (task.estimatedHours + changeoverTime) * 3600000);

        // 计算延迟惩罚
        let delayPenalty = 0;
        if (task.latestFinish && endTime > task.latestFinish) {
          delayPenalty = (endTime.getTime() - task.latestFinish.getTime()) / 3600000; // 小时
        }

        scheduledTasks.push({
          taskId: task.id,
          resourceId,
          scheduledStart: startTime,
          scheduledEnd: endTime,
          durationHours: task.estimatedHours,
          sequenceOrder,
          changeoverTime,
          delayPenalty
        });

        // 更新资源调度表
        resourceSchedule.set(resourceId, {
          endTime,
          lastBu: task.buCode
        });

        // 记录任务结束时间
        taskEndTimes.set(task.id, endTime);
      } else {
        // 无可用资源，使用虚拟资源
        const startTime = earliestStart;
        const endTime = new Date(startTime.getTime() + task.estimatedHours * 3600000);

        scheduledTasks.push({
          taskId: task.id,
          resourceId: undefined,
          scheduledStart: startTime,
          scheduledEnd: endTime,
          durationHours: task.estimatedHours,
          sequenceOrder,
          changeoverTime: 0,
          delayPenalty: task.latestFinish && endTime > task.latestFinish 
            ? (endTime.getTime() - task.latestFinish.getTime()) / 3600000 
            : 0
        });

        taskEndTimes.set(task.id, endTime);
      }
    }

    return scheduledTasks;
  }

  /**
   * 找到最佳资源
   */
  private findBestResource(
    task: SchedulingTask,
    resourceSchedule: Map<string, { endTime: Date; lastBu: string }>,
    earliestStart: Date
  ): { resourceId: string; startTime: Date; changeoverTime: number } | null {
    let bestResource: { resourceId: string; startTime: Date; changeoverTime: number } | null = null;
    let bestScore = Infinity;

    for (const resource of this.resources) {
      if (resource.status !== 'available') continue;

      // 检查技能匹配
      if (task.requiredSkills.length > 0) {
        const hasRequiredSkills = task.requiredSkills.every(reqSkill =>
          resource.skills.some(s => s.skill === reqSkill && s.level >= 1)
        );
        if (!hasRequiredSkills) continue;
      }

      // 检查BU匹配
      if (resource.buCode && resource.buCode !== task.buCode) continue;

      const schedule = resourceSchedule.get(resource.id);
      if (!schedule) continue;

      // 计算开始时间
      const resourceAvailableTime = schedule.endTime;
      const startTime = new Date(Math.max(earliestStart.getTime(), resourceAvailableTime.getTime()));

      // 检查资源可用性（请假等）
      if (!this.isResourceAvailable(resource, startTime)) continue;

      // 计算切换成本
      const changeoverTime = this.calculateChangeoverTime(schedule.lastBu, task.buCode);

      // 计算得分（越小越好）
      const score = startTime.getTime() + changeoverTime * 3600000 * this.objectiveWeights.changeoverWeight;

      if (score < bestScore) {
        bestScore = score;
        bestResource = { resourceId: resource.id, startTime, changeoverTime };
      }
    }

    return bestResource;
  }

  /**
   * 检查资源在指定时间是否可用
   */
  private isResourceAvailable(resource: SchedulingResource, date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0];
    const calendar = resource.availabilityCalendar || [];
    
    const dayEntry = calendar.find(c => c.date === dateStr);
    if (dayEntry && !dayEntry.available) {
      return false;
    }

    return true;
  }

  /**
   * 计算BU切换时间
   */
  private calculateChangeoverTime(fromBu: string, toBu: string): number {
    if (!fromBu || fromBu === toBu) return 0;
    return BU_CHANGEOVER_COSTS[fromBu]?.[toBu] || 0;
  }

  /**
   * 局部优化：尝试减少切换成本
   */
  private localOptimization(scheduledTasks: ScheduledTask[]): ScheduledTask[] {
    // 简单的局部搜索：尝试交换相邻任务
    const optimized = [...scheduledTasks];
    let improved = true;
    let iterations = 0;
    const maxIterations = 100;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 0; i < optimized.length - 1; i++) {
        const current = optimized[i];
        const next = optimized[i + 1];

        // 只有在同一资源上的任务才能交换
        if (current.resourceId !== next.resourceId) continue;

        // 检查交换后是否违反依赖约束
        const task1 = this.tasks.find(t => t.id === current.taskId);
        const task2 = this.tasks.find(t => t.id === next.taskId);
        if (!task1 || !task2) continue;

        // 如果task2依赖task1，不能交换
        if (task2.predecessorTasks?.includes(task1.id)) continue;

        // 计算交换前后的切换成本
        const currentCost = current.changeoverTime + next.changeoverTime;
        
        // 模拟交换
        const newCost1 = this.calculateChangeoverTime(
          i > 0 ? this.getTaskBu(optimized[i - 1].taskId) : '',
          task2.buCode
        );
        const newCost2 = this.calculateChangeoverTime(task2.buCode, task1.buCode);
        const newCost = newCost1 + newCost2;

        if (newCost < currentCost) {
          // 执行交换
          [optimized[i], optimized[i + 1]] = [optimized[i + 1], optimized[i]];
          optimized[i].changeoverTime = newCost1;
          optimized[i + 1].changeoverTime = newCost2;
          improved = true;
        }
      }
    }

    return optimized;
  }

  /**
   * 获取任务的BU代码
   */
  private getTaskBu(taskId: string): string {
    const task = this.tasks.find(t => t.id === taskId);
    return task?.buCode || '';
  }

  /**
   * 计算目标函数值
   */
  private calculateObjective(scheduledTasks: ScheduledTask[]): { totalDelay: number; totalChangeoverCost: number } {
    let totalDelay = 0;
    let totalChangeoverCost = 0;

    for (const st of scheduledTasks) {
      totalDelay += st.delayPenalty;
      totalChangeoverCost += st.changeoverTime;
    }

    return { totalDelay, totalChangeoverCost };
  }
}

// ==================== 辅助函数 ====================

/**
 * 生成甘特图数据
 */
export function generateGanttData(
  scheduledTasks: ScheduledTask[],
  tasks: SchedulingTask[],
  resources: SchedulingResource[]
): {
  tasks: Array<{
    id: string;
    name: string;
    start: string;
    end: string;
    resource: string;
    bu: string;
    progress: number;
    dependencies: string[];
  }>;
  resources: Array<{
    id: string;
    name: string;
    utilization: number;
  }>;
} {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const resourceMap = new Map(resources.map(r => [r.id, r]));

  const ganttTasks = scheduledTasks.map(st => {
    const task = taskMap.get(st.taskId);
    const resource = st.resourceId ? resourceMap.get(st.resourceId) : null;

    return {
      id: st.taskId,
      name: task?.taskName || '未知任务',
      start: st.scheduledStart.toISOString(),
      end: st.scheduledEnd.toISOString(),
      resource: resource?.resourceName || '待分配',
      bu: task?.buCode || '',
      progress: task?.status === 'completed' ? 100 : task?.status === 'in_progress' ? 50 : 0,
      dependencies: task?.predecessorTasks || []
    };
  });

  // 计算资源利用率
  const resourceUtilization = new Map<string, number>();
  for (const st of scheduledTasks) {
    if (st.resourceId) {
      const current = resourceUtilization.get(st.resourceId) || 0;
      resourceUtilization.set(st.resourceId, current + st.durationHours);
    }
  }

  const ganttResources = resources
    .filter(r => r.status === 'available')
    .map(r => ({
      id: r.id,
      name: r.resourceName,
      utilization: Math.min(100, ((resourceUtilization.get(r.id) || 0) / (r.capacityPerDay * 5)) * 100)
    }));

  return { tasks: ganttTasks, resources: ganttResources };
}

/**
 * 验证排程结果
 */
export function validateSchedulingResult(
  scheduledTasks: ScheduledTask[],
  tasks: SchedulingTask[],
  constraints: SchedulingConstraint[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const taskEndTimes = new Map<string, Date>();

  for (const st of scheduledTasks) {
    taskEndTimes.set(st.taskId, st.scheduledEnd);
  }

  for (const st of scheduledTasks) {
    const task = taskMap.get(st.taskId);
    if (!task) continue;

    // 检查前置任务约束
    for (const predId of task.predecessorTasks || []) {
      const predEndTime = taskEndTimes.get(predId);
      if (predEndTime && predEndTime > st.scheduledStart) {
        violations.push(`任务 ${task.taskName} 在前置任务完成前开始`);
      }
    }

    // 检查最早开始时间约束
    if (task.earliestStart && st.scheduledStart < task.earliestStart) {
      violations.push(`任务 ${task.taskName} 在最早开始时间前开始`);
    }

    // 检查最晚完成时间约束
    if (task.latestFinish && st.scheduledEnd > task.latestFinish) {
      violations.push(`任务 ${task.taskName} 超过最晚完成时间`);
    }
  }

  return { valid: violations.length === 0, violations };
}
