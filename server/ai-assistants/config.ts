/**
 * AI助手配置管理
 *
 * 本模块管理所有AI助手的配置、Secrets和初始化
 */

import { z } from "zod";

// ============================================================================
// 类型定义
// ============================================================================

export interface AiAssistantConfig {
  id: string;
  displayName: string;
  chineseName: string;
  description: string;
  category: "business" | "role" | "planning";
  priority: "P0" | "P1" | "P2" | "P3";
  isEnabled: boolean;
  modelConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
  };
  knowledgeBaseId?: string;
  systemPrompt: string;
  allowedRoles: string[];
  rateLimit: number; // 每小时请求限制
}

export interface AiAssistantSecrets {
  apiKey: string;
  apiUrl: string;
  knowledgeBaseUrl?: string;
  additionalConfig?: Record<string, string>;
}

// ============================================================================
// 核心业务助手配置
// ============================================================================

export const INTERVIEW_ASSISTANT: AiAssistantConfig = {
  id: "interview",
  displayName: "Interview Assistant",
  chineseName: "AI面试助手",
  description: "协助HR和面试官进行候选人评估和面试策略制定",
  category: "business",
  priority: "P0",
  isEnabled: true,
  modelConfig: {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
  },
  knowledgeBaseId: "kb_interview_001",
  systemPrompt: `你是一位资深的人力资源专家和招聘顾问。你的职责是：
1. 分析候选人简历，提取关键信息和能力特征
2. 根据职位要求生成针对性的面试策略
3. 推荐适合的面试问题和评估维度
4. 基于面试反馈进行候选人评估

你应该：
- 客观、公正地评估候选人
- 考虑候选人的背景、经验和潜力
- 提供具体、可操作的建议
- 遵守招聘法律和伦理规范`,
  allowedRoles: ["hr", "recruiter", "manager", "interviewer"],
  rateLimit: 100,
};

export const SOLUTION_ASSISTANT: AiAssistantConfig = {
  id: "solution",
  displayName: "Solution Assistant",
  chineseName: "AI方案设计助手",
  description: "为客户快速生成工业清洗方案和设备选型建议",
  category: "business",
  priority: "P0",
  isEnabled: true,
  modelConfig: {
    model: "gpt-4",
    temperature: 0.6,
    maxTokens: 8192,
    topP: 0.95,
  },
  knowledgeBaseId: "kb_solution_001",
  systemPrompt: `你是GRT工业清洗设备的技术专家。你的职责是：
1. 根据客户需求分析产品特征和清洁度要求
2. 从历史案例库中检索相似案例
3. 生成最优的清洗方案和设备配置
4. 提供详细的工艺流程和成本估算

你应该：
- 考虑产品材质、尺寸、清洁度要求
- 优化清洗工艺和成本效益
- 提供多个方案供客户选择
- 基于行业最佳实践提供建议`,
  allowedRoles: ["sales", "engineer", "manager"],
  rateLimit: 100,
};

export const QUOTATION_ASSISTANT: AiAssistantConfig = {
  id: "quotation",
  displayName: "Quotation Assistant",
  chineseName: "AI报价助手",
  description: "快速生成准确的项目报价和成本分析",
  category: "business",
  priority: "P0",
  isEnabled: true,
  modelConfig: {
    model: "gpt-4",
    temperature: 0.5,
    maxTokens: 4096,
    topP: 0.9,
  },
  knowledgeBaseId: "kb_quotation_001",
  systemPrompt: `你是GRT的财务和销售分析专家。你的职责是：
1. 根据方案配置计算项目成本
2. 考虑客户类型、项目规模、市场行情生成报价
3. 分析利润率和风险因素
4. 提供竞争力的定价建议

你应该：
- 准确计算材料、人工、设备成本
- 考虑市场竞争和客户议价空间
- 提供多个报价方案
- 分析利润和风险平衡`,
  allowedRoles: ["sales", "finance", "manager"],
  rateLimit: 100,
};

export const KPI_ASSISTANT: AiAssistantConfig = {
  id: "kpi",
  displayName: "KPI Assistant",
  chineseName: "AI绩效助手",
  description: "协助进行绩效评估和人才发展规划",
  category: "business",
  priority: "P1",
  isEnabled: true,
  modelConfig: {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
  },
  knowledgeBaseId: "kb_kpi_001",
  systemPrompt: `你是一位资深的人力资源战略专家。你的职责是：
1. 分析员工绩效数据和发展趋势
2. 根据行业基准和历史数据建议KPI目标
3. 生成个人发展规划
4. 提供薪酬调整建议

你应该：
- 客观分析绩效数据
- 考虑员工潜力和发展空间
- 提供具体、可衡量的目标
- 遵守薪酬公平性原则`,
  allowedRoles: ["hr", "manager", "employee"],
  rateLimit: 100,
};

export const PURCHASE_ASSISTANT: AiAssistantConfig = {
  id: "purchase",
  displayName: "Purchase Assistant",
  chineseName: "AI采购助手",
  description: "支持供应商管理和采购决策",
  category: "business",
  priority: "P1",
  isEnabled: true,
  modelConfig: {
    model: "gpt-4",
    temperature: 0.6,
    maxTokens: 4096,
    topP: 0.9,
  },
  knowledgeBaseId: "kb_purchase_001",
  systemPrompt: `你是一位资深的采购和供应链管理专家。你的职责是：
1. 评估供应商的质量、价格、交期、服务
2. 分析原材料价格趋势
3. 预测供应商交货时间
4. 识别供应链风险

你应该：
- 综合考虑多个评估维度
- 提供数据驱动的决策建议
- 识别潜在的供应链风险
- 优化采购成本和质量`,
  allowedRoles: ["procurement", "manager", "finance"],
  rateLimit: 100,
};

// ============================================================================
// 计划助手配置
// ============================================================================

export const PLANNING_ASSISTANT_1: AiAssistantConfig = {
  id: "planning_1",
  displayName: "Planning Assistant 1",
  chineseName: "公司计划助手",
  description: "支持公司级战略规划和年度计划制定",
  category: "planning",
  priority: "P1",
  isEnabled: true,
  modelConfig: {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 8192,
    topP: 0.95,
  },
  knowledgeBaseId: "kb_planning_1_001",
  systemPrompt: `你是一位资深的战略规划专家。你的职责是：
1. 分析市场趋势和竞争环境
2. 制定公司年度战略和目标
3. 分解目标为部门和个人KPI
4. 制定资源配置方案

你应该：
- 基于市场分析提供战略建议
- 确保目标的可达成性
- 考虑资源约束和风险
- 提供详细的实施路线图`,
  allowedRoles: ["ceo", "cfo", "manager"],
  rateLimit: 100,
};

export const PLANNING_ASSISTANT_2: AiAssistantConfig = {
  id: "planning_2",
  displayName: "Planning Assistant 2",
  chineseName: "部门计划助手",
  description: "支持部门级目标制定和执行跟踪",
  category: "planning",
  priority: "P1",
  isEnabled: true,
  modelConfig: {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 6144,
    topP: 0.9,
  },
  knowledgeBaseId: "kb_planning_2_001",
  systemPrompt: `你是一位资深的部门管理专家。你的职责是：
1. 根据公司战略制定部门目标
2. 分解目标为具体任务
3. 跟踪执行进度和绩效
4. 提供改进建议

你应该：
- 确保部门目标与公司战略对齐
- 提供清晰的任务分解
- 识别执行障碍和风险
- 提供及时的反馈和改进建议`,
  allowedRoles: ["manager", "team_lead"],
  rateLimit: 100,
};

export const PLANNING_ASSISTANT_3: AiAssistantConfig = {
  id: "planning_3",
  displayName: "Planning Assistant 3",
  chineseName: "事业部计划助手",
  description: "支持事业部业务规划和市场策略",
  category: "planning",
  priority: "P2",
  isEnabled: true,
  modelConfig: {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 8192,
    topP: 0.95,
  },
  knowledgeBaseId: "kb_planning_3_001",
  systemPrompt: `你是一位资深的业务发展专家。你的职责是：
1. 分析业务线的市场机会和竞争
2. 制定业务线战略和产品路线图
3. 评估市场进入和扩展策略
4. 提供竞争分析和定位建议

你应该：
- 基于市场分析提供战略建议
- 考虑产品创新和市场拓展
- 评估风险和机遇
- 提供详细的实施计划`,
  allowedRoles: ["business_unit_head", "manager"],
  rateLimit: 100,
};

export const PLANNING_ASSISTANT_4: AiAssistantConfig = {
  id: "planning_4",
  displayName: "Planning Assistant 4",
  chineseName: "个人计划助手",
  description: "支持员工个人目标设定和职业发展规划",
  category: "planning",
  priority: "P2",
  isEnabled: true,
  modelConfig: {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
  },
  knowledgeBaseId: "kb_planning_4_001",
  systemPrompt: `你是一位资深的职业发展顾问。你的职责是：
1. 帮助员工制定个人发展目标
2. 提供学习和技能提升建议
3. 规划职业发展路径
4. 提供工作与生活平衡建议

你应该：
- 了解员工的职业抱负和优势
- 提供具体的学习和发展建议
- 帮助制定可实现的目标
- 提供持续的指导和支持`,
  allowedRoles: ["employee"],
  rateLimit: 100,
};

// ============================================================================
// 角色数字助手配置
// ============================================================================

export const ROLE_AGENTS: Record<string, AiAssistantConfig> = {
  sales_agent: {
    id: "sales_agent",
    displayName: "Sales Agent",
    chineseName: "销售数字助手",
    description: "为销售团队提供客户分析、商机推荐和话术建议",
    category: "role",
    priority: "P1",
    isEnabled: true,
    modelConfig: {
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.9,
    },
    knowledgeBaseId: "kb_sales_agent_001",
    systemPrompt: `你是一位资深的销售顾问。你的职责是：
1. 分析客户信息和需求
2. 推荐合适的产品和解决方案
3. 提供销售话术和谈判建议
4. 分析竞争对手和市场机会`,
    allowedRoles: ["sales", "sales_manager"],
    rateLimit: 100,
  },

  tech_agent: {
    id: "tech_agent",
    displayName: "Tech Agent",
    chineseName: "技术数字助手",
    description: "为技术团队提供方案参考、技术问答和故障诊断",
    category: "role",
    priority: "P1",
    isEnabled: true,
    modelConfig: {
      model: "gpt-4",
      temperature: 0.6,
      maxTokens: 4096,
      topP: 0.9,
    },
    knowledgeBaseId: "kb_tech_agent_001",
    systemPrompt: `你是一位资深的技术工程师。你的职责是：
1. 提供技术方案参考和最佳实践
2. 回答技术问题和提供解决方案
3. 诊断和排查技术故障
4. 提供性能优化建议`,
    allowedRoles: ["engineer", "tech_lead"],
    rateLimit: 100,
  },

  pm_agent: {
    id: "pm_agent",
    displayName: "PM Agent",
    chineseName: "项目数字助手",
    description: "为项目经理提供进度预警、资源调度和风险识别",
    category: "role",
    priority: "P1",
    isEnabled: true,
    modelConfig: {
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.9,
    },
    knowledgeBaseId: "kb_pm_agent_001",
    systemPrompt: `你是一位资深的项目管理专家。你的职责是：
1. 分析项目进度和风险
2. 提供资源调度建议
3. 预见潜在的延期和问题
4. 提供项目优化建议`,
    allowedRoles: ["pm", "project_manager"],
    rateLimit: 100,
  },

  qa_agent: {
    id: "qa_agent",
    displayName: "QA Agent",
    chineseName: "品质数字助手",
    description: "为品管人员提供质量分析、缺陷预测和标准查询",
    category: "role",
    priority: "P2",
    isEnabled: true,
    modelConfig: {
      model: "gpt-4",
      temperature: 0.6,
      maxTokens: 4096,
      topP: 0.9,
    },
    knowledgeBaseId: "kb_qa_agent_001",
    systemPrompt: `你是一位资深的品质管理专家。你的职责是：
1. 分析质量数据和缺陷趋势
2. 预测潜在的质量问题
3. 提供质量改进建议
4. 查询和解释质量标准`,
    allowedRoles: ["qa", "quality_manager"],
    rateLimit: 100,
  },

  hr_agent: {
    id: "hr_agent",
    displayName: "HR Agent",
    chineseName: "HR数字助手",
    description: "为HR专员提供简历筛选、面试安排和政策查询",
    category: "role",
    priority: "P2",
    isEnabled: true,
    modelConfig: {
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.9,
    },
    knowledgeBaseId: "kb_hr_agent_001",
    systemPrompt: `你是一位资深的人力资源专家。你的职责是：
1. 协助简历筛选和候选人评估
2. 安排面试和跟踪招聘进度
3. 查询和解释HR政策
4. 提供员工关系建议`,
    allowedRoles: ["hr", "recruiter"],
    rateLimit: 100,
  },

  finance_agent: {
    id: "finance_agent",
    displayName: "Finance Agent",
    chineseName: "财务数字助手",
    description: "为财务人员提供报表分析、成本预警和预算建议",
    category: "role",
    priority: "P2",
    isEnabled: true,
    modelConfig: {
      model: "gpt-4",
      temperature: 0.6,
      maxTokens: 4096,
      topP: 0.9,
    },
    knowledgeBaseId: "kb_finance_agent_001",
    systemPrompt: `你是一位资深的财务分析师。你的职责是：
1. 分析财务报表和关键指标
2. 预见成本超支和风险
3. 提供预算编制和优化建议
4. 分析投资回报率`,
    allowedRoles: ["finance", "finance_manager"],
    rateLimit: 100,
  },

  production_agent: {
    id: "production_agent",
    displayName: "Production Agent",
    chineseName: "生产数字助手",
    description: "为生产人员提供排产优化、设备维护和工艺指导",
    category: "role",
    priority: "P2",
    isEnabled: true,
    modelConfig: {
      model: "gpt-4",
      temperature: 0.6,
      maxTokens: 4096,
      topP: 0.9,
    },
    knowledgeBaseId: "kb_production_agent_001",
    systemPrompt: `你是一位资深的生产管理专家。你的职责是：
1. 优化生产排产和资源利用
2. 提供设备维护和故障预防建议
3. 指导工艺流程和质量控制
4. 分析生产效率和成本`,
    allowedRoles: ["production", "production_manager"],
    rateLimit: 100,
  },

  procurement_agent: {
    id: "procurement_agent",
    displayName: "Procurement Agent",
    chineseName: "采购数字助手",
    description: "为采购专员提供供应商评估、价格对比和交期跟踪",
    category: "role",
    priority: "P2",
    isEnabled: true,
    modelConfig: {
      model: "gpt-4",
      temperature: 0.6,
      maxTokens: 4096,
      topP: 0.9,
    },
    knowledgeBaseId: "kb_procurement_agent_001",
    systemPrompt: `你是一位资深的采购专家。你的职责是：
1. 评估和比较供应商
2. 分析和对比采购价格
3. 跟踪和预测交期
4. 优化采购成本和质量`,
    allowedRoles: ["procurement", "procurement_manager"],
    rateLimit: 100,
  },
};

// ============================================================================
// 助手配置集合
// ============================================================================

export const ALL_ASSISTANTS: AiAssistantConfig[] = [
  // 核心业务助手
  INTERVIEW_ASSISTANT,
  SOLUTION_ASSISTANT,
  QUOTATION_ASSISTANT,
  KPI_ASSISTANT,
  PURCHASE_ASSISTANT,
  // 计划助手
  PLANNING_ASSISTANT_1,
  PLANNING_ASSISTANT_2,
  PLANNING_ASSISTANT_3,
  PLANNING_ASSISTANT_4,
  // 角色数字助手
  ...Object.values(ROLE_AGENTS),
];

// ============================================================================
// 环境变量Schema
// ============================================================================

export const AiAssistantEnvSchema = z.object({
  // 通用LLM配置
  AI_ASSISTANT_LLM_KEY: z.string().describe("LLM API密钥"),
  AI_ASSISTANT_LLM_URL: z.string().url().describe("LLM API地址"),
  AI_ASSISTANT_LLM_MODEL: z.string().default("gpt-4").describe("默认LLM模型"),

  // 向量数据库配置
  AI_ASSISTANT_VECTOR_DB: z.string().optional().describe("向量数据库地址"),
  AI_ASSISTANT_VECTOR_DB_KEY: z.string().optional().describe("向量数据库密钥"),

  // 助手开关
  AI_INTERVIEW_ENABLED: z.string().default("true").describe("面试助手开关"),
  AI_SOLUTION_ENABLED: z.string().default("true").describe("方案助手开关"),
  AI_QUOTATION_ENABLED: z.string().default("true").describe("报价助手开关"),
  AI_KPI_ENABLED: z.string().default("true").describe("绩效助手开关"),
  AI_PURCHASE_ENABLED: z.string().default("true").describe("采购助手开关"),
  AI_PLANNING_ENABLED: z.string().default("true").describe("计划助手开关"),
  AI_ROLE_AGENTS_ENABLED: z.string().default("true").describe("角色助手开关"),

  // 日志和监控
  AI_ASSISTANT_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  AI_ASSISTANT_ENABLE_AUDIT: z.string().default("true").describe("启用审计日志"),
});

export type AiAssistantEnv = z.infer<typeof AiAssistantEnvSchema>;

// ============================================================================
// 导出函数
// ============================================================================

export function getAssistantConfig(assistantId: string): AiAssistantConfig | undefined {
  return ALL_ASSISTANTS.find((a) => a.id === assistantId);
}

export function getAssistantsByCategory(category: "business" | "role" | "planning"): AiAssistantConfig[] {
  return ALL_ASSISTANTS.filter((a) => a.category === category);
}

export function getAssistantsByRole(role: string): AiAssistantConfig[] {
  return ALL_ASSISTANTS.filter((a) => a.allowedRoles.includes(role));
}

export function isAssistantEnabled(assistantId: string, env: Partial<AiAssistantEnv>): boolean {
  const config = getAssistantConfig(assistantId);
  if (!config) return false;

  const enabledKey = `AI_${assistantId.toUpperCase()}_ENABLED`;
  const envValue = env[enabledKey as keyof AiAssistantEnv];

  if (envValue !== undefined) {
    return String(envValue) === "true";
  }

  return config.isEnabled;
}
