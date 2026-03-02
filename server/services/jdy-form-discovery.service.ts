/**
 * 简道云表单发现服务
 * 自动发现JDY应用/表单，分类为GRT目标实体，生成字段映射建议
 */

import { requireDb } from '../db';
import { sql as drizzleSql } from 'drizzle-orm';
import { getJiandaoyunSyncService, JiandaoyunField } from '../jiandaoyun';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("jdy-forms");

// 表单分类规则 — 20+ 实体类型，按匹配优先级排序（精确匹配在前，模糊匹配在后）
const FORM_CLASSIFICATION_RULES: Array<{
  pattern: RegExp;
  targetEntity: string;
}> = [
  // ── 项目管理 ──
  { pattern: /项目管理|项目台账|M[0-9]|项目立项|项目信息/, targetEntity: 'project' },
  { pattern: /任务|工单|待办/, targetEntity: 'projectTask' },
  { pattern: /里程碑|交付物|节点/, targetEntity: 'projectMilestone' },
  { pattern: /阶段|Phase|评审/, targetEntity: 'projectPhase' },
  { pattern: /团队成员|项目成员|参与人/, targetEntity: 'projectTeamMember' },

  // ── 审批（模板优先匹配，实例兜底） ──
  { pattern: /审批模板|流程模板|审批定义/, targetEntity: 'approval_template' },
  { pattern: /审批|流程|申请|审核/, targetEntity: 'approval_instance' },

  // ── CRM ──
  { pattern: /客户管理|客户台账|客户信息|客户档案/, targetEntity: 'crmCustomer' },
  { pattern: /联系人|客户联系/, targetEntity: 'crmContact' },
  { pattern: /商机|销售机会|业务机会/, targetEntity: 'crmOpportunity' },
  { pattern: /线索|潜在客户|意向客户/, targetEntity: 'crmLead' },
  { pattern: /跟进记录|拜访记录|客户跟进|沟通记录/, targetEntity: 'crmFollowUp' },

  // ── HR ──
  { pattern: /员工信息|员工台账|员工档案|人事档案/, targetEntity: 'hrmEmployee' },
  { pattern: /招聘|候选人|应聘|面试/, targetEntity: 'hrmCandidate' },
  { pattern: /培训|课程|学习|教育/, targetEntity: 'hrmTraining' },
  { pattern: /绩效|考核|KPI|评价/, targetEntity: 'hrmPerformance' },
  { pattern: /薪资|薪酬|工资|奖金/, targetEntity: 'hrmSalary' },

  // ── 制造 ──
  { pattern: /生产工单|生产计划|生产任务|制造工单/, targetEntity: 'productionWorkOrder' },
  { pattern: /质检|质量检验|检验记录|QC/, targetEntity: 'qualityInspection' },
  { pattern: /BOM|物料清单|产品结构/, targetEntity: 'bom' },
  { pattern: /库存|库存管理|出入库|盘点/, targetEntity: 'inventory' },

  // ── 销售 / 采购 ──
  { pattern: /销售订单|出货单|发货单/, targetEntity: 'salesOrder' },
  { pattern: /采购订单|采购申请|采购计划/, targetEntity: 'purchaseOrder' },
  { pattern: /报价|报价单|报价管理/, targetEntity: 'quotation' },

  // ── 知识 ──
  { pattern: /知识库|文档管理|知识管理|共享文档/, targetEntity: 'knowledgeDocument' },
  { pattern: /问题|Bug|缺陷|Issue|异常/, targetEntity: 'issueRecord' },
];

// GRT字段映射建议规则（JDY字段label → GRT column）
const FIELD_MAPPING_SUGGESTIONS: Record<string, Record<string, string>> = {
  // ── 项目管理 ──
  project: {
    '项目名称': 'name',
    '项目编号': 'projectCode',
    '项目简称': 'shortName',
    '客户': 'customerId',
    '客户名称': 'customerName',
    '项目类型': 'type',
    '项目状态': 'status',
    '当前阶段': 'currentPhase',
    '优先级': 'priority',
    '计划开始日期': 'plannedStartDate',
    '计划结束日期': 'plannedEndDate',
    '实际开始日期': 'actualStartDate',
    '实际结束日期': 'actualEndDate',
    '预算': 'budget',
    '实际费用': 'actualCost',
    '合同金额': 'contractAmount',
    '项目经理': 'managerId',
    '描述': 'description',
    '目标': 'objectives',
    '范围': 'scope',
    '备注': 'remark',
    '风险等级': 'riskLevel',
    '完成百分比': 'completionPercent',
  },
  projectTask: {
    '任务名称': 'name',
    '任务编号': 'taskCode',
    '负责人': 'assigneeId',
    '计划开始': 'plannedStart',
    '计划结束': 'plannedEnd',
    '实际开始': 'actualStart',
    '实际结束': 'actualEnd',
    '状态': 'status',
    '优先级': 'priority',
    '描述': 'description',
    '备注': 'remark',
  },
  projectMilestone: {
    '里程碑名称': 'name',
    '目标日期': 'targetDate',
    '实际日期': 'actualDate',
    '状态': 'status',
    '描述': 'description',
  },
  projectPhase: {
    '阶段编号': 'phaseCode',
    '阶段名称': 'name',
    '英文名称': 'nameEn',
    '描述': 'description',
    '排序': 'sequence',
    '是否关键阶段': 'isKeyPhase',
    '默认工期': 'defaultDuration',
    '颜色': 'color',
  },
  projectTeamMember: {
    '项目编号': 'projectId',
    '成员': 'userId',
    '角色': 'role',
    '职责': 'responsibility',
    '加入日期': 'joinedAt',
    '离开日期': 'leftAt',
    '状态': 'status',
  },

  // ── 审批 ──
  approval_instance: {
    '审批标题': 'businessTitle',
    '申请人': 'applicantName',
    '申请部门': 'applicantDepartment',
    '审批状态': 'status',
    '摘要': 'summary',
    '金额': 'amount',
    '紧急程度': 'urgency',
    '提交时间': 'submittedAt',
    '完成时间': 'completedAt',
  },
  approval_template: {
    '模板名称': 'templateName',
    '流程名称': 'templateName',
    '模板编号': 'templateCode',
    '业务类型': 'businessType',
    '审批类型': 'businessType',
    '描述': 'description',
  },

  // ── CRM ──
  crmCustomer: {
    '客户名称': 'name',
    '客户编号': 'code',
    '客户类型': 'type',
    '行业': 'industry',
    '地区': 'region',
    '地址': 'address',
    '电话': 'phone',
    '邮箱': 'email',
    '网址': 'website',
    '联系人': 'primaryContact',
    '负责人': 'ownerId',
    '状态': 'status',
    '来源': 'source',
    '备注': 'remark',
  },
  crmContact: {
    '姓名': 'name',
    '职位': 'title',
    '部门': 'department',
    '电话': 'phone',
    '手机': 'mobile',
    '邮箱': 'email',
    '微信': 'wechat',
    '客户': 'customerId',
    '备注': 'remark',
  },
  crmOpportunity: {
    '商机名称': 'name',
    '客户': 'customerId',
    '金额': 'amount',
    '阶段': 'stage',
    '概率': 'probability',
    '负责人': 'ownerId',
    '预计成交日期': 'expectedCloseDate',
    '来源': 'source',
    '描述': 'description',
    '状态': 'status',
  },
  crmLead: {
    '线索名称': 'name',
    '公司': 'company',
    '联系人': 'contact',
    '电话': 'phone',
    '邮箱': 'email',
    '来源': 'source',
    '状态': 'status',
    '负责人': 'ownerId',
    '备注': 'remark',
  },
  crmFollowUp: {
    '跟进类型': 'type',
    '跟进内容': 'content',
    '客户': 'customerId',
    '联系人': 'contactId',
    '跟进人': 'userId',
    '跟进时间': 'followUpDate',
    '下次跟进': 'nextFollowUpDate',
    '备注': 'remark',
  },

  // ── HR ──
  hrmEmployee: {
    '姓名': 'name',
    '工号': 'employeeCode',
    '部门': 'department',
    '职位': 'position',
    '入职日期': 'hireDate',
    '手机': 'phone',
    '邮箱': 'email',
    '状态': 'status',
    '性别': 'gender',
    '身份证号': 'idNumber',
    '学历': 'education',
  },
  hrmCandidate: {
    '姓名': 'name',
    '应聘职位': 'position',
    '手机': 'phone',
    '邮箱': 'email',
    '简历': 'resume',
    '来源': 'source',
    '状态': 'status',
    '面试日期': 'interviewDate',
    '面试评价': 'evaluation',
  },
  hrmTraining: {
    '培训名称': 'name',
    '培训类型': 'type',
    '讲师': 'trainer',
    '开始日期': 'startDate',
    '结束日期': 'endDate',
    '地点': 'location',
    '参与人数': 'participantCount',
    '状态': 'status',
    '描述': 'description',
  },
  hrmPerformance: {
    '考核周期': 'period',
    '员工': 'employeeId',
    '评分': 'score',
    '等级': 'grade',
    '评价人': 'evaluatorId',
    '状态': 'status',
    '评语': 'comment',
  },
  hrmSalary: {
    '员工': 'employeeId',
    '月份': 'month',
    '基本工资': 'baseSalary',
    '绩效奖金': 'performanceBonus',
    '补贴': 'allowance',
    '扣款': 'deduction',
    '实发工资': 'netSalary',
  },

  // ── 制造 ──
  productionWorkOrder: {
    '工单编号': 'orderCode',
    '产品名称': 'productName',
    '计划数量': 'plannedQuantity',
    '实际数量': 'actualQuantity',
    '计划开始': 'plannedStart',
    '计划结束': 'plannedEnd',
    '状态': 'status',
    '负责人': 'ownerId',
    '优先级': 'priority',
    '备注': 'remark',
  },
  qualityInspection: {
    '检验编号': 'inspectionCode',
    '产品': 'productName',
    '工单': 'workOrderId',
    '检验类型': 'type',
    '检验结果': 'result',
    '检验员': 'inspectorId',
    '检验日期': 'inspectionDate',
    '不合格项': 'defects',
    '备注': 'remark',
  },
  bom: {
    '物料编号': 'materialCode',
    '物料名称': 'materialName',
    '规格型号': 'specification',
    '单位': 'unit',
    '数量': 'quantity',
    '父级物料': 'parentMaterialCode',
    '层级': 'level',
    '备注': 'remark',
  },
  inventory: {
    '物料编号': 'materialCode',
    '物料名称': 'materialName',
    '仓库': 'warehouse',
    '库存数量': 'quantity',
    '单位': 'unit',
    '入库日期': 'inDate',
    '出库日期': 'outDate',
    '操作类型': 'operationType',
    '备注': 'remark',
  },

  // ── 销售 / 采购 ──
  salesOrder: {
    '订单编号': 'orderCode',
    '客户': 'customerId',
    '产品': 'productName',
    '数量': 'quantity',
    '金额': 'amount',
    '状态': 'status',
    '交货日期': 'deliveryDate',
    '负责人': 'ownerId',
    '备注': 'remark',
  },
  purchaseOrder: {
    '采购编号': 'orderCode',
    '供应商': 'supplierId',
    '物料': 'materialName',
    '数量': 'quantity',
    '金额': 'amount',
    '状态': 'status',
    '到货日期': 'deliveryDate',
    '采购员': 'buyerId',
    '备注': 'remark',
  },
  quotation: {
    '报价编号': 'quotationCode',
    '客户': 'customerId',
    '产品': 'productName',
    '报价金额': 'amount',
    '有效期': 'validUntil',
    '状态': 'status',
    '负责人': 'ownerId',
    '备注': 'remark',
  },

  // ── 知识 ──
  knowledgeDocument: {
    '标题': 'title',
    '分类': 'category',
    '内容': 'content',
    '标签': 'tags',
    '来源': 'source',
    '创建人': 'createdBy',
  },
  issueRecord: {
    '问题标题': 'title',
    '问题类型': 'type',
    '严重程度': 'severity',
    '描述': 'description',
    '报告人': 'reporterId',
    '负责人': 'assigneeId',
    '状态': 'status',
    '解决方案': 'solution',
  },
};

export interface FormDiscoveryResult {
  totalApps: number;
  totalForms: number;
  classified: number;
  unclassified: number;
  forms: Array<{
    appName: string;
    formName: string;
    targetEntity: string | null;
    recordCount: number;
    fieldCount: number;
  }>;
}

/**
 * 表单发现服务
 */
export class JdyFormDiscoveryService {
  /**
   * 执行表单发现 - 扫描所有JDY应用和表单，自动分类并存储映射
   */
  async discoverForms(): Promise<FormDiscoveryResult> {
    const syncService = getJiandaoyunSyncService();
    if (!syncService.isConfigured()) {
      throw new Error('简道云API未配置');
    }

    const result: FormDiscoveryResult = {
      totalApps: 0,
      totalForms: 0,
      classified: 0,
      unclassified: 0,
      forms: [],
    };

    // 1. 获取所有应用
    const apps = await syncService.syncApps();
    result.totalApps = apps.length;

    const db = await requireDb();

    for (const app of apps) {
      try {
        // 2. 获取每个应用的表单列表
        const forms = await syncService.syncForms(app.app_id);

        for (const form of forms) {
          result.totalForms++;

          try {
            // 3. 获取字段结构
            const fields = await syncService.getFormFields(app.app_id, form.entry_id);

            // 4. 获取记录数
            let recordCount = 0;
            try {
              const stats = await syncService.getFormStats(app.app_id, form.entry_id);
              recordCount = stats.count;
            } catch {
              // 某些表单可能无法获取统计
            }

            // 5. 分类
            const targetEntity = this.classifyForm(form.name, app.name);
            if (targetEntity) {
              result.classified++;
            } else {
              result.unclassified++;
            }

            // 6. 生成字段映射建议
            const fieldMapping = targetEntity
              ? this.suggestFieldMapping(fields, targetEntity)
              : null;

            // 7. 获取样例数据（前3条）
            let sampleData: unknown[] = [];
            try {
              if (recordCount > 0) {
                const sampleResult = await syncService.getFormData(app.app_id, form.entry_id, { limit: 3 });
                sampleData = sampleResult.data;
              }
            } catch {
              // 样例数据获取失败不影响流程
            }

            // 8. Upsert到映射表
            const existing = await db.execute(
              drizzleSql`SELECT id FROM jiandaoyun_form_mappings
                WHERE jdy_app_id = ${app.app_id} AND jdy_form_id = ${form.entry_id} LIMIT 1`
            );

            if (existing && (existing as any)[0]?.length > 0) {
              await db.execute(
                drizzleSql`UPDATE jiandaoyun_form_mappings SET
                  jdy_app_name = ${app.name},
                  jdy_form_name = ${form.name},
                  target_entity = ${targetEntity},
                  field_mapping = ${fieldMapping ? JSON.stringify(fieldMapping) : null},
                  record_count = ${recordCount},
                  sample_data = ${sampleData.length > 0 ? JSON.stringify(sampleData) : null},
                  field_schema = ${JSON.stringify(fields)},
                  last_discovered_at = NOW(),
                  updated_at = NOW()
                WHERE jdy_app_id = ${app.app_id} AND jdy_form_id = ${form.entry_id}`
              );
            } else {
              await db.execute(
                drizzleSql`INSERT INTO jiandaoyun_form_mappings
                  (jdy_app_id, jdy_app_name, jdy_form_id, jdy_form_name, target_entity,
                   field_mapping, record_count, sample_data, field_schema, is_confirmed, last_discovered_at)
                VALUES (${app.app_id}, ${app.name}, ${form.entry_id}, ${form.name}, ${targetEntity},
                  ${fieldMapping ? JSON.stringify(fieldMapping) : null}, ${recordCount},
                  ${sampleData.length > 0 ? JSON.stringify(sampleData) : null},
                  ${JSON.stringify(fields)}, false, NOW())`
              );
            }

            result.forms.push({
              appName: app.name,
              formName: form.name,
              targetEntity,
              recordCount,
              fieldCount: fields.length,
            });
          } catch (error: any) {
            log.warn({ appName: app.name, formName: form.name, error: error.message }, "处理表单失败");
          }
        }
      } catch (error: any) {
        log.warn({ appName: app.name, error: error.message }, "获取应用表单失败");
      }
    }

    return result;
  }

  /**
   * 通过表单名称自动分类
   */
  classifyForm(formName: string, appName: string): string | null {
    const combined = `${appName}/${formName}`;
    for (const rule of FORM_CLASSIFICATION_RULES) {
      if (rule.pattern.test(combined)) {
        return rule.targetEntity;
      }
    }
    return null;
  }

  /**
   * 根据JDY字段标签模糊匹配，生成GRT列映射建议
   */
  suggestFieldMapping(
    fields: JiandaoyunField[],
    targetEntity: string
  ): Record<string, string> {
    const suggestions = FIELD_MAPPING_SUGGESTIONS[targetEntity];
    if (!suggestions) return {};

    const mapping: Record<string, string> = {};

    for (const field of fields) {
      // 精确匹配
      if (suggestions[field.label]) {
        mapping[field.name] = suggestions[field.label];
        continue;
      }
      // 模糊匹配：检查JDY标签是否包含建议关键词
      for (const [keyword, grtColumn] of Object.entries(suggestions)) {
        if (field.label.includes(keyword) || keyword.includes(field.label)) {
          mapping[field.name] = grtColumn;
          break;
        }
      }
    }

    return mapping;
  }

  /**
   * 获取所有已发现的表单映射
   */
  async getFormMappings(targetEntity?: string): Promise<any[]> {
    const db = await requireDb();
    if (targetEntity) {
      const result = await db.execute(
        drizzleSql`SELECT * FROM jiandaoyun_form_mappings WHERE target_entity = ${targetEntity} ORDER BY jdy_app_name, jdy_form_name`
      );
      return (result as any)[0] || [];
    }
    const result = await db.execute(
      drizzleSql`SELECT * FROM jiandaoyun_form_mappings ORDER BY jdy_app_name, jdy_form_name`
    );
    return (result as any)[0] || [];
  }

  /**
   * 获取已确认的表单映射
   */
  async getConfirmedMappings(targetEntity?: string): Promise<any[]> {
    const db = await requireDb();
    if (targetEntity) {
      const result = await db.execute(
        drizzleSql`SELECT * FROM jiandaoyun_form_mappings WHERE is_confirmed = true AND target_entity = ${targetEntity}`
      );
      return (result as any)[0] || [];
    }
    const result = await db.execute(
      drizzleSql`SELECT * FROM jiandaoyun_form_mappings WHERE is_confirmed = true`
    );
    return (result as any)[0] || [];
  }

  /**
   * 更新表单映射（含确认）
   */
  async updateFormMapping(
    id: number,
    update: {
      targetEntity?: string;
      fieldMapping?: Record<string, string>;
      isConfirmed?: boolean;
    }
  ): Promise<boolean> {
    const db = await requireDb();
    const sets: string[] = ['updated_at = NOW()'];
    if (update.targetEntity !== undefined) {
      sets.push(`target_entity = '${update.targetEntity}'`);
    }
    if (update.fieldMapping !== undefined) {
      // Use parameterized update
      await db.execute(
        drizzleSql`UPDATE jiandaoyun_form_mappings SET
          field_mapping = ${JSON.stringify(update.fieldMapping)},
          target_entity = ${update.targetEntity ?? null},
          is_confirmed = ${update.isConfirmed ?? false},
          updated_at = NOW()
        WHERE id = ${id}`
      );
      return true;
    }
    if (update.isConfirmed !== undefined) {
      await db.execute(
        drizzleSql`UPDATE jiandaoyun_form_mappings SET
          is_confirmed = ${update.isConfirmed},
          updated_at = NOW()
        WHERE id = ${id}`
      );
      return true;
    }
    return false;
  }
}

// 单例
let instance: JdyFormDiscoveryService | null = null;
export function getJdyFormDiscoveryService(): JdyFormDiscoveryService {
  if (!instance) {
    instance = new JdyFormDiscoveryService();
  }
  return instance;
}
