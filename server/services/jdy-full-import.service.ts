/**
 * 简道云全量导入编排器
 * 按5个阶段顺序编排组织同步、用户创建、表单发现、项目导入、审批导入
 */

import { requireDb } from '../db';
import { sql as drizzleSql } from 'drizzle-orm';
import { getJiandaoyunSyncService, getJiandaoyunUserSyncService } from '../jiandaoyun';
import { provisionUsersFromJiandaoyun } from './jdy-user-provisioning.service';
import { getJdyFormDiscoveryService } from './jdy-form-discovery.service';
import { getJdyProjectImportService } from './jdy-project-import.service';
import { getJdyApprovalImportService } from './jdy-approval-import.service';

export type ImportPhase = 'org' | 'user' | 'discovery' | 'project' | 'approval' | 'knowledge';

export interface ImportConfig {
  phases: ImportPhase[];
  dryRun: boolean;
}

export interface ImportProgress {
  runCode: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentPhase: string | null;
  currentStep: string | null;
  progressPercent: number;
  totalExpected: number;
  totalProcessed: number;
  totalCreated: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFailed: number;
  phaseResults: Record<string, unknown>;
  errors: Array<{ phase: string; entity?: string; jdyId?: string; message: string }>;
  startedAt: string | null;
  completedAt: string | null;
}

// 全局导入锁
let currentImportRunCode: string | null = null;
let cancelRequested = false;

/**
 * 全量导入编排器
 */
export class JdyFullImportService {
  /**
   * 检查是否有导入正在运行
   */
  isRunning(): boolean {
    return currentImportRunCode !== null;
  }

  /**
   * 请求取消当前运行
   */
  requestCancel(): boolean {
    if (!currentImportRunCode) return false;
    cancelRequested = true;
    return true;
  }

  /**
   * 生成运行代码
   */
  private generateRunCode(): string {
    const now = new Date();
    const ts = now.toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    return `IMPORT-${ts}`;
  }

  /**
   * 更新运行进度到数据库
   */
  private async updateProgress(
    runCode: string,
    update: Partial<ImportProgress>
  ): Promise<void> {
    const db = await requireDb();
    await db.execute(
      drizzleSql`UPDATE jiandaoyun_import_runs SET
        status = ${update.status || 'running'},
        current_phase = ${update.currentPhase || null},
        current_step = ${update.currentStep || null},
        progress_percent = ${update.progressPercent || 0},
        total_expected = ${update.totalExpected || 0},
        total_processed = ${update.totalProcessed || 0},
        total_created = ${update.totalCreated || 0},
        total_updated = ${update.totalUpdated || 0},
        total_skipped = ${update.totalSkipped || 0},
        total_failed = ${update.totalFailed || 0},
        phase_results = ${update.phaseResults ? JSON.stringify(update.phaseResults) : null},
        errors = ${update.errors ? JSON.stringify(update.errors) : null},
        completed_at = ${update.completedAt || null},
        updated_at = NOW()
      WHERE run_code = ${runCode}`
    );
  }

  /**
   * 获取运行进度
   */
  async getProgress(runCode: string): Promise<ImportProgress | null> {
    const db = await requireDb();
    const result = await db.execute(
      drizzleSql`SELECT * FROM jiandaoyun_import_runs WHERE run_code = ${runCode} LIMIT 1`
    );
    const rows = (result as any)[0] || [];
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      runCode: row.run_code,
      status: row.status,
      currentPhase: row.current_phase,
      currentStep: row.current_step,
      progressPercent: row.progress_percent || 0,
      totalExpected: row.total_expected || 0,
      totalProcessed: row.total_processed || 0,
      totalCreated: row.total_created || 0,
      totalUpdated: row.total_updated || 0,
      totalSkipped: row.total_skipped || 0,
      totalFailed: row.total_failed || 0,
      phaseResults: typeof row.phase_results === 'string' ? JSON.parse(row.phase_results) : (row.phase_results || {}),
      errors: typeof row.errors === 'string' ? JSON.parse(row.errors) : (row.errors || []),
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }

  /**
   * 获取所有导入记录
   */
  async getImportRuns(): Promise<ImportProgress[]> {
    const db = await requireDb();
    const result = await db.execute(
      drizzleSql`SELECT * FROM jiandaoyun_import_runs ORDER BY created_at DESC LIMIT 50`
    );
    const rows = (result as any)[0] || [];
    return rows.map((row: any) => ({
      runCode: row.run_code,
      status: row.status,
      currentPhase: row.current_phase,
      currentStep: row.current_step,
      progressPercent: row.progress_percent || 0,
      totalExpected: row.total_expected || 0,
      totalProcessed: row.total_processed || 0,
      totalCreated: row.total_created || 0,
      totalUpdated: row.total_updated || 0,
      totalSkipped: row.total_skipped || 0,
      totalFailed: row.total_failed || 0,
      phaseResults: typeof row.phase_results === 'string' ? JSON.parse(row.phase_results) : (row.phase_results || {}),
      errors: typeof row.errors === 'string' ? JSON.parse(row.errors) : (row.errors || []),
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));
  }

  /**
   * 启动全量导入
   */
  async startImport(config: ImportConfig, triggeredBy?: number): Promise<string> {
    if (this.isRunning()) {
      throw new Error('已有导入任务正在运行，请等待完成或取消后再试');
    }

    const runCode = this.generateRunCode();
    currentImportRunCode = runCode;
    cancelRequested = false;

    const db = await requireDb();

    // 创建运行记录
    await db.execute(
      drizzleSql`INSERT INTO jiandaoyun_import_runs
        (run_code, run_type, status, import_config, triggered_by, started_at, created_at, updated_at)
      VALUES (
        ${runCode}, ${'full'}, ${'running'},
        ${JSON.stringify(config)}, ${triggeredBy || null},
        NOW(), NOW(), NOW()
      )`
    );

    // 异步执行导入（不阻塞请求）
    this.executeImport(runCode, config).catch((error) => {
      console.error(`[FullImport] 运行 ${runCode} 发生未捕获错误:`, error);
    });

    return runCode;
  }

  /**
   * 执行导入流程（异步）
   */
  private async executeImport(runCode: string, config: ImportConfig): Promise<void> {
    const phases = config.phases;
    const totalPhases = phases.length;
    const phaseResults: Record<string, unknown> = {};
    const allErrors: Array<{ phase: string; entity?: string; jdyId?: string; message: string }> = [];
    let totalCreated = 0, totalUpdated = 0, totalSkipped = 0, totalFailed = 0;

    try {
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];

        // 检查取消
        if (cancelRequested) {
          await this.updateProgress(runCode, {
            status: 'cancelled',
            currentPhase: phase,
            currentStep: '已取消',
            progressPercent: Math.round(((i) / totalPhases) * 100),
            totalCreated, totalUpdated, totalSkipped, totalFailed,
            phaseResults, errors: allErrors,
            completedAt: new Date().toISOString(),
          });
          currentImportRunCode = null;
          return;
        }

        const phasePercent = Math.round(((i) / totalPhases) * 100);
        await this.updateProgress(runCode, {
          currentPhase: phase,
          currentStep: `阶段 ${i + 1}/${totalPhases}: ${this.phaseLabel(phase)}`,
          progressPercent: phasePercent,
          totalCreated, totalUpdated, totalSkipped, totalFailed,
          phaseResults, errors: allErrors,
        });

        try {
          const phaseResult = await this.executePhase(phase, config.dryRun);
          phaseResults[phase] = phaseResult;

          // 累计统计
          if (phaseResult && typeof phaseResult === 'object') {
            const r = phaseResult as Record<string, any>;
            totalCreated += (r.created || r.usersCreated || r.projectsCreated || r.templatesCreated || r.instancesCreated || r.classified || 0);
            totalUpdated += (r.updated || r.usersUpdated || r.projectsUpdated || r.templatesUpdated || r.instancesUpdated || 0);
            totalSkipped += (r.skipped || r.usersSkipped || r.projectsSkipped || r.unclassified || 0);
            totalFailed += (r.failed || r.projectsFailed || 0);

            // 收集错误
            if (r.errors && Array.isArray(r.errors)) {
              for (const err of r.errors) {
                if (typeof err === 'string') {
                  allErrors.push({ phase, message: err });
                } else {
                  allErrors.push({ phase, ...err });
                }
              }
            }
          }
        } catch (error: any) {
          allErrors.push({ phase, message: error.message });
          console.error(`[FullImport] 阶段 ${phase} 失败:`, error);
          // 继续下一阶段
        }
      }

      // 完成
      await this.updateProgress(runCode, {
        status: 'completed',
        currentPhase: null,
        currentStep: '导入完成',
        progressPercent: 100,
        totalCreated, totalUpdated, totalSkipped, totalFailed,
        phaseResults, errors: allErrors,
        completedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      await this.updateProgress(runCode, {
        status: 'failed',
        currentStep: `致命错误: ${error.message}`,
        totalCreated, totalUpdated, totalSkipped, totalFailed,
        phaseResults,
        errors: [...allErrors, { phase: 'global', message: error.message }],
        completedAt: new Date().toISOString(),
      });
    } finally {
      currentImportRunCode = null;
    }
  }

  /**
   * 执行单个阶段
   */
  private async executePhase(phase: ImportPhase, dryRun: boolean): Promise<unknown> {
    switch (phase) {
      case 'org': {
        // Phase 1: 组织同步
        console.log('[FullImport] Phase 1: 组织同步');
        const userSyncService = getJiandaoyunUserSyncService();
        const deptResult = await userSyncService.syncDepartments();
        const memberResult = await userSyncService.syncMembers();
        const roleResult = await userSyncService.syncRoles();
        const roleMemberResult = await userSyncService.syncRoleMembers();
        return {
          departments: deptResult,
          members: memberResult,
          roles: roleResult,
          roleMembers: roleMemberResult,
          created: deptResult.created + memberResult.created + roleResult.created + roleMemberResult.created,
          updated: deptResult.updated + memberResult.updated + roleResult.updated + roleMemberResult.updated,
          failed: deptResult.failed + memberResult.failed + roleResult.failed + roleMemberResult.failed,
          errors: [
            ...deptResult.errors,
            ...memberResult.errors,
            ...roleResult.errors,
            ...roleMemberResult.errors,
          ],
        };
      }

      case 'user': {
        // Phase 2: 用户创建/同步
        console.log('[FullImport] Phase 2: 用户创建');
        const provisionResult = await provisionUsersFromJiandaoyun(dryRun);
        return {
          ...provisionResult,
          created: provisionResult.usersCreated,
          updated: provisionResult.usersUpdated + provisionResult.usersLinked,
          skipped: provisionResult.usersSkipped,
          errors: provisionResult.errors.map(e => `${e.jdyUsername}: ${e.error}`),
        };
      }

      case 'discovery': {
        // Phase 3: 表单发现
        console.log('[FullImport] Phase 3: 表单发现');
        const discoveryService = getJdyFormDiscoveryService();
        const discoveryResult = await discoveryService.discoverForms();
        return {
          ...discoveryResult,
          created: discoveryResult.classified,
          skipped: discoveryResult.unclassified,
        };
      }

      case 'project': {
        // Phase 4: 项目导入
        console.log('[FullImport] Phase 4: 项目导入');
        const projectService = getJdyProjectImportService();
        return projectService.importProjects(dryRun);
      }

      case 'approval': {
        // Phase 5: 审批导入
        console.log('[FullImport] Phase 5: 审批导入');
        const approvalService = getJdyApprovalImportService();
        return approvalService.importApprovals(dryRun);
      }

      case 'knowledge': {
        // Phase 6: 知识库导入
        console.log('[FullImport] Phase 6: 知识库导入');
        const { getJdyKnowledgeImportService } = await import('./jdy-knowledge-import.service');
        const knowledgeService = getJdyKnowledgeImportService();
        const knowledgeResult = await knowledgeService.importKnowledge();
        return {
          ...knowledgeResult,
          created: knowledgeResult.documentsCreated,
          updated: knowledgeResult.documentsUpdated,
          skipped: knowledgeResult.documentsSkipped,
          errors: knowledgeResult.errors.map(e => `${e.formId}: ${e.message}`),
        };
      }

      default:
        throw new Error(`未知阶段: ${phase}`);
    }
  }

  /**
   * 阶段标签
   */
  private phaseLabel(phase: ImportPhase): string {
    const labels: Record<ImportPhase, string> = {
      org: '组织架构同步',
      user: '用户创建',
      discovery: '表单发现',
      project: '项目数据导入',
      approval: '审批流程导入',
      knowledge: '知识库导入',
    };
    return labels[phase] || phase;
  }

  /**
   * 获取导入验证结果
   */
  async getVerification(): Promise<Record<string, unknown>> {
    const db = await requireDb();

    const [deptCount, userCount, linkedCount, projectCount, approvalCount, orphanCheck] = await Promise.all([
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_dept_mappings`),
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_user_mappings`),
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_user_mappings WHERE grt_user_id IS NOT NULL`),
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM projects WHERE "jiandaoyunId" IS NOT NULL`),
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM grt_approval_instances WHERE jiandaoyun_id IS NOT NULL`),
      // 孤立引用检查：项目中引用了不存在的用户ID
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM projects
        WHERE "managerId" IS NOT NULL AND "managerId" NOT IN (SELECT id FROM users)`),
    ]);

    return {
      departments: { jdyCount: ((deptCount as any)[0]?.[0]?.cnt || 0) },
      users: {
        jdyCount: ((userCount as any)[0]?.[0]?.cnt || 0),
        linkedCount: ((linkedCount as any)[0]?.[0]?.cnt || 0),
      },
      projects: { importedCount: ((projectCount as any)[0]?.[0]?.cnt || 0) },
      approvals: { importedCount: ((approvalCount as any)[0]?.[0]?.cnt || 0) },
      orphanedReferences: { count: ((orphanCheck as any)[0]?.[0]?.cnt || 0) },
    };
  }
}

// 单例
let instance: JdyFullImportService | null = null;
export function getJdyFullImportService(): JdyFullImportService {
  if (!instance) {
    instance = new JdyFullImportService();
  }
  return instance;
}
