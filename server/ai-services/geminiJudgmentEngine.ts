/**
 * Gemini Judgment Engine
 * Safety checking, query routing, business evaluation, and AI judgment
 */

// Safety patterns for sensitive content detection
const SENSITIVE_PATTERNS = [
  { pattern: /价格|报价|单价|成本/g, type: "price_info", riskLevel: "critical" as const },
  { pattern: /API[_\-]?KEY|access[_\-]?token|secret/gi, type: "api_key", riskLevel: "critical" as const },
  { pattern: /配方|浓度\s*\d+%/g, type: "formula", riskLevel: "critical" as const },
  { pattern: /密码|password/gi, type: "credential", riskLevel: "critical" as const },
];

// Query routing keyword patterns
const CODE_KEYWORDS = ["代码", "code", "编程", "debug", "bug", "修复", "实现", "排序", "算法"];
const ANALYSIS_KEYWORDS = ["分析", "评估", "风险", "趋势", "预测"];
const DOMAIN_KEYWORDS = ["清洗", "超声波", "喷淋", "设备参数", "工艺"];
const SENSITIVE_QUERY_KEYWORDS = ["报价", "价格", "成本", "薪资", "薪酬"];

interface SafetyCheckInput {
  content: string;
  contentType: "user_input" | "ai_response";
}

interface SafetyCheckResult {
  safe: boolean;
  violations: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  sanitizedContent?: string;
}

interface RouteQueryInput {
  query: string;
  userRole: string;
}

interface RouteQueryResult {
  route: "claude" | "gemini" | "internal_llm" | "specialized";
  requiredCapabilities: string[];
  reason: string;
}

interface JudgeInput {
  context: string;
  question: string;
}

interface JudgeResult {
  decision: string;
  confidence: number;
  reasoning: string;
}

interface BusinessLogicInput {
  type: "lead_scoring" | "risk_evaluation" | string;
  data: Record<string, any>;
}

interface BusinessLogicResult {
  score: number;
  recommendation: string;
  action: "approve" | "reject" | "review" | "escalate";
}

interface RecommendationInput {
  userId: string;
  context: string;
  currentState: Record<string, any>;
}

interface RecommendationResult {
  recommendations: string[];
  reasoning: string;
}

interface RiskAssessmentInput {
  type: string;
  factors: Record<string, any>;
}

interface RiskAssessmentResult {
  overallRisk: "low" | "medium" | "high" | "critical";
  riskScore: number;
  riskFactors: string[];
  recommendations: string[];
}

export async function checkSafety(input: SafetyCheckInput): Promise<SafetyCheckResult> {
  const violations: string[] = [];
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  let sanitizedContent = input.content;

  for (const rule of SENSITIVE_PATTERNS) {
    if (rule.pattern.test(input.content)) {
      // Reset lastIndex since we're reusing regex with g flag
      rule.pattern.lastIndex = 0;
      violations.push(`${rule.type}: 检测到敏感信息 (${rule.type === "api_key" ? "API密钥" : rule.type})`);
      if (rule.riskLevel === "critical") {
        riskLevel = "critical";
      }
      sanitizedContent = sanitizedContent.replace(rule.pattern, "[已脱敏]");
      rule.pattern.lastIndex = 0;
    }
  }

  return {
    safe: violations.length === 0,
    violations,
    riskLevel,
    sanitizedContent,
  };
}

export async function routeQuery(input: RouteQueryInput): Promise<RouteQueryResult> {
  const query = input.query.toLowerCase();

  // Check for sensitive queries first -> internal_llm
  if (SENSITIVE_QUERY_KEYWORDS.some((kw) => input.query.includes(kw))) {
    return {
      route: "internal_llm",
      requiredCapabilities: ["sensitive_data"],
      reason: "查询包含敏感商业信息，路由到内部LLM处理",
    };
  }

  // Check for code-related queries -> claude
  if (CODE_KEYWORDS.some((kw) => query.includes(kw))) {
    const capabilities: string[] = [];
    if (query.includes("bug") || query.includes("修复") || query.includes("debug")) {
      capabilities.push("debugging");
    }
    if (query.includes("代码") || query.includes("code") || query.includes("实现") || query.includes("排序")) {
      capabilities.push("code_generation");
    }
    if (capabilities.length === 0) capabilities.push("code_generation");
    return {
      route: "claude",
      requiredCapabilities: capabilities,
      reason: "代码相关查询，路由到Claude处理",
    };
  }

  // Check for domain-specific queries -> specialized
  if (DOMAIN_KEYWORDS.some((kw) => input.query.includes(kw))) {
    return {
      route: "specialized",
      requiredCapabilities: ["domain_knowledge"],
      reason: "工业清洗设备领域专用查询",
    };
  }

  // Check for analysis queries -> gemini
  if (ANALYSIS_KEYWORDS.some((kw) => input.query.includes(kw))) {
    return {
      route: "gemini",
      requiredCapabilities: ["analysis"],
      reason: "分析评估类查询，路由到Gemini处理",
    };
  }

  // Default -> internal_llm
  return {
    route: "internal_llm",
    requiredCapabilities: ["general_qa"],
    reason: "通用查询，路由到内部LLM处理",
  };
}

export class GeminiJudgmentEngine {
  async judge(input: JudgeInput): Promise<JudgeResult> {
    return {
      decision: "review_needed",
      confidence: 0.75,
      reasoning: `基于上下文"${input.context}"和问题"${input.question}"，建议进一步审查`,
    };
  }

  async evaluateBusinessLogic(input: BusinessLogicInput): Promise<BusinessLogicResult> {
    let score = 50;
    let action: "approve" | "reject" | "review" | "escalate" = "review";

    if (input.type === "lead_scoring") {
      const { budget, authority, need, timeline } = input.data;
      score = 0;
      if (budget >= 100000) score += 30;
      else if (budget >= 50000) score += 20;
      else score += 10;

      if (authority) score += 25;
      if (need === "high") score += 25;
      else if (need === "medium") score += 15;

      if (timeline === "3months") score += 20;
      else if (timeline === "6months") score += 10;

      if (score >= 80) action = "approve";
      else if (score >= 60) action = "review";
      else if (score >= 40) action = "escalate";
      else action = "reject";
    } else if (input.type === "risk_evaluation") {
      const { projectSize, complexity, timeline } = input.data;
      score = 30;
      if (projectSize === "large") score += 20;
      if (complexity === "high") score += 25;
      if (timeline === "tight") score += 15;

      if (score >= 80) action = "escalate";
      else if (score >= 60) action = "review";
      else action = "approve";
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      recommendation: `风险评分${score}分，建议${action === "approve" ? "批准" : action === "review" ? "审查" : action === "escalate" ? "上报" : "拒绝"}`,
      action,
    };
  }

  async getRecommendations(input: RecommendationInput): Promise<RecommendationResult> {
    const recommendations: string[] = [];

    if (input.context === "solution") {
      if (input.currentState.cleanliness === "high") {
        recommendations.push("推荐使用多级超声波清洗工艺");
        recommendations.push("建议配置在线清洁度检测系统");
      }
      recommendations.push("建议进行清洗工艺可行性试验");
    }

    return {
      recommendations,
      reasoning: `基于${input.context}场景和当前状态分析，提供以下建议`,
    };
  }

  async assessRisk(input: RiskAssessmentInput): Promise<RiskAssessmentResult> {
    const riskFactors: string[] = [];
    let riskScore = 0;

    if (input.factors.budget > 300000) {
      riskFactors.push("高预算项目");
      riskScore += 25;
    }
    if (input.factors.complexity === "high") {
      riskFactors.push("高复杂度");
      riskScore += 30;
    }
    if (input.factors.timeline === "6months" || input.factors.timeline === "tight") {
      riskFactors.push("时间紧迫");
      riskScore += 20;
    }

    let overallRisk: "low" | "medium" | "high" | "critical";
    if (riskScore >= 75) overallRisk = "critical";
    else if (riskScore >= 50) overallRisk = "high";
    else if (riskScore >= 25) overallRisk = "medium";
    else overallRisk = "low";

    return {
      overallRisk,
      riskScore,
      riskFactors,
      recommendations: [
        "建立风险监控机制",
        "制定应急预案",
        "加强项目里程碑管理",
      ],
    };
  }
}
