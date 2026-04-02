/**
 * 项目身份统一服务
 * 管理 OPP → BID → PRJ 编号生命周期
 * 确保预项目号向正式项目号平滑迁移
 */

import { createChildLogger } from '../lib/logger';

const log = createChildLogger('project-identity');

// State machine transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  'opportunity': ['bid_submitted'],
  'bid_submitted': ['bid_evaluation', 'bid_lost'],
  'bid_evaluation': ['bid_won', 'bid_lost'],
  'bid_won': ['project_initiated'],
  'bid_lost': ['archived'],
  'project_initiated': ['active'],
  'active': ['completed'],
  'completed': ['archived'],
};

/**
 * Validate a stage transition
 */
export function canTransition(currentStage: string, targetStage: string): boolean {
  const allowed = VALID_TRANSITIONS[currentStage];
  return allowed ? allowed.includes(targetStage) : false;
}

/**
 * Get allowed next stages
 */
export function getNextStages(currentStage: string): string[] {
  return VALID_TRANSITIONS[currentStage] || [];
}

/**
 * Generate project code with sequential numbering
 */
export function generateProjectCode(
  prefix: 'PRJ' | 'BID' | 'OPP',
  buCode: string,
  year: number,
  sequence: number
): string {
  const seq = String(sequence).padStart(3, '0');
  return `${prefix}-${buCode}-${year}-${seq}`;
}

/**
 * Parse a project code into its components
 */
export function parseProjectCode(code: string): {
  prefix: string;
  buCode: string;
  year: number;
  sequence: number;
} | null {
  const match = code.match(/^(PRJ|BID|OPP)-([A-Z]{2})-(\d{4})-(\d{3,6})$/);
  if (!match) return null;
  return {
    prefix: match[1],
    buCode: match[2],
    year: parseInt(match[3], 10),
    sequence: parseInt(match[4], 10),
  };
}

/**
 * Build the stage history entry
 */
export function buildStageEntry(stage: string, userId: number): {
  stage: string;
  enteredAt: string;
  triggeredBy: number;
} {
  return {
    stage,
    enteredAt: new Date().toISOString(),
    triggeredBy: userId,
  };
}

/**
 * Get the full lifecycle description for a stage
 */
export function getStageDescription(stage: string): string {
  const descriptions: Record<string, string> = {
    'opportunity': '商机跟进中',
    'bid_submitted': '已提交投标',
    'bid_evaluation': '评标中',
    'bid_won': '中标',
    'bid_lost': '未中标',
    'project_initiated': '项目已立项',
    'active': '项目执行中',
    'completed': '项目已完成',
    'archived': '已归档',
  };
  return descriptions[stage] || stage;
}

/**
 * Validate project code format
 */
export function validateProjectCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!code) { errors.push('项目编号不能为空'); return { valid: false, errors }; }

  const parsed = parseProjectCode(code);
  if (!parsed) {
    errors.push(`编号格式不正确，应为 {PRJ|BID|OPP}-{BU}-{YYYY}-{NNN}，实际: ${code}`);
    return { valid: false, errors };
  }

  const validBUs = ['HW', 'SY', 'CY', 'BD', 'GY']; // 海外/商用/乘用/半导体/工业通用
  if (!validBUs.includes(parsed.buCode)) {
    errors.push(`BU编码无效: ${parsed.buCode}，有效值: ${validBUs.join('/')}`);
  }

  if (parsed.year < 2020 || parsed.year > 2035) {
    errors.push(`年份超出范围: ${parsed.year}`);
  }

  return { valid: errors.length === 0, errors };
}
