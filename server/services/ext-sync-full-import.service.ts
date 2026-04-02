/**
 * 外部平台全量导入编排器
 * 按5个阶段顺序编排组织同步、用户创建、表单发现、项目导入、审批导入
 */

import { requireDb } from '../db';
import { sql as drizzleSql } from 'drizzle-orm';
import { getExternalSyncService, getExternalSyncUserService } from '../external-sync';
import { provisionUsersFromExternalSync } from './ext-sync-user-provisioning.service';
import { getExtSyncFormDiscoveryService } from './ext-sync-form-discovery.service';
import { getExtSyncProjectImportService } from './ext-sync-project-import.service';
import { getExtSyncApprovalImportService } from './ext-sync-approval-import.service';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("ext-sync-full");

export type ImportPhase = 'org' | 'user' | 'discovery' | 'project' | 'approval' | 'knowledge' | 'procurement' | 'complaint';

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
  errors: Array<{ phase: string; entity?: string; extId?: string; message: string }>;
  startedAt: string | null;
  completedAt: string | null;
}

// 全局导入锁
let currentImportRunCode: string | null = null;
let cancelRequested = false;

/**
 * 全量导入编排器
 */
export class ExtSyncFullImportService {
  /**
   * Startup cleanup — mark any "running" imports as failed (orphaned by server restart).
   * Called once when service is first instantiated.
   */
  async cleanupOrphanedRuns(): Promise<void> {
    try {
      const db = await requireDb();
      const result = await db.execute(
        drizzleSql`UPDATE jiandaoyun_import_runs
          SET status = 'failed', completed_at = NOW(), updated_at = NOW()
          WHERE status = 'running'
          RETURNING run_code`
      );
      const rows = (result as any).rows || (result as any)[0] || [];
      if (rows.length > 0) {
        log.warn({ orphanedRuns: rows.map((r: any) => r.run_code) },
          "Cleaned up orphaned import runs from previous server instance");
      }
    } catch (err) {
      log.warn({ err }, "Failed to cleanup orphaned import runs (table may not exist yet)");
    }
  }

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
    const rows = (result as any).rows || (result as any)[0] || [];
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
    const rows = (result as any).rows || (result as any)[0] || [];
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

    try {
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
    } catch (error) {
      // Release lock if INSERT fails so future imports aren't blocked
      currentImportRunCode = null;
      throw error;
    }

    // 异步执行导入（不阻塞请求）
    this.executeImport(runCode, config).catch((error) => {
      log.error({ err: error, runCode }, "运行发生未捕获错误");
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
    const allErrors: Array<{ phase: string; entity?: string; extId?: string; message: string }> = [];
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
          log.error({ err: error, phase }, "阶段失败");
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
        const userSyncService = getExternalSyncUserService();
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
        const provisionResult = await provisionUsersFromExternalSync(dryRun);
        return {
          ...provisionResult,
          created: provisionResult.usersCreated,
          updated: provisionResult.usersUpdated + provisionResult.usersLinked,
          skipped: provisionResult.usersSkipped,
          errors: provisionResult.errors.map(e => `${e.extUsername}: ${e.error}`),
        };
      }

      case 'discovery': {
        // Phase 3: 表单发现
        const discoveryService = getExtSyncFormDiscoveryService();
        const discoveryResult = await discoveryService.discoverForms();
        return {
          ...discoveryResult,
          created: discoveryResult.classified,
          skipped: discoveryResult.unclassified,
        };
      }

      case 'project': {
        // Phase 4: 项目导入
        const projectService = getExtSyncProjectImportService();
        return projectService.importProjects(dryRun);
      }

      case 'approval': {
        // Phase 5: 审批导入
        const approvalService = getExtSyncApprovalImportService();
        return approvalService.importApprovals(dryRun);
      }

      case 'knowledge': {
        // Phase 6: 知识库导入
        const { getExtSyncKnowledgeImportService } = await import('./ext-sync-knowledge-import.service');
        const knowledgeService = getExtSyncKnowledgeImportService();
        const knowledgeResult = await knowledgeService.importKnowledge();
        return {
          ...knowledgeResult,
          created: knowledgeResult.documentsCreated,
          updated: knowledgeResult.documentsUpdated,
          skipped: knowledgeResult.documentsSkipped,
          errors: knowledgeResult.errors.map(e => `${e.formId}: ${e.message}`),
        };
      }

      case 'procurement': {
        // Phase 7: 采购数据导入
        const { getExtSyncProcurementImportService } = await import('./ext-sync-procurement-import.service');
        const procService = getExtSyncProcurementImportService();
        const procResult = await procService.importProcurement(dryRun);
        return {
          ...procResult,
          created: procResult.purchaseRequestsCreated,
          updated: procResult.purchaseRequestsUpdated,
          skipped: procResult.purchaseRequestsSkipped,
          failed: procResult.purchaseRequestsFailed,
          errors: procResult.errors.map(e => `${e.entity}: ${e.message}`),
        };
      }

      case 'complaint': {
        // Phase 8: 客诉数据导入
        const { getExtSyncComplaintImportService } = await import('./ext-sync-complaint-import.service');
        const complaintService = getExtSyncComplaintImportService();
        const complaintResult = await complaintService.importComplaints(dryRun);
        return {
          ...complaintResult,
          created: complaintResult.ticketsCreated,
          updated: complaintResult.ticketsUpdated,
          skipped: complaintResult.ticketsSkipped,
          failed: complaintResult.ticketsFailed,
          errors: complaintResult.errors.map(e => `${e.entity}: ${e.message}`),
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
      procurement: '采购数据导入',
      complaint: '客诉数据导入',
    };
    return labels[phase] || phase;
  }

  /**
   * 获取导入验证结果
   */
  async getVerification(): Promise<Record<string, unknown>> {
    const db = await requireDb();
    const extractCount = (result: any) => Number((result as any)[0]?.[0]?.cnt ?? (result as any).rows?.[0]?.cnt ?? 0);

    // Core counts — always present
    const [deptCount, userCount, linkedCount, projectCount, approvalCount, orphanCheck] = await Promise.all([
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_dept_mappings`),
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_user_mappings`),
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_user_mappings WHERE grt_user_id IS NOT NULL`),
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM projects WHERE "jiandaoyunId" IS NOT NULL`),
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM grt_approval_instances WHERE jiandaoyun_id IS NOT NULL`),
      db.execute(drizzleSql`SELECT COUNT(*) as cnt FROM projects
        WHERE "managerId" IS NOT NULL AND "managerId" NOT IN (SELECT id FROM users)`),
    ]);

    // Extended counts — optional tables, each wrapped in try/catch
    const safeCount = async (query: ReturnType<typeof drizzleSql>) => {
      try { return extractCount(await db.execute(query)); } catch { return null; }
    };

    const [roleCount, roleMemberCount, formCount, cacheCount, procurementCount, complaintCount, knowledgeCount, importRunCount] = await Promise.all([
      safeCount(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_role_mappings`),
      safeCount(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_role_members`),
      safeCount(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_form_mappings`),
      safeCount(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_form_data_cache`),
      safeCount(drizzleSql`SELECT COUNT(*) as cnt FROM purchase_requests WHERE source = 'jiandaoyun'`),
      safeCount(drizzleSql`SELECT COUNT(*) as cnt FROM customer_tickets WHERE source = 'jiandaoyun'`),
      safeCount(drizzleSql`SELECT COUNT(*) as cnt FROM knowledge_documents WHERE source = 'jiandaoyun'`),
      safeCount(drizzleSql`SELECT COUNT(*) as cnt FROM jiandaoyun_import_runs`),
    ]);

    return {
      departments: { extCount: extractCount(deptCount) },
      users: {
        extCount: extractCount(userCount),
        linkedCount: extractCount(linkedCount),
      },
      roles: { extCount: roleCount, memberCount: roleMemberCount },
      forms: { discoveredCount: formCount, cachedRecords: cacheCount },
      projects: { importedCount: extractCount(projectCount) },
      approvals: { importedCount: extractCount(approvalCount) },
      procurement: { importedCount: procurementCount },
      complaints: { importedCount: complaintCount },
      knowledge: { importedCount: knowledgeCount },
      orphanedReferences: { count: extractCount(orphanCheck) },
      importRuns: { totalCount: importRunCount },
    };
  }
}

// 单例
let instance: ExtSyncFullImportService | null = null;
let cleanupDone = false;
export function getExtSyncFullImportService(): ExtSyncFullImportService {
  if (!instance) {
    instance = new ExtSyncFullImportService();
    // Cleanup orphaned runs from previous server instance (fire-and-forget)
    if (!cleanupDone) {
      cleanupDone = true;
      instance.cleanupOrphanedRuns().catch(() => {});
    }
  }
  return instance;
}
