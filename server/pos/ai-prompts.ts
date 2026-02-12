/**
 * POS项目型组织操作系统 - AI Prompt模板
 * 用于与LLM交互的结构化提示词
 */

/**
 * 相似项目匹配引擎 Prompt
 * 用于M2阶段AI推荐相似项目功能
 */
export const SIMILAR_PROJECT_MATCHING_PROMPT = {
  system: `你是GRT非标清洗设备"相似项目匹配引擎"。你必须输出严格JSON数组，每项包含：project_code, similarity(0-1), reasons[], key_differences[]。`,
  
  userTemplate: (m2Json: string) => `新项目M2结构化需求如下：
${m2Json}
请从历史项目索引中选择最相似的3个项目，并说明相似原因与关键差异（用于提醒复用风险）。
输出JSON数组，不要输出额外文字。`,

  responseSchema: {
    type: "json_schema" as const,
    json_schema: {
      name: "similar_projects",
      strict: true,
      schema: {
        type: "object",
        properties: {
          projects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                project_code: { type: "string", description: "项目编号，如GRT-347" },
                similarity: { type: "number", description: "相似度0-1" },
                reasons: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "相似原因列表" 
                },
                key_differences: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "关键差异列表（复用风险提醒）" 
                },
              },
              required: ["project_code", "similarity", "reasons", "key_differences"],
              additionalProperties: false,
            },
          },
        },
        required: ["projects"],
        additionalProperties: false,
      },
    },
  },
};

/**
 * 版本生成引擎 Prompt
 * 用于基于AIV0和差异输入生成V1版本
 */
export const VERSION_GENERATION_PROMPT = {
  system: `你是GRT项目版本生成引擎。输入为 base_version(AIV0) 与 delta_input(工程师差异增强框)。输出必须是严格JSON：
{
  "new_version":"V1",
  "changes_summary":[...],
  "stage_baseline": { "M3":{}, "M4":{}, ... "M12":{} }
}
你必须：更新里程碑建议、风险清单、测试项、资源需求与关键BOM预估，并标注变化原因。`,

  userTemplate: (aiv0Json: string, deltaInput: string) => `base_version(AIV0)：
${aiv0Json}
delta_input：
${deltaInput}
生成V1版本JSON。`,

  responseSchema: {
    type: "json_schema" as const,
    json_schema: {
      name: "version_generation",
      strict: true,
      schema: {
        type: "object",
        properties: {
          new_version: { type: "string", description: "新版本号，如V1" },
          changes_summary: {
            type: "array",
            items: { type: "string" },
            description: "变更摘要列表",
          },
          stage_baseline: {
            type: "object",
            properties: {
              M3: { type: "object", additionalProperties: true },
              M4: { type: "object", additionalProperties: true },
              M5: { type: "object", additionalProperties: true },
              M6: { type: "object", additionalProperties: true },
              M7: { type: "object", additionalProperties: true },
              M8: { type: "object", additionalProperties: true },
              M9: { type: "object", additionalProperties: true },
              M10: { type: "object", additionalProperties: true },
              M11: { type: "object", additionalProperties: true },
              M12: { type: "object", additionalProperties: true },
            },
            required: ["M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"],
            additionalProperties: false,
            description: "各阶段基线配置",
          },
        },
        required: ["new_version", "changes_summary", "stage_baseline"],
        additionalProperties: false,
      },
    },
  },
};

/**
 * 采购建议系统 Prompt
 * 用于M4阶段完成后生成PO建议草案
 */
export const PROCUREMENT_SUGGESTION_PROMPT = {
  system: `你是GRT采购建议系统。输出必须是严格JSON：
{
 "po_suggestions":[
   {"item_code":"","desc":"","qty":0,"suggested_supplier":"","price_range":"","need_date":"","risk_flags":[],"rationale":""}
 ]
}
你必须优先保障交期与质量风险控制，同时给出可替代供应商建议（如有）。`,

  userTemplate: (bomJson: string, scheduleJson: string, historyJson: string) => `项目版本与BOM草案：
${bomJson}
项目里程碑：
${scheduleJson}
历史价格与供应商绩效（如有）：
${historyJson}
生成PO建议草案JSON。`,

  responseSchema: {
    type: "json_schema" as const,
    json_schema: {
      name: "procurement_suggestions",
      strict: true,
      schema: {
        type: "object",
        properties: {
          po_suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item_code: { type: "string", description: "物料编码" },
                desc: { type: "string", description: "物料描述" },
                qty: { type: "number", description: "数量" },
                suggested_supplier: { type: "string", description: "建议供应商" },
                price_range: { type: "string", description: "价格区间" },
                need_date: { type: "string", description: "需求日期" },
                risk_flags: {
                  type: "array",
                  items: { type: "string" },
                  description: "风险标识",
                },
                rationale: { type: "string", description: "建议理由" },
              },
              required: ["item_code", "desc", "qty", "suggested_supplier", "price_range", "need_date", "risk_flags", "rationale"],
              additionalProperties: false,
            },
          },
        },
        required: ["po_suggestions"],
        additionalProperties: false,
      },
    },
  },
};

/**
 * M2摘要生成 Prompt
 * 用于AI生成M2阶段摘要
 */
export const M2_SUMMARY_PROMPT = {
  system: `你是GRT项目M2阶段摘要生成器。根据项目需求和客户信息，生成结构化的M2阶段摘要。
输出必须包含：项目概述、客户需求分析、技术要点、风险评估、下一步建议。`,

  userTemplate: (projectInfo: string, customerInfo: string, requirementsInfo: string) => `项目信息：
${projectInfo}

客户信息：
${customerInfo}

需求详情：
${requirementsInfo}

请生成M2阶段摘要。`,

  responseSchema: {
    type: "json_schema" as const,
    json_schema: {
      name: "m2_summary",
      strict: true,
      schema: {
        type: "object",
        properties: {
          project_overview: { type: "string", description: "项目概述" },
          customer_needs_analysis: { type: "string", description: "客户需求分析" },
          technical_highlights: {
            type: "array",
            items: { type: "string" },
            description: "技术要点",
          },
          risk_assessment: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risk: { type: "string" },
                level: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
                mitigation: { type: "string" },
              },
              required: ["risk", "level", "mitigation"],
              additionalProperties: false,
            },
            description: "风险评估",
          },
          next_steps: {
            type: "array",
            items: { type: "string" },
            description: "下一步建议",
          },
        },
        required: ["project_overview", "customer_needs_analysis", "technical_highlights", "risk_assessment", "next_steps"],
        additionalProperties: false,
      },
    },
  },
};

export type SimilarProject = {
  project_code: string;
  similarity: number;
  reasons: string[];
  key_differences: string[];
};

export type VersionGeneration = {
  new_version: string;
  changes_summary: string[];
  stage_baseline: Record<string, Record<string, unknown>>;
};

export type ProcurementSuggestion = {
  item_code: string;
  desc: string;
  qty: number;
  suggested_supplier: string;
  price_range: string;
  need_date: string;
  risk_flags: string[];
  rationale: string;
};

export type M2Summary = {
  project_overview: string;
  customer_needs_analysis: string;
  technical_highlights: string[];
  risk_assessment: Array<{
    risk: string;
    level: "HIGH" | "MEDIUM" | "LOW";
    mitigation: string;
  }>;
  next_steps: string[];
};
