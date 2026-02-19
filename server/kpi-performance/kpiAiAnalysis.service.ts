/**
 * KPI AI Analysis Service
 * Fetches performance reviews + skill matrices, sends to LLM for structured analysis.
 * Returns: training recommendations, risk alerts, patterns, summary.
 */

import { invokeLLM } from "../_core/llm";
import { requireDb } from "../db";
import {
  hrmMonthlyPerformanceReviews,
  hrmUserSkillMatrix,
  hrmKpiLibrary,
  hrmPositionKpiTargets,
  hrmKpiPositions,
} from "../../drizzle/kpi-performance-schema";
import { eq, and, sql } from "drizzle-orm";

// ── Result types ──

export type KpiAnalysisResult = {
  summary: string;
  trainingRecommendations: {
    title: string;
    reason: string;
    targetAudience: string;
    priority: "high" | "medium" | "low";
    affectedUserIds: number[];
  }[];
  riskAlerts: {
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    affectedUserIds: number[];
    suggestedAction: string;
  }[];
  patterns: {
    pattern: string;
    frequency: number;
    impact: string;
  }[];
};

// ── JSON schema for structured LLM output ──

const KPI_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "Overall department health summary (2-3 sentences)" },
    trainingRecommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
          targetAudience: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          affectedUserIds: { type: "array", items: { type: "number" } },
        },
        required: ["title", "reason", "targetAudience", "priority", "affectedUserIds"],
        additionalProperties: false,
      },
    },
    riskAlerts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
          description: { type: "string" },
          affectedUserIds: { type: "array", items: { type: "number" } },
          suggestedAction: { type: "string" },
        },
        required: ["type", "severity", "description", "affectedUserIds", "suggestedAction"],
        additionalProperties: false,
      },
    },
    patterns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          frequency: { type: "number" },
          impact: { type: "string" },
        },
        required: ["pattern", "frequency", "impact"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "trainingRecommendations", "riskAlerts", "patterns"],
  additionalProperties: false,
};

// ── Main analysis function ──

export async function analyzeKpiPerformance(params: {
  buCode?: string;
  department?: string;
  monthDate?: string;
}): Promise<KpiAnalysisResult> {
  const db = await requireDb();
  const { buCode, department, monthDate } = params;

  // 1. Fetch monthly reviews (with optional filters via position's buCode)
  const reviewConditions: any[] = [];
  if (monthDate) reviewConditions.push(eq(hrmMonthlyPerformanceReviews.monthDate, monthDate));

  const reviewWhere = reviewConditions.length > 0 ? and(...reviewConditions) : undefined;
  const reviews = await db
    .select()
    .from(hrmMonthlyPerformanceReviews)
    .where(reviewWhere)
    .limit(100);

  if (reviews.length === 0) {
    return {
      summary: "暂无绩效评审数据可供分析。请先确保已有月度评审记录。",
      trainingRecommendations: [],
      riskAlerts: [],
      patterns: [],
    };
  }

  // Collect unique userIds and positionIds from reviews
  const userIds = [...new Set(reviews.map((r) => r.userId))];
  const positionIds = [...new Set(reviews.filter((r) => r.positionId).map((r) => r.positionId!))];

  // 2. Fetch positions for BU/department filtering
  let positions: any[] = [];
  if (positionIds.length > 0) {
    positions = await db
      .select()
      .from(hrmKpiPositions)
      .where(
        sql`${hrmKpiPositions.id} IN (${sql.join(
          positionIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
  }

  // Apply BU/department filter based on positions
  let filteredReviews = reviews;
  if (buCode || department) {
    const matchingPositionIds = new Set(
      positions
        .filter((p: any) => {
          if (buCode && p.buCode !== buCode) return false;
          if (department && p.department !== department) return false;
          return true;
        })
        .map((p: any) => p.id)
    );

    filteredReviews = reviews.filter(
      (r) => !r.positionId || matchingPositionIds.has(r.positionId)
    );

    if (filteredReviews.length === 0) {
      return {
        summary: "所选筛选条件下暂无匹配的评审数据。",
        trainingRecommendations: [],
        riskAlerts: [],
        patterns: [],
      };
    }
  }

  const filteredUserIds = [...new Set(filteredReviews.map((r) => r.userId))];

  // 3. Fetch skill matrix for these users
  let skills: any[] = [];
  if (filteredUserIds.length > 0) {
    skills = await db
      .select()
      .from(hrmUserSkillMatrix)
      .where(
        sql`${hrmUserSkillMatrix.userId} IN (${sql.join(
          filteredUserIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
  }

  // 4. Fetch KPI library to resolve KPI names
  const kpiLibrary = await db.select().from(hrmKpiLibrary).limit(200);
  const kpiMap = new Map(kpiLibrary.map((k) => [k.id, k]));

  // 5. Fetch position KPI targets for context
  let targets: any[] = [];
  if (positionIds.length > 0) {
    targets = await db
      .select()
      .from(hrmPositionKpiTargets)
      .where(
        sql`${hrmPositionKpiTargets.positionId} IN (${sql.join(
          positionIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
  }

  // 6. Build context string for LLM
  const positionMap = new Map(positions.map((p: any) => [p.id, p]));

  const contextParts: string[] = [];

  contextParts.push("=== MONTHLY PERFORMANCE REVIEWS ===");
  for (const review of filteredReviews) {
    const pos = review.positionId ? positionMap.get(review.positionId) : null;
    const posTitle = pos ? `${pos.title} (${pos.department})` : "Unknown Position";

    let kpiDetails = "";
    if (review.kpiDetailsJson) {
      const details = (typeof review.kpiDetailsJson === "string"
        ? JSON.parse(review.kpiDetailsJson)
        : review.kpiDetailsJson) as any[];
      kpiDetails = details
        .map((d: any) => {
          const kpi = d.kpiId ? kpiMap.get(d.kpiId) : null;
          const name = d.kpiName || kpi?.name || `KPI#${d.kpiId}`;
          return `  - ${name}: target=${d.target}, actual=${d.actual}, score=${d.score}, weight=${d.weight}`;
        })
        .join("\n");
    }

    contextParts.push(
      `\nUser #${review.userId} | Position: ${posTitle} | Month: ${review.monthDate}` +
      `\n  Overall KPI Score: ${review.overallKpiScore || "N/A"}` +
      `\n  Bonus Coefficient: ${review.bonusCoefficient || "N/A"}` +
      `\n  Gaps: ${review.gapsText || "None reported"}` +
      `\n  Improvement Plan: ${review.improvementPlanText || "None"}` +
      `\n  Reviewer Comments: ${review.reviewerComments || "None"}` +
      `\n  Status: ${review.status}` +
      (kpiDetails ? `\n  KPI Details:\n${kpiDetails}` : "")
    );
  }

  if (skills.length > 0) {
    contextParts.push("\n=== SKILL MATRIX ===");
    const skillsByUser = new Map<number, any[]>();
    for (const s of skills) {
      if (!skillsByUser.has(s.userId)) skillsByUser.set(s.userId, []);
      skillsByUser.get(s.userId)!.push(s);
    }
    for (const [userId, userSkills] of skillsByUser) {
      contextParts.push(`\nUser #${userId} Skills:`);
      for (const s of userSkills) {
        const gap = s.targetLevel - s.currentLevel;
        contextParts.push(
          `  - ${s.skillName} [${s.skillCategory || "general"}]: current=${s.currentLevel}/5, target=${s.targetLevel}/5, gap=${gap}${s.notes ? ` (${s.notes})` : ""}`
        );
      }
    }
  }

  if (targets.length > 0) {
    contextParts.push("\n=== POSITION KPI TARGETS ===");
    for (const t of targets) {
      const kpi = kpiMap.get(t.kpiId);
      const pos = positionMap.get(t.positionId);
      contextParts.push(
        `  Position: ${pos?.title || `#${t.positionId}`} | KPI: ${kpi?.name || `#${t.kpiId}`} | Target: ${t.targetValue} | Challenge: ${t.challengeValue || "N/A"} | Min: ${t.minimumValue || "N/A"} | Weight: ${t.weight}`
      );
    }
  }

  const contextString = contextParts.join("\n");

  // 7. Call LLM with structured output
  const systemPrompt = `You are an HR analytics expert for GRT (高仕达), an industrial cleaning equipment manufacturer.
Your task is to analyze KPI performance review data and skill gap information, then produce structured analysis.

Business rules:
- If multiple employees miss DSO/Collection/回款-related KPIs, recommend "Financial Management for Sales" training.
- If Succession Plan / 核心人才保留 KPI is failed, flag a risk alert with severity "high".
- Cross-reference gaps_text with skill_matrix where currentLevel < targetLevel to identify systemic skill deficits.
- If overall KPI score < 85, flag performance concern.
- If bonusCoefficient < 1.0, the employee is underperforming.
- Group similar gaps across employees into patterns.

Output language: Chinese (Simplified) for all text fields.
Analyze the data and return structured JSON.`;

  const userPrompt = `请分析以下KPI绩效数据，返回培训建议、风险预警、规律发现和总结。

筛选条件: ${buCode ? `BU=${buCode}` : "全部BU"}, ${department ? `部门=${department}` : "全部部门"}, ${monthDate ? `月份=${monthDate}` : "全部月份"}

数据:
${contextString}`;

  const response = await invokeLLM({
    system: systemPrompt,
    prompt: userPrompt,
    schema: KPI_ANALYSIS_SCHEMA,
  });

  // 8. Parse and return
  const content = response.content || response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty response");
  }

  const parsed: KpiAnalysisResult = JSON.parse(content);
  return parsed;
}
