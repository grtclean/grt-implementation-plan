/**
 * 简道云定时同步服务
 * 配置和管理简道云数据的定时同步任务
 */

import { requireDb } from '../db';
import { sql as drizzleSql } from 'drizzle-orm';
import { getJiandaoyunSyncService, getJiandaoyunUserSyncService } from '../jiandaoyun';

/**
 * 同步任务配置
 */
export interface SyncTaskConfig {
  taskName: string;
  taskType: 'user' | 'department' | 'role' | 'role_members' | 'form_data' | 'full';
  jdyAppId?: string;
  jdyFormId?: string;
  syncDirection: 'jdy_to_grt' | 'grt_to_jdy' | 'bidirectional';
  fieldMapping?: Record<string, string>;
  filterCondition?: Record<string, unknown>;
  cronExpression?: string;
  isEnabled: boolean;
}

/**
 * 同步任务执行结果
 */
export interface SyncTaskResult {
  taskId: number;
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  duration: number;
  errorMessage?: string;
}

/**
 * 简道云定时同步调度器
 */
export class JiandaoyunScheduler {
  private syncService = getJiandaoyunSyncService();
  private userSyncService = getJiandaoyunUserSyncService();
  private runningTasks: Set<number> = new Set();

  /**
   * 创建同步任务
   */
  async createTask(config: SyncTaskConfig): Promise<number> {
    const db = await requireDb();
    
    const result = await db.execute(
      drizzleSql`INSERT INTO jiandaoyun_sync_tasks 
        (task_name, task_type, jdy_app_id, jdy_form_id, sync_direction, 
         field_mapping, filter_condition, cron_expression, is_enabled)
        VALUES (
          ${config.taskName}, 
          ${config.taskType}, 
          ${config.jdyAppId || null}, 
          ${config.jdyFormId || null}, 
          ${config.syncDirection},
          ${config.fieldMapping ? JSON.stringify(config.fieldMapping) : null},
          ${config.filterCondition ? JSON.stringify(config.filterCondition) : null},
          ${config.cronExpression || null},
          ${config.isEnabled}
        )`
    );
    
    return (result as any)[0]?.insertId || 0;
  }

  /**
   * 获取所有同步任务
   */
  async getTasks(): Promise<any[]> {
    const db = await requireDb();
    const result = await db.execute(
      drizzleSql`SELECT * FROM jiandaoyun_sync_tasks ORDER BY created_at DESC`
    );
    return (result as any)[0] || [];
  }

  /**
   * 获取启用的同步任务
   */
  async getEnabledTasks(): Promise<any[]> {
    const db = await requireDb();
    const result = await db.execute(
      drizzleSql`SELECT * FROM jiandaoyun_sync_tasks WHERE is_enabled = true ORDER BY created_at DESC`
    );
    return (result as any)[0] || [];
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId: number, enabled: boolean): Promise<boolean> {
    const db = await requireDb();
    await db.execute(
      drizzleSql`UPDATE jiandaoyun_sync_tasks SET is_enabled = ${enabled}, updated_at = NOW() WHERE id = ${taskId}`
    );
    return true;
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: number): Promise<boolean> {
    const db = await requireDb();
    await db.execute(
      drizzleSql`DELETE FROM jiandaoyun_sync_tasks WHERE id = ${taskId}`
    );
    return true;
  }

  /**
   * 执行同步任务
   */
  async executeTask(taskId: number, triggeredBy: 'schedule' | 'manual' | 'webhook' = 'manual', userId?: number): Promise<SyncTaskResult> {
    // 防止重复执行
    if (this.runningTasks.has(taskId)) {
      return {
        taskId,
        status: 'failed',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        duration: 0,
        errorMessage: 'Task is already running',
      };
    }

    this.runningTasks.add(taskId);
    const startTime = Date.now();
    const db = await requireDb();

    // 创建执行日志
    const logResult = await db.execute(
      drizzleSql`INSERT INTO jiandaoyun_sync_logs 
        (task_id, started_at, status, triggered_by, triggered_by_user)
        VALUES (${taskId}, NOW(), 'running', ${triggeredBy}, ${userId || null})`
    );
    const logId = (logResult as any)[0]?.insertId;

    try {
      // 获取任务配置
      const taskResult = await db.execute(
        drizzleSql`SELECT * FROM jiandaoyun_sync_tasks WHERE id = ${taskId}`
      );
      const task = (taskResult as any)[0]?.[0];

      if (!task) {
        throw new Error('Task not found');
      }

      let result: SyncTaskResult = {
        taskId,
        status: 'success',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        duration: 0,
      };

      // 根据任务类型执行同步
      switch (task.task_type) {
        case 'user':
          const userResult = await this.userSyncService.syncMembers();
          result.recordsProcessed = userResult.totalMembers;
          result.recordsCreated = userResult.created;
          result.recordsUpdated = userResult.updated;
          result.recordsFailed = userResult.failed;
          if (userResult.errors.length > 0) {
            result.status = userResult.failed > 0 ? 'partial' : 'success';
            result.errorMessage = userResult.errors.join('; ');
          }
          break;

        case 'department':
          const deptResult = await this.userSyncService.syncDepartments();
          result.recordsProcessed = deptResult.totalDepts;
          result.recordsCreated = deptResult.created;
          result.recordsUpdated = deptResult.updated;
          result.recordsFailed = deptResult.failed;
          if (deptResult.errors.length > 0) {
            result.status = deptResult.failed > 0 ? 'partial' : 'success';
            result.errorMessage = deptResult.errors.join('; ');
          }
          break;

        case 'role':
          const roleResult = await this.userSyncService.syncRoles();
          result.recordsProcessed = roleResult.totalRoles;
          result.recordsCreated = roleResult.created;
          result.recordsUpdated = roleResult.updated;
          result.recordsFailed = roleResult.failed;
          if (roleResult.errors.length > 0) {
            result.status = roleResult.failed > 0 ? 'partial' : 'success';
            result.errorMessage = roleResult.errors.join('; ');
          }
          break;

        case 'role_members':
          const roleMemberResult = await this.userSyncService.syncRoleMembers();
          result.recordsProcessed = roleMemberResult.totalRoleMembers;
          result.recordsCreated = roleMemberResult.created;
          result.recordsUpdated = roleMemberResult.updated;
          result.recordsFailed = roleMemberResult.failed;
          if (roleMemberResult.errors.length > 0) {
            result.status = roleMemberResult.failed > 0 ? 'partial' : 'success';
            result.errorMessage = roleMemberResult.errors.join('; ');
          }
          break;

        case 'form_data':
          // 表单数据同步
          if (task.jdy_app_id && task.jdy_form_id) {
            const formData = await this.syncService.getFormData(task.jdy_app_id, task.jdy_form_id, {
              limit: 100,
            });
            result.recordsProcessed = formData.data.length;
            // 这里可以根据field_mapping将数据写入GRT系统
            // 目前只做数据获取，实际写入需要根据具体业务逻辑实现
          }
          break;

        case 'full':
          // 全量同步
          const userSync = await this.userSyncService.syncMembers();
          const deptSync = await this.userSyncService.syncDepartments();
          const roleSync = await this.userSyncService.syncRoles();
          const roleMemberSync = await this.userSyncService.syncRoleMembers();

          result.recordsProcessed = userSync.totalMembers + deptSync.totalDepts + roleSync.totalRoles + roleMemberSync.totalRoleMembers;
          result.recordsCreated = userSync.created + deptSync.created + roleSync.created + roleMemberSync.created;
          result.recordsUpdated = userSync.updated + deptSync.updated + roleSync.updated + roleMemberSync.updated;
          result.recordsFailed = userSync.failed + deptSync.failed + roleSync.failed + roleMemberSync.failed;

          const allErrors = [...userSync.errors, ...deptSync.errors, ...roleSync.errors, ...roleMemberSync.errors];
          if (allErrors.length > 0) {
            result.status = result.recordsFailed > 0 ? 'partial' : 'success';
            result.errorMessage = allErrors.join('; ');
          }
          break;
      }

      result.duration = Date.now() - startTime;

      // 更新执行日志
      await db.execute(
        drizzleSql`UPDATE jiandaoyun_sync_logs 
          SET completed_at = NOW(), 
              duration = ${result.duration},
              status = ${result.status},
              records_processed = ${result.recordsProcessed},
              records_created = ${result.recordsCreated},
              records_updated = ${result.recordsUpdated},
              records_failed = ${result.recordsFailed},
              error_message = ${result.errorMessage || null}
          WHERE id = ${logId}`
      );

      // 更新任务统计
      await db.execute(
        drizzleSql`UPDATE jiandaoyun_sync_tasks 
          SET last_run_at = NOW(),
              last_run_status = ${result.status},
              last_run_records = ${result.recordsProcessed},
              last_run_error = ${result.errorMessage || null},
              total_sync_count = total_sync_count + 1,
              total_records_synced = total_records_synced + ${result.recordsCreated + result.recordsUpdated}
          WHERE id = ${taskId}`
      );

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // 更新执行日志为失败
      await db.execute(
        drizzleSql`UPDATE jiandaoyun_sync_logs 
          SET completed_at = NOW(), 
              duration = ${duration},
              status = 'failed',
              error_message = ${error.message}
          WHERE id = ${logId}`
      );

      // 更新任务状态
      await db.execute(
        drizzleSql`UPDATE jiandaoyun_sync_tasks 
          SET last_run_at = NOW(),
              last_run_status = 'failed',
              last_run_error = ${error.message}
          WHERE id = ${taskId}`
      );

      return {
        taskId,
        status: 'failed',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        duration,
        errorMessage: error.message,
      };
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  /**
   * 获取任务执行日志
   */
  async getTaskLogs(taskId?: number, limit: number = 50): Promise<any[]> {
    const db = await requireDb();
    
    if (taskId) {
      const result = await db.execute(
        drizzleSql`SELECT * FROM jiandaoyun_sync_logs WHERE task_id = ${taskId} ORDER BY started_at DESC LIMIT ${limit}`
      );
      return (result as any)[0] || [];
    } else {
      const result = await db.execute(
        drizzleSql`SELECT l.*, t.task_name FROM jiandaoyun_sync_logs l 
          LEFT JOIN jiandaoyun_sync_tasks t ON l.task_id = t.id 
          ORDER BY l.started_at DESC LIMIT ${limit}`
      );
      return (result as any)[0] || [];
    }
  }

  /**
   * 获取同步统计
   */
  async getStats(): Promise<{
    totalTasks: number;
    enabledTasks: number;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncTime: string | null;
  }> {
    const db = await requireDb();
    
    const tasksResult = await db.execute(
      drizzleSql`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_enabled = true THEN 1 ELSE 0 END) as enabled
      FROM jiandaoyun_sync_tasks`
    );
    
    const logsResult = await db.execute(
      drizzleSql`SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        MAX(started_at) as last_sync
      FROM jiandaoyun_sync_logs`
    );
    
    const tasks = (tasksResult as any)[0]?.[0] || {};
    const logs = (logsResult as any)[0]?.[0] || {};
    
    return {
      totalTasks: Number(tasks.total) || 0,
      enabledTasks: Number(tasks.enabled) || 0,
      totalSyncs: Number(logs.total) || 0,
      successfulSyncs: Number(logs.success) || 0,
      failedSyncs: Number(logs.failed) || 0,
      lastSyncTime: logs.last_sync || null,
    };
  }

  /**
   * 创建默认同步任务
   */
  async createDefaultTasks(): Promise<number[]> {
    const taskIds: number[] = [];
    
    // 用户同步任务（每天凌晨2点）
    const userTaskId = await this.createTask({
      taskName: '简道云用户同步',
      taskType: 'user',
      syncDirection: 'jdy_to_grt',
      cronExpression: '0 0 2 * * *',
      isEnabled: true,
    });
    taskIds.push(userTaskId);
    
    // 部门同步任务（每天凌晨2点30分）
    const deptTaskId = await this.createTask({
      taskName: '简道云部门同步',
      taskType: 'department',
      syncDirection: 'jdy_to_grt',
      cronExpression: '0 30 2 * * *',
      isEnabled: true,
    });
    taskIds.push(deptTaskId);
    
    // 角色同步任务（每天凌晨3点）
    const roleTaskId = await this.createTask({
      taskName: '简道云角色同步',
      taskType: 'role',
      syncDirection: 'jdy_to_grt',
      cronExpression: '0 0 3 * * *',
      isEnabled: true,
    });
    taskIds.push(roleTaskId);

    // 角色成员同步任务（每天凌晨3点30分）
    const roleMemberTaskId = await this.createTask({
      taskName: '简道云角色成员同步',
      taskType: 'role_members',
      syncDirection: 'jdy_to_grt',
      cronExpression: '0 30 3 * * *',
      isEnabled: true,
    });
    taskIds.push(roleMemberTaskId);

    return taskIds;
  }
}

// 单例实例
let schedulerInstance: JiandaoyunScheduler | null = null;

export function getJiandaoyunScheduler(): JiandaoyunScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new JiandaoyunScheduler();
  }
  return schedulerInstance;
}
