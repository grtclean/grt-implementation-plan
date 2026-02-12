/**
 * POS项目型组织操作系统 - AI服务
 * 集成LLM调用，实现M2摘要生成、相似项目推荐、版本生成、采购建议
 */

import { invokeLLM } from "../_core/llm";
import {
  SIMILAR_PROJECT_MATCHING_PROMPT,
  VERSION_GENERATION_PROMPT,
  PROCUREMENT_SUGGESTION_PROMPT,
  M2_SUMMARY_PROMPT,
  type SimilarProject,
  type VersionGeneration,
  type ProcurementSuggestion,
  type M2Summary,
} from "./ai-prompts";
import { HISTORICAL_PROJECTS_INDEX, searchSimilarProjects as searchLocalSimilarProjects } from "./db-init";

/**
 * 生成M2阶段摘要
 */
export async function generateM2Summary(
  projectInfo: string,
  customerInfo: string,
  requirementsInfo: string
): Promise<M2Summary> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: M2_SUMMARY_PROMPT.system },
      {
        role: "user",
        content: M2_SUMMARY_PROMPT.userTemplate(projectInfo, customerInfo, requirementsInfo),
      },
    ],
    response_format: M2_SUMMARY_PROMPT.responseSchema,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI未返回有效内容");
  }

  return JSON.parse(content) as M2Summary;
}

/**
 * 获取历史项目索引字符串
 */
export function getHistoricalProjectsIndexString(): string {
  return JSON.stringify(HISTORICAL_PROJECTS_INDEX, null, 2);
}

/**
 * 本地搜索相似项目（不使用AI）
 */
export function searchSimilarProjectsLocal(criteria: {
  scene?: string;
  customerType?: string;
  cleanlinessLevel?: string;
  cycleTime?: number;
  automationLevel?: string;
}) {
  return searchLocalSimilarProjects(criteria);
}

/**
 * 查找相似项目（使用AI + 历史项目索引）
 */
export async function findSimilarProjects(
  m2Json: string,
  historicalProjectsIndex?: string
): Promise<SimilarProject[]> {
  // 默认使用内置的历史项目索引
  const indexData = historicalProjectsIndex || getHistoricalProjectsIndexString();
  
  // 构建历史项目索引上下文
  const systemPrompt = `${SIMILAR_PROJECT_MATCHING_PROMPT.system}\n\n历史项目索引：\n${indexData}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: SIMILAR_PROJECT_MATCHING_PROMPT.userTemplate(m2Json),
      },
    ],
    response_format: SIMILAR_PROJECT_MATCHING_PROMPT.responseSchema,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI未返回有效内容");
  }

  const result = JSON.parse(content);
  return result.projects as SimilarProject[];
}

/**
 * 生成AIV0版本 (复制基线项目M3-M12)
 */
export async function generateAIV0(
  baseProjectCode: string,
  baseProjectData: Record<string, unknown>
): Promise<{
  versionCode: string;
  versionJson: Record<string, unknown>;
  changesSummary: string[];
}> {
  // AIV0是直接复制基线项目，不需要AI处理
  return {
    versionCode: "AIV0",
    versionJson: {
      baseProjectCode,
      M3: baseProjectData.M3 || {},
      M4: baseProjectData.M4 || {},
      M5: baseProjectData.M5 || {},
      M6: baseProjectData.M6 || {},
      M7: baseProjectData.M7 || {},
      M8: baseProjectData.M8 || {},
      M9: baseProjectData.M9 || {},
      M10: baseProjectData.M10 || {},
      M11: baseProjectData.M11 || {},
      M12: baseProjectData.M12 || {},
    },
    changesSummary: [`从基线项目 ${baseProjectCode} 复制M3-M12阶段配置`],
  };
}

/**
 * 生成V1版本 (基于AIV0和差异输入)
 */
export async function generateV1(
  aiv0Json: string,
  deltaInput: string
): Promise<VersionGeneration> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: VERSION_GENERATION_PROMPT.system },
      {
        role: "user",
        content: VERSION_GENERATION_PROMPT.userTemplate(aiv0Json, deltaInput),
      },
    ],
    response_format: VERSION_GENERATION_PROMPT.responseSchema,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI未返回有效内容");
  }

  return JSON.parse(content) as VersionGeneration;
}

/**
 * 生成采购建议
 */
export async function generateProcurementSuggestions(
  bomJson: string,
  scheduleJson: string,
  historyJson: string
): Promise<ProcurementSuggestion[]> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: PROCUREMENT_SUGGESTION_PROMPT.system },
      {
        role: "user",
        content: PROCUREMENT_SUGGESTION_PROMPT.userTemplate(bomJson, scheduleJson, historyJson),
      },
    ],
    response_format: PROCUREMENT_SUGGESTION_PROMPT.responseSchema,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI未返回有效内容");
  }

  const result = JSON.parse(content);
  return result.po_suggestions as ProcurementSuggestion[];
}

/**
 * 版本对比
 */
export function compareVersions(
  version1: Record<string, unknown>,
  version2: Record<string, unknown>
): {
  added: string[];
  modified: string[];
  removed: string[];
} {
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  const stages = ['M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];

  for (const stage of stages) {
    const v1Stage = version1[stage] as Record<string, unknown> | undefined;
    const v2Stage = version2[stage] as Record<string, unknown> | undefined;

    if (!v1Stage && v2Stage) {
      added.push(`${stage}: 新增阶段配置`);
    } else if (v1Stage && !v2Stage) {
      removed.push(`${stage}: 移除阶段配置`);
    } else if (v1Stage && v2Stage) {
      // 简单对比JSON字符串
      if (JSON.stringify(v1Stage) !== JSON.stringify(v2Stage)) {
        modified.push(`${stage}: 阶段配置已修改`);
      }
    }
  }

  return { added, modified, removed };
}
