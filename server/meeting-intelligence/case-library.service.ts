/**
 * 历史案例库管理服务
 * 支持案例导入、管理和AI匹配
 */

import { requireDb } from '../db';
import { sql } from 'drizzle-orm';

// 案例数据结构
export interface CaseData {
  id?: string;
  caseNumber: string;           // 案例编号
  projectName: string;          // 项目名称
  customerName: string;         // 客户名称
  industry: string;             // 行业
  productType: string;          // 产品类型
  cleanlinessStandard: string;  // 清洁度标准
  cleanlinessValue?: string;    // 清洁度数值
  partType: string;             // 零件类型
  partMaterial?: string;        // 零件材质
  processFlow: string;          // 工艺流程
  technicalSolution: string;    // 技术方案
  equipmentUsed?: string;       // 使用设备
  deliveryResult: string;       // 交付结果
  lessonsLearned?: string;      // 经验教训
  keySuccessFactors?: string;   // 成功关键因素
  projectPhase: string;         // 项目阶段 (M0-M12)
  processStages?: string;       // 工序阶段 (T1-T15)
  attachments?: string[];       // 附件列表
  tags: string[];               // 标签
  createdBy: string;            // 创建人
  createdAt?: string;           // 创建时间
  updatedAt?: string;           // 更新时间
}

// 批量导入结果
export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: { row: number; error: string }[];
}

/**
 * 导入单个案例
 */
export async function importCase(caseData: CaseData): Promise<{ success: boolean; id: string; error?: string }> {
  const db = await requireDb();
  const now = new Date().toISOString();
  const id = caseData.id || `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    await db.execute(sql`INSERT INTO customer_solution_case_library
            (id, case_number, project_name, customer_name, industry, product_type,
             cleanliness_standard, cleanliness_value, part_type, part_material,
             process_flow, technical_solution, equipment_used, delivery_result,
             lessons_learned, key_success_factors, project_phase, process_stages,
             attachments, tags, created_by, created_at, updated_at)
            VALUES (${id}, ${caseData.caseNumber}, ${caseData.projectName}, ${caseData.customerName}, ${caseData.industry}, ${caseData.productType}, ${caseData.cleanlinessStandard}, ${caseData.cleanlinessValue || null}, ${caseData.partType}, ${caseData.partMaterial || null}, ${caseData.processFlow}, ${caseData.technicalSolution}, ${caseData.equipmentUsed || null}, ${caseData.deliveryResult}, ${caseData.lessonsLearned || null}, ${caseData.keySuccessFactors || null}, ${caseData.projectPhase}, ${caseData.processStages || null}, ${JSON.stringify(caseData.attachments || [])}, ${JSON.stringify(caseData.tags)}, ${caseData.createdBy}, ${now}, ${now})`);

    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      id: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 批量导入案例
 */
export async function batchImportCases(cases: CaseData[]): Promise<ImportResult> {
  let imported = 0;
  let failed = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < cases.length; i++) {
    const result = await importCase(cases[i]);
    if (result.success) {
      imported++;
    } else {
      failed++;
      errors.push({ row: i + 1, error: result.error || 'Unknown error' });
    }
  }

  return {
    success: failed === 0,
    imported,
    failed,
    errors
  };
}

/**
 * 获取案例列表
 */
export async function getCases(filters?: {
  industry?: string;
  productType?: string;
  cleanlinessStandard?: string;
  projectPhase?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}): Promise<{ cases: CaseData[]; total: number }> {
  const db = await requireDb();

  let whereClause = sql`1=1`;

  if (filters?.industry) {
    whereClause = sql`${whereClause} AND industry = ${filters.industry}`;
  }
  if (filters?.productType) {
    whereClause = sql`${whereClause} AND product_type = ${filters.productType}`;
  }
  if (filters?.cleanlinessStandard) {
    whereClause = sql`${whereClause} AND cleanliness_standard = ${filters.cleanlinessStandard}`;
  }
  if (filters?.projectPhase) {
    whereClause = sql`${whereClause} AND project_phase = ${filters.projectPhase}`;
  }
  if (filters?.keyword) {
    const keyword = `%${filters.keyword}%`;
    whereClause = sql`${whereClause} AND (project_name LIKE ${keyword} OR customer_name LIKE ${keyword} OR technical_solution LIKE ${keyword})`;
  }

  // 获取总数
  const countResult = await db.execute(sql`SELECT COUNT(*) as total FROM customer_solution_case_library WHERE ${whereClause}`);
  const total = (countResult.rows[0] as any)?.total || 0;

  // 获取数据
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;

  const result = await db.execute(sql`SELECT * FROM customer_solution_case_library WHERE ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);

  const cases = result.rows.map((row: any) => ({
    id: row.id,
    caseNumber: row.case_number,
    projectName: row.project_name,
    customerName: row.customer_name,
    industry: row.industry,
    productType: row.product_type,
    cleanlinessStandard: row.cleanliness_standard,
    cleanlinessValue: row.cleanliness_value,
    partType: row.part_type,
    partMaterial: row.part_material,
    processFlow: row.process_flow,
    technicalSolution: row.technical_solution,
    equipmentUsed: row.equipment_used,
    deliveryResult: row.delivery_result,
    lessonsLearned: row.lessons_learned,
    keySuccessFactors: row.key_success_factors,
    projectPhase: row.project_phase,
    processStages: row.process_stages,
    attachments: JSON.parse(row.attachments || '[]'),
    tags: JSON.parse(row.tags || '[]'),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  return { cases, total };
}

/**
 * 删除案例
 */
export async function deleteCase(id: string): Promise<{ success: boolean }> {
  const db = await requireDb();

  await db.execute(sql`DELETE FROM customer_solution_case_library WHERE id = ${id}`);

  return { success: true };
}

/**
 * 更新案例
 */
export async function updateCase(id: string, updates: Partial<CaseData>): Promise<{ success: boolean }> {
  const db = await requireDb();
  const now = new Date().toISOString();

  // Build dynamic update using raw SQL with drizzle sql template
  // We'll construct the SET clause dynamically
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.projectName !== undefined) {
    setClauses.push('project_name');
    values.push(updates.projectName);
  }
  if (updates.customerName !== undefined) {
    setClauses.push('customer_name');
    values.push(updates.customerName);
  }
  if (updates.industry !== undefined) {
    setClauses.push('industry');
    values.push(updates.industry);
  }
  if (updates.productType !== undefined) {
    setClauses.push('product_type');
    values.push(updates.productType);
  }
  if (updates.cleanlinessStandard !== undefined) {
    setClauses.push('cleanliness_standard');
    values.push(updates.cleanlinessStandard);
  }
  if (updates.technicalSolution !== undefined) {
    setClauses.push('technical_solution');
    values.push(updates.technicalSolution);
  }
  if (updates.deliveryResult !== undefined) {
    setClauses.push('delivery_result');
    values.push(updates.deliveryResult);
  }
  if (updates.tags !== undefined) {
    setClauses.push('tags');
    values.push(JSON.stringify(updates.tags));
  }

  // Always update updated_at
  // Use a single query that updates all changed fields
  let updateQuery = sql`UPDATE customer_solution_case_library SET updated_at = ${now}`;

  if (updates.projectName !== undefined) {
    updateQuery = sql`${updateQuery}, project_name = ${updates.projectName}`;
  }
  if (updates.customerName !== undefined) {
    updateQuery = sql`${updateQuery}, customer_name = ${updates.customerName}`;
  }
  if (updates.industry !== undefined) {
    updateQuery = sql`${updateQuery}, industry = ${updates.industry}`;
  }
  if (updates.productType !== undefined) {
    updateQuery = sql`${updateQuery}, product_type = ${updates.productType}`;
  }
  if (updates.cleanlinessStandard !== undefined) {
    updateQuery = sql`${updateQuery}, cleanliness_standard = ${updates.cleanlinessStandard}`;
  }
  if (updates.technicalSolution !== undefined) {
    updateQuery = sql`${updateQuery}, technical_solution = ${updates.technicalSolution}`;
  }
  if (updates.deliveryResult !== undefined) {
    updateQuery = sql`${updateQuery}, delivery_result = ${updates.deliveryResult}`;
  }
  if (updates.tags !== undefined) {
    updateQuery = sql`${updateQuery}, tags = ${JSON.stringify(updates.tags)}`;
  }

  updateQuery = sql`${updateQuery} WHERE id = ${id}`;

  await db.execute(updateQuery);

  return { success: true };
}

/**
 * 获取案例统计信息
 */
export async function getCaseStatistics(): Promise<{
  totalCases: number;
  byIndustry: { industry: string; count: number }[];
  byProductType: { productType: string; count: number }[];
  byCleanlinessStandard: { standard: string; count: number }[];
  byProjectPhase: { phase: string; count: number }[];
}> {
  const db = await requireDb();

  // 总数
  const totalResult = await db.execute(sql`SELECT COUNT(*) as total FROM customer_solution_case_library`);
  const totalCases = (totalResult.rows[0] as any)?.total || 0;

  // 按行业统计
  const industryResult = await db.execute(sql`SELECT industry, COUNT(*) as count FROM customer_solution_case_library GROUP BY industry ORDER BY count DESC`);
  const byIndustry = industryResult.rows.map((row: any) => ({
    industry: row.industry,
    count: row.count
  }));

  // 按产品类型统计
  const productTypeResult = await db.execute(sql`SELECT product_type, COUNT(*) as count FROM customer_solution_case_library GROUP BY product_type ORDER BY count DESC`);
  const byProductType = productTypeResult.rows.map((row: any) => ({
    productType: row.product_type,
    count: row.count
  }));

  // 按清洁度标准统计
  const cleanlinessResult = await db.execute(sql`SELECT cleanliness_standard, COUNT(*) as count FROM customer_solution_case_library GROUP BY cleanliness_standard ORDER BY count DESC`);
  const byCleanlinessStandard = cleanlinessResult.rows.map((row: any) => ({
    standard: row.cleanliness_standard,
    count: row.count
  }));

  // 按项目阶段统计
  const phaseResult = await db.execute(sql`SELECT project_phase, COUNT(*) as count FROM customer_solution_case_library GROUP BY project_phase ORDER BY count DESC`);
  const byProjectPhase = phaseResult.rows.map((row: any) => ({
    phase: row.project_phase,
    count: row.count
  }));

  return {
    totalCases,
    byIndustry,
    byProductType,
    byCleanlinessStandard,
    byProjectPhase
  };
}

// GRT历史案例示例数据
export const SAMPLE_CASES: CaseData[] = [
  {
    caseNumber: 'GRT-2024-001',
    projectName: '某汽车变速箱壳体清洗项目',
    customerName: '某知名汽车零部件供应商',
    industry: '汽车制造',
    productType: '变速箱壳体',
    cleanlinessStandard: 'VDA 19.1',
    cleanlinessValue: '≤500μm, ≤15mg',
    partType: '铝合金压铸件',
    partMaterial: 'ADC12铝合金',
    processFlow: '预清洗→超声波清洗→高压喷淋→真空干燥→洁净度检测',
    technicalSolution: '采用多槽式超声波清洗系统，配合高压定点喷淋，针对复杂内腔结构设计专用工装夹具。使用环保型水基清洗剂，满足客户环保要求。',
    equipmentUsed: 'GRT-UC800超声波清洗机, GRT-HP500高压喷淋系统',
    deliveryResult: '成功',
    lessonsLearned: '复杂内腔结构需要专门设计喷淋角度，确保死角清洗到位',
    keySuccessFactors: '工装夹具设计、清洗剂配比优化、工艺参数调试',
    projectPhase: 'M8',
    processStages: 'T1,T2,T3,T5,T8,T10',
    tags: ['汽车', '变速箱', 'VDA19.1', '超声波清洗', '铝合金'],
    createdBy: 'system'
  },
  {
    caseNumber: 'GRT-2024-002',
    projectName: '新能源电池托盘清洗线',
    customerName: '某新能源汽车制造商',
    industry: '新能源汽车',
    productType: '电池托盘',
    cleanlinessStandard: 'ISO 16232',
    cleanlinessValue: '≤200μm, ≤5mg',
    partType: '铝型材焊接件',
    partMaterial: '6系铝合金',
    processFlow: '碱洗除油→酸洗去氧化→纯水漂洗→热风干燥→等离子处理',
    technicalSolution: '采用连续式通过清洗线，集成等离子表面处理，提升后续涂装附着力。全自动PLC控制，支持MES系统对接。',
    equipmentUsed: 'GRT-CL1200连续清洗线, GRT-PL300等离子处理机',
    deliveryResult: '成功',
    lessonsLearned: '焊缝区域需要加强清洗，防止残留焊渣影响涂装质量',
    keySuccessFactors: '工艺流程优化、自动化程度高、与客户MES系统无缝对接',
    projectPhase: 'M10',
    processStages: 'T1,T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12',
    tags: ['新能源', '电池托盘', 'ISO16232', '等离子处理', '自动化'],
    createdBy: 'system'
  },
  {
    caseNumber: 'GRT-2024-003',
    projectName: '精密液压阀体清洗系统',
    customerName: '某液压系统制造商',
    industry: '工程机械',
    productType: '液压阀体',
    cleanlinessStandard: 'NAS 1638 Class 6',
    cleanlinessValue: '≤50μm, ≤1mg',
    partType: '铸铁精加工件',
    partMaterial: 'HT250灰铸铁',
    processFlow: '粗洗→精洗→超精洗→真空干燥→洁净室包装',
    technicalSolution: '三级递进式清洗工艺，最终在千级洁净室内完成包装。采用专用防锈处理，确保长期存储不生锈。',
    equipmentUsed: 'GRT-PV600精密阀体清洗机, GRT-CR1000洁净室',
    deliveryResult: '成功',
    lessonsLearned: '铸铁件易生锈，需要在清洗后立即进行防锈处理',
    keySuccessFactors: '三级清洗工艺、洁净室包装、防锈处理',
    projectPhase: 'M12',
    processStages: 'T1,T2,T3,T5,T8,T10,T12,T13,T14,T15',
    tags: ['液压', '阀体', 'NAS1638', '精密清洗', '洁净室'],
    createdBy: 'system'
  },
  {
    caseNumber: 'GRT-2024-004',
    projectName: '半导体设备零部件清洗',
    customerName: '某半导体设备制造商',
    industry: '半导体',
    productType: '真空腔体',
    cleanlinessStandard: 'SEMI F57',
    cleanlinessValue: '≤0.3μm颗粒数<100个/cm²',
    partType: '不锈钢精密加工件',
    partMaterial: '316L不锈钢',
    processFlow: '超声波清洗→兆声波清洗→DI水漂洗→IPA干燥→洁净包装',
    technicalSolution: '采用兆声波清洗技术，有效去除亚微米级颗粒。全程在百级洁净室内操作，使用超纯水和高纯度IPA。',
    equipmentUsed: 'GRT-MC500兆声波清洗机, GRT-CR100百级洁净室',
    deliveryResult: '成功',
    lessonsLearned: '半导体级清洗对水质和化学品纯度要求极高，需要专门的供应链管理',
    keySuccessFactors: '兆声波技术、超纯水系统、百级洁净环境',
    projectPhase: 'M11',
    processStages: 'T1,T2,T3,T5,T8,T10,T12,T15',
    tags: ['半导体', '真空腔体', 'SEMI', '兆声波', '超纯水'],
    createdBy: 'system'
  },
  {
    caseNumber: 'GRT-2024-005',
    projectName: '航空发动机叶片清洗',
    customerName: '某航空发动机制造商',
    industry: '航空航天',
    productType: '涡轮叶片',
    cleanlinessStandard: 'AS9100D',
    cleanlinessValue: '无可见残留，荧光检测合格',
    partType: '高温合金精密铸造件',
    partMaterial: 'Inconel 718',
    processFlow: '碱洗除油→酸洗去氧化→中和→纯水漂洗→真空干燥→荧光检测',
    technicalSolution: '针对高温合金材料特性，采用专用清洗剂配方。全程可追溯，满足航空质量体系要求。',
    equipmentUsed: 'GRT-AE800航空件清洗系统',
    deliveryResult: '成功',
    lessonsLearned: '航空件清洗需要严格的过程记录和质量追溯',
    keySuccessFactors: '专用清洗剂、全程追溯、荧光检测验证',
    projectPhase: 'M9',
    processStages: 'T1,T2,T3,T4,T5,T6,T7,T8,T9,T10',
    tags: ['航空', '涡轮叶片', 'AS9100', '高温合金', '荧光检测'],
    createdBy: 'system'
  },
  {
    caseNumber: 'GRT-2023-001',
    projectName: '医疗器械清洗验证项目',
    customerName: '某医疗器械制造商',
    industry: '医疗器械',
    productType: '手术器械',
    cleanlinessStandard: 'ISO 13485',
    cleanlinessValue: '无菌级，内毒素<0.5EU/ml',
    partType: '不锈钢精密加工件',
    partMaterial: '17-4PH不锈钢',
    processFlow: '酶洗→超声波清洗→纯水漂洗→灭菌→无菌包装',
    technicalSolution: '采用多酶清洗剂，有效去除蛋白质残留。集成灭菌系统，实现清洗-灭菌一体化。',
    equipmentUsed: 'GRT-MD600医疗器械清洗机, GRT-ST300灭菌系统',
    deliveryResult: '成功',
    lessonsLearned: '医疗器械清洗需要通过严格的验证流程，包括清洗效果验证和灭菌效果验证',
    keySuccessFactors: '多酶清洗剂、灭菌一体化、验证文件完整',
    projectPhase: 'M12',
    processStages: 'T1,T2,T3,T5,T8,T10,T12,T13,T14,T15',
    tags: ['医疗', '手术器械', 'ISO13485', '灭菌', '验证'],
    createdBy: 'system'
  },
  {
    caseNumber: 'GRT-2023-002',
    projectName: '光学镜片清洗线',
    customerName: '某光学仪器制造商',
    industry: '光学仪器',
    productType: '光学镜片',
    cleanlinessStandard: 'MIL-C-48497A',
    cleanlinessValue: '无可见划痕和污点',
    partType: '光学玻璃',
    partMaterial: 'K9光学玻璃',
    processFlow: '超声波清洗→DI水漂洗→IPA蒸汽干燥→光学检测',
    technicalSolution: '采用低频超声波，避免损伤镜片表面。IPA蒸汽干燥确保无水痕残留。',
    equipmentUsed: 'GRT-OC400光学清洗机',
    deliveryResult: '成功',
    lessonsLearned: '光学件清洗需要特别注意超声波频率选择，避免产生微裂纹',
    keySuccessFactors: '低频超声波、IPA蒸汽干燥、光学检测',
    projectPhase: 'M8',
    processStages: 'T1,T2,T3,T5,T8,T10',
    tags: ['光学', '镜片', 'MIL-C', '超声波', 'IPA干燥'],
    createdBy: 'system'
  },
  {
    caseNumber: 'GRT-2023-003',
    projectName: '电子元器件清洗项目',
    customerName: '某电子元器件制造商',
    industry: '电子制造',
    productType: 'PCB板',
    cleanlinessStandard: 'IPC-A-610',
    cleanlinessValue: '离子污染<1.56μg/cm²',
    partType: 'FR4基板',
    partMaterial: 'FR4环氧玻纤板',
    processFlow: '水基清洗→纯水漂洗→热风干燥→离子污染检测',
    technicalSolution: '采用环保型水基清洗剂，替代传统溶剂清洗。在线离子污染检测，实时监控清洗效果。',
    equipmentUsed: 'GRT-EC500电子清洗机, GRT-IC100离子污染测试仪',
    deliveryResult: '成功',
    lessonsLearned: '电子清洗需要关注ESD防护，避免静电损伤元器件',
    keySuccessFactors: '水基清洗剂、ESD防护、在线检测',
    projectPhase: 'M7',
    processStages: 'T1,T2,T3,T5,T8',
    tags: ['电子', 'PCB', 'IPC', '水基清洗', '离子污染'],
    createdBy: 'system'
  }
];

/**
 * 初始化示例案例数据
 */
export async function initializeSampleCases(): Promise<ImportResult> {
  const db = await requireDb();

  // 检查是否已有数据
  const existingResult = await db.execute(sql`SELECT COUNT(*) as count FROM customer_solution_case_library`);

  const existingCount = (existingResult.rows[0] as any)?.count || 0;

  if (existingCount > 0) {
    return {
      success: true,
      imported: 0,
      failed: 0,
      errors: [{ row: 0, error: `案例库已有 ${existingCount} 条数据，跳过初始化` }]
    };
  }

  return await batchImportCases(SAMPLE_CASES);
}

export default {
  importCase,
  batchImportCases,
  getCases,
  deleteCase,
  updateCase,
  getCaseStatistics,
  initializeSampleCases,
  SAMPLE_CASES
};
