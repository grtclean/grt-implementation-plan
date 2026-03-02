/**
 * 门径管理增强功能服务
 * 功能：项目导入向导、ERP对接接口
 */

import { requireDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("stage-gate-enhanced");

// ==================== 项目导入向导 ====================

/**
 * 项目导入服务
 * 支持批量导入、字段映射、数据验证
 */
export class ProjectImportService {
  /**
   * 解析导入文件并生成字段映射建议
   * @param headers 文件表头
   * @param sampleData 样本数据
   * @returns 字段映射建议
   */
  static async suggestFieldMapping(
    headers: string[],
    sampleData: any[]
  ): Promise<FieldMappingSuggestion[]> {
    // 标准字段定义
    const standardFields = [
      { name: "project_code", label: "项目编号", required: true, type: "string" },
      { name: "project_name", label: "项目名称", required: true, type: "string" },
      { name: "customer_name", label: "客户名称", required: true, type: "string" },
      { name: "customer_code", label: "客户编号", required: false, type: "string" },
      { name: "contract_amount", label: "合同金额", required: false, type: "number" },
      { name: "currency", label: "币种", required: false, type: "string" },
      { name: "start_date", label: "开始日期", required: false, type: "date" },
      { name: "target_date", label: "目标完成日期", required: false, type: "date" },
      { name: "current_stage", label: "当前阶段", required: false, type: "string" },
      { name: "project_manager", label: "项目经理", required: false, type: "string" },
      { name: "sales_rep", label: "销售负责人", required: false, type: "string" },
      { name: "product_type", label: "产品类型", required: false, type: "string" },
      { name: "industry", label: "行业", required: false, type: "string" },
      { name: "region", label: "区域", required: false, type: "string" },
      { name: "priority", label: "优先级", required: false, type: "string" },
      { name: "description", label: "项目描述", required: false, type: "text" },
    ];

    const suggestions: FieldMappingSuggestion[] = [];

    // 使用AI辅助映射
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是一个数据映射专家。根据源字段名称和样本数据，推荐最佳的目标字段映射。
输出JSON格式：{ "mappings": [{ "source": "源字段", "target": "目标字段", "confidence": 0-100 }] }

目标字段列表：
${standardFields.map(f => `- ${f.name}: ${f.label} (${f.type})`).join("\n")}`,
          },
          {
            role: "user",
            content: `源字段：${headers.join(", ")}

样本数据：
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

请推荐字段映射。`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "field_mapping",
            strict: true,
            schema: {
              type: "object",
              properties: {
                mappings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      source: { type: "string" },
                      target: { type: "string" },
                      confidence: { type: "number" },
                    },
                    required: ["source", "target", "confidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["mappings"],
              additionalProperties: false,
            },
          },
        },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      for (const mapping of result.mappings || []) {
        const targetField = standardFields.find(f => f.name === mapping.target);
        suggestions.push({
          sourceField: mapping.source,
          targetField: mapping.target,
          targetLabel: targetField?.label || mapping.target,
          confidence: mapping.confidence,
          required: targetField?.required || false,
          dataType: targetField?.type || "string",
        });
      }
    } catch (error) {
      // 回退到基于规则的映射
      for (const header of headers) {
        const headerLower = header.toLowerCase();
        let matched = false;

        for (const field of standardFields) {
          const fieldLower = field.label.toLowerCase();
          const nameLower = field.name.toLowerCase();

          if (
            headerLower.includes(fieldLower) ||
            fieldLower.includes(headerLower) ||
            headerLower.includes(nameLower) ||
            headerLower.replace(/[_\s]/g, "") === nameLower.replace(/[_\s]/g, "")
          ) {
            suggestions.push({
              sourceField: header,
              targetField: field.name,
              targetLabel: field.label,
              confidence: 80,
              required: field.required,
              dataType: field.type,
            });
            matched = true;
            break;
          }
        }

        if (!matched) {
          suggestions.push({
            sourceField: header,
            targetField: "",
            targetLabel: "未映射",
            confidence: 0,
            required: false,
            dataType: "string",
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * 验证导入数据
   * @param data 待验证数据
   * @param mapping 字段映射
   * @returns 验证结果
   */
  static validateImportData(
    data: any[],
    mapping: Record<string, string>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let validCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel行号从2开始（1是表头）
      let rowValid = true;

      // 检查必填字段
      const requiredFields = ["project_code", "project_name", "customer_name"];
      for (const field of requiredFields) {
        const sourceField = Object.keys(mapping).find(k => mapping[k] === field);
        if (sourceField && !row[sourceField]) {
          errors.push({
            row: rowNum,
            field,
            message: `必填字段"${field}"为空`,
            severity: "error",
          });
          rowValid = false;
        }
      }

      // 检查数据格式
      const amountField = Object.keys(mapping).find(k => mapping[k] === "contract_amount");
      if (amountField && row[amountField]) {
        const amount = parseFloat(row[amountField]);
        if (isNaN(amount)) {
          errors.push({
            row: rowNum,
            field: "contract_amount",
            message: `金额格式错误: ${row[amountField]}`,
            severity: "error",
          });
          rowValid = false;
        } else if (amount < 0) {
          warnings.push({
            row: rowNum,
            field: "contract_amount",
            message: `金额为负数: ${amount}`,
          });
        }
      }

      // 检查日期格式
      const dateFields = ["start_date", "target_date"];
      for (const dateField of dateFields) {
        const sourceField = Object.keys(mapping).find(k => mapping[k] === dateField);
        if (sourceField && row[sourceField]) {
          const date = new Date(row[sourceField]);
          if (isNaN(date.getTime())) {
            warnings.push({
              row: rowNum,
              field: dateField,
              message: `日期格式可能有误: ${row[sourceField]}`,
            });
          }
        }
      }

      // 检查重复项目编号
      const codeField = Object.keys(mapping).find(k => mapping[k] === "project_code");
      if (codeField && row[codeField]) {
        const duplicates = data.filter((r, idx) => idx !== i && r[codeField] === row[codeField]);
        if (duplicates.length > 0) {
          warnings.push({
            row: rowNum,
            field: "project_code",
            message: `项目编号重复: ${row[codeField]}`,
          });
        }
      }

      if (rowValid) validCount++;
    }

    return {
      totalRows: data.length,
      validRows: validCount,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings,
      canProceed: errors.length === 0,
    };
  }

  /**
   * 执行数据导入
   * @param data 导入数据
   * @param mapping 字段映射
   * @param options 导入选项
   * @returns 导入结果
   */
  static async executeImport(
    data: any[],
    mapping: Record<string, string>,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const db: any = await requireDb();
    const { skipDuplicates = true, updateExisting = false, userId } = options;

    let imported = 0;
    let skipped = 0;
    let updated = 0;
    let failed = 0;
    const failedRows: { row: number; error: string }[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      try {
        // 转换数据
        const projectData: Record<string, unknown> = {};
        for (const [source, target] of Object.entries(mapping)) {
          if (target && row[source] !== undefined) {
            projectData[target] = row[source];
          }
        }

        // 检查是否存在
        const [existing] = await db.execute(
          `SELECT id FROM stage_gate_projects WHERE project_code = ?`,
          [projectData.project_code]
        );

        if ((existing as any[]).length > 0) {
          if (updateExisting) {
            // 更新现有记录
            const setClauses = Object.keys(projectData)
              .filter(k => k !== "project_code")
              .map(k => `${k} = ?`);
            const values = Object.keys(projectData)
              .filter(k => k !== "project_code")
              .map(k => projectData[k]);

            if (setClauses.length > 0) {
              await db.execute(
                `UPDATE stage_gate_projects SET ${setClauses.join(", ")} WHERE project_code = ?`,
                [...values, projectData.project_code]
              );
              updated++;
            }
          } else if (skipDuplicates) {
            skipped++;
          } else {
            failedRows.push({ row: rowNum, error: "项目编号已存在" });
            failed++;
          }
        } else {
          // 插入新记录
          const columns = Object.keys(projectData);
          const placeholders = columns.map(() => "?").join(", ");
          const values = columns.map(k => projectData[k]);

          if (userId) {
            columns.push("created_by");
            values.push(userId);
          }

          await db.execute(
            `INSERT INTO stage_gate_projects (${columns.join(", ")}) VALUES (${placeholders})`,
            values
          );
          imported++;
        }
      } catch (error: any) {
        failedRows.push({ row: rowNum, error: error.message });
        failed++;
      }
    }

    return {
      totalProcessed: data.length,
      imported,
      updated,
      skipped,
      failed,
      failedRows,
      success: failed === 0,
    };
  }
}

// ==================== ERP对接接口 ====================

/**
 * ERP适配器接口
 */
export interface ERPAdapter {
  name: string;
  connect(): Promise<boolean>;
  syncProjects(): Promise<ERPSyncResult>;
  syncCustomers(): Promise<ERPSyncResult>;
  syncOrders(): Promise<ERPSyncResult>;
  pushDelivery(projectId: number): Promise<boolean>;
}

/**
 * SAP ERP适配器
 */
export class SAPAdapter implements ERPAdapter {
  name = "SAP";
  private config: ERPConfig;

  constructor(config: ERPConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    // 模拟SAP连接
    log.info({ host: this.config.host, port: this.config.port }, "SAP connecting");
    return true;
  }

  async syncProjects(): Promise<ERPSyncResult> {
    const db: any = await requireDb();
    
    // 模拟从SAP获取项目数据
    const sapProjects = await this.fetchFromSAP("/api/projects");
    
    let synced = 0;
    let errors: string[] = [];

    for (const project of sapProjects) {
      try {
        await db.execute(
          `INSERT INTO stage_gate_projects (project_code, project_name, erp_source, erp_id)
           VALUES (?, ?, 'SAP', ?)
           ON DUPLICATE KEY UPDATE project_name = VALUES(project_name)`,
          [project.code, project.name, project.id]
        );
        synced++;
      } catch (error: any) {
        errors.push(`项目 ${project.code}: ${error.message}`);
      }
    }

    return { synced, errors, source: "SAP", syncTime: new Date().toISOString() };
  }

  async syncCustomers(): Promise<ERPSyncResult> {
    // 实现客户同步逻辑
    return { synced: 0, errors: [], source: "SAP", syncTime: new Date().toISOString() };
  }

  async syncOrders(): Promise<ERPSyncResult> {
    // 实现订单同步逻辑
    return { synced: 0, errors: [], source: "SAP", syncTime: new Date().toISOString() };
  }

  async pushDelivery(projectId: number): Promise<boolean> {
    // 实现交付推送逻辑
    log.info({ projectId }, "SAP pushing delivery info");
    return true;
  }

  private async fetchFromSAP(endpoint: string): Promise<any[]> {
    // 模拟SAP API调用
    return [
      { id: "SAP001", code: "PRJ-SAP-001", name: "SAP测试项目1" },
      { id: "SAP002", code: "PRJ-SAP-002", name: "SAP测试项目2" },
    ];
  }
}

/**
 * Oracle ERP适配器
 */
export class OracleAdapter implements ERPAdapter {
  name = "Oracle";
  private config: ERPConfig;

  constructor(config: ERPConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    log.info({ host: this.config.host, port: this.config.port }, "Oracle connecting");
    return true;
  }

  async syncProjects(): Promise<ERPSyncResult> {
    // 实现Oracle项目同步
    return { synced: 0, errors: [], source: "Oracle", syncTime: new Date().toISOString() };
  }

  async syncCustomers(): Promise<ERPSyncResult> {
    return { synced: 0, errors: [], source: "Oracle", syncTime: new Date().toISOString() };
  }

  async syncOrders(): Promise<ERPSyncResult> {
    return { synced: 0, errors: [], source: "Oracle", syncTime: new Date().toISOString() };
  }

  async pushDelivery(projectId: number): Promise<boolean> {
    return true;
  }
}

/**
 * 金蝶ERP适配器
 */
export class KingdeeAdapter implements ERPAdapter {
  name = "Kingdee";
  private config: ERPConfig;

  constructor(config: ERPConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    log.info({ host: this.config.host, port: this.config.port }, "Kingdee connecting");
    return true;
  }

  async syncProjects(): Promise<ERPSyncResult> {
    return { synced: 0, errors: [], source: "Kingdee", syncTime: new Date().toISOString() };
  }

  async syncCustomers(): Promise<ERPSyncResult> {
    return { synced: 0, errors: [], source: "Kingdee", syncTime: new Date().toISOString() };
  }

  async syncOrders(): Promise<ERPSyncResult> {
    return { synced: 0, errors: [], source: "Kingdee", syncTime: new Date().toISOString() };
  }

  async pushDelivery(projectId: number): Promise<boolean> {
    return true;
  }
}

/**
 * ERP集成管理器
 */
export class ERPIntegrationManager {
  private adapters: Map<string, ERPAdapter> = new Map();

  /**
   * 注册ERP适配器
   */
  registerAdapter(type: string, config: ERPConfig): void {
    let adapter: ERPAdapter;
    
    switch (type.toLowerCase()) {
      case "sap":
        adapter = new SAPAdapter(config);
        break;
      case "oracle":
        adapter = new OracleAdapter(config);
        break;
      case "kingdee":
        adapter = new KingdeeAdapter(config);
        break;
      default:
        throw new Error(`不支持的ERP类型: ${type}`);
    }

    this.adapters.set(type.toLowerCase(), adapter);
  }

  /**
   * 获取适配器
   */
  getAdapter(type: string): ERPAdapter | undefined {
    return this.adapters.get(type.toLowerCase());
  }

  /**
   * 测试连接
   */
  async testConnection(type: string): Promise<boolean> {
    const adapter = this.getAdapter(type);
    if (!adapter) return false;
    return adapter.connect();
  }

  /**
   * 执行全量同步
   */
  async fullSync(type: string): Promise<{
    projects: ERPSyncResult;
    customers: ERPSyncResult;
    orders: ERPSyncResult;
  }> {
    const adapter = this.getAdapter(type);
    if (!adapter) {
      throw new Error(`未找到ERP适配器: ${type}`);
    }

    const [projects, customers, orders] = await Promise.all([
      adapter.syncProjects(),
      adapter.syncCustomers(),
      adapter.syncOrders(),
    ]);

    return { projects, customers, orders };
  }
}

// ==================== 类型定义 ====================

export interface FieldMappingSuggestion {
  sourceField: string;
  targetField: string;
  targetLabel: string;
  confidence: number;
  required: boolean;
  dataType: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationWarning {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  totalRows: number;
  validRows: number;
  errorCount: number;
  warningCount: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  canProceed: boolean;
}

export interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  userId?: number;
}

export interface ImportResult {
  totalProcessed: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  failedRows: { row: number; error: string }[];
  success: boolean;
}

export interface ERPConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
  apiKey?: string;
}

export interface ERPSyncResult {
  synced: number;
  errors: string[];
  source: string;
  syncTime: string;
}
