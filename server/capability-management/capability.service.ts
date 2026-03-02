/**
 * 能力管理服务层
 * 
 * 实现能力操作系统(Capability OS)的核心功能：
 * - 能力定义和等级管理 (L1-L5)
 * - 能力证据记录和验证
 * - 能力升级自动触发
 * - 能力档案管理
 */

import { requireDb } from '../db';
import { eq, and, sql, like } from 'drizzle-orm';
import { createChildLogger } from '../lib/logger';

const log = createChildLogger("capability");
import {
  capabilityProofConfigs,
  publicCapabilityShowcase,
} from '../../drizzle/schema';

// 能力等级定义
export const CAPABILITY_LEVELS = {
  L1: { name: '初级', minScore: 0, maxScore: 20, description: '基础操作能力' },
  L2: { name: '中级', minScore: 21, maxScore: 40, description: '独立执行能力' },
  L3: { name: '高级', minScore: 41, maxScore: 60, description: '指导他人能力' },
  L4: { name: '专家', minScore: 61, maxScore: 80, description: '创新优化能力' },
  L5: { name: '大师', minScore: 81, maxScore: 100, description: '战略引领能力' },
};

// 能力域定义
export const CAPABILITY_DOMAINS = {
  T: { name: '技术能力', code: 'T', description: '专业技术和工具使用' },
  S: { name: '系统理解', code: 'S', description: '系统架构和流程理解' },
  D: { name: '交付能力', code: 'D', description: '项目交付和执行' },
  C: { name: '客户价值', code: 'C', description: '客户服务和价值创造' },
  K: { name: '知识沉淀', code: 'K', description: '知识文档和培训' },
  L: { name: '领导影响', code: 'L', description: '团队领导和影响力' },
};

/**
 * 获取所有能力配置
 */
export async function getCapabilityConfigs(options?: {
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { category, search, page = 1, pageSize = 20 } = options || {};
  
  try {
    const db = await requireDb();
    let query = db.select().from(capabilityProofConfigs);
    
    const conditions = [];
    if (category) {
      conditions.push(eq(capabilityProofConfigs.capabilityCategory, category as any));
    }
    if (search) {
      conditions.push(like(capabilityProofConfigs.capabilityName, `%${search}%`));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const offset = (page - 1) * pageSize;
    const results = await query.limit(pageSize).offset(offset);
    
    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(capabilityProofConfigs);
    
    return {
      data: results,
      total: countResult[0]?.count || 0,
      page,
      pageSize,
    };
  } catch (error) {
    log.error({ err: error }, "获取能力配置失败");
    return {
      data: [],
      total: 0,
      page,
      pageSize,
    };
  }
}

/**
 * 获取单个能力配置
 */
export async function getCapabilityConfig(id: number) {
  try {
    const db = await requireDb();
    const results = await db
      .select()
      .from(capabilityProofConfigs)
      .where(eq(capabilityProofConfigs.id, id))
      .limit(1);
    
    return results[0] || null;
  } catch (error) {
    log.error({ err: error }, "获取能力配置失败");
    return null;
  }
}

/**
 * 创建能力配置
 */
export async function createCapabilityConfig(data: {
  capabilityCode: string;
  capabilityName: string;
  capabilityCategory: 'technical_skill' | 'system_understanding' | 'delivery_capability' | 'customer_value' | 'knowledge_precipitation' | 'equipment_capability';
  description?: string;
  proofRequirements?: string;
  validationRules?: string;
  levelCriteria?: string;
  isActive?: boolean;
}) {
  try {
    const db = await requireDb();
    const [result] = await db.insert(capabilityProofConfigs).values({
      capabilityCode: data.capabilityCode,
      capabilityName: data.capabilityName,
      capabilityCategory: data.capabilityCategory,
      publicDescription: data.description || '',
      publicEvidence: data.proofRequirements || '{}',
      verificationRules: data.validationRules || '{}',
      requiredDataSources: data.levelCriteria || '{}',
      isActive: (data.isActive ?? true) ? 1 : 0,
    } as any).returning();

    return { success: true, id: result?.id };
  } catch (error) {
    log.error({ err: error }, "创建能力配置失败");
    return { success: false, error: String(error) };
  }
}

/**
 * 更新能力配置
 */
export async function updateCapabilityConfig(id: number, data: Partial<{
  capabilityName: string;
  description: string;
  proofRequirements: string;
  validationRules: string;
  levelCriteria: string;
  isActive: boolean;
}>) {
  try {
    const db = await requireDb();
    const updateData: any = { ...data };
    if (data.isActive !== undefined) updateData.isActive = data.isActive ? 1 : 0;
    if (data.description !== undefined) { updateData.publicDescription = data.description; delete updateData.description; }
    if (data.proofRequirements !== undefined) { updateData.publicEvidence = data.proofRequirements; delete updateData.proofRequirements; }
    if (data.validationRules !== undefined) { updateData.verificationRules = data.validationRules; delete updateData.validationRules; }
    if (data.levelCriteria !== undefined) { updateData.requiredDataSources = data.levelCriteria; delete updateData.levelCriteria; }
    await db
      .update(capabilityProofConfigs)
      .set(updateData)
      .where(eq(capabilityProofConfigs.id, id));
    
    return { success: true };
  } catch (error) {
    log.error({ err: error }, "更新能力配置失败");
    return { success: false, error: String(error) };
  }
}

/**
 * 删除能力配置
 */
export async function deleteCapabilityConfig(id: number) {
  try {
    const db = await requireDb();
    await db
      .delete(capabilityProofConfigs)
      .where(eq(capabilityProofConfigs.id, id));
    
    return { success: true };
  } catch (error) {
    log.error({ err: error }, "删除能力配置失败");
    return { success: false, error: String(error) };
  }
}

/**
 * 获取公开能力展示
 */
export async function getPublicCapabilityShowcases(options?: {
  showcaseType?: string;
  isPublic?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { showcaseType, isPublic, page = 1, pageSize = 20 } = options || {};
  
  try {
    const db = await requireDb();
    let query = db.select().from(publicCapabilityShowcase);
    
    const conditions = [];
    if (showcaseType) {
      conditions.push(eq(publicCapabilityShowcase.category, showcaseType as any));
    }
    if (isPublic !== undefined) {
      conditions.push(eq(publicCapabilityShowcase.isFeatured, isPublic ? 1 : 0));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const offset = (page - 1) * pageSize;
    const results = await query.limit(pageSize).offset(offset);
    
    return {
      data: results,
      total: results.length,
      page,
      pageSize,
    };
  } catch (error) {
    log.error({ err: error }, "获取公开能力展示失败");
    return {
      data: [],
      total: 0,
      page,
      pageSize,
    };
  }
}

/**
 * 创建公开能力展示
 */
export async function createPublicCapabilityShowcase(data: {
  showcaseType: 'project_case' | 'capability_certificate' | 'team_profile' | 'technology_stack';
  title: string;
  summary?: string;
  contentJson?: string;
  mediaUrls?: string;
  relatedCapabilityIds?: string;
  isPublic?: boolean;
  displayOrder?: number;
}) {
  try {
    const db = await requireDb();
    const showcaseCode = `SC-${Date.now().toString(36).toUpperCase()}`;
    const slug = `showcase-${showcaseCode.toLowerCase()}`;
    const [result] = await db.insert(publicCapabilityShowcase).values({
      showcaseCode,
      category: data.showcaseType as any,
      title: data.title,
      slug,
      summary: data.summary || '',
      content: data.contentJson || '{}',
      gallery: data.mediaUrls || '[]',
      relatedCapabilityIds: data.relatedCapabilityIds || '[]',
      isFeatured: (data.isPublic ?? true) ? 1 : 0,
      sortOrder: data.displayOrder ?? 0,
      status: 'published' as any,
    } as any).returning();

    return { success: true, id: result?.id };
  } catch (error) {
    log.error({ err: error }, "创建公开能力展示失败");
    return { success: false, error: String(error) };
  }
}

/**
 * 计算能力等级
 * 根据能力得分自动计算等级
 */
export function calculateCapabilityLevel(score: number): string {
  if (score >= 81) return 'L5';
  if (score >= 61) return 'L4';
  if (score >= 41) return 'L3';
  if (score >= 21) return 'L2';
  return 'L1';
}

/**
 * 获取能力等级详情
 */
export function getCapabilityLevelDetails(level: string) {
  return CAPABILITY_LEVELS[level as keyof typeof CAPABILITY_LEVELS] || null;
}

/**
 * 获取能力域详情
 */
export function getCapabilityDomainDetails(domainCode: string) {
  return CAPABILITY_DOMAINS[domainCode as keyof typeof CAPABILITY_DOMAINS] || null;
}

/**
 * 获取所有能力域
 */
export function getAllCapabilityDomains() {
  return Object.values(CAPABILITY_DOMAINS);
}

/**
 * 获取所有能力等级
 */
export function getAllCapabilityLevels() {
  return Object.entries(CAPABILITY_LEVELS).map(([code, details]) => ({
    code,
    ...details,
  }));
}

/**
 * 初始化默认能力配置
 */
export async function initializeDefaultCapabilities() {
  const defaultCapabilities = [
    // 技术能力
    { code: 'T001', name: '超声波清洗技术', category: 'technical_skill' as const, description: '超声波清洗设备操作和调试能力' },
    { code: 'T002', name: '高压喷淋技术', category: 'technical_skill' as const, description: '高压喷淋系统操作和维护能力' },
    { code: 'T003', name: 'PLC编程', category: 'technical_skill' as const, description: 'PLC程序编写和调试能力' },
    { code: 'T004', name: '机械设计', category: 'technical_skill' as const, description: '清洗设备机械结构设计能力' },
    
    // 系统理解
    { code: 'S001', name: '清洗工艺理解', category: 'system_understanding' as const, description: '清洗工艺流程和参数理解' },
    { code: 'S002', name: '质量体系理解', category: 'system_understanding' as const, description: 'ISO质量管理体系理解' },
    
    // 交付能力
    { code: 'D001', name: '项目交付', category: 'delivery_capability' as const, description: '项目按时按质交付能力' },
    { code: 'D002', name: '现场调试', category: 'delivery_capability' as const, description: '设备现场安装调试能力' },
    
    // 客户价值
    { code: 'C001', name: '客户沟通', category: 'customer_value' as const, description: '客户需求沟通和方案讲解能力' },
    { code: 'C002', name: '售后服务', category: 'customer_value' as const, description: '售后服务和客户关系维护能力' },
    
    // 知识沉淀
    { code: 'K001', name: '技术文档', category: 'knowledge_precipitation' as const, description: '技术文档编写和知识库维护能力' },
    { code: 'K002', name: '培训授课', category: 'knowledge_precipitation' as const, description: '内部培训和知识传承能力' },
    
    // 设备能力
    { code: 'E001', name: '设备维护', category: 'equipment_capability' as const, description: '设备日常维护和保养能力' },
    { code: 'E002', name: '故障诊断', category: 'equipment_capability' as const, description: '设备故障诊断和排除能力' },
  ];
  
  let created = 0;
  try {
    const db = await requireDb();
    for (const cap of defaultCapabilities) {
      try {
        // 检查是否已存在
        const existing = await db
          .select()
          .from(capabilityProofConfigs)
          .where(eq(capabilityProofConfigs.capabilityCode, cap.code))
          .limit(1);
        
        if (existing.length === 0) {
          await createCapabilityConfig({
            capabilityCode: cap.code,
            capabilityName: cap.name,
            capabilityCategory: cap.category,
            description: cap.description,
          });
          created++;
        }
      } catch (error) {
        log.error({ err: error, capabilityCode: cap.code }, "创建能力配置失败");
      }
    }
  } catch (error) {
    log.error({ err: error }, "初始化默认能力配置失败");
    return { success: false, created: 0, total: defaultCapabilities.length };
  }
  
  return { success: true, created, total: defaultCapabilities.length };
}

// 兼容旧接口的占位符函数
export async function getOrCreateEmployeeCapability(employeeId: string, capabilityDomain: string) {
  return null;
}

export async function recordCapabilityEvidence(employeeId: string, capabilityDomain: string, evidenceType: string, description: string, score: number) {
  return null;
}

export async function checkUpgradeEligibility(employeeId: string, capabilityDomain: string, targetLevel: string) {
  return false;
}

export async function upgradeCapability(employeeId: string, capabilityDomain: string, toLevel: string) {
  return null;
}

export async function getCapabilityAssessmentReport(employeeId: string) {
  return null;
}

export async function getEmployeeCapabilities(employeeId: string) {
  return [];
}

export async function getCapabilityDevelopmentPath(employeeId: string, capabilityDomain: string) {
  return null;
}

export async function updateCapabilityDevelopmentPath(employeeId: string, capabilityDomain: string, developmentPlan: string) {
  return null;
}
