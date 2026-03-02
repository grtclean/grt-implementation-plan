/**
 * POS (项目型组织操作系统) 数据库初始化脚本
 * 包含示例数据和历史项目索引
 */

import { requireDb } from "../db";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("pos-db-init");
import { 
  customersV2, 
  projectsV2, 
  projectStagesV2, 
  projectVersions,
  poSuggestions,
  mesSync
} from "../../drizzle/schema";

// 客户类型枚举
export const CUSTOMER_TYPES = [
  'tier1_strategic',      // Tier1战略客户
  'tier2_key',            // Tier2重点客户
  'tier3_standard',       // Tier3标准客户
  'tier4_small',          // Tier4小型客户
  'potential',            // 潜在客户
  'dormant',              // 休眠客户
  'churned'               // 流失客户
] as const;

// 应用场景枚举
export const SCENES = [
  'automotive_powertrain',      // 汽车动力总成
  'automotive_body',            // 汽车车身
  'semiconductor',              // 半导体
  'medical_device',             // 医疗器械
  'aerospace',                  // 航空航天
  'precision_optics',           // 精密光学
  'general_industrial'          // 通用工业
] as const;

// M0-M12阶段定义 - 从shared统一定义导入
import { STAGES as SHARED_STAGES } from "../../shared/stage-definitions";

export const PROJECT_STAGES = SHARED_STAGES.map(s => ({
  code: s.code,
  name: s.name,
  description: s.description,
}));

// Jared策略枚举
export const JARED_STRATEGIES = [
  'technical_leadership',   // 技术领先
  'price_competitive',      // 价格竞争
  'relationship_driven',    // 关系驱动
  'value_added',            // 增值服务
  'solution_bundling',      // 方案打包
  'quick_response',         // 快速响应
  'local_support',          // 本地支持
  'innovation_partner',     // 创新伙伴
  'risk_sharing',           // 风险共担
  'long_term_contract',     // 长期合同
  'reference_case'          // 标杆案例
] as const;

/**
 * 历史项目索引数据 - 用于AI相似项目匹配
 */
export const HISTORICAL_PROJECTS_INDEX = [
  {
    project_code: 'GRT347',
    customer_type: 'tier1_strategic',
    scene: 'automotive_powertrain',
    product_type: '超声波清洗线',
    cleanliness_level: 'ISO 16232 Class A',
    cycle_time: 120,
    automation_level: 'full_auto',
    special_requirements: ['高压喷淋', '真空干燥', '在线检测'],
    delivery_date: '2024-06',
    success_rate: 0.95,
    key_learnings: ['真空干燥参数优化', '节拍提升15%'],
    bom_template: 'GRT347_BOM_V2'
  },
  {
    project_code: 'GRT369',
    customer_type: 'tier1_strategic',
    scene: 'automotive_powertrain',
    product_type: '超声波清洗线',
    cleanliness_level: 'ISO 16232 Class B',
    cycle_time: 90,
    automation_level: 'semi_auto',
    special_requirements: ['碳氢清洗', '热风干燥'],
    delivery_date: '2024-09',
    success_rate: 0.92,
    key_learnings: ['碳氢溶剂回收系统优化'],
    bom_template: 'GRT369_BOM_V1'
  },
  {
    project_code: 'GRT388',
    customer_type: 'tier2_key',
    scene: 'semiconductor',
    product_type: '精密清洗设备',
    cleanliness_level: 'Class 100',
    cycle_time: 180,
    automation_level: 'full_auto',
    special_requirements: ['超纯水', '氮气保护', '颗粒检测'],
    delivery_date: '2024-11',
    success_rate: 0.88,
    key_learnings: ['超纯水系统调试经验', '颗粒检测标定'],
    bom_template: 'GRT388_BOM_V1'
  },
  {
    project_code: 'GRT412',
    customer_type: 'tier1_strategic',
    scene: 'medical_device',
    product_type: '医疗器械清洗线',
    cleanliness_level: 'FDA Class II',
    cycle_time: 150,
    automation_level: 'full_auto',
    special_requirements: ['GMP验证', '可追溯性', '灭菌接口'],
    delivery_date: '2025-01',
    success_rate: 0.90,
    key_learnings: ['GMP文档体系', 'IQ/OQ/PQ流程'],
    bom_template: 'GRT412_BOM_V1'
  },
  {
    project_code: 'GRT425',
    customer_type: 'tier2_key',
    scene: 'aerospace',
    product_type: '航空零件清洗系统',
    cleanliness_level: 'NAS 1638 Class 6',
    cycle_time: 240,
    automation_level: 'semi_auto',
    special_requirements: ['钛合金兼容', '无氯清洗剂', '航空认证'],
    delivery_date: '2025-03',
    success_rate: 0.85,
    key_learnings: ['航空材料兼容性测试', '认证流程优化'],
    bom_template: 'GRT425_BOM_V1'
  }
];

/**
 * 示例客户数据
 */
export const SAMPLE_CUSTOMERS = [
  {
    customerCode: 'CUST001',
    name: '博世汽车部件（苏州）有限公司',
    shortName: '博世苏州',
    customerType: 'tier1_strategic',
    industry: '汽车零部件',
    region: '华东',
    country: 'CN',
    scenes: JSON.stringify(['automotive_powertrain', 'automotive_body']),
    decisionWeights: JSON.stringify({ tech: 0.35, price: 0.20, value: 0.25, relation: 0.10, boss: 0.10 }),
    keyContacts: JSON.stringify([
      { name: '张工', title: '技术经理', phone: '138xxxx1234', email: 'zhang@bosch.com', role: 'technical_decision' },
      { name: '李总', title: '采购总监', phone: '139xxxx5678', email: 'li@bosch.com', role: 'commercial_decision' }
    ]),
    deliveryRisk: 'low',
    riskSolution: '标准交付流程，重点关注FAT验收',
    jaredStrategy: JSON.stringify(['technical_leadership', 'value_added', 'reference_case']),
    annualRevenue: 50000000,
    creditScore: 95,
    isActive: 1
  },
  {
    customerCode: 'CUST002',
    name: '台积电（南京）有限公司',
    shortName: '台积电南京',
    customerType: 'tier1_strategic',
    industry: '半导体',
    region: '华东',
    country: 'CN',
    scenes: JSON.stringify(['semiconductor']),
    decisionWeights: JSON.stringify({ tech: 0.40, price: 0.15, value: 0.30, relation: 0.05, boss: 0.10 }),
    keyContacts: JSON.stringify([
      { name: '王工', title: '设备工程师', phone: '137xxxx2345', email: 'wang@tsmc.com', role: 'technical_decision' }
    ]),
    deliveryRisk: 'medium',
    riskSolution: '提前进行洁净度验证，预留调试时间',
    jaredStrategy: JSON.stringify(['technical_leadership', 'innovation_partner']),
    annualRevenue: 80000000,
    creditScore: 98,
    isActive: 1
  },
  {
    customerCode: 'CUST003',
    name: '美敦力医疗器械（上海）',
    shortName: '美敦力上海',
    customerType: 'tier2_key',
    industry: '医疗器械',
    region: '华东',
    country: 'CN',
    scenes: JSON.stringify(['medical_device']),
    decisionWeights: JSON.stringify({ tech: 0.30, price: 0.25, value: 0.25, relation: 0.10, boss: 0.10 }),
    keyContacts: JSON.stringify([
      { name: '陈工', title: '质量经理', phone: '136xxxx3456', email: 'chen@medtronic.com', role: 'quality_decision' }
    ]),
    deliveryRisk: 'medium',
    riskSolution: 'GMP验证文档提前准备，IQ/OQ/PQ流程规划',
    jaredStrategy: JSON.stringify(['value_added', 'risk_sharing']),
    annualRevenue: 30000000,
    creditScore: 92,
    isActive: 1
  }
];

/**
 * 示例项目数据
 */
export const SAMPLE_PROJECTS = [
  {
    projectCode: 'GRT2025001',
    projectName: '博世苏州发动机缸体清洗线',
    customerId: 1,
    currentStage: 'M2',
    projectType: 'new_equipment',
    priority: 'high',
    pm: '张明',
    techLeader: '李强',
    salesOwner: '王芳',
    serviceOwner: '赵伟',
    sceneSnapshot: JSON.stringify({
      scene: 'automotive_powertrain',
      product: '发动机缸体',
      cleanliness: 'ISO 16232 Class A',
      cycleTime: 120,
      automation: 'full_auto'
    }),
    decisionSnapshot: JSON.stringify({
      tech: 0.35, price: 0.20, value: 0.25, relation: 0.10, boss: 0.10
    }),
    activeVersion: null,
    contractValue: 2500000,
    plannedStartDate: '2025-02-01',
    plannedEndDate: '2025-08-31',
    status: 'active'
  },
  {
    projectCode: 'GRT2025002',
    projectName: '台积电南京晶圆清洗设备',
    customerId: 2,
    currentStage: 'M3',
    projectType: 'new_equipment',
    priority: 'critical',
    pm: '刘洋',
    techLeader: '陈杰',
    salesOwner: '周敏',
    serviceOwner: '吴昊',
    sceneSnapshot: JSON.stringify({
      scene: 'semiconductor',
      product: '晶圆',
      cleanliness: 'Class 100',
      cycleTime: 180,
      automation: 'full_auto'
    }),
    decisionSnapshot: JSON.stringify({
      tech: 0.40, price: 0.15, value: 0.30, relation: 0.05, boss: 0.10
    }),
    activeVersion: 'V1',
    contractValue: 5000000,
    plannedStartDate: '2025-01-15',
    plannedEndDate: '2025-10-31',
    status: 'active'
  }
];

/**
 * 初始化POS数据库表和示例数据
 */
export async function initPOSDatabase() {
  log.info("开始初始化数据库");
  
  try {
    const db = await requireDb();
    
    // 插入示例客户数据
    log.info("插入示例客户数据");
    for (const customer of SAMPLE_CUSTOMERS) {
      await db.insert(customersV2).values({
        customerCode: customer.customerCode,
        customerName: customer.name,
        customerType: customer.customerType as any,
        scenes: customer.scenes as any,
        decisionWeights: customer.decisionWeights,
        keyContacts: customer.keyContacts,
        deliveryRisk: customer.deliveryRisk as any,
        riskSolution: customer.riskSolution,
        jaredStrategy: customer.jaredStrategy,
        industry: customer.industry,
        annualRevenue: String(customer.annualRevenue),
      } as any).onConflictDoNothing();
    }

    // 插入示例项目数据
    log.info("插入示例项目数据");
    for (const project of SAMPLE_PROJECTS) {
      await db.insert(projectsV2).values(project as any).onConflictDoNothing();
    }

    // 为每个项目创建M0-M12阶段记录
    log.info("创建项目阶段记录");
    for (let projectId = 1; projectId <= SAMPLE_PROJECTS.length; projectId++) {
      for (const stage of PROJECT_STAGES) {
        await db.insert(projectStagesV2).values({
          projectId,
          stageCode: stage.code as any,
          stageName: stage.name,
          status: stage.code <= SAMPLE_PROJECTS[projectId - 1].currentStage ? 'completed' : 'pending',
          owner: SAMPLE_PROJECTS[projectId - 1].pm,
          inputJson: JSON.stringify({}),
          outputJson: JSON.stringify({}),
          tasksJson: JSON.stringify([]),
          auditLog: JSON.stringify([])
        } as any).onConflictDoNothing();
      }
    }
    
    log.info("数据库初始化完成");
    return { success: true, message: '数据库初始化完成' };
  } catch (error) {
    log.error({ err: error }, "数据库初始化失败");
    return { success: false, message: String(error) };
  }
}

/**
 * 获取历史项目索引（用于AI相似项目匹配）
 */
export function getHistoricalProjectsIndex() {
  return HISTORICAL_PROJECTS_INDEX;
}

/**
 * 根据条件搜索相似历史项目
 */
export function searchSimilarProjects(criteria: {
  scene?: string;
  customerType?: string;
  cleanlinessLevel?: string;
  cycleTime?: number;
  automationLevel?: string;
}) {
  return HISTORICAL_PROJECTS_INDEX.filter(project => {
    let score = 0;
    let matches = 0;
    
    if (criteria.scene && project.scene === criteria.scene) {
      score += 0.3;
      matches++;
    }
    if (criteria.customerType && project.customer_type === criteria.customerType) {
      score += 0.2;
      matches++;
    }
    if (criteria.automationLevel && project.automation_level === criteria.automationLevel) {
      score += 0.2;
      matches++;
    }
    if (criteria.cycleTime) {
      const diff = Math.abs(project.cycle_time - criteria.cycleTime) / criteria.cycleTime;
      if (diff < 0.2) {
        score += 0.15;
        matches++;
      }
    }
    
    return matches >= 2;
  }).map(project => ({
    ...project,
    similarity: Math.random() * 0.3 + 0.7 // 模拟相似度计算
  })).sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}
