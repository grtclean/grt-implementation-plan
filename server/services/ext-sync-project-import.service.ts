/**
 * 外部平台项目数据导入服务
 * 将外部平台表单数据映射并导入到GRT项目管理表
 */

import { requireDb } from '../db';
import { sql as drizzleSql } from 'drizzle-orm';
import { getExternalSyncService, ExternalSyncRecord } from '../external-sync';
import { getExtSyncFormDiscoveryService } from './ext-sync-form-discovery.service';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("ext-sync-project");

export interface ProjectImportResult {
  projectsCreated: number;
  projectsUpdated: number;
  projectsSkipped: number;
  projectsFailed: number;
  tasksCreated: number;
  tasksUpdated: number;
  milestonesCreated: number;
  milestonesUpdated: number;
  phasesCreated: number;
  phasesUpdated: number;
  teamMembersCreated: number;
  teamMembersUpdated: number;
  errors: Array<{ entity: string; extId: string; message: string }>;
}

// M阶段代码解析正则
const PHASE_PATTERN = /M(\d{1,2})/i;

/**
 * 从表单名称中解析M0-M12阶段码
 */
function parsePhaseFromFormName(formName: string): string | null {
  const match = formName.match(PHASE_PATTERN);
  if (match) {
    return `M${match[1]}`;
  }
  return null;
}

/**
 * 项目数据导入服务
 */
export class ExtSyncProjectImportService {
  // 外部平台 username → GRT userId 内存缓存
  private userCache: Map<string, number> = new Map();

  /**
   * 构建用户映射缓存（避免N+1查询）
   */
  private async buildUserCache(): Promise<void> {
    const db = await requireDb();
    const result = await db.execute(
      drizzleSql`SELECT jdy_username, grt_user_id FROM jiandaoyun_user_mappings WHERE grt_user_id IS NOT NULL`
    );
    const rows = (result as any)[0] || [];
    this.userCache.clear();
    for (const row of rows) {
      this.userCache.set(row.jdy_username, row.grt_user_id);
    }
  }

  /**
   * 解析外部平台用户引用为GRT userId
   * 外部平台中用户引用可能是 username 字符串 或 { username, name } 对象
   */
  private resolveUser(jdyUserRef: unknown): number | null {
    if (!jdyUserRef) return null;

    if (typeof jdyUserRef === 'string') {
      return this.userCache.get(jdyUserRef) ?? null;
    }

    if (typeof jdyUserRef === 'object' && jdyUserRef !== null) {
      const ref = jdyUserRef as Record<string, unknown>;
      const username = ref.username as string;
      if (username) {
        return this.userCache.get(username) ?? null;
      }
    }

    return null;
  }

  /**
   * 将外部平台表单记录按字段映射转换为GRT项目数据
   */
  private mapRecordToProject(
    record: ExternalSyncRecord,
    fieldMapping: Record<string, string>,
    defaultPhase: string | null
  ): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};

    for (const [jdyField, grtColumn] of Object.entries(fieldMapping)) {
      const value = record[jdyField];
      if (value === undefined || value === null) continue;

      // 用户引用字段特殊处理
      if (grtColumn === 'managerId' || grtColumn === 'assigneeId') {
        mapped[grtColumn] = this.resolveUser(value);
      } else {
        mapped[grtColumn] = value;
      }
    }

    // 设置阶段码（从表单名解析）
    if (defaultPhase && !mapped.currentPhase) {
      mapped.currentPhase = defaultPhase;
    }

    // 设置外部平台 ID用于幂等
    mapped.externalSyncId = record._id;

    return mapped;
  }

  /**
   * 执行项目数据导入
   */
  async importProjects(dryRun: boolean = false): Promise<ProjectImportResult> {
    const result: ProjectImportResult = {
      projectsCreated: 0,
      projectsUpdated: 0,
      projectsSkipped: 0,
      projectsFailed: 0,
      tasksCreated: 0,
      tasksUpdated: 0,
      milestonesCreated: 0,
      milestonesUpdated: 0,
      phasesCreated: 0,
      phasesUpdated: 0,
      teamMembersCreated: 0,
      teamMembersUpdated: 0,
      errors: [],
    };

    const syncService = getExternalSyncService();
    const discoveryService = getExtSyncFormDiscoveryService();

    // 1. 构建用户缓存
    await this.buildUserCache();

    const db = await requireDb();

    // 2. 获取已确认的项目类表单映射
    const projectMappings = await discoveryService.getConfirmedMappings('project');
    const taskMappings = await discoveryService.getConfirmedMappings('projectTask');
    const milestoneMappings = await discoveryService.getConfirmedMappings('projectMilestone');

    // 3. 导入项目
    for (const mapping of projectMappings) {
      try {
        const fieldMapping = typeof mapping.field_mapping === 'string'
          ? JSON.parse(mapping.field_mapping)
          : mapping.field_mapping;
        if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
          log.warn({ formName: mapping.jdy_form_name }, "跳过无字段映射的表单");
          continue;
        }

        const defaultPhase = parsePhaseFromFormName(mapping.jdy_form_name);

        // 分页获取所有数据
        const allRecords = await syncService.getAllFormData(mapping.jdy_app_id, mapping.jdy_form_id);

        // 按50条批量处理
        for (let i = 0; i < allRecords.length; i += 50) {
          const batch = allRecords.slice(i, i + 50);

          for (const record of batch) {
            try {
              const data = this.mapRecordToProject(record, fieldMapping, defaultPhase);

              if (dryRun) {
                result.projectsSkipped++;
                continue;
              }

              // 幂等upsert: 按externalSyncId查找
              const existing = await db.execute(
                drizzleSql`SELECT id FROM projects WHERE "jiandaoyunId" = ${record._id} LIMIT 1`
              );

              if (existing && (existing as any)[0]?.length > 0) {
                // UPDATE
                await db.execute(
                  drizzleSql`UPDATE projects SET
                    name = ${(data.name as string) || 'Unnamed'},
                    "projectCode" = ${(data.projectCode as string) || null},
                    "shortName" = ${(data.shortName as string) || null},
                    "currentPhase" = ${(data.currentPhase as string) || null},
                    description = ${(data.description as string) || null},
                    "managerId" = ${(data.managerId as number) || null},
                    remark = ${(data.remark as string) || null},
                    "updatedAt" = NOW()
                  WHERE "jiandaoyunId" = ${record._id}`
                );
                result.projectsUpdated++;
              } else {
                // INSERT
                await db.execute(
                  drizzleSql`INSERT INTO projects
                    (name, "projectCode", "shortName", "currentPhase", description, "managerId", remark, "jiandaoyunId", "createdAt", "updatedAt")
                  VALUES (
                    ${(data.name as string) || 'Unnamed'},
                    ${(data.projectCode as string) || null},
                    ${(data.shortName as string) || null},
                    ${(data.currentPhase as string) || 'M0'},
                    ${(data.description as string) || null},
                    ${(data.managerId as number) || null},
                    ${(data.remark as string) || null},
                    ${record._id},
                    NOW(), NOW()
                  )`
                );
                result.projectsCreated++;
              }
            } catch (error: any) {
              result.projectsFailed++;
              result.errors.push({
                entity: 'project',
                extId: record._id,
                message: error.message,
              });
            }
          }

          // 检查失败率
          const total = result.projectsCreated + result.projectsUpdated + result.projectsFailed;
          if (total > 10 && result.projectsFailed / total > 0.5) {
            log.error({ failRate: result.projectsFailed / total }, "失败率超过50%，暂停导入");
            result.errors.push({
              entity: 'project',
              extId: '',
              message: '失败率超过50%，导入已暂停',
            });
            return result;
          }
        }
      } catch (error: any) {
        result.errors.push({
          entity: 'project',
          extId: mapping.jdy_form_id,
          message: `表单获取失败: ${error.message}`,
        });
      }
    }

    // 4. 导入任务
    for (const mapping of taskMappings) {
      try {
        const fieldMapping = typeof mapping.field_mapping === 'string'
          ? JSON.parse(mapping.field_mapping)
          : mapping.field_mapping;
        if (!fieldMapping || Object.keys(fieldMapping).length === 0) continue;

        const allRecords = await syncService.getAllFormData(mapping.jdy_app_id, mapping.jdy_form_id);

        for (const record of allRecords) {
          try {
            const data = this.mapRecordToProject(record, fieldMapping, null);

            if (dryRun) {
              result.tasksCreated++; // 计为预期创建
              continue;
            }

            const existing = await db.execute(
              drizzleSql`SELECT id FROM project_tasks WHERE "jiandaoyunId" = ${record._id} LIMIT 1`
            );

            if (existing && (existing as any)[0]?.length > 0) {
              result.tasksUpdated++;
            } else {
              await db.execute(
                drizzleSql`INSERT INTO project_tasks
                  (name, description, "jiandaoyunId", "createdAt", "updatedAt")
                VALUES (
                  ${(data.name as string) || 'Unnamed Task'},
                  ${(data.description as string) || null},
                  ${record._id},
                  NOW(), NOW()
                )`
              );
              result.tasksCreated++;
            }
          } catch (error: any) {
            result.errors.push({
              entity: 'projectTask',
              extId: record._id,
              message: error.message,
            });
          }
        }
      } catch (error: any) {
        result.errors.push({
          entity: 'projectTask',
          extId: mapping.jdy_form_id,
          message: `任务表单获取失败: ${error.message}`,
        });
      }
    }

    // 5. 导入里程碑
    for (const mapping of milestoneMappings) {
      try {
        const fieldMapping = typeof mapping.field_mapping === 'string'
          ? JSON.parse(mapping.field_mapping)
          : mapping.field_mapping;
        if (!fieldMapping || Object.keys(fieldMapping).length === 0) continue;

        const allRecords = await syncService.getAllFormData(mapping.jdy_app_id, mapping.jdy_form_id);

        for (const record of allRecords) {
          try {
            if (dryRun) {
              result.milestonesCreated++;
              continue;
            }

            // 里程碑表没有externalSyncId列，用名称+日期去重
            const data = this.mapRecordToProject(record, fieldMapping, null);
            await db.execute(
              drizzleSql`INSERT INTO project_milestones
                (name, description, "createdAt", "updatedAt")
              VALUES (
                ${(data.name as string) || 'Unnamed Milestone'},
                ${(data.description as string) || null},
                NOW(), NOW()
              )`
            );
            result.milestonesCreated++;
          } catch (error: any) {
            result.errors.push({
              entity: 'projectMilestone',
              extId: record._id,
              message: error.message,
            });
          }
        }
      } catch (error: any) {
        result.errors.push({
          entity: 'projectMilestone',
          extId: mapping.jdy_form_id,
          message: `里程碑表单获取失败: ${error.message}`,
        });
      }
    }

    // 6. 导入项目阶段
    const phaseMappings = await discoveryService.getConfirmedMappings('projectPhase');
    for (const mapping of phaseMappings) {
      try {
        const fieldMapping = typeof mapping.field_mapping === 'string'
          ? JSON.parse(mapping.field_mapping)
          : mapping.field_mapping;
        if (!fieldMapping || Object.keys(fieldMapping).length === 0) continue;

        const allRecords = await syncService.getAllFormData(mapping.jdy_app_id, mapping.jdy_form_id);

        for (const record of allRecords) {
          try {
            if (dryRun) {
              result.phasesCreated++;
              continue;
            }

            const data = this.mapRecordToProject(record, fieldMapping, null);
            const phaseCode = (data.phaseCode as string) || parsePhaseFromFormName(mapping.jdy_form_name) || `PH-${record._id.substring(0, 8)}`;

            // 用 phaseCode 去重
            const existing = await db.execute(
              drizzleSql`SELECT id FROM project_phases WHERE "phaseCode" = ${phaseCode} LIMIT 1`
            );

            if (existing && (existing as any)[0]?.length > 0) {
              await db.execute(
                drizzleSql`UPDATE project_phases SET
                  name = ${(data.name as string) || phaseCode},
                  description = ${(data.description as string) || null}
                WHERE "phaseCode" = ${phaseCode}`
              );
              result.phasesUpdated++;
            } else {
              await db.execute(
                drizzleSql`INSERT INTO project_phases
                  ("phaseCode", name, description, sequence, "createdAt")
                VALUES (
                  ${phaseCode},
                  ${(data.name as string) || phaseCode},
                  ${(data.description as string) || null},
                  ${(data.sequence as number) || 0},
                  NOW()
                )`
              );
              result.phasesCreated++;
            }
          } catch (error: any) {
            result.errors.push({
              entity: 'projectPhase',
              extId: record._id,
              message: error.message,
            });
          }
        }
      } catch (error: any) {
        result.errors.push({
          entity: 'projectPhase',
          extId: mapping.jdy_form_id,
          message: `阶段表单获取失败: ${error.message}`,
        });
      }
    }

    // 7. 导入项目团队成员
    const teamMemberMappings = await discoveryService.getConfirmedMappings('projectTeamMember');
    for (const mapping of teamMemberMappings) {
      try {
        const fieldMapping = typeof mapping.field_mapping === 'string'
          ? JSON.parse(mapping.field_mapping)
          : mapping.field_mapping;
        if (!fieldMapping || Object.keys(fieldMapping).length === 0) continue;

        const allRecords = await syncService.getAllFormData(mapping.jdy_app_id, mapping.jdy_form_id);

        for (const record of allRecords) {
          try {
            if (dryRun) {
              result.teamMembersCreated++;
              continue;
            }

            const data = this.mapRecordToProject(record, fieldMapping, null);
            const projectId = data.projectId as number;
            const userId = data.userId as number;

            if (!projectId || !userId) {
              result.errors.push({
                entity: 'projectTeamMember',
                extId: record._id,
                message: '缺少projectId或userId',
              });
              continue;
            }

            // 用 projectId + userId 去重
            const existing = await db.execute(
              drizzleSql`SELECT id FROM project_team_members WHERE "projectId" = ${projectId} AND "userId" = ${userId} LIMIT 1`
            );

            if (existing && (existing as any)[0]?.length > 0) {
              await db.execute(
                drizzleSql`UPDATE project_team_members SET
                  role = ${(data.role as string) || 'member'},
                  responsibility = ${(data.responsibility as string) || null}
                WHERE "projectId" = ${projectId} AND "userId" = ${userId}`
              );
              result.teamMembersUpdated++;
            } else {
              await db.execute(
                drizzleSql`INSERT INTO project_team_members
                  ("projectId", "userId", role, responsibility, "joinedAt", "createdAt")
                VALUES (
                  ${projectId},
                  ${userId},
                  ${(data.role as string) || 'member'},
                  ${(data.responsibility as string) || null},
                  NOW(), NOW()
                )`
              );
              result.teamMembersCreated++;
            }
          } catch (error: any) {
            result.errors.push({
              entity: 'projectTeamMember',
              extId: record._id,
              message: error.message,
            });
          }
        }
      } catch (error: any) {
        result.errors.push({
          entity: 'projectTeamMember',
          extId: mapping.jdy_form_id,
          message: `成员表单获取失败: ${error.message}`,
        });
      }
    }

    return result;
  }
}

// 单例
let instance: ExtSyncProjectImportService | null = null;
export function getExtSyncProjectImportService(): ExtSyncProjectImportService {
  if (!instance) {
    instance = new ExtSyncProjectImportService();
  }
  return instance;
}
