/**
 * 外部平台知识库导入服务
 * 从 externalSyncFormMappings 中挖掘元数据生成知识文档
 * 每个表单生成一篇知识文档：标题、所属应用、字段结构表格、记录数
 */

import { requireDb } from '../db';
import { sql as drizzleSql } from 'drizzle-orm';

export interface KnowledgeImportResult {
  documentsCreated: number;
  documentsUpdated: number;
  documentsSkipped: number;
  errors: Array<{ formId: string; message: string }>;
}

// 实体类型 → 知识文档分类映射
const ENTITY_CATEGORY_MAP: Record<string, string> = {
  project: 'process',
  projectTask: 'process',
  projectMilestone: 'process',
  projectPhase: 'process',
  projectTeamMember: 'process',
  approval_instance: 'process',
  approval_template: 'process',
  crmCustomer: 'process',
  crmContact: 'process',
  crmOpportunity: 'process',
  crmLead: 'process',
  crmFollowUp: 'process',
  hrmEmployee: 'process',
  hrmCandidate: 'process',
  hrmTraining: 'process',
  hrmPerformance: 'process',
  hrmSalary: 'process',
  productionWorkOrder: 'technical',
  qualityInspection: 'technical',
  bom: 'technical',
  inventory: 'technical',
  salesOrder: 'process',
  purchaseOrder: 'process',
  quotation: 'process',
  knowledgeDocument: 'technical',
  issueRecord: 'technical',
};

/**
 * 知识库导入服务
 */
export class ExtSyncKnowledgeImportService {
  /**
   * 从表单元数据生成知识文档
   */
  async importKnowledge(): Promise<KnowledgeImportResult> {
    const result: KnowledgeImportResult = {
      documentsCreated: 0,
      documentsUpdated: 0,
      documentsSkipped: 0,
      errors: [],
    };

    const db = await requireDb();

    // 获取所有已发现的表单映射
    const mappingsResult = await db.execute(
      drizzleSql`SELECT * FROM jiandaoyun_form_mappings ORDER BY jdy_app_name, jdy_form_name`
    );
    const mappings = (mappingsResult as any)[0] || [];

    if (mappings.length === 0) {
      return result;
    }

    for (const mapping of mappings) {
      try {
        const formName = mapping.jdy_form_name || 'Unknown';
        const appName = mapping.jdy_app_name || 'Unknown';
        const targetEntity = mapping.target_entity || '未分类';
        const recordCount = mapping.record_count || 0;

        // 解析字段结构
        let fields: Array<{ name: string; label: string; type: string }> = [];
        try {
          const rawSchema = mapping.field_schema;
          fields = typeof rawSchema === 'string' ? JSON.parse(rawSchema) : (rawSchema || []);
        } catch {
          // 字段解析失败，继续
        }

        // 构建知识文档标题
        const title = `[${appName}] ${formName} — 表单结构文档`;

        // 构建文档内容（Markdown格式）
        const contentParts: string[] = [
          `# ${formName}`,
          '',
          `**所属应用**: ${appName}`,
          `**目标实体**: ${targetEntity}`,
          `**记录数**: ${recordCount}`,
          `**表单ID**: ${mapping.jdy_form_id}`,
          '',
        ];

        // 字段结构表格
        if (fields.length > 0) {
          contentParts.push('## 字段结构');
          contentParts.push('');
          contentParts.push('| 字段名 | 标签 | 类型 |');
          contentParts.push('|--------|------|------|');
          for (const field of fields) {
            contentParts.push(`| ${field.name || '-'} | ${field.label || '-'} | ${field.type || '-'} |`);
          }
          contentParts.push('');
        }

        // 字段映射信息
        let fieldMapping: Record<string, string> = {};
        try {
          const rawMapping = mapping.field_mapping;
          fieldMapping = typeof rawMapping === 'string' ? JSON.parse(rawMapping) : (rawMapping || {});
        } catch { /* ignore */ }

        if (Object.keys(fieldMapping).length > 0) {
          contentParts.push('## 字段映射');
          contentParts.push('');
          contentParts.push('| 外部平台字段 | GRT列 |');
          contentParts.push('|---------|-------|');
          for (const [extField, grtCol] of Object.entries(fieldMapping)) {
            contentParts.push(`| ${extField} | ${grtCol} |`);
          }
          contentParts.push('');
        }

        const content = contentParts.join('\n');

        // 提取字段标签作为标签(tags)
        const tags = fields
          .map(f => f.label)
          .filter(Boolean)
          .slice(0, 20);

        // 确定分类
        const category = ENTITY_CATEGORY_MAP[targetEntity] || 'technical';

        // 用标题去重 (source = 'ext_sync_import')
        const existing = await db.execute(
          drizzleSql`SELECT id FROM knowledge_documents
            WHERE source = 'ext_sync_import' AND title = ${title} LIMIT 1`
        );

        if (existing && (existing as any)[0]?.length > 0) {
          const docId = (existing as any)[0][0].id;
          await db.execute(
            drizzleSql`UPDATE knowledge_documents SET
              content = ${content},
              category = ${category},
              tags = ${JSON.stringify(tags)},
              updated_at = NOW()
            WHERE id = ${docId}`
          );
          result.documentsUpdated++;
        } else {
          await db.execute(
            drizzleSql`INSERT INTO knowledge_documents
              (title, category, content, tags, source, created_by, created_at, updated_at)
            VALUES (
              ${title}, ${category}, ${content}, ${JSON.stringify(tags)},
              ${'ext_sync_import'}, ${0}, NOW(), NOW()
            )`
          );
          result.documentsCreated++;
        }
      } catch (error: any) {
        result.errors.push({
          formId: mapping.jdy_form_id || 'unknown',
          message: error.message,
        });
      }
    }

    return result;
  }
}

// 单例
let instance: ExtSyncKnowledgeImportService | null = null;
export function getExtSyncKnowledgeImportService(): ExtSyncKnowledgeImportService {
  if (!instance) {
    instance = new ExtSyncKnowledgeImportService();
  }
  return instance;
}
