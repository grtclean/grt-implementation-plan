/**
 * 简道云审批流程导入服务
 * 将JDY审批流程数据导入到GRT审批引擎表
 */

import { requireDb } from '../db';
import { sql as drizzleSql } from 'drizzle-orm';
import { getJiandaoyunSyncService, JiandaoyunRecord } from '../jiandaoyun';
import { getJdyFormDiscoveryService } from './jdy-form-discovery.service';

export interface ApprovalImportResult {
  templatesCreated: number;
  templatesUpdated: number;
  instancesCreated: number;
  instancesUpdated: number;
  stepsCreated: number;
  logsCreated: number;
  failed: number;
  errors: Array<{ entity: string; jdyId: string; message: string }>;
}

// JDY审批状态 → GRT审批状态映射
const STATUS_MAPPING: Record<string, string> = {
  'pending': 'pending',
  '待审批': 'pending',
  '审批中': 'pending',
  'approved': 'approved',
  '已通过': 'approved',
  '已同意': 'approved',
  'rejected': 'rejected',
  '已拒绝': 'rejected',
  '已驳回': 'rejected',
  'withdrawn': 'cancelled',
  '已撤回': 'cancelled',
  '已取消': 'cancelled',
};

/**
 * 映射审批状态
 */
function mapApprovalStatus(jdyStatus: unknown): string {
  if (!jdyStatus) return 'pending';
  const statusStr = String(jdyStatus).trim();
  return STATUS_MAPPING[statusStr] || 'pending';
}

/**
 * 生成唯一的实例/模板编码
 */
function generateCode(prefix: string, jdyId: string): string {
  return `${prefix}-JDY-${jdyId.substring(0, 12)}`;
}

/**
 * 解析的审批步骤
 */
interface ParsedWorkflowStep {
  stepNumber: number;
  stepName: string;
  approverRole: string;
  approverType: string;
  approverRef?: unknown; // JDY用户引用，运行时解析
}

/**
 * 审批流程导入服务
 */
export class JdyApprovalImportService {
  // JDY username → GRT userId 内存缓存
  private userCache: Map<string, { userId: number; name: string }> = new Map();

  /**
   * 构建用户映射缓存
   */
  private async buildUserCache(): Promise<void> {
    const db = await requireDb();
    const result = await db.execute(
      drizzleSql`SELECT jdy_username, grt_user_id, jdy_name FROM jiandaoyun_user_mappings WHERE grt_user_id IS NOT NULL`
    );
    const rows = (result as any)[0] || [];
    this.userCache.clear();
    for (const row of rows) {
      this.userCache.set(row.jdy_username, {
        userId: row.grt_user_id,
        name: row.jdy_name,
      });
    }
    console.log(`[ApprovalImport] 用户缓存已构建: ${this.userCache.size} 条`);
  }

  /**
   * 解析JDY用户引用
   */
  private resolveUser(jdyUserRef: unknown): { userId: number; name: string } | null {
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
   * 从JDY记录中解析审批步骤（多策略）
   * 策略1: 子表单字段 — 查找包含审批步骤数据的数组字段
   * 策略2: 编号字段 — 查找"审批人1"/"审批人2"等编号字段
   * 兜底: 返回默认单步骤
   */
  private parseWorkflowSteps(record: JiandaoyunRecord): ParsedWorkflowStep[] {
    const stepKeywords = ['审批人', '审批节点', '步骤', '节点', 'approver', 'step'];
    const roleKeywords = ['审批', '审核', '会签', '复核', '终审'];

    // 策略1: 查找子表单（数组字段），包含多个审批步骤
    for (const [key, value] of Object.entries(record)) {
      if (!Array.isArray(value) || value.length === 0) continue;
      // 检查数组元素是否含有审批相关字段
      const firstItem = value[0];
      if (typeof firstItem !== 'object' || firstItem === null) continue;
      const subKeys = Object.keys(firstItem);
      const hasStepFields = subKeys.some(sk =>
        stepKeywords.some(kw => sk.includes(kw))
      );
      if (!hasStepFields) continue;

      // 解析子表单中的步骤
      const steps: ParsedWorkflowStep[] = [];
      for (let i = 0; i < value.length; i++) {
        const item = value[i] as Record<string, unknown>;
        // 查找步骤名和审批人
        let stepName = '审批';
        let approverRef: unknown = null;
        let approverRole = 'approver';

        for (const [sk, sv] of Object.entries(item)) {
          if (sk.includes('名称') || sk.includes('节点名') || sk.includes('步骤名')) {
            stepName = String(sv || '审批');
          }
          if (stepKeywords.some(kw => sk.includes(kw)) && sv) {
            approverRef = sv;
          }
          if (sk.includes('角色') || sk.includes('类型')) {
            approverRole = String(sv || 'approver');
          }
        }

        steps.push({
          stepNumber: i + 1,
          stepName: stepName || `步骤${i + 1}`,
          approverRole,
          approverType: 'user',
          approverRef,
        });
      }
      if (steps.length > 0) return steps;
    }

    // 策略2: 查找编号字段（审批人1、审批人2 …）
    const numberedSteps: ParsedWorkflowStep[] = [];
    for (let n = 1; n <= 10; n++) {
      const variants = [`审批人${n}`, `审核人${n}`, `approver${n}`, `审批人_${n}`];
      let found = false;
      for (const variant of variants) {
        if (record[variant] !== undefined) {
          const roleName = roleKeywords[Math.min(n - 1, roleKeywords.length - 1)] || '审批';
          numberedSteps.push({
            stepNumber: n,
            stepName: `${roleName}(${n})`,
            approverRole: 'approver',
            approverType: 'user',
            approverRef: record[variant],
          });
          found = true;
          break;
        }
      }
      // 一旦编号断开，停止查找
      if (!found && n > 1) break;
    }
    if (numberedSteps.length > 0) return numberedSteps;

    // 兜底: 单步骤默认值
    return [{
      stepNumber: 1,
      stepName: '审批',
      approverRole: 'manager',
      approverType: 'user',
    }];
  }

  /**
   * 执行审批数据导入
   */
  async importApprovals(dryRun: boolean = false): Promise<ApprovalImportResult> {
    const result: ApprovalImportResult = {
      templatesCreated: 0,
      templatesUpdated: 0,
      instancesCreated: 0,
      instancesUpdated: 0,
      stepsCreated: 0,
      logsCreated: 0,
      failed: 0,
      errors: [],
    };

    const syncService = getJiandaoyunSyncService();
    const discoveryService = getJdyFormDiscoveryService();

    // 1. 构建用户缓存
    await this.buildUserCache();

    const db = await requireDb();

    // 2. 获取已确认的审批类表单映射
    const templateMappings = await discoveryService.getConfirmedMappings('approval_template');
    const instanceMappings = await discoveryService.getConfirmedMappings('approval_instance');

    // 3. 导入审批模板
    for (const mapping of templateMappings) {
      try {
        const allRecords = await syncService.getAllFormData(mapping.jdy_app_id, mapping.jdy_form_id);
        console.log(`[ApprovalImport] 模板表单 ${mapping.jdy_form_name}: ${allRecords.length} 条`);

        for (const record of allRecords) {
          try {
            if (dryRun) {
              result.templatesCreated++;
              continue;
            }

            const templateCode = generateCode('TPL', record._id);
            const templateName = (record['模板名称'] || record['流程名称'] || record['name'] || mapping.jdy_form_name) as string;
            const businessType = (record['业务类型'] || record['审批类型'] || 'general') as string;

            // 解析多步骤审批流程
            const parsedSteps = this.parseWorkflowSteps(record);

            // 幂等upsert
            const existing = await db.execute(
              drizzleSql`SELECT id FROM grt_approval_templates WHERE jiandaoyun_id = ${record._id} LIMIT 1`
            );

            if (existing && (existing as any)[0]?.length > 0) {
              await db.execute(
                drizzleSql`UPDATE grt_approval_templates SET
                  template_name = ${templateName},
                  business_type = ${businessType},
                  steps = ${JSON.stringify(parsedSteps.map(s => ({ stepNumber: s.stepNumber, stepName: s.stepName, approverRole: s.approverRole, approverType: s.approverType })))},
                  updated_at = NOW()
                WHERE jiandaoyun_id = ${record._id}`
              );
              result.templatesUpdated++;
            } else {
              await db.execute(
                drizzleSql`INSERT INTO grt_approval_templates
                  (template_code, template_name, business_type, steps, jiandaoyun_id, created_at, updated_at)
                VALUES (
                  ${templateCode},
                  ${templateName},
                  ${businessType},
                  ${JSON.stringify(parsedSteps.map(s => ({ stepNumber: s.stepNumber, stepName: s.stepName, approverRole: s.approverRole, approverType: s.approverType })))},
                  ${record._id},
                  NOW(), NOW()
                )`
              );
              result.templatesCreated++;
            }
          } catch (error: any) {
            result.failed++;
            result.errors.push({ entity: 'approval_template', jdyId: record._id, message: error.message });
          }
        }
      } catch (error: any) {
        result.errors.push({ entity: 'approval_template', jdyId: mapping.jdy_form_id, message: error.message });
      }
    }

    // 4. 导入审批实例
    for (const mapping of instanceMappings) {
      try {
        const fieldMapping = typeof mapping.field_mapping === 'string'
          ? JSON.parse(mapping.field_mapping)
          : mapping.field_mapping || {};

        const allRecords = await syncService.getAllFormData(mapping.jdy_app_id, mapping.jdy_form_id);
        console.log(`[ApprovalImport] 实例表单 ${mapping.jdy_form_name}: ${allRecords.length} 条`);

        for (const record of allRecords) {
          try {
            if (dryRun) {
              result.instancesCreated++;
              continue;
            }

            const instanceCode = generateCode('INST', record._id);
            const status = mapApprovalStatus(record[fieldMapping['status'] || '审批状态'] || record['status']);

            // 解析申请人
            const applicantRef = record[fieldMapping['applicantName'] || '申请人'] || record['创建人'];
            const applicant = this.resolveUser(applicantRef);

            const businessTitle = (record[fieldMapping['businessTitle'] || '审批标题'] || record['标题'] || mapping.jdy_form_name) as string;
            const summary = (record[fieldMapping['summary'] || '摘要'] || record['说明'] || '') as string;

            // 幂等upsert
            const existing = await db.execute(
              drizzleSql`SELECT id FROM grt_approval_instances WHERE jiandaoyun_id = ${record._id} LIMIT 1`
            );

            if (existing && (existing as any)[0]?.length > 0) {
              await db.execute(
                drizzleSql`UPDATE grt_approval_instances SET
                  status = ${status},
                  business_title = ${businessTitle},
                  summary = ${summary},
                  updated_at = NOW()
                WHERE jiandaoyun_id = ${record._id}`
              );
              result.instancesUpdated++;
            } else {
              // 寻找或创建默认模板
              let templateId = 1;
              let templateCode = 'TPL-DEFAULT';
              let templateSteps: ParsedWorkflowStep[] = [
                { stepNumber: 1, stepName: '审批', approverRole: 'approver', approverType: 'user' },
              ];
              const tplResult = await db.execute(
                drizzleSql`SELECT id, template_code, steps FROM grt_approval_templates LIMIT 1`
              );
              if ((tplResult as any)[0]?.length > 0) {
                templateId = (tplResult as any)[0][0].id;
                templateCode = (tplResult as any)[0][0].template_code;
                try {
                  const rawSteps = (tplResult as any)[0][0].steps;
                  const parsed = typeof rawSteps === 'string' ? JSON.parse(rawSteps) : rawSteps;
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    templateSteps = parsed;
                  }
                } catch { /* use default */ }
              }

              // 解析实例自身的步骤（可能覆盖模板步骤）
              const instanceSteps = this.parseWorkflowSteps(record);
              const effectiveSteps = instanceSteps.length > 1 ? instanceSteps : templateSteps;

              await db.execute(
                drizzleSql`INSERT INTO grt_approval_instances
                  (instance_code, template_id, template_code, business_type, business_id, business_table,
                   business_title, applicant_id, applicant_name, summary, status, total_steps,
                   jiandaoyun_id, created_at, updated_at)
                VALUES (
                  ${instanceCode}, ${templateId}, ${templateCode}, ${'general'},
                  ${record._id}, ${'jiandaoyun_import'},
                  ${businessTitle},
                  ${applicant?.userId || 0}, ${applicant?.name || '未知'},
                  ${summary}, ${status}, ${effectiveSteps.length},
                  ${record._id}, NOW(), NOW()
                )`
              );
              result.instancesCreated++;

              // 5. 为每个实例创建多条审批步骤记录（按模板/解析出的步骤）
              try {
                const newInstanceResult = await db.execute(
                  drizzleSql`SELECT id, instance_code FROM grt_approval_instances WHERE jiandaoyun_id = ${record._id} LIMIT 1`
                );
                if ((newInstanceResult as any)[0]?.length > 0) {
                  const instId = (newInstanceResult as any)[0][0].id;
                  const instCode = (newInstanceResult as any)[0][0].instance_code;

                  for (const step of effectiveSteps) {
                    // 解析审批人（如果步骤中有引用）
                    const approver = step.approverRef ? this.resolveUser(step.approverRef) : null;
                    const stepStatus = step.stepNumber === 1 ? status : 'pending';

                    await db.execute(
                      drizzleSql`INSERT INTO grt_approval_step_records
                        (instance_id, instance_code, step_number, step_name, approver_role,
                         approver_id, approver_name, status, jiandaoyun_id)
                      VALUES (
                        ${instId}, ${instCode}, ${step.stepNumber}, ${step.stepName}, ${step.approverRole},
                        ${approver?.userId || null}, ${approver?.name || null}, ${stepStatus}, ${record._id}
                      )`
                    );
                    result.stepsCreated++;
                  }
                }
              } catch (stepError: any) {
                // 步骤创建失败不中断
                console.warn(`[ApprovalImport] 创建步骤记录失败:`, stepError.message);
              }

              // 6. 创建操作日志
              try {
                const instResult = await db.execute(
                  drizzleSql`SELECT id FROM grt_approval_instances WHERE jiandaoyun_id = ${record._id} LIMIT 1`
                );
                if ((instResult as any)[0]?.length > 0) {
                  const instId = (instResult as any)[0][0].id;
                  await db.execute(
                    drizzleSql`INSERT INTO grt_approval_action_logs
                      (instance_id, action, operator_id, operator_name, new_status, comment)
                    VALUES (
                      ${instId}, ${'import'}, ${applicant?.userId || 0}, ${applicant?.name || '系统导入'}, ${status},
                      ${'从简道云导入'}
                    )`
                  );
                  result.logsCreated++;
                }
              } catch (logError: any) {
                console.warn(`[ApprovalImport] 创建日志失败:`, logError.message);
              }
            }
          } catch (error: any) {
            result.failed++;
            result.errors.push({ entity: 'approval_instance', jdyId: record._id, message: error.message });

            // 检查失败率
            const total = result.instancesCreated + result.instancesUpdated + result.failed;
            if (total > 10 && result.failed / total > 0.5) {
              result.errors.push({ entity: 'approval_instance', jdyId: '', message: '失败率超过50%，导入已暂停' });
              return result;
            }
          }
        }
      } catch (error: any) {
        result.errors.push({ entity: 'approval_instance', jdyId: mapping.jdy_form_id, message: error.message });
      }
    }

    return result;
  }
}

// 单例
let instance: JdyApprovalImportService | null = null;
export function getJdyApprovalImportService(): JdyApprovalImportService {
  if (!instance) {
    instance = new JdyApprovalImportService();
  }
  return instance;
}
