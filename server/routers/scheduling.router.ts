/**
 * 智能排程 tRPC 路由
 */

import { z } from 'zod';
import { router, protectedProcedure, requirePermission } from '../_core/trpc';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { 
  SchedulingEngine, 
  generateGanttData, 
  validateSchedulingResult,
  type SchedulingTask,
  type SchedulingResource,
  type SchedulingConstraint,
  type SchedulingInput
} from '../services/scheduling.service';
import {
  handleWorkReportEvent,
  triggerManualRefresh,
  getRefreshStatus,
  updateAutoRefreshConfig,
  getAutoRefreshConfig,
  simulateWorkReportEvent,
} from '../services/scheduling-auto-refresh.service';

// ==================== 输入验证Schema ====================

const taskInputSchema = z.object({
  projectId: z.string().optional(),
  buCode: z.string(),
  taskName: z.string(),
  taskType: z.enum(['machining', 'welding', 'assembly', 'debugging', 'testing']),
  estimatedHours: z.number().positive(),
  priority: z.number().min(1).max(10).default(5),
  earliestStart: z.string().datetime().optional(),
  latestFinish: z.string().datetime().optional(),
  predecessorTasks: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  requiredResources: z.array(z.string()).default([]),
});

const resourceInputSchema = z.object({
  resourceType: z.enum(['employee', 'equipment', 'workstation']),
  resourceName: z.string(),
  buCode: z.string().optional(),
  skills: z.array(z.object({
    skill: z.string(),
    level: z.number().min(1).max(5)
  })).default([]),
  capacityPerDay: z.number().positive().default(8),
  costPerHour: z.number().min(0).default(0),
});

const constraintInputSchema = z.object({
  constraintType: z.enum(['time_window', 'resource_capacity', 'task_dependency', 'bu_sequence', 'skill_requirement', 'changeover_time']),
  constraintName: z.string(),
  description: z.string().optional(),
  parameters: z.record(z.string(), z.any()),
  priority: z.number().min(1).max(10).default(5),
  isHardConstraint: z.boolean().default(true),
  penaltyWeight: z.number().min(0).default(1),
});

const schedulingInputSchema = z.object({
  jobName: z.string(),
  taskIds: z.array(z.string()).optional(), // 如果不指定，则排程所有pending任务
  objectiveWeights: z.object({
    delayWeight: z.number().min(0).default(1),
    changeoverWeight: z.number().min(0).default(0.5),
  }).default({ delayWeight: 1, changeoverWeight: 0.5 }),
  solverConfig: z.object({
    maxTimeSeconds: z.number().positive().default(60),
    optimizationLevel: z.enum(['fast', 'balanced', 'optimal']).default('balanced'),
  }).default({ maxTimeSeconds: 60, optimizationLevel: 'balanced' }),
  planningHorizon: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
});

// ==================== 路由定义 ====================

export const schedulingRouter = router({
  // ==================== 任务管理 ====================
  
  /**
   * 获取排程任务列表
   */
  listTasks: requirePermission('mfg:scheduling:view')
    .input(z.object({
      projectId: z.string().optional(),
      buCode: z.string().optional(),
      status: z.enum(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db: any = await getDb();
      const filters = (input || {}) as any;

      let query = 'SELECT * FROM scheduling_tasks WHERE 1=1';
      const params: unknown[] = [];

      if (filters.projectId) {
        query += ' AND project_id = ?';
        params.push(filters.projectId);
      }
      if (filters.buCode) {
        query += ' AND bu_code = ?';
        params.push(filters.buCode);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?';
      params.push(filters.limit || 50, filters.offset || 0);
      
      const [rows] = await db.execute(query, params);
      return rows as any[];
    }),

  /**
   * 创建排程任务
   */
  createTask: protectedProcedure
    .input(taskInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db: any = await getDb();
      const id = uuidv4();
      
      await db.execute(
        `INSERT INTO scheduling_tasks 
         (id, project_id, bu_code, task_name, task_type, estimated_hours, priority, 
          earliest_start, latest_finish, predecessor_tasks, required_skills, required_resources, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          id,
          input.projectId || null,
          input.buCode,
          input.taskName,
          input.taskType,
          input.estimatedHours,
          input.priority,
          input.earliestStart || null,
          input.latestFinish || null,
          JSON.stringify(input.predecessorTasks),
          JSON.stringify(input.requiredSkills),
          JSON.stringify(input.requiredResources),
        ]
      );
      
      return { id, ...input };
    }),

  /**
   * 更新排程任务
   */
  updateTask: protectedProcedure
    .input(z.object({
      id: z.string(),
      ...taskInputSchema.partial().shape,
    }))
    .mutation(async ({ input, ctx }) => {
      const db: any = await getDb();
      const { id, ...updates } = input;
      
      const setClauses: string[] = [];
      const params: unknown[] = [];
      
      if (updates.taskName !== undefined) {
        setClauses.push('task_name = ?');
        params.push(updates.taskName);
      }
      if (updates.estimatedHours !== undefined) {
        setClauses.push('estimated_hours = ?');
        params.push(updates.estimatedHours);
      }
      if (updates.priority !== undefined) {
        setClauses.push('priority = ?');
        params.push(updates.priority);
      }
      if (updates.earliestStart !== undefined) {
        setClauses.push('earliest_start = ?');
        params.push(updates.earliestStart);
      }
      if (updates.latestFinish !== undefined) {
        setClauses.push('latest_finish = ?');
        params.push(updates.latestFinish);
      }
      if (updates.predecessorTasks !== undefined) {
        setClauses.push('predecessor_tasks = ?');
        params.push(JSON.stringify(updates.predecessorTasks));
      }
      
      if (setClauses.length > 0) {
        params.push(id);
        await db.execute(
          `UPDATE scheduling_tasks SET ${setClauses.join(', ')} WHERE id = ?`,
          params
        );
      }
      
      return { success: true };
    }),

  /**
   * 删除排程任务
   */
  deleteTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db: any = await getDb();
      await db.execute('DELETE FROM scheduling_tasks WHERE id = ?', [input.id]);
      return { success: true };
    }),

  // ==================== 资源管理 ====================

  /**
   * 获取资源列表
   */
  listResources: requirePermission('mfg:scheduling:view')
    .input(z.object({
      resourceType: z.enum(['employee', 'equipment', 'workstation']).optional(),
      buCode: z.string().optional(),
      status: z.enum(['available', 'busy', 'unavailable', 'on_leave']).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db: any = await getDb();
      const filters = input || {};
      
      let query = 'SELECT * FROM scheduling_resources WHERE 1=1';
      const params: unknown[] = [];
      
      if (filters.resourceType) {
        query += ' AND resource_type = ?';
        params.push(filters.resourceType);
      }
      if (filters.buCode) {
        query += ' AND bu_code = ?';
        params.push(filters.buCode);
      }
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      query += ' ORDER BY resource_name';
      
      const [rows] = await db.execute(query, params);
      return rows as any[];
    }),

  /**
   * 创建资源
   */
  createResource: protectedProcedure
    .input(resourceInputSchema)
    .mutation(async ({ input }) => {
      const db: any = await getDb();
      const id = uuidv4();
      
      await db.execute(
        `INSERT INTO scheduling_resources 
         (id, resource_type, resource_name, bu_code, skills, capacity_per_day, cost_per_hour, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'available')`,
        [
          id,
          input.resourceType,
          input.resourceName,
          input.buCode || null,
          JSON.stringify(input.skills),
          input.capacityPerDay,
          input.costPerHour,
        ]
      );
      
      return { id, ...input };
    }),

  /**
   * 更新资源可用性
   */
  updateResourceAvailability: protectedProcedure
    .input(z.object({
      resourceId: z.string(),
      date: z.string(), // YYYY-MM-DD
      available: z.boolean(),
      availableHours: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db: any = await getDb();
      
      // 获取当前资源
      const [rows] = await db.execute(
        'SELECT availability_calendar FROM scheduling_resources WHERE id = ?',
        [input.resourceId]
      ) as any[];
      
      if (rows.length === 0) {
        throw new Error('资源不存在');
      }
      
      let calendar = rows[0].availability_calendar || [];
      if (typeof calendar === 'string') {
        calendar = JSON.parse(calendar);
      }
      
      // 更新或添加日期条目
      const existingIndex = calendar.findIndex((c: any) => c.date === input.date);
      const newEntry = {
        date: input.date,
        available: input.available,
        availableHours: input.availableHours,
      };
      
      if (existingIndex >= 0) {
        calendar[existingIndex] = newEntry;
      } else {
        calendar.push(newEntry);
      }
      
      await db.execute(
        'UPDATE scheduling_resources SET availability_calendar = ? WHERE id = ?',
        [JSON.stringify(calendar), input.resourceId]
      );
      
      return { success: true };
    }),

  // ==================== 约束管理 ====================

  /**
   * 获取约束列表
   */
  listConstraints: requirePermission('mfg:scheduling:view')
    .input(z.object({
      constraintType: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db: any = await getDb();
      const filters = input || {};
      
      let query = 'SELECT * FROM scheduling_constraints WHERE 1=1';
      const params: unknown[] = [];
      
      if (filters.constraintType) {
        query += ' AND constraint_type = ?';
        params.push(filters.constraintType);
      }
      if (filters.isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.isActive);
      }
      
      query += ' ORDER BY priority DESC';
      
      const [rows] = await db.execute(query, params);
      return rows as any[];
    }),

  /**
   * 创建约束
   */
  createConstraint: protectedProcedure
    .input(constraintInputSchema)
    .mutation(async ({ input }) => {
      const db: any = await getDb();
      const id = uuidv4();
      
      await db.execute(
        `INSERT INTO scheduling_constraints 
         (id, constraint_type, constraint_name, description, parameters, priority, is_hard_constraint, penalty_weight, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          id,
          input.constraintType,
          input.constraintName,
          input.description || null,
          JSON.stringify(input.parameters),
          input.priority,
          input.isHardConstraint,
          input.penaltyWeight,
        ]
      );
      
      return { id, ...input };
    }),

  /**
   * 切换约束启用状态
   */
  toggleConstraint: protectedProcedure
    .input(z.object({
      id: z.string(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db: any = await getDb();
      await db.execute(
        'UPDATE scheduling_constraints SET is_active = ? WHERE id = ?',
        [input.isActive, input.id]
      );
      return { success: true };
    }),

  // ==================== 排程执行 ====================

  /**
   * 执行排程计算
   */
  runScheduling: requirePermission('mfg:scheduling:run')
    .input(schedulingInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db: any = await getDb();
      const jobId = uuidv4();
      
      // 创建排程任务记录
      await db.execute(
        `INSERT INTO scheduling_jobs 
         (id, job_name, job_type, status, input_parameters, objective_weights, solver_config, created_by, started_at)
         VALUES (?, ?, 'manual', 'running', ?, ?, ?, ?, NOW())`,
        [
          jobId,
          input.jobName,
          JSON.stringify({ taskIds: input.taskIds, planningHorizon: input.planningHorizon }),
          JSON.stringify(input.objectiveWeights),
          JSON.stringify(input.solverConfig),
          ctx.user.id,
        ]
      );

      try {
        // 获取任务数据
        let taskQuery = 'SELECT * FROM scheduling_tasks WHERE status = ?';
        const taskParams: any[] = ['pending'];
        
        if (input.taskIds && input.taskIds.length > 0) {
          taskQuery = `SELECT * FROM scheduling_tasks WHERE id IN (${input.taskIds.map(() => '?').join(',')})`;
          taskParams.length = 0;
          taskParams.push(...input.taskIds);
        }
        
        const [taskRows] = await db.execute(taskQuery, taskParams) as any[];
        
        // 获取资源数据
        const [resourceRows] = await db.execute(
          'SELECT * FROM scheduling_resources WHERE status = ?',
          ['available']
        ) as any[];
        
        // 获取约束数据
        const [constraintRows] = await db.execute(
          'SELECT * FROM scheduling_constraints WHERE is_active = TRUE'
        ) as any[];

        // 转换数据格式
        const tasks: SchedulingTask[] = taskRows.map((row: any) => ({
          id: row.id,
          projectId: row.project_id,
          buCode: row.bu_code,
          taskName: row.task_name,
          taskType: row.task_type,
          estimatedHours: parseFloat(row.estimated_hours),
          priority: row.priority,
          earliestStart: row.earliest_start ? new Date(row.earliest_start) : undefined,
          latestFinish: row.latest_finish ? new Date(row.latest_finish) : undefined,
          predecessorTasks: typeof row.predecessor_tasks === 'string' 
            ? JSON.parse(row.predecessor_tasks) 
            : row.predecessor_tasks || [],
          requiredSkills: typeof row.required_skills === 'string'
            ? JSON.parse(row.required_skills)
            : row.required_skills || [],
          requiredResources: typeof row.required_resources === 'string'
            ? JSON.parse(row.required_resources)
            : row.required_resources || [],
          status: row.status,
        }));

        const resources: SchedulingResource[] = resourceRows.map((row: any) => ({
          id: row.id,
          resourceType: row.resource_type,
          resourceName: row.resource_name,
          buCode: row.bu_code,
          skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills || [],
          capacityPerDay: parseFloat(row.capacity_per_day),
          costPerHour: parseFloat(row.cost_per_hour),
          availabilityCalendar: typeof row.availability_calendar === 'string'
            ? JSON.parse(row.availability_calendar)
            : row.availability_calendar || [],
          status: row.status,
        }));

        const constraints: SchedulingConstraint[] = constraintRows.map((row: any) => ({
          id: row.id,
          constraintType: row.constraint_type,
          constraintName: row.constraint_name,
          description: row.description,
          parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
          priority: row.priority,
          isHardConstraint: row.is_hard_constraint,
          penaltyWeight: parseFloat(row.penalty_weight),
          isActive: row.is_active,
        }));

        // 构建排程输入
        const schedulingInput: SchedulingInput = {
          tasks,
          resources,
          constraints,
          objectiveWeights: input.objectiveWeights,
          solverConfig: input.solverConfig,
          planningHorizon: {
            startDate: new Date(input.planningHorizon.startDate),
            endDate: new Date(input.planningHorizon.endDate),
          },
        };

        // 执行排程
        const engine = new SchedulingEngine(schedulingInput);
        const result = engine.solve();

        // 保存排程结果
        for (const st of result.scheduledTasks) {
          await db.execute(
            `INSERT INTO scheduling_results 
             (id, job_id, task_id, resource_id, scheduled_start, scheduled_end, duration_hours, sequence_order, changeover_time, delay_penalty)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              jobId,
              st.taskId,
              st.resourceId || null,
              st.scheduledStart,
              st.scheduledEnd,
              st.durationHours,
              st.sequenceOrder,
              st.changeoverTime,
              st.delayPenalty,
            ]
          );

          // 更新任务状态
          await db.execute(
            'UPDATE scheduling_tasks SET status = ? WHERE id = ?',
            ['scheduled', st.taskId]
          );
        }

        // 更新排程任务记录
        await db.execute(
          `UPDATE scheduling_jobs SET 
           status = ?, result_summary = ?, total_delay = ?, total_changeover_cost = ?, 
           objective_value = ?, solve_time_seconds = ?, completed_at = NOW()
           WHERE id = ?`,
          [
            result.feasible ? 'completed' : 'failed',
            JSON.stringify({ 
              taskCount: result.scheduledTasks.length,
              feasible: result.feasible,
              message: result.message 
            }),
            result.totalDelay,
            result.totalChangeoverCost,
            result.objectiveValue,
            result.solveTimeSeconds,
            jobId,
          ]
        );

        return {
          jobId,
          ...result,
          ganttData: generateGanttData(result.scheduledTasks, tasks, resources),
        };

      } catch (error) {
        // 更新失败状态
        await db.execute(
          `UPDATE scheduling_jobs SET status = 'failed', error_message = ?, completed_at = NOW() WHERE id = ?`,
          [error instanceof Error ? error.message : '未知错误', jobId]
        );
        throw error;
      }
    }),

  /**
   * 获取排程任务执行记录
   */
  listJobs: requirePermission('mfg:scheduling:view')
    .input(z.object({
      status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ input }) => {
      const db: any = await getDb();
      const filters = (input || {}) as any;

      let query = 'SELECT * FROM scheduling_jobs WHERE 1=1';
      const params: unknown[] = [];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(filters.limit || 20);
      
      const [rows] = await db.execute(query, params);
      return rows as any[];
    }),

  /**
   * 获取排程结果
   */
  getJobResults: requirePermission('mfg:scheduling:view')
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const db: any = await getDb();
      
      // 获取排程任务信息
      const [jobRows] = await db.execute(
        'SELECT * FROM scheduling_jobs WHERE id = ?',
        [input.jobId]
      ) as any[];
      
      if (jobRows.length === 0) {
        throw new Error('排程任务不存在');
      }
      
      const job = jobRows[0];
      
      // 获取排程结果
      const [resultRows] = await db.execute(
        `SELECT sr.*, st.task_name, st.bu_code, st.task_type, res.resource_name
         FROM scheduling_results sr
         LEFT JOIN scheduling_tasks st ON sr.task_id = st.id
         LEFT JOIN scheduling_resources res ON sr.resource_id = res.id
         WHERE sr.job_id = ?
         ORDER BY sr.sequence_order`,
        [input.jobId]
      ) as any[];
      
      return {
        job,
        results: resultRows,
      };
    }),

  /**
   * 获取甘特图数据
   */
  getGanttData: requirePermission('mfg:scheduling:view')
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const db: any = await getDb();
      
      // 获取排程结果
      const [resultRows] = await db.execute(
        `SELECT sr.*, st.task_name, st.bu_code, st.task_type, st.predecessor_tasks, st.status as task_status,
                res.resource_name
         FROM scheduling_results sr
         LEFT JOIN scheduling_tasks st ON sr.task_id = st.id
         LEFT JOIN scheduling_resources res ON sr.resource_id = res.id
         WHERE sr.job_id = ?
         ORDER BY sr.scheduled_start`,
        [input.jobId]
      ) as any[];
      
      // 获取资源列表
      const [resourceRows] = await db.execute(
        'SELECT * FROM scheduling_resources WHERE status = ?',
        ['available']
      ) as any[];
      
      // 计算资源利用率
      const resourceUtilization = new Map<string, number>();
      for (const row of resultRows) {
        if (row.resource_id) {
          const current = resourceUtilization.get(row.resource_id) || 0;
          resourceUtilization.set(row.resource_id, current + parseFloat(row.duration_hours));
        }
      }
      
      const tasks = resultRows.map((row: any) => ({
        id: row.task_id,
        name: row.task_name,
        start: row.scheduled_start,
        end: row.scheduled_end,
        resource: row.resource_name || '待分配',
        resourceId: row.resource_id,
        bu: row.bu_code,
        taskType: row.task_type,
        progress: row.task_status === 'completed' ? 100 : row.task_status === 'in_progress' ? 50 : 0,
        dependencies: typeof row.predecessor_tasks === 'string' 
          ? JSON.parse(row.predecessor_tasks) 
          : row.predecessor_tasks || [],
        changeoverTime: parseFloat(row.changeover_time),
        delayPenalty: parseFloat(row.delay_penalty),
      }));
      
      const resources = resourceRows.map((row: any) => ({
        id: row.id,
        name: row.resource_name,
        type: row.resource_type,
        bu: row.bu_code,
        utilization: Math.min(100, ((resourceUtilization.get(row.id) || 0) / (parseFloat(row.capacity_per_day) * 5)) * 100),
      }));
      
      return { tasks, resources };
    }),

  // ==================== 统计分析 ====================

  /**
   * 获取排程统计
   */
  getStatistics: requirePermission('mfg:scheduling:view')
    .query(async () => {
      const db: any = await getDb();
      
      // 任务统计
      const [taskStats] = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM scheduling_tasks
      `) as any[];
      
      // 资源统计
      const [resourceStats] = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN resource_type = 'employee' THEN 1 ELSE 0 END) as employees,
          SUM(CASE WHEN resource_type = 'equipment' THEN 1 ELSE 0 END) as equipment
        FROM scheduling_resources
      `) as any[];
      
      // 最近排程任务
      const [recentJobs] = await db.execute(`
        SELECT id, job_name, status, objective_value, solve_time_seconds, created_at
        FROM scheduling_jobs
        ORDER BY created_at DESC
        LIMIT 5
      `) as any[];
      
      // BU任务分布
      const [buDistribution] = await db.execute(`
        SELECT bu_code, COUNT(*) as count, SUM(estimated_hours) as total_hours
        FROM scheduling_tasks
        GROUP BY bu_code
      `) as any[];
      
      return {
        tasks: taskStats[0],
        resources: resourceStats[0],
        recentJobs,
        buDistribution,
      };
    }),

  // ==================== 导出功能 ====================

  /**
   * 导出排程结果为Excel
   */
  exportToExcel: protectedProcedure
    .input(z.object({
      jobId: z.string().optional(),
      projectId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db: any = await getDb();
      const { exportSchedulingToExcel } = await import('../services/scheduling-export.service');
      
      // 获取任务数据
      let taskQuery = 'SELECT * FROM scheduling_tasks WHERE 1=1';
      const taskParams: any[] = [];
      if (input.projectId) {
        taskQuery += ' AND project_id = ?';
        taskParams.push(input.projectId);
      }
      const [taskRows] = await db.execute(taskQuery, taskParams) as any[];
      
      // 获取资源数据
      const [resourceRows] = await db.execute('SELECT * FROM scheduling_resources') as any[];
      
      // 转换为导出格式
      const tasks = taskRows.map((row: any) => ({
        id: row.id,
        taskName: row.task_name,
        projectId: row.project_id || '',
        projectName: row.project_id || '未分配项目',
        buCode: row.bu_code,
        taskType: row.task_type,
        estimatedHours: parseFloat(row.estimated_hours),
        priority: row.priority,
        scheduledStart: row.scheduled_start ? new Date(row.scheduled_start) : undefined,
        scheduledEnd: row.scheduled_end ? new Date(row.scheduled_end) : undefined,
        assignedResource: row.assigned_resource_id,
        status: row.status,
      }));
      
      const allocations = resourceRows.map((row: any) => ({
        resourceId: row.id,
        resourceName: row.resource_name,
        resourceType: row.resource_type,
        buCode: row.bu_code || 'N/A',
        allocatedTasks: [],
        totalUtilization: 0.7,
      }));
      
      const ganttData = {
        tasks: tasks.map((t: any) => ({
          id: t.id,
          name: t.taskName,
          start: t.scheduledStart || new Date(),
          end: t.scheduledEnd || new Date(),
          progress: t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0,
          dependencies: [],
          resource: t.assignedResource || '',
          bu: t.buCode,
        })),
        resources: resourceRows.map((r: any) => ({
          id: r.id,
          name: r.resource_name,
          type: r.resource_type,
        })),
        projectInfo: {
          name: input.projectId || 'GRT排程报告',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
        },
      };
      
      const buffer = await exportSchedulingToExcel(tasks, allocations, ganttData);
      
      // 返回Base64编码的Excel文件
      return {
        filename: `排程报告_${new Date().toISOString().split('T')[0]}.xlsx`,
        data: buffer.toString('base64'),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }),

  /**
   * 导出排程结果为PDF
   */
  exportToPDF: protectedProcedure
    .input(z.object({
      jobId: z.string().optional(),
      projectId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db: any = await getDb();
      const { generateSchedulingPDFContent } = await import('../services/scheduling-export.service');
      
      // 获取任务数据
      let taskQuery = 'SELECT * FROM scheduling_tasks WHERE 1=1';
      const taskParams: any[] = [];
      if (input.projectId) {
        taskQuery += ' AND project_id = ?';
        taskParams.push(input.projectId);
      }
      const [taskRows] = await db.execute(taskQuery, taskParams) as any[];
      
      // 获取资源数据
      const [resourceRows] = await db.execute('SELECT * FROM scheduling_resources') as any[];
      
      // 转换为导出格式
      const tasks = taskRows.map((row: any) => ({
        id: row.id,
        taskName: row.task_name,
        projectId: row.project_id || '',
        projectName: row.project_id || '未分配项目',
        buCode: row.bu_code,
        taskType: row.task_type,
        estimatedHours: parseFloat(row.estimated_hours),
        priority: row.priority,
        scheduledStart: row.scheduled_start ? new Date(row.scheduled_start) : undefined,
        scheduledEnd: row.scheduled_end ? new Date(row.scheduled_end) : undefined,
        assignedResource: row.assigned_resource_id,
        status: row.status,
      }));
      
      const allocations = resourceRows.map((row: any) => ({
        resourceId: row.id,
        resourceName: row.resource_name,
        resourceType: row.resource_type,
        buCode: row.bu_code || 'N/A',
        allocatedTasks: [],
        totalUtilization: 0.7,
      }));
      
      const ganttData = {
        tasks: tasks.map((t: any) => ({
          id: t.id,
          name: t.taskName,
          start: t.scheduledStart || new Date(),
          end: t.scheduledEnd || new Date(),
          progress: t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0,
          dependencies: [],
          resource: t.assignedResource || '',
          bu: t.buCode,
        })),
        resources: resourceRows.map((r: any) => ({
          id: r.id,
          name: r.resource_name,
          type: r.resource_type,
        })),
        projectInfo: {
          name: input.projectId || 'GRT排程报告',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
        },
      };
      
      const htmlContent = generateSchedulingPDFContent(tasks, allocations, ganttData);
      
      // 返回HTML内容，前端可以使用html2pdf转换
      return {
        filename: `排程报告_${new Date().toISOString().split('T')[0]}.pdf`,
        htmlContent,
        mimeType: 'text/html',
      };
    }),

  /**
   * 导出排程结果为CSV
   */
  exportToCSV: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db: any = await getDb();
      const { exportSchedulingToCSV } = await import('../services/scheduling-export.service');
      
      // 获取任务数据
      let taskQuery = 'SELECT * FROM scheduling_tasks WHERE 1=1';
      const taskParams: any[] = [];
      if (input.projectId) {
        taskQuery += ' AND project_id = ?';
        taskParams.push(input.projectId);
      }
      const [taskRows] = await db.execute(taskQuery, taskParams) as any[];
      
      const tasks = taskRows.map((row: any) => ({
        id: row.id,
        taskName: row.task_name,
        projectId: row.project_id || '',
        projectName: row.project_id || '未分配项目',
        buCode: row.bu_code,
        taskType: row.task_type,
        estimatedHours: parseFloat(row.estimated_hours),
        priority: row.priority,
        scheduledStart: row.scheduled_start ? new Date(row.scheduled_start) : undefined,
        scheduledEnd: row.scheduled_end ? new Date(row.scheduled_end) : undefined,
        assignedResource: row.assigned_resource_id,
        status: row.status,
      }));
      
      const csvContent = exportSchedulingToCSV(tasks);
      
      return {
        filename: `排程任务_${new Date().toISOString().split('T')[0]}.csv`,
        data: csvContent,
        mimeType: 'text/csv',
      };
    }),

  // ==================== 自动刷新功能 ====================

  /**
   * 获取自动刷新状态
   */
  getAutoRefreshStatus: protectedProcedure
    .query(async () => {
      return getRefreshStatus();
    }),

  /**
   * 更新自动刷新配置
   */
  updateAutoRefreshConfig: protectedProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      triggerDelay: z.number().min(1000).optional(),
      minIntervalMinutes: z.number().min(1).optional(),
      affectedBuThreshold: z.number().min(1).optional(),
      notifyOnRefresh: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return updateAutoRefreshConfig(input);
    }),

  /**
   * 手动触发刷新
   */
  triggerManualRefresh: protectedProcedure
    .mutation(async () => {
      return await triggerManualRefresh();
    }),

  /**
   * 接收报工事件（用于触发自动刷新）
   */
  reportWorkEvent: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      resourceId: z.string(),
      reportedHours: z.number().positive(),
      reportDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      await handleWorkReportEvent({
        type: 'work_report_submitted',
        taskId: input.taskId,
        resourceId: input.resourceId,
        reportedHours: input.reportedHours,
        reportDate: input.reportDate,
        timestamp: new Date(),
      });
      return { success: true, message: '报工事件已接收，将触发自动刷新' };
    }),

  /**
   * 模拟报工事件（用于测试）
   */
  simulateWorkReport: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      resourceId: z.string(),
      reportedHours: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      await simulateWorkReportEvent(input.taskId, input.resourceId, input.reportedHours);
      return { success: true, message: '模拟报工事件已发送' };
    }),

  // ==================== 任务下发 (#44) ====================

  /**
   * 将排程结果下发给工人
   */
  dispatchToWorkers: requirePermission('mfg:scheduling:dispatch')
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db: any = await getDb();

      // 获取排程任务信息
      const [jobRows] = await db.execute(
        'SELECT * FROM scheduling_jobs WHERE id = ?',
        [input.jobId]
      ) as any[];

      if (jobRows.length === 0) {
        throw new Error('排程任务不存在');
      }

      const job = jobRows[0];
      if (job.status !== 'completed') {
        throw new Error('排程任务尚未完成，无法下发');
      }

      // 获取排程结果中的任务-资源分配
      const [resultRows] = await db.execute(
        `SELECT sr.*, st.task_name, st.bu_code, st.task_type
         FROM scheduling_results sr
         LEFT JOIN scheduling_tasks st ON sr.task_id = st.id
         WHERE sr.job_id = ?
         ORDER BY sr.sequence_order`,
        [input.jobId]
      ) as any[];

      if (resultRows.length === 0) {
        throw new Error('排程结果为空，无可下发任务');
      }

      const assignments: Array<{ taskId: string; resourceId: string; startTime: string; endTime: string }> = [];
      let dispatched = 0;

      for (const row of resultRows) {
        if (!row.resource_id) continue;

        const dispatchId = uuidv4();

        // 检查是否已下发过
        const [existing] = await db.execute(
          'SELECT id FROM scheduling_dispatches WHERE job_id = ? AND task_id = ? AND resource_id = ?',
          [input.jobId, row.task_id, row.resource_id]
        ) as any[];

        if (existing.length > 0) {
          // 更新已有记录
          await db.execute(
            `UPDATE scheduling_dispatches SET
               scheduled_start = ?, scheduled_end = ?, status = 'dispatched',
               dispatched_by = ?, dispatched_at = NOW(), updated_at = NOW()
             WHERE job_id = ? AND task_id = ? AND resource_id = ?`,
            [
              row.scheduled_start,
              row.scheduled_end,
              ctx.user.id,
              input.jobId,
              row.task_id,
              row.resource_id,
            ]
          );
        } else {
          // 创建新的下发记录
          await db.execute(
            `INSERT INTO scheduling_dispatches
             (id, job_id, task_id, resource_id, task_name, bu_code, task_type,
              scheduled_start, scheduled_end, duration_hours,
              status, dispatched_by, dispatched_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dispatched', ?, NOW(), NOW(), NOW())`,
            [
              dispatchId,
              input.jobId,
              row.task_id,
              row.resource_id,
              row.task_name || null,
              row.bu_code || null,
              row.task_type || null,
              row.scheduled_start,
              row.scheduled_end,
              row.duration_hours,
              ctx.user.id,
            ]
          );
        }

        assignments.push({
          taskId: row.task_id,
          resourceId: row.resource_id,
          startTime: row.scheduled_start,
          endTime: row.scheduled_end,
        });
        dispatched++;
      }

      return { dispatched, assignments };
    }),

  /**
   * 查询工人已下发的任务
   */
  getWorkerDispatches: protectedProcedure
    .input(z.object({
      workerId: z.number().optional(),
      date: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db: any = await getDb();

      let query = 'SELECT * FROM scheduling_dispatches WHERE 1=1';
      const params: unknown[] = [];

      if (input.workerId !== undefined) {
        query += ' AND resource_id = ?';
        params.push(String(input.workerId));
      }

      if (input.date) {
        query += ' AND DATE(scheduled_start) <= ? AND DATE(scheduled_end) >= ?';
        params.push(input.date, input.date);
      }

      query += ' ORDER BY scheduled_start ASC';

      const [rows] = await db.execute(query, params);
      return rows as any[];
    }),
});
