/**
 * Capability Evidence Service - 能力证据服务
 * 
 * 提供能力证据的上传、审核和能力升级功能
 */

import { v4 as uuidv4 } from "uuid";
import { storagePut } from "../storage";

// 证据类型
export type EvidenceType = 
  | 'project_delivery'    // 项目交付物
  | 'training_cert'       // 培训证书
  | 'skill_cert'          // 技能认证
  | 'customer_feedback'   // 客户反馈
  | 'peer_review'         // 同事评审
  | 'self_assessment'     // 自我评估
  | 'supervisor_eval'     // 主管评估
  | 'other';              // 其他

// 能力域
export type CapabilityDomain = 
  | 'T'   // Technology - 技术能力
  | 'S'   // System Understanding - 系统理解
  | 'D'   // Delivery - 交付能力
  | 'C'   // Customer Value - 客户价值
  | 'K'   // Knowledge Precipitation - 知识沉淀
  | 'L';  // Leadership/Influence - 领导力/影响力

// 证据状态
export type EvidenceStatus = 'pending' | 'approved' | 'rejected' | 'archived';

// 能力等级定义
export const CAPABILITY_LEVELS = {
  1: { name: 'L1 - 入门', description: '基础知识和技能，需要指导完成任务' },
  2: { name: 'L2 - 熟练', description: '能独立完成常规任务，偶尔需要指导' },
  3: { name: 'L3 - 精通', description: '能独立处理复杂问题，可指导他人' },
  4: { name: 'L4 - 专家', description: '领域专家，能解决疑难问题，培养他人' },
  5: { name: 'L5 - 大师', description: '行业领先，能创新和引领发展方向' },
};

// 能力域定义
export const CAPABILITY_DOMAINS = {
  T: { name: '技术能力', description: '专业技术知识和实践能力' },
  S: { name: '系统理解', description: '对业务系统和流程的理解能力' },
  D: { name: '交付能力', description: '项目交付和执行能力' },
  C: { name: '客户价值', description: '创造客户价值的能力' },
  K: { name: '知识沉淀', description: '知识总结和传承能力' },
  L: { name: '领导力', description: '领导和影响他人的能力' },
};

// 证据类型定义
export const EVIDENCE_TYPES = {
  project_delivery: { name: '项目交付物', description: '项目完成的交付物证明' },
  training_cert: { name: '培训证书', description: '完成培训的证书' },
  skill_cert: { name: '技能认证', description: '技能认证证书' },
  customer_feedback: { name: '客户反馈', description: '客户的正面反馈' },
  peer_review: { name: '同事评审', description: '同事的评审意见' },
  self_assessment: { name: '自我评估', description: '自我能力评估' },
  supervisor_eval: { name: '主管评估', description: '主管的评估意见' },
  other: { name: '其他', description: '其他类型的证据' },
};

// 证据输入
export interface EvidenceInput {
  userId: string;
  userName: string;
  evidenceType: EvidenceType;
  capabilityDomain: CapabilityDomain;
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  equipmentModel?: string;
  validFrom?: Date;
  validUntil?: Date;
  tags?: string[];
}

// 文件上传输入
export interface FileUploadInput {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileBuffer: Buffer;
}

/**
 * 生成证据ID
 */
export function generateEvidenceId(): string {
  const timestamp = Date.now().toString(36);
  const random = uuidv4().split('-')[0];
  return `EVD-${timestamp}-${random}`.toUpperCase();
}

/**
 * 上传证据文件到S3
 */
export async function uploadEvidenceFile(
  evidenceId: string,
  file: FileUploadInput
): Promise<{ url: string; key: string }> {
  // 生成唯一的文件key
  const ext = file.fileName.split('.').pop() || 'bin';
  const randomSuffix = uuidv4().split('-')[0];
  const fileKey = `capability-evidences/${evidenceId}/${randomSuffix}.${ext}`;

  // 上传到S3
  const { url } = await storagePut(fileKey, file.fileBuffer, file.fileType);

  return { url, key: fileKey };
}

/**
 * 验证证据是否符合升级条件
 */
export function validateEvidenceForUpgrade(
  evidenceType: EvidenceType,
  capabilityDomain: CapabilityDomain,
  currentLevel: number
): { eligible: boolean; reason: string } {
  // 基本验证规则
  const rules: Record<EvidenceType, { minLevel: number; maxLevel: number; domains: CapabilityDomain[] }> = {
    project_delivery: { minLevel: 1, maxLevel: 4, domains: ['T', 'D', 'C'] },
    training_cert: { minLevel: 1, maxLevel: 3, domains: ['T', 'S', 'K'] },
    skill_cert: { minLevel: 2, maxLevel: 4, domains: ['T', 'S'] },
    customer_feedback: { minLevel: 2, maxLevel: 5, domains: ['C', 'D'] },
    peer_review: { minLevel: 2, maxLevel: 4, domains: ['T', 'K', 'L'] },
    self_assessment: { minLevel: 1, maxLevel: 2, domains: ['T', 'S', 'D', 'C', 'K', 'L'] },
    supervisor_eval: { minLevel: 1, maxLevel: 5, domains: ['T', 'S', 'D', 'C', 'K', 'L'] },
    other: { minLevel: 1, maxLevel: 3, domains: ['T', 'S', 'D', 'C', 'K', 'L'] },
  };

  const rule = rules[evidenceType];

  if (!rule.domains.includes(capabilityDomain)) {
    return {
      eligible: false,
      reason: `${EVIDENCE_TYPES[evidenceType].name}不适用于${CAPABILITY_DOMAINS[capabilityDomain].name}能力域`,
    };
  }

  if (currentLevel >= rule.maxLevel) {
    return {
      eligible: false,
      reason: `当前等级已达到该证据类型的最高可升级等级(L${rule.maxLevel})`,
    };
  }

  return {
    eligible: true,
    reason: '符合升级条件',
  };
}

/**
 * 计算升级所需的证据数量
 */
export function calculateRequiredEvidences(
  currentLevel: number,
  targetLevel: number,
  capabilityDomain: CapabilityDomain
): { required: number; description: string } {
  // 每升一级需要的证据数量递增
  const baseRequired = {
    1: 2,  // L1 -> L2: 2个证据
    2: 3,  // L2 -> L3: 3个证据
    3: 5,  // L3 -> L4: 5个证据
    4: 8,  // L4 -> L5: 8个证据
  };

  // 领导力域需要更多证据
  const multiplier = capabilityDomain === 'L' ? 1.5 : 1;

  const required = Math.ceil((baseRequired[currentLevel as keyof typeof baseRequired] || 2) * multiplier);

  return {
    required,
    description: `从L${currentLevel}升级到L${targetLevel}需要${required}个有效证据`,
  };
}

/**
 * 检查是否满足自动升级条件
 */
export function checkAutoUpgradeEligibility(
  approvedEvidences: number,
  currentLevel: number,
  capabilityDomain: CapabilityDomain
): { canUpgrade: boolean; newLevel: number; reason: string } {
  const { required } = calculateRequiredEvidences(currentLevel, currentLevel + 1, capabilityDomain);

  if (approvedEvidences >= required && currentLevel < 5) {
    return {
      canUpgrade: true,
      newLevel: currentLevel + 1,
      reason: `已收集${approvedEvidences}个有效证据，满足升级到L${currentLevel + 1}的条件`,
    };
  }

  return {
    canUpgrade: false,
    newLevel: currentLevel,
    reason: `还需要${required - approvedEvidences}个有效证据才能升级`,
  };
}
