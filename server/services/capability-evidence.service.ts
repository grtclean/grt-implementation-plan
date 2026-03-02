/**
 * 能力证据系统服务
 * 能力升级证据管理，自动触发能力升级
 */


import { createChildLogger } from "../lib/logger";
const log = createChildLogger("capability-evidence");

export type CapabilityDomain = 'T' | 'S' | 'D' | 'C' | 'K' | 'L';
// T: Technology 技术
// S: System Understanding 系统理解
// D: Delivery 交付
// C: Customer Value 客户价值
// K: Knowledge Precipitation 知识沉淀
// L: Leadership/Influence 领导力/影响力

export type CapabilityLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface Capability {
  id: string;
  employeeId: string;
  domain: CapabilityDomain;
  name: string;
  level: CapabilityLevel;
  evidences: CapabilityEvidence[];
  lastUpgradeDate?: string;
  nextLevelRequirements: LevelRequirement[];
}

export interface CapabilityEvidence {
  id: string;
  type: 'project' | 'service' | 'certification' | 'training' | 'peer_review';
  source: string;
  description: string;
  projectId?: string;
  serviceId?: string;
  date: string;
  verifiedBy?: string;
  score: number;
  artifacts: string[];
}

export interface LevelRequirement {
  description: string;
  minScore: number;
  evidenceTypes: string[];
  minEvidenceCount: number;
  fulfilled: boolean;
}

export interface CapabilityUpgradeResult {
  success: boolean;
  capability: Capability;
  previousLevel: CapabilityLevel;
  newLevel: CapabilityLevel;
  reason: string;
  evidencesUsed: string[];
}

// 能力等级要求定义
const levelRequirements: Record<CapabilityLevel, Record<CapabilityDomain, LevelRequirement[]>> = {
  L1: {
    T: [{ description: "完成基础技术培训", minScore: 60, evidenceTypes: ['training'], minEvidenceCount: 1, fulfilled: false }],
    S: [{ description: "了解系统基本架构", minScore: 60, evidenceTypes: ['training'], minEvidenceCount: 1, fulfilled: false }],
    D: [{ description: "参与项目交付", minScore: 60, evidenceTypes: ['project'], minEvidenceCount: 1, fulfilled: false }],
    C: [{ description: "完成客户服务培训", minScore: 60, evidenceTypes: ['training'], minEvidenceCount: 1, fulfilled: false }],
    K: [{ description: "编写技术文档", minScore: 60, evidenceTypes: ['project'], minEvidenceCount: 1, fulfilled: false }],
    L: [{ description: "参与团队活动", minScore: 60, evidenceTypes: ['peer_review'], minEvidenceCount: 1, fulfilled: false }]
  },
  L2: {
    T: [
      { description: "独立完成技术任务", minScore: 70, evidenceTypes: ['project', 'service'], minEvidenceCount: 3, fulfilled: false },
      { description: "获得专业认证", minScore: 70, evidenceTypes: ['certification'], minEvidenceCount: 1, fulfilled: false }
    ],
    S: [{ description: "独立进行系统分析", minScore: 70, evidenceTypes: ['project'], minEvidenceCount: 2, fulfilled: false }],
    D: [{ description: "主导项目阶段交付", minScore: 70, evidenceTypes: ['project'], minEvidenceCount: 2, fulfilled: false }],
    C: [{ description: "独立处理客户问题", minScore: 70, evidenceTypes: ['service'], minEvidenceCount: 3, fulfilled: false }],
    K: [{ description: "贡献知识库内容", minScore: 70, evidenceTypes: ['project'], minEvidenceCount: 2, fulfilled: false }],
    L: [{ description: "指导新员工", minScore: 70, evidenceTypes: ['peer_review'], minEvidenceCount: 2, fulfilled: false }]
  },
  L3: {
    T: [
      { description: "解决复杂技术问题", minScore: 80, evidenceTypes: ['project', 'service'], minEvidenceCount: 5, fulfilled: false },
      { description: "技术创新贡献", minScore: 80, evidenceTypes: ['project'], minEvidenceCount: 1, fulfilled: false }
    ],
    S: [{ description: "系统优化建议被采纳", minScore: 80, evidenceTypes: ['project'], minEvidenceCount: 2, fulfilled: false }],
    D: [{ description: "主导完整项目交付", minScore: 80, evidenceTypes: ['project'], minEvidenceCount: 3, fulfilled: false }],
    C: [{ description: "客户满意度优秀", minScore: 80, evidenceTypes: ['service'], minEvidenceCount: 5, fulfilled: false }],
    K: [{ description: "建立标准SOP", minScore: 80, evidenceTypes: ['project'], minEvidenceCount: 2, fulfilled: false }],
    L: [{ description: "带领小团队", minScore: 80, evidenceTypes: ['peer_review', 'project'], minEvidenceCount: 3, fulfilled: false }]
  },
  L4: {
    T: [
      { description: "技术专家认可", minScore: 90, evidenceTypes: ['certification', 'peer_review'], minEvidenceCount: 3, fulfilled: false },
      { description: "主导技术攻关", minScore: 90, evidenceTypes: ['project'], minEvidenceCount: 2, fulfilled: false }
    ],
    S: [{ description: "系统架构设计", minScore: 90, evidenceTypes: ['project'], minEvidenceCount: 2, fulfilled: false }],
    D: [{ description: "Tier 1客户交付成功", minScore: 90, evidenceTypes: ['project'], minEvidenceCount: 2, fulfilled: false }],
    C: [{ description: "客户价值创造", minScore: 90, evidenceTypes: ['service', 'project'], minEvidenceCount: 3, fulfilled: false }],
    K: [{ description: "知识体系建设", minScore: 90, evidenceTypes: ['project'], minEvidenceCount: 2, fulfilled: false }],
    L: [{ description: "跨部门协调", minScore: 90, evidenceTypes: ['peer_review', 'project'], minEvidenceCount: 3, fulfilled: false }]
  },
  L5: {
    T: [
      { description: "行业技术领先", minScore: 95, evidenceTypes: ['certification', 'peer_review'], minEvidenceCount: 5, fulfilled: false },
      { description: "技术战略贡献", minScore: 95, evidenceTypes: ['project'], minEvidenceCount: 3, fulfilled: false }
    ],
    S: [{ description: "系统战略规划", minScore: 95, evidenceTypes: ['project'], minEvidenceCount: 2, fulfilled: false }],
    D: [{ description: "复杂项目群管理", minScore: 95, evidenceTypes: ['project'], minEvidenceCount: 3, fulfilled: false }],
    C: [{ description: "战略客户关系", minScore: 95, evidenceTypes: ['service', 'project'], minEvidenceCount: 5, fulfilled: false }],
    K: [{ description: "知识战略领导", minScore: 95, evidenceTypes: ['project'], minEvidenceCount: 3, fulfilled: false }],
    L: [{ description: "组织影响力", minScore: 95, evidenceTypes: ['peer_review'], minEvidenceCount: 5, fulfilled: false }]
  }
};

// 模拟员工能力数据
const employeeCapabilities: Map<string, Capability[]> = new Map();

/**
 * 添加能力证据
 */
export function addCapabilityEvidence(
  employeeId: string,
  domain: CapabilityDomain,
  evidence: Omit<CapabilityEvidence, 'id'>
): CapabilityEvidence {
  const newEvidence: CapabilityEvidence = {
    id: `EVD-${Date.now()}`,
    ...evidence
  };

  // 获取或创建员工能力
  let capabilities = employeeCapabilities.get(employeeId) || [];
  let capability = capabilities.find(c => c.domain === domain);

  if (!capability) {
    capability = {
      id: `CAP-${employeeId}-${domain}`,
      employeeId,
      domain,
      name: getDomainName(domain),
      level: 'L1',
      evidences: [],
      nextLevelRequirements: levelRequirements.L2[domain].map(r => ({ ...r }))
    };
    capabilities.push(capability);
  }

  capability.evidences.push(newEvidence);
  employeeCapabilities.set(employeeId, capabilities);

  // 检查是否触发升级
  checkAndTriggerUpgrade(employeeId, domain);

  return newEvidence;
}

/**
 * 检查并触发能力升级
 */
export function checkAndTriggerUpgrade(
  employeeId: string,
  domain: CapabilityDomain
): CapabilityUpgradeResult | null {
  const capabilities = employeeCapabilities.get(employeeId);
  if (!capabilities) return null;

  const capability = capabilities.find(c => c.domain === domain);
  if (!capability) return null;

  const currentLevel = capability.level;
  const nextLevel = getNextLevel(currentLevel);
  if (!nextLevel) return null; // 已经是最高级别

  const requirements = levelRequirements[nextLevel][domain];
  const evidences = capability.evidences;

  // 检查是否满足所有要求
  let allFulfilled = true;
  const evidencesUsed: string[] = [];

  for (const req of requirements) {
    const matchingEvidences = evidences.filter(e => 
      req.evidenceTypes.includes(e.type) && e.score >= req.minScore
    );

    if (matchingEvidences.length >= req.minEvidenceCount) {
      req.fulfilled = true;
      evidencesUsed.push(...matchingEvidences.slice(0, req.minEvidenceCount).map(e => e.id));
    } else {
      allFulfilled = false;
    }
  }

  if (allFulfilled) {
    // 触发升级
    const previousLevel = capability.level;
    capability.level = nextLevel;
    capability.lastUpgradeDate = new Date().toISOString().split('T')[0];
    capability.nextLevelRequirements = getNextLevel(nextLevel) 
      ? levelRequirements[getNextLevel(nextLevel)!][domain].map(r => ({ ...r }))
      : [];

    return {
      success: true,
      capability,
      previousLevel,
      newLevel: nextLevel,
      reason: `满足${nextLevel}级别所有要求，系统自动升级`,
      evidencesUsed
    };
  }

  return null;
}

/**
 * 获取员工能力列表
 */
export function getEmployeeCapabilities(employeeId: string): Capability[] {
  return employeeCapabilities.get(employeeId) || [];
}

/**
 * 获取能力升级进度
 */
export function getUpgradeProgress(
  employeeId: string,
  domain: CapabilityDomain
): {
  currentLevel: CapabilityLevel;
  nextLevel: CapabilityLevel | null;
  requirements: LevelRequirement[];
  progress: number;
} {
  const capabilities = employeeCapabilities.get(employeeId);
  const capability = capabilities?.find(c => c.domain === domain);

  if (!capability) {
    return {
      currentLevel: 'L1',
      nextLevel: 'L2',
      requirements: levelRequirements.L2[domain].map(r => ({ ...r })),
      progress: 0
    };
  }

  const nextLevel = getNextLevel(capability.level);
  const requirements = nextLevel 
    ? levelRequirements[nextLevel][domain].map(r => ({ ...r }))
    : [];

  // 计算进度
  let fulfilledCount = 0;
  for (const req of requirements) {
    const matchingEvidences = capability.evidences.filter(e => 
      req.evidenceTypes.includes(e.type) && e.score >= req.minScore
    );
    if (matchingEvidences.length >= req.minEvidenceCount) {
      fulfilledCount++;
    }
  }

  const progress = requirements.length > 0 
    ? Math.round((fulfilledCount / requirements.length) * 100)
    : 100;

  return {
    currentLevel: capability.level,
    nextLevel,
    requirements,
    progress
  };
}

/**
 * 获取下一级别
 */
function getNextLevel(current: CapabilityLevel): CapabilityLevel | null {
  const levels: CapabilityLevel[] = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const currentIndex = levels.indexOf(current);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
}

/**
 * 获取领域名称
 */
function getDomainName(domain: CapabilityDomain): string {
  const names: Record<CapabilityDomain, string> = {
    T: '技术能力',
    S: '系统理解',
    D: '交付能力',
    C: '客户价值',
    K: '知识沉淀',
    L: '领导影响力'
  };
  return names[domain];
}

/**
 * 验证能力证据
 */
export function verifyEvidence(
  evidenceId: string,
  verifierId: string,
  verified: boolean,
  comments?: string
): boolean {
  // 实际实现中应更新数据库
  log.info({ evidenceId, verifierId, verified }, "Evidence verification recorded");
  return true;
}

/**
 * 获取能力证据统计
 */
export function getEvidenceStatistics(employeeId: string): {
  totalEvidences: number;
  byDomain: Record<CapabilityDomain, number>;
  byType: Record<string, number>;
  averageScore: number;
} {
  const capabilities = employeeCapabilities.get(employeeId) || [];
  
  let totalEvidences = 0;
  const byDomain: Record<CapabilityDomain, number> = { T: 0, S: 0, D: 0, C: 0, K: 0, L: 0 };
  const byType: Record<string, number> = {};
  let totalScore = 0;

  for (const cap of capabilities) {
    byDomain[cap.domain] = cap.evidences.length;
    totalEvidences += cap.evidences.length;
    
    for (const evidence of cap.evidences) {
      byType[evidence.type] = (byType[evidence.type] || 0) + 1;
      totalScore += evidence.score;
    }
  }

  return {
    totalEvidences,
    byDomain,
    byType,
    averageScore: totalEvidences > 0 ? Math.round(totalScore / totalEvidences) : 0
  };
}
