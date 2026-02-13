/**
 * Capability Level Service
 * Manages TSDCKL capability domains, level thresholds, evidence scoring, and point distribution.
 */

export interface CapabilityDomain {
  code: string;
  name: string;
  weight: number;
}

export const CAPABILITY_DOMAINS: CapabilityDomain[] = [
  { code: "T", name: "技术能力", weight: 0.25 },
  { code: "S", name: "服务能力", weight: 0.15 },
  { code: "D", name: "交付能力", weight: 0.25 },
  { code: "C", name: "客户能力", weight: 0.15 },
  { code: "K", name: "知识能力", weight: 0.10 },
  { code: "L", name: "领导能力", weight: 0.10 },
];

export interface LevelThreshold {
  level: number;
  minPoints: number;
  maxPoints: number;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, minPoints: 0, maxPoints: 99 },
  { level: 2, minPoints: 100, maxPoints: 299 },
  { level: 3, minPoints: 300, maxPoints: 599 },
  { level: 4, minPoints: 600, maxPoints: 999 },
  { level: 5, minPoints: 1000, maxPoints: Infinity },
];

export interface EvidenceScoreRule {
  code: string;
  name: string;
  baseScore: number;
  domains: string[];
}

export const EVIDENCE_SCORE_RULES: EvidenceScoreRule[] = [
  { code: "TIER1_DELIVERY", name: "Tier1交付", baseScore: 100, domains: ["T", "D"] },
  { code: "RED_BLUE_PASS", name: "红蓝对抗通过", baseScore: 80, domains: ["T", "S"] },
  { code: "PROJECT_COMPLETION", name: "项目完成", baseScore: 60, domains: ["D", "C"] },
  { code: "CUSTOMER_FEEDBACK", name: "客户反馈", baseScore: 50, domains: ["C", "S"] },
  { code: "KNOWLEDGE_SHARE", name: "知识分享", baseScore: 40, domains: ["K", "L"] },
  { code: "TRAINING_COMPLETION", name: "培训完成", baseScore: 30, domains: ["K"] },
  { code: "MENTORING", name: "导师辅导", baseScore: 45, domains: ["L", "K"] },
  { code: "PATENT_FILING", name: "专利申请", baseScore: 70, domains: ["T", "K"] },
  { code: "PROCESS_IMPROVEMENT", name: "流程改进", baseScore: 55, domains: ["D", "L"] },
  { code: "CERTIFICATION", name: "资质认证", baseScore: 65, domains: ["T", "S", "K"] },
];

export function calculateLevelFromPoints(points: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].minPoints) {
      return LEVEL_THRESHOLDS[i].level;
    }
  }
  return 1;
}

export function calculateEvidenceScore(
  baseScore: number,
  qualityMultiplier: number = 1.0,
  complexityMultiplier: number = 1.0,
  urgencyMultiplier: number = 1.0
): number {
  return Math.round(baseScore * qualityMultiplier * complexityMultiplier * urgencyMultiplier);
}

export function distributePointsToDomains(
  totalPoints: number,
  domains: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  const pointsPerDomain = Math.floor(totalPoints / domains.length);
  for (const domain of domains) {
    result[domain] = pointsPerDomain;
  }
  return result;
}

export function validateLevelCalculation(): boolean {
  // Validate that thresholds are continuous
  for (let i = 0; i < LEVEL_THRESHOLDS.length - 1; i++) {
    if (LEVEL_THRESHOLDS[i].maxPoints + 1 !== LEVEL_THRESHOLDS[i + 1].minPoints) {
      return false;
    }
  }
  // Validate domain weights sum to 1.0
  const totalWeight = CAPABILITY_DOMAINS.reduce((sum, d) => sum + d.weight, 0);
  if (Math.abs(totalWeight - 1.0) >= 0.001) {
    return false;
  }
  return true;
}
