/**
 * AI Agent Fleet — L1-L5 等级配置矩阵
 *
 * 每位员工拥有L1-L5五个等级的AI助理军团，M默认=员工当前能力等级。
 * 本文件定义等级参数、提示词修饰、能力掩码及辅助函数。
 */

import type { AiCapability } from "./ai-assistant-presets";

// ─── 类型定义 ────────────────────────────────────────────

export type AgentLevel = 1 | 2 | 3 | 4 | 5;
export type AutonomyLevel = "supervised" | "semi_autonomous" | "autonomous";
export type DataScope = "self" | "team" | "department" | "bu" | "global";

export type AgentTaskType =
  | "document_draft"
  | "data_analysis"
  | "code_review"
  | "report_generation"
  | "meeting_summary"
  | "email_draft"
  | "risk_assessment"
  | "quality_inspection";

export const AGENT_TASK_TYPE_LABELS: Record<AgentTaskType, string> = {
  document_draft: "文档起草",
  data_analysis: "数据分析",
  code_review: "代码审查",
  report_generation: "报告生成",
  meeting_summary: "会议纪要",
  email_draft: "邮件草拟",
  risk_assessment: "风险评估",
  quality_inspection: "质量检查",
};

export const ALL_TASK_TYPES: AgentTaskType[] = Object.keys(
  AGENT_TASK_TYPE_LABELS,
) as AgentTaskType[];

// ─── 等级配置接口 ──────────────────────────────────────────

export interface AgentLevelConfig {
  level: AgentLevel;
  label: string;
  labelEn: string;
  maxTaskComplexity: number;
  autonomyLevel: AutonomyLevel;
  capabilityCount: number;
  defaultCapabilities: AiCapability[];
  maxConcurrentTasks: number;
  humanReviewThreshold: number; // 复杂度>此值需人审; 0=全部需人审; 6=无需人审
  dataScope: DataScope;
  bidPriceRangeLow: number;
  bidPriceRangeHigh: number;
  promptModifier: string;
  color: string; // Tailwind color class
  badge: string; // 等级徽章
}

// ─── L1-L5 配置矩阵 ────────────────────────────────────────

export const AGENT_LEVEL_CONFIGS: Record<AgentLevel, AgentLevelConfig> = {
  1: {
    level: 1,
    label: "初级助理",
    labelEn: "Junior",
    maxTaskComplexity: 1,
    autonomyLevel: "supervised",
    capabilityCount: 3,
    defaultCapabilities: ["work_arrangement", "culture_communication", "execution_optimization"],
    maxConcurrentTasks: 1,
    humanReviewThreshold: 0, // 全部需人审
    dataScope: "self",
    bidPriceRangeLow: 1,
    bidPriceRangeHigh: 10,
    promptModifier:
      "你是初级助理(L1)，只处理简单明确的任务。严格遵循指令，不做超出范围的决策。所有输出必须经过人类审核。",
    color: "gray",
    badge: "L1",
  },
  2: {
    level: 2,
    label: "标准助理",
    labelEn: "Standard",
    maxTaskComplexity: 2,
    autonomyLevel: "supervised",
    capabilityCount: 5,
    defaultCapabilities: [
      "work_arrangement",
      "work_plan_advice",
      "culture_communication",
      "execution_optimization",
      "skill_coaching",
    ],
    maxConcurrentTasks: 2,
    humanReviewThreshold: 0, // 全部需人审
    dataScope: "self",
    bidPriceRangeLow: 5,
    bidPriceRangeHigh: 30,
    promptModifier:
      "你是标准助理(L2)，可处理常规任务。对于标准流程类工作可提供建议，但所有输出仍需人类审核确认。",
    color: "blue",
    badge: "L2",
  },
  3: {
    level: 3,
    label: "高级助理",
    labelEn: "Senior",
    maxTaskComplexity: 3,
    autonomyLevel: "semi_autonomous",
    capabilityCount: 7,
    defaultCapabilities: [
      "meeting_listening",
      "work_arrangement",
      "work_plan_advice",
      "improve_thinking",
      "skill_coaching",
      "culture_communication",
      "execution_optimization",
    ],
    maxConcurrentTasks: 3,
    humanReviewThreshold: 2, // 复杂度>2需人审
    dataScope: "team",
    bidPriceRangeLow: 10,
    bidPriceRangeHigh: 80,
    promptModifier:
      "你是高级助理(L3)，可独立处理多数任务。对于复杂度不超过2的任务可自主完成，更高复杂度需请求人类审核。",
    color: "green",
    badge: "L3",
  },
  4: {
    level: 4,
    label: "资深助理",
    labelEn: "Expert",
    maxTaskComplexity: 4,
    autonomyLevel: "semi_autonomous",
    capabilityCount: 8,
    defaultCapabilities: [
      "meeting_listening",
      "work_arrangement",
      "work_plan_advice",
      "improve_thinking",
      "skill_coaching",
      "culture_communication",
      "empower_owner",
      "execution_optimization",
    ],
    maxConcurrentTasks: 5,
    humanReviewThreshold: 3, // 复杂度>3需人审
    dataScope: "department",
    bidPriceRangeLow: 20,
    bidPriceRangeHigh: 200,
    promptModifier:
      "你是资深助理(L4)，具备高度专业能力。可自主处理复杂度3以内的任务，仅在高复杂度场景需人类确认。你的建议应体现专业深度。",
    color: "purple",
    badge: "L4",
  },
  5: {
    level: 5,
    label: "专家助理",
    labelEn: "Master",
    maxTaskComplexity: 5,
    autonomyLevel: "autonomous",
    capabilityCount: 8,
    defaultCapabilities: [
      "meeting_listening",
      "work_arrangement",
      "work_plan_advice",
      "improve_thinking",
      "skill_coaching",
      "culture_communication",
      "empower_owner",
      "execution_optimization",
    ],
    maxConcurrentTasks: 8,
    humanReviewThreshold: 4, // 仅复杂度5需人审
    dataScope: "bu",
    bidPriceRangeLow: 50,
    bidPriceRangeHigh: 500,
    promptModifier:
      "你是专家级助理(L5)，可完全自主决策。你拥有跨领域的专业能力，可独立处理绝大多数任务。仅在最高复杂度(5级)任务时需人类确认。你的输出应当是专家级品质。",
    color: "amber",
    badge: "L5",
  },
};

// ─── 辅助函数 ────────────────────────────────────────────

/**
 * 获取等级配置
 */
export function getLevelConfig(level: AgentLevel): AgentLevelConfig {
  return AGENT_LEVEL_CONFIGS[level];
}

/**
 * 根据员工技能等级获取默认M级等级
 * skillLevel: L1-L5 string or number
 */
export function getDefaultLevel(
  skillLevel?: string | number | null,
): AgentLevel {
  if (!skillLevel) return 1;
  const n =
    typeof skillLevel === "number"
      ? skillLevel
      : parseInt(String(skillLevel).replace(/[^0-9]/g, ""), 10);
  if (isNaN(n) || n < 1) return 1;
  if (n > 5) return 5;
  return n as AgentLevel;
}

/**
 * 生成Agent名称
 * e.g. "张三-L3 AI助理"
 */
export function generateAgentName(
  ownerName: string,
  level: AgentLevel,
): string {
  const cfg = AGENT_LEVEL_CONFIGS[level];
  return `${ownerName}-L${level} ${cfg.label}`;
}

/**
 * 生成Agent编码
 * e.g. "AGT-GRT001-L3"
 */
export function generateAgentCode(
  employeeCode: string,
  level: AgentLevel,
): string {
  return `AGT-${employeeCode}-L${level}`;
}

/**
 * 生成Agent DID
 * e.g. "did:grt:agt:GRT001-L3"
 */
export function generateAgentDid(
  employeeCode: string,
  level: AgentLevel,
): string {
  return `did:grt:agt:${employeeCode}-L${level}`;
}

/**
 * 判断任务是否需要人类审核
 */
export function needsHumanReview(
  level: AgentLevel,
  taskComplexity: number,
): boolean {
  const cfg = AGENT_LEVEL_CONFIGS[level];
  return taskComplexity > cfg.humanReviewThreshold;
}

/**
 * 计算G-Token奖励（基于任务复杂度和质量分）
 */
export function calculateGTokenReward(
  taskComplexity: number,
  qualityScore: number,
): number {
  // 基础奖励 = 复杂度 * 10
  const base = taskComplexity * 10;
  // 质量加成 = 质量分/100 * 基础
  const qualityBonus = (qualityScore / 100) * base;
  return Math.round((base + qualityBonus) * 100) / 100;
}

/**
 * 获取等级对应的颜色 CSS class
 */
export function getLevelColorClass(level: AgentLevel): string {
  const colorMap: Record<AgentLevel, string> = {
    1: "bg-gray-100 text-gray-700 border-gray-300",
    2: "bg-blue-100 text-blue-700 border-blue-300",
    3: "bg-green-100 text-green-700 border-green-300",
    4: "bg-purple-100 text-purple-700 border-purple-300",
    5: "bg-amber-100 text-amber-700 border-amber-300",
  };
  return colorMap[level];
}

/**
 * 获取等级对应的实心颜色 class（用于卡片背景）
 */
export function getLevelSolidColorClass(level: AgentLevel): string {
  const colorMap: Record<AgentLevel, string> = {
    1: "bg-gray-500",
    2: "bg-blue-500",
    3: "bg-green-500",
    4: "bg-purple-500",
    5: "bg-amber-500",
  };
  return colorMap[level];
}
