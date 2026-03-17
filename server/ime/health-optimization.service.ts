/**
 * G-IME: Health Score, Optimization, Digest, ROI & Prediction
 * 会议健康度、优化建议、摘要、ROI、预测服务
 */

import { requireDb } from "../db";
import { sql, type SQL } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ime:health");

// ── Row types for raw SQL query results ──────────────────────────────────
interface DbRow extends Record<string, unknown> {}

interface AvgRow extends DbRow { avg_effectiveness?: string | number; avg_cost?: string | number; max_cost?: string | number; avg_sentiment?: string | number; avg_balance?: string | number; avg_eff?: string | number; avg_sent?: string | number; }
interface CountRow extends DbRow { total?: string | number; completed?: string | number; resolved?: string | number; cnt?: string | number; }
interface HealthRow extends DbRow { health_score?: string | number; grade?: string; dimensions?: string; recommendations?: string; computed_at?: string; scope_id?: string; }
interface DigestRow extends DbRow { id?: string; digest_type?: string; scope?: string; scope_id?: string; period?: string; summary?: string; highlights?: string; alerts?: string; metrics?: string; generated_at?: string; }
interface AlertRow { alertType: string; message: string; severity: string; }
interface HighlightItem { type: string; title: string; description: string; severity: string; }
interface Recommendation { type: string; priority: string; title: string; description: string; expectedImpact: string; }
interface PatternRow extends DbRow { pattern_type?: string; pattern_data?: string; ai_insight?: string; }
interface PatternMapped { type: unknown; insight: unknown; }
interface ActionStatsRow extends DbRow { new_items?: string | number; completed?: string | number; stale_count?: string | number; }
interface TopicStatsRow extends DbRow { introduced?: string | number; decided?: string | number; stalled?: string | number; }
interface MeetingRow extends DbRow { id?: string; title?: string; objective?: string; summary?: string; channel_id?: string; }
interface CostRow extends DbRow { total_cost?: string | number; participant_count?: string | number; duration_minutes?: string | number; total?: string | number; avg_cost?: string | number; }
interface BlockRow extends DbRow { block_type?: string; cnt?: string | number; }
interface MeetingCostHighRow extends DbRow { meeting_id?: string; title?: string; total_cost?: string | number; }
interface TensionRow extends DbRow { meeting_id?: string; title?: string; tension_level?: string | number; }
interface RoiStatsRow extends DbRow { total_analyzed?: string | number; avg_score?: string | number; avg_cost_per_decision?: string | number; total_cost?: string | number; }
interface GradeRow extends DbRow { grade?: string; cnt?: string | number; }
interface ContributionRow extends DbRow { employee_id?: string; employee_name?: string; contribution_score?: string | number; intervention_count?: string | number; decision_count?: string | number; avg_score?: string | number; score_variance?: string | number; meeting_count?: string | number; avg_interventions?: string | number; avg_engagement?: string | number; }
interface OptStatsRow extends DbRow { total_optimized?: string | number; avg_saving?: string | number; avg_size_gap?: string | number; }
interface OverInvitedRow extends DbRow { over_invited_participants?: string; }
interface TopicContinuityRow extends DbRow { topic_name?: string; meeting_appearances?: string; }
interface ContribSuggestionRow extends DbRow { employee_id?: string; employee_name?: string; avg_score?: string | number; topic_meeting_count?: string | number; total_decisions?: string | number; }
interface EngagementRow extends DbRow { meeting_id?: string; engagement_level?: string; engagement_score?: string | number; meeting_date?: { toISOString?: () => string }; channel_id?: string; }
interface EffectivenessRow extends DbRow { overall_score?: string | number; }
interface PredTypeStatsRow extends DbRow { prediction_type?: string; cnt?: string | number; avg_predicted?: string | number; avg_confidence?: string | number; }
interface AccuracyRow extends DbRow { total?: string | number; avg_accuracy?: string | number; avg_error?: string | number; }
interface RiskFactorRow extends DbRow { risk_factors?: string; }
interface RiskFactor { factor: string; weight: number; description: string; }
interface PredRecommendation { action: string; priority: string; expectedImpact: string; }
interface TrendForecastItem { period: string; predictedScore: number; confidence: number; }
interface RoiOutcome { type: string; description: string; value: string; }
interface OverInvitedPerson { employeeId: string; name: string; avgScore: number; costWaste: number; reason: string; }
interface EnrichedParticipant { employeeId: unknown; name: unknown; avgScore: number; avgEngagement: number; meetingCount: number; currentScore: number; }
interface CompositionAdvice { roleGap: string; recommendation: string; }
interface BatchRoiResult { meetingId: string; success: boolean; error?: string; [key: string]: unknown; }

// ============================================================================
// Phase 4 — Feature 2: Meeting Health Score & Optimization
// ============================================================================

/** Convert named period to safe INTERVAL value (prevents SQL injection) */
function safePeriodInterval(period?: string): string {
  if (!period) return "30 days";
  const map: Record<string, string> = {
    "weekly": "7 days", "monthly": "30 days", "quarterly": "90 days", "yearly": "365 days",
    "7 days": "7 days", "30 days": "30 days", "90 days": "90 days", "365 days": "365 days",
    "14 days": "14 days", "60 days": "60 days", "180 days": "180 days",
  };
  return map[period] || "30 days";
}

export async function computeMeetingHealth(scope: string, scopeId?: string, period?: string) {
  const db = await requireDb();

  const safeInterval = safePeriodInterval(period);
  const dateCondition = period ? sql`AND mr.meeting_date >= NOW() - INTERVAL ${sql.raw(`'${safeInterval}'`)}` : sql``;
  const scopeCondition = scope === "meeting" && scopeId
    ? sql`AND mr.id = ${scopeId}`
    : scope === "department" && scopeId
    ? sql`AND mr.channel_id = ${scopeId}`
    : sql``;

  // 1. Effectiveness scores
  const effResult = await db.execute(sql`
    SELECT AVG(mes.overall_score) as avg_effectiveness
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE 1=1 ${scopeCondition} ${dateCondition}
  `);
  const avgEffectiveness = Number((effResult.rows as AvgRow[])[0]?.avg_effectiveness) || 0;

  // 2. Cost data
  const costResult = await db.execute(sql`
    SELECT AVG(mc.total_cost) as avg_cost, MAX(mc.total_cost) as max_cost
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE 1=1 ${scopeCondition} ${dateCondition}
  `);
  const avgCost = Number((costResult.rows as AvgRow[])[0]?.avg_cost) || 0;
  const maxCost = Number((costResult.rows as AvgRow[])[0]?.max_cost) || 1;

  // 3. Sentiment data
  const sentResult = await db.execute(sql`
    SELECT AVG(ms.sentiment_score) as avg_sentiment
    FROM ime_meeting_sentiment ms
    JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE 1=1 ${scopeCondition} ${dateCondition}
  `);
  const avgSentiment = Number((sentResult.rows as AvgRow[])[0]?.avg_sentiment) || 0;

  // 4. Action item completion rate
  const actionResult = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM ime_action_items
  `);
  const actionTotal = Number((actionResult.rows as CountRow[])[0]?.total) || 1;
  const actionCompleted = Number((actionResult.rows as CountRow[])[0]?.completed) || 0;

  // 5. Topic resolution rate
  const topicResult = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('decided', 'closed') THEN 1 ELSE 0 END) as resolved
    FROM ime_topic_continuity
  `);
  const topicTotal = Number((topicResult.rows as CountRow[])[0]?.total) || 1;
  const topicResolved = Number((topicResult.rows as CountRow[])[0]?.resolved) || 0;

  // 6. Participation balance
  const partResult = await db.execute(sql`
    SELECT AVG(mes.participation_balance) as avg_balance
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE 1=1 ${scopeCondition} ${dateCondition}
  `);
  const avgBalance = Number((partResult.rows as AvgRow[])[0]?.avg_balance) || 0;

  // Compute 6 dimension scores (0-100)
  const dimensions = {
    effectiveness: Math.min(100, avgEffectiveness),
    costEfficiency: Math.min(100, Math.max(0, 100 - (avgCost / Math.max(maxCost, 1)) * 100)),
    sentiment: Math.min(100, Math.max(0, (avgSentiment + 1) * 50)),
    actionCompletion: Math.min(100, (actionCompleted / actionTotal) * 100),
    topicResolution: Math.min(100, (topicResolved / topicTotal) * 100),
    participationBalance: Math.min(100, avgBalance),
  };

  // Weighted average
  const healthScore = Math.round(
    dimensions.effectiveness * 0.25 +
    dimensions.costEfficiency * 0.15 +
    dimensions.sentiment * 0.20 +
    dimensions.actionCompletion * 0.15 +
    dimensions.topicResolution * 0.10 +
    dimensions.participationBalance * 0.15
  );

  const grade = healthScore >= 85 ? "A" : healthScore >= 70 ? "B" : healthScore >= 55 ? "C" : healthScore >= 40 ? "D" : "F";

  // LLM recommendations
  let recommendations: Recommendation[] = [];
  try {
    const weakDims = Object.entries(dimensions)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${Math.round(v)}/100`);

    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个会议优化顾问。根据会议健康度分析，给出3-5条可操作的改进建议。请用中文回答。Return JSON only.",
        },
        {
          role: "user",
          content: `会议健康度: ${healthScore}/100 (${grade})\n维度得分: ${JSON.stringify(dimensions)}\n最弱维度: ${weakDims.join(", ")}\n\n请给出3-5条优先级排序的改进建议:\n- type: reduce_frequency/shorten_duration/change_participants/improve_agenda/address_conflict/follow_up_actions/escalate_topics\n- priority: high/medium/low\n- title: 简短标题\n- description: 具体建议\n- expectedImpact: 预期效果`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "health_recommendations",
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    priority: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    expectedImpact: { type: "string" },
                  },
                  required: ["type", "priority", "title", "description", "expectedImpact"],
                  additionalProperties: false,
                },
              },
            },
            required: ["recommendations"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });
    recommendations = JSON.parse(llmResult.content || "{}").recommendations;
  } catch {
    recommendations = [
      { type: "improve_agenda", priority: "medium", title: "优化会议议程", description: "确保每次会议有明确目标和议程", expectedImpact: "提升效能5-10分" },
    ];
  }

  // Delete+insert
  const scopeIdVal = scopeId || scope;
  await db.execute(sql`
    DELETE FROM ime_meeting_health WHERE scope = ${scope} AND scope_id = ${scopeIdVal}
  `);
  await db.execute(sql`
    INSERT INTO ime_meeting_health (
      scope, scope_id, period, health_score, dimensions, grade,
      recommendations, computed_at
    ) VALUES (
      ${scope}, ${scopeIdVal}, ${period || "all"},
      ${healthScore}, ${JSON.stringify(dimensions)}, ${grade},
      ${JSON.stringify(recommendations)}, NOW()
    )
  `);

  return { scope, scopeId: scopeIdVal, period, healthScore, grade, dimensions, recommendations };
}

export async function getHealthDashboard(filters: { scope?: string; period?: string }) {
  const db = await requireDb();

  const conditions: SQL[] = [sql`1=1`];
  if (filters.scope) conditions.push(sql`scope = ${filters.scope}`);
  const where = sql.join(conditions, sql` AND `);

  // Current health records
  const currentResult = await db.execute(sql`
    SELECT * FROM ime_meeting_health
    WHERE ${where}
    ORDER BY computed_at DESC
    LIMIT 1
  `);
  const current = (currentResult.rows as HealthRow[])[0];

  // Health trend (last 6 records)
  const trendResult = await db.execute(sql`
    SELECT health_score, grade, dimensions, computed_at
    FROM ime_meeting_health
    WHERE ${where}
    ORDER BY computed_at DESC
    LIMIT 6
  `);

  // Department comparison (all scopes)
  const deptResult = await db.execute(sql`
    SELECT DISTINCT ON (scope_id) scope_id, health_score, grade, dimensions, computed_at
    FROM ime_meeting_health
    WHERE scope = 'department'
    ORDER BY scope_id, computed_at DESC
  `);

  return {
    current: current ? {
      healthScore: Number(current.health_score),
      grade: current.grade,
      dimensions: JSON.parse(current.dimensions || "{}"),
      recommendations: JSON.parse(current.recommendations || "[]"),
      computedAt: current.computed_at,
    } : null,
    trend: (trendResult.rows as HealthRow[]).reverse().map((r: HealthRow) => ({
      healthScore: Number(r.health_score),
      grade: r.grade,
      dimensions: JSON.parse(String(r.dimensions || "{}")),
      computedAt: r.computed_at,
    })),
    departmentComparison: (deptResult.rows as HealthRow[]).map((r: HealthRow) => ({
      department: r.scope_id,
      healthScore: Number(r.health_score),
      grade: r.grade,
    })),
  };
}

export async function getOptimizationRecommendations(scope: string, scopeId?: string) {
  const db = await requireDb();

  // Get latest health
  const scopeIdVal = scopeId || scope;
  const healthResult = await db.execute(sql`
    SELECT * FROM ime_meeting_health
    WHERE scope = ${scope} AND scope_id = ${scopeIdVal}
    ORDER BY computed_at DESC LIMIT 1
  `);
  const health = (healthResult.rows as HealthRow[])[0];

  // Get patterns
  const patternsResult = await db.execute(sql`
    SELECT pattern_type, pattern_data, ai_insight FROM ime_meeting_patterns
    ORDER BY created_at DESC LIMIT 10
  `);

  // Get stale action items count
  const staleResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM ime_action_items WHERE status = 'stale'
  `);
  const staleCount = Number((staleResult.rows as CountRow[])[0]?.cnt) || 0;

  // Get stalled topics count
  const stalledResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM ime_topic_continuity WHERE status = 'stalled'
  `);
  const stalledCount = Number((stalledResult.rows as CountRow[])[0]?.cnt) || 0;

  // Get high tension meetings count
  const tensionResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM ime_meeting_sentiment WHERE tension_level >= 7
  `);
  const highTensionCount = Number((tensionResult.rows as CountRow[])[0]?.cnt) || 0;

  const healthDims = health ? JSON.parse(String(health.dimensions || "{}")) : {};
  const patterns: PatternMapped[] = (patternsResult.rows as PatternRow[]).map((p: PatternRow) => ({
    type: p.pattern_type,
    insight: p.ai_insight,
  }));

  let recommendations: Recommendation[] = [];
  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个组织效能优化顾问。综合分析会议数据，给出5-7条可操作的优化建议。请用中文回答。Return JSON only.",
        },
        {
          role: "user",
          content: `健康度: ${health ? Number(health.health_score) : "N/A"}/100\n维度: ${JSON.stringify(healthDims)}\n逾期行动项: ${staleCount}\n停滞议题: ${stalledCount}\n高紧张度会议: ${highTensionCount}\n会议模式: ${JSON.stringify(patterns)}\n\n请给出5-7条优化建议:\n- type: reduce_frequency/shorten_duration/change_participants/improve_agenda/address_conflict/follow_up_actions/escalate_topics\n- priority: high/medium/low\n- title, description, expectedImpact (中文)`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "optimization_recommendations",
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    priority: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    expectedImpact: { type: "string" },
                  },
                  required: ["type", "priority", "title", "description", "expectedImpact"],
                  additionalProperties: false,
                },
              },
            },
            required: ["recommendations"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });
    recommendations = JSON.parse(llmResult.content || "{}").recommendations;
  } catch {
    recommendations = [
      { type: "follow_up_actions", priority: "high", title: "跟进逾期行动项", description: `当前有${staleCount}个逾期行动项需要跟进`, expectedImpact: "提升行动完成率" },
      { type: "escalate_topics", priority: "medium", title: "推进停滞议题", description: `当前有${stalledCount}个停滞议题需要升级处理`, expectedImpact: "提升议题解决率" },
    ];
  }

  return {
    scope,
    scopeId: scopeIdVal,
    healthScore: health ? Number(health.health_score) : null,
    grade: health?.grade || null,
    staleActionItems: staleCount,
    stalledTopics: stalledCount,
    highTensionMeetings: highTensionCount,
    recommendations,
  };
}

// ============================================================================
// Phase 4 — Feature 3: Digest & Alert System
// ============================================================================

export async function generateDigest(digestType: string, scope: string, scopeId?: string, period?: string) {
  const db = await requireDb();

  // Determine date range (sanitized via allowlist)
  const days = digestType === "weekly" ? 7 : digestType === "monthly" ? 30 : 7;
  const dateRange = safePeriodInterval(period || `${days} days`);

  // Aggregate metrics
  const meetingResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM meeting_records WHERE meeting_date >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)}
  `);
  const meetingCount = Number((meetingResult.rows as CountRow[])[0]?.cnt) || 0;

  const costResult = await db.execute(sql`
    SELECT SUM(total_cost) as total, AVG(total_cost) as avg_cost
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)}
  `);
  const totalCost = Number((costResult.rows as CostRow[])[0]?.total) || 0;

  const effResult = await db.execute(sql`
    SELECT AVG(overall_score) as avg_eff
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)}
  `);
  const avgEffectiveness = Number((effResult.rows as AvgRow[])[0]?.avg_eff) || 0;

  const sentResult = await db.execute(sql`
    SELECT AVG(sentiment_score) as avg_sent
    FROM ime_meeting_sentiment ms
    JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)}
  `);
  const avgSentiment = Number((sentResult.rows as AvgRow[])[0]?.avg_sent) || 0;

  // Action items
  const actionResult = await db.execute(sql`
    SELECT
      SUM(CASE WHEN created_at >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)} THEN 1 ELSE 0 END) as new_items,
      SUM(CASE WHEN status = 'completed' AND updated_at >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)} THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'stale' THEN 1 ELSE 0 END) as stale_count
    FROM ime_action_items
  `);
  const actionStats = (actionResult.rows as ActionStatsRow[])[0] || {} as ActionStatsRow;

  // Topics
  const topicResult = await db.execute(sql`
    SELECT
      SUM(CASE WHEN first_seen_date >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)} THEN 1 ELSE 0 END) as introduced,
      SUM(CASE WHEN status IN ('decided', 'closed') AND resolved_date >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)} THEN 1 ELSE 0 END) as decided,
      SUM(CASE WHEN status = 'stalled' THEN 1 ELSE 0 END) as stalled
    FROM ime_topic_continuity
  `);
  const topicStats = (topicResult.rows as TopicStatsRow[])[0] || {} as TopicStatsRow;

  // HR signals
  const hrResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM ime_hr_signals WHERE created_at >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)}
  `);
  const hrSignalCount = Number((hrResult.rows as CountRow[])[0]?.cnt) || 0;

  // Patterns
  const patternResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM ime_meeting_patterns WHERE created_at >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)}
  `);
  const patternCount = Number((patternResult.rows as CountRow[])[0]?.cnt) || 0;

  // Highlights
  const highlights: HighlightItem[] = [];

  // Most expensive meeting
  const expensiveResult = await db.execute(sql`
    SELECT mc.meeting_id, mr.title, mc.total_cost
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)}
    ORDER BY mc.total_cost DESC LIMIT 1
  `);
  if ((expensiveResult.rows as MeetingCostHighRow[])[0]) {
    const m = (expensiveResult.rows as MeetingCostHighRow[])[0];
    highlights.push({ type: "cost", title: "最高成本会议", description: `${m.title}: ¥${Number(m.total_cost).toFixed(0)}`, severity: "info" });
  }

  // Highest tension
  const tensionHighResult = await db.execute(sql`
    SELECT ms.meeting_id, mr.title, ms.tension_level
    FROM ime_meeting_sentiment ms
    JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)}
    ORDER BY ms.tension_level DESC LIMIT 1
  `);
  if ((tensionHighResult.rows as TensionRow[])[0]) {
    const m = (tensionHighResult.rows as TensionRow[])[0];
    highlights.push({ type: "tension", title: "最高紧张度会议", description: `${m.title}: 紧张度${Number(m.tension_level).toFixed(1)}/10`, severity: Number(m.tension_level) >= 7 ? "warning" : "info" });
  }

  // Stale action items highlight
  const staleCount = Number(actionStats.stale_count) || 0;
  if (staleCount > 0) {
    highlights.push({ type: "action_stale", title: "逾期行动项", description: `${staleCount}个行动项已逾期`, severity: staleCount >= 5 ? "critical" : "warning" });
  }

  // Stalled topics
  const stalledCount = Number(topicStats.stalled) || 0;
  if (stalledCount > 0) {
    highlights.push({ type: "topic_stalled", title: "停滞议题", description: `${stalledCount}个议题处于停滞状态`, severity: stalledCount >= 5 ? "critical" : "warning" });
  }

  // HR signals
  if (hrSignalCount > 0) {
    highlights.push({ type: "hr_signal", title: "HR信号", description: `本期检测到${hrSignalCount}个HR信号`, severity: "info" });
  }

  // Generate alerts
  const alerts: AlertRow[] = [];

  // Health grade check
  const healthResult = await db.execute(sql`
    SELECT health_score, grade FROM ime_meeting_health ORDER BY computed_at DESC LIMIT 1
  `);
  const latestHealth = (healthResult.rows as HealthRow[])[0];
  if (latestHealth && (latestHealth.grade === "D" || latestHealth.grade === "F")) {
    alerts.push({ alertType: "low_health", message: `会议健康度为${latestHealth.grade}级 (${Number(latestHealth.health_score).toFixed(0)}分)，需要关注`, severity: "critical" });
  }

  if (staleCount >= 5) {
    alerts.push({ alertType: "stale_actions", message: `${staleCount}个行动项已逾期5次以上出现`, severity: "critical" });
  } else if (staleCount >= 3) {
    alerts.push({ alertType: "stale_actions", message: `${staleCount}个行动项已逾期`, severity: "warning" });
  }

  if (stalledCount >= 5) {
    alerts.push({ alertType: "stalled_topics", message: `${stalledCount}个议题停滞超过5次出现`, severity: "critical" });
  } else if (stalledCount >= 3) {
    alerts.push({ alertType: "stalled_topics", message: `${stalledCount}个议题处于停滞状态`, severity: "warning" });
  }

  if (patternCount > 0) {
    alerts.push({ alertType: "new_patterns", message: `本期检测到${patternCount}个新会议模式`, severity: "info" });
  }

  const metrics = {
    meetingCount,
    totalCost: Math.round(totalCost),
    avgEffectiveness: Math.round(avgEffectiveness),
    avgSentiment: Number(avgSentiment.toFixed(2)),
    newActionItems: Number(actionStats.new_items) || 0,
    completedActionItems: Number(actionStats.completed) || 0,
    staleActionItems: staleCount,
    topicsIntroduced: Number(topicStats.introduced) || 0,
    topicsDecided: Number(topicStats.decided) || 0,
    stalledTopics: stalledCount,
    hrSignals: hrSignalCount,
    patterns: patternCount,
  };

  // LLM narrative
  let narrativeSummary = "";
  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个会议运营分析师。根据数据生成3-5句中文摘要。Return JSON only.",
        },
        {
          role: "user",
          content: `报告类型: ${digestType}\n指标: ${JSON.stringify(metrics)}\n重点事项: ${JSON.stringify(highlights)}\n警报: ${JSON.stringify(alerts)}\n\n请生成简洁的中文摘要(3-5句)。`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "digest_narrative",
          schema: {
            type: "object",
            properties: { narrative: { type: "string" } },
            required: ["narrative"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });
    narrativeSummary = JSON.parse(llmResult.content || "{}").narrative;
  } catch {
    narrativeSummary = `本期共${meetingCount}次会议，平均效能${Math.round(avgEffectiveness)}分，总花费¥${Math.round(totalCost)}。${staleCount > 0 ? `有${staleCount}个逾期行动项需关注。` : ""}`;
  }

  // Insert
  await db.execute(sql`
    INSERT INTO ime_digest_alerts (
      digest_type, scope, scope_id, period, summary, highlights, alerts, metrics, generated_at
    ) VALUES (
      ${digestType}, ${scope}, ${scopeId || scope}, ${dateRange},
      ${JSON.stringify({ narrative: narrativeSummary })},
      ${JSON.stringify(highlights)},
      ${JSON.stringify(alerts)},
      ${JSON.stringify(metrics)},
      NOW()
    )
  `);

  return { digestType, scope, period: dateRange, summary: narrativeSummary, highlights, alerts, metrics };
}

export async function getDigestHistory(filters: { digestType?: string; scope?: string; limit?: number }) {
  const db = await requireDb();

  const conditions: SQL[] = [sql`1=1`];
  if (filters.digestType) conditions.push(sql`digest_type = ${filters.digestType}`);
  if (filters.scope) conditions.push(sql`scope = ${filters.scope}`);
  const where = sql.join(conditions, sql` AND `);
  const limit = filters.limit || 10;

  const result = await db.execute(sql`
    SELECT * FROM ime_digest_alerts
    WHERE ${where}
    ORDER BY generated_at DESC
    LIMIT ${limit}
  `);

  return (result.rows as DigestRow[]).map((row: DigestRow) => ({
    id: row.id,
    digestType: row.digest_type,
    scope: row.scope,
    scopeId: row.scope_id,
    period: row.period,
    summary: JSON.parse(row.summary || "{}"),
    highlights: JSON.parse(row.highlights || "[]"),
    alerts: JSON.parse(row.alerts || "[]"),
    metrics: JSON.parse(row.metrics || "{}"),
    generatedAt: row.generated_at,
  }));
}

export async function getActiveAlerts(scope?: string, scopeId?: string) {
  const db = await requireDb();

  // Get latest digest alerts
  const conditions: SQL[] = [sql`1=1`];
  if (scope) conditions.push(sql`scope = ${scope}`);
  if (scopeId) conditions.push(sql`scope_id = ${scopeId}`);
  const where = sql.join(conditions, sql` AND `);

  const digestResult = await db.execute(sql`
    SELECT alerts FROM ime_digest_alerts
    WHERE ${where}
    ORDER BY generated_at DESC LIMIT 1
  `);
  let digestAlerts: AlertRow[] = [];
  if ((digestResult.rows as DigestRow[])[0]) {
    digestAlerts = (JSON.parse(String((digestResult.rows as DigestRow[])[0].alerts || "[]")) as AlertRow[])
      .filter((a: AlertRow) => a.severity === "critical" || a.severity === "warning");
  }

  // Real-time: stale action items
  const staleResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM ime_action_items WHERE status = 'stale' AND appearance_count >= 3
  `);
  const staleCount = Number((staleResult.rows as CountRow[])[0]?.cnt) || 0;

  // Real-time: stalled topics
  const stalledResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM ime_topic_continuity WHERE status = 'stalled' AND appearance_count >= 3
  `);
  const stalledCount = Number((stalledResult.rows as CountRow[])[0]?.cnt) || 0;

  // Real-time: health grade
  const healthResult = await db.execute(sql`
    SELECT health_score, grade FROM ime_meeting_health ORDER BY computed_at DESC LIMIT 1
  `);
  const latestHealth = (healthResult.rows as HealthRow[])[0];

  const realTimeAlerts: AlertRow[] = [];
  if (staleCount >= 3) {
    realTimeAlerts.push({ alertType: "stale_actions_realtime", message: `${staleCount}个行动项已逾期(≥3次出现)`, severity: staleCount >= 5 ? "critical" : "warning" });
  }
  if (stalledCount >= 3) {
    realTimeAlerts.push({ alertType: "stalled_topics_realtime", message: `${stalledCount}个议题停滞(≥3次出现)`, severity: stalledCount >= 5 ? "critical" : "warning" });
  }
  if (latestHealth && latestHealth.grade !== "A" && latestHealth.grade !== "B" && latestHealth.grade !== "C") {
    realTimeAlerts.push({ alertType: "low_health_realtime", message: `会议健康度${latestHealth.grade}级 (${Number(latestHealth.health_score).toFixed(0)}分)`, severity: "critical" });
  }

  // Merge and deduplicate
  const allAlerts = [...digestAlerts, ...realTimeAlerts];
  const seen = new Set<string>();
  const unique = allAlerts.filter((a) => {
    const key = `${a.alertType}-${a.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: critical first
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  unique.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  return { alerts: unique, totalCritical: unique.filter((a) => a.severity === "critical").length, totalWarning: unique.filter((a) => a.severity === "warning").length };
}

// ============================================================================
// Phase 5: Meeting ROI & Outcome Tracking
// ============================================================================

export async function computeMeetingRoi(meetingId: string) {
  const db = await requireDb();

  // 1. Get meeting info
  const meetingResult = await db.execute(sql`
    SELECT id, title, objective, summary FROM meeting_records WHERE id = ${meetingId}
  `);
  const meeting = (meetingResult.rows as MeetingRow[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // 2. Get cost from ime_meeting_costs (fallback: estimate)
  const costResult = await db.execute(sql`
    SELECT total_cost, participant_count, duration_minutes FROM ime_meeting_costs WHERE meeting_id = ${meetingId} LIMIT 1
  `);
  const costRow = (costResult.rows as CostRow[])[0];
  const totalCost = costRow ? Number(costRow.total_cost) : 500;

  // 3. Count decisions and action items from content blocks
  const blocksResult = await db.execute(sql`
    SELECT block_type, COUNT(*) as cnt FROM meeting_content_blocks
    WHERE meeting_id = ${meetingId}
    AND block_type IN ('decision', 'action_item')
    GROUP BY block_type
  `);
  let decisionCount = 0, actionItemCount = 0;
  for (const row of blocksResult.rows as BlockRow[]) {
    if (row.block_type === "decision") decisionCount = Number(row.cnt);
    if (row.block_type === "action_item") actionItemCount = Number(row.cnt);
  }

  // 4. Action item completion status
  const actionResult = await db.execute(sql`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM ime_action_items
    WHERE origin_meeting_id = ${meetingId}
  `);
  const actionRow = (actionResult.rows as CountRow[])[0];
  const completedActionCount = Number(actionRow?.completed) || 0;

  // 5. Resolved topics linked to this meeting
  const topicResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM ime_topic_continuity
    WHERE status IN ('resolved', 'decided', 'closed')
    AND meeting_appearances ILIKE ${'%' + meetingId + '%'}
  `);
  const resolvedTopics = Number((topicResult.rows as CountRow[])[0]?.cnt) || 0;

  // 6. LLM ROI analysis
  let outcomeScore = 0, roiGrade = "C", outcomes: RoiOutcome[] = [], aiNarrative = "";

  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是会议ROI分析专家。根据会议数据评估投资回报率。返回JSON。",
        },
        {
          role: "user",
          content: `会议: "${meeting.title}"\n目标: ${meeting.objective || "N/A"}\n摘要: ${(meeting.summary || "").substring(0, 500)}\n\n成本: ¥${totalCost}\n决策数: ${decisionCount}\n行动项: ${actionItemCount}\n已完成行动项: ${completedActionCount}\n已解决议题: ${resolvedTopics}\n\n请评估:\n- outcomeScore (0-100)\n- grade (A/B/C/D/F)\n- outcomes: [{type: decision|deliverable|resolved_topic, description, value: high|medium|low}]\n- narrative: 2-3句中文ROI评估`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "roi_analysis",
          schema: {
            type: "object",
            properties: {
              outcomeScore: { type: "number" },
              grade: { type: "string" },
              outcomes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    description: { type: "string" },
                    value: { type: "string" },
                  },
                  required: ["type", "description", "value"],
                  additionalProperties: false,
                },
              },
              narrative: { type: "string" },
            },
            required: ["outcomeScore", "grade", "outcomes", "narrative"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
    outcomeScore = parsed.outcomeScore ?? 0;
    roiGrade = parsed.grade ?? "C";
    outcomes = parsed.outcomes ?? [];
    aiNarrative = parsed.narrative ?? "";
  } catch (e) {
    log.error({ err: e }, "ROI LLM analysis failed, using heuristic");
    const costNormalized = Math.min(totalCost / 5000, 1);
    outcomeScore = Math.min(100, (decisionCount * 20 + completedActionCount * 15 + resolvedTopics * 10) * (1 - costNormalized * 0.3));
    outcomeScore = Math.max(0, Math.round(outcomeScore));
  }

  if (!aiNarrative) {
    roiGrade = outcomeScore >= 80 ? "A" : outcomeScore >= 60 ? "B" : outcomeScore >= 40 ? "C" : outcomeScore >= 20 ? "D" : "F";
  }

  const costPerDecision = decisionCount > 0 ? totalCost / decisionCount : null;
  const costPerActionItem = actionItemCount > 0 ? totalCost / actionItemCount : null;

  // 7. Delete+insert
  await db.execute(sql`DELETE FROM ime_meeting_roi WHERE meeting_id = ${meetingId}`);
  await db.execute(sql`
    INSERT INTO ime_meeting_roi
      (meeting_id, total_cost, decision_count, action_item_count, completed_action_count,
       cost_per_decision, cost_per_action_item, outcome_score, roi_grade, outcomes, ai_narrative, computed_at)
    VALUES (
      ${meetingId},
      ${totalCost},
      ${decisionCount},
      ${actionItemCount},
      ${completedActionCount},
      ${costPerDecision ?? null},
      ${costPerActionItem ?? null},
      ${outcomeScore},
      ${roiGrade},
      ${JSON.stringify(outcomes)},
      ${aiNarrative || ""},
      NOW()
    )
  `);

  return { meetingId, totalCost, decisionCount, actionItemCount, completedActionCount, outcomeScore, roiGrade, outcomes, aiNarrative };
}

export async function getRoiDashboard(filters: { channelId?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const conditions: SQL[] = [sql`1=1`];
  if (filters.channelId) conditions.push(sql`mr.channel_id = ${filters.channelId}`);
  if (filters.dateFrom) conditions.push(sql`mr.meeting_date >= ${filters.dateFrom}`);
  if (filters.dateTo) conditions.push(sql`mr.meeting_date <= ${filters.dateTo}`);
  const where = sql.join(conditions, sql` AND `);

  const statsResult = await db.execute(sql`
    SELECT COUNT(*) as total_analyzed,
           AVG(roi.outcome_score) as avg_score,
           AVG(roi.cost_per_decision::numeric) as avg_cost_per_decision,
           SUM(roi.total_cost::numeric) as total_cost
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where}
  `);
  const stats = (statsResult.rows as RoiStatsRow[])[0] || {} as RoiStatsRow;

  const gradeResult = await db.execute(sql`
    SELECT roi.roi_grade as grade, COUNT(*) as cnt
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where}
    GROUP BY roi.roi_grade
  `);
  const gradeDistribution = (gradeResult.rows as GradeRow[]).map((r: GradeRow) => ({ grade: r.grade, count: Number(r.cnt) }));

  const bestResult = await db.execute(sql`
    SELECT roi.*, mr.title as meeting_title, mr.meeting_date
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where}
    ORDER BY roi.outcome_score DESC LIMIT 5
  `);

  const worstResult = await db.execute(sql`
    SELECT roi.*, mr.title as meeting_title, mr.meeting_date
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where}
    ORDER BY roi.outcome_score ASC LIMIT 5
  `);

  const deptResult = await db.execute(sql`
    SELECT roi.department_id,
           AVG(roi.outcome_score) as avg_score,
           AVG(roi.cost_per_decision::numeric) as avg_cost_per_decision,
           COUNT(*) as meeting_count
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where} AND roi.department_id IS NOT NULL
    GROUP BY roi.department_id
    ORDER BY avg_score DESC
  `);

  const trendResult = await db.execute(sql`
    SELECT TO_CHAR(roi.computed_at, 'YYYY-MM') as month,
           AVG(roi.outcome_score) as avg_score,
           COUNT(*) as meeting_count,
           SUM(roi.total_cost::numeric) as total_cost
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where}
    GROUP BY TO_CHAR(roi.computed_at, 'YYYY-MM')
    ORDER BY month
  `);

  const scatterResult = await db.execute(sql`
    SELECT roi.total_cost::numeric as cost,
           roi.outcome_score as score,
           mc.participant_count as participants,
           mr.title
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    LEFT JOIN ime_meeting_costs mc ON roi.meeting_id = mc.meeting_id
    WHERE ${where}
  `);

  return {
    stats: {
      totalAnalyzed: Number(stats.total_analyzed) || 0,
      avgScore: Math.round(Number(stats.avg_score) || 0),
      avgCostPerDecision: Math.round(Number(stats.avg_cost_per_decision) || 0),
      totalCost: Math.round(Number(stats.total_cost) || 0),
    },
    gradeDistribution,
    bestRoi: bestResult.rows,
    worstRoi: worstResult.rows,
    departmentComparison: deptResult.rows,
    monthlyTrend: trendResult.rows,
    scatterData: scatterResult.rows,
  };
}

export async function batchComputeRoi(meetingIds: string[]) {
  const results: BatchRoiResult[] = [];
  for (const id of meetingIds) {
    try {
      const result = await computeMeetingRoi(id);
// @ts-ignore duplicate property
      results.push({ meetingId: id, success: true, ...result });
    } catch (e: unknown) {
      results.push({ meetingId: id, success: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { processed: results.length, results };
}

// ============================================================================
// Phase 5: Attendee Optimization & Smart Scheduling
// ============================================================================

export async function optimizeAttendees(meetingId: string) {
  const db = await requireDb();

  const meetingResult = await db.execute(sql`
    SELECT id, title, objective, summary FROM meeting_records WHERE id = ${meetingId}
  `);
  const meeting = (meetingResult.rows as MeetingRow[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const participantsResult = await db.execute(sql`
    SELECT mc.employee_id, mc.employee_name,
           mc.contribution_score,
           mc.intervention_count, mc.decision_count
    FROM meeting_contributions mc
    WHERE mc.meeting_id = ${meetingId}
    ORDER BY mc.contribution_score DESC
  `);
  const currentParticipants = participantsResult.rows as ContributionRow[];

  const enrichedParticipants: EnrichedParticipant[] = [];
  for (const p of currentParticipants) {
    const histResult = await db.execute(sql`
      SELECT AVG(contribution_score) as avg_score,
             COUNT(*) as meeting_count,
             AVG(intervention_count) as avg_engagement
      FROM meeting_contributions
      WHERE employee_id = ${p.employee_id || ""}
    `);
    const hist = (histResult.rows as ContributionRow[])[0] || {} as ContributionRow;
    enrichedParticipants.push({
      employeeId: p.employee_id,
      name: p.employee_name,
      avgScore: Math.round(Number(hist.avg_score) || Number(p.contribution_score)),
      avgEngagement: Math.round(Number(hist.avg_engagement) || 0),
      meetingCount: Number(hist.meeting_count) || 1,
      currentScore: Number(p.contribution_score),
    });
  }

  const costResult = await db.execute(sql`
    SELECT participant_count, duration_minutes, total_cost FROM ime_meeting_costs WHERE meeting_id = ${meetingId} LIMIT 1
  `);
  const costRow = (costResult.rows as CostRow[])[0];
  const durationMinutes = costRow ? Number(costRow.duration_minutes) : 60;
  const costPerPerson = costRow && costRow.participant_count ? Number(costRow.total_cost) / Number(costRow.participant_count) : 200;

  let recommendedParticipants: OverInvitedPerson[] = [], overInvitedParticipants: OverInvitedPerson[] = [];
  let optimalSize = currentParticipants.length, compositionAdvice: CompositionAdvice | null = null, aiNarrative = "";
  let estimatedCostSaving = 0;

  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是会议参会者优化专家。分析参会者数据，识别超邀人员和推荐新增人员。返回JSON。",
        },
        {
          role: "user",
          content: `会议: "${meeting.title}"\n目标: ${meeting.objective || "N/A"}\n\n当前参会者(${enrichedParticipants.length}人):\n${JSON.stringify(enrichedParticipants, null, 2)}\n\n请分析:\n- overInvited: [{employeeId, name, avgScore, costWaste, reason}] (平均分<30且参会>=3次)\n- optimalSize: 最佳人数\n- compositionAdvice: {roleGap: string, recommendation: string}\n- narrative: 2-3句中文建议`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "attendee_optimization",
          schema: {
            type: "object",
            properties: {
              overInvited: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    employeeId: { type: "string" },
                    name: { type: "string" },
                    avgScore: { type: "number" },
                    costWaste: { type: "number" },
                    reason: { type: "string" },
                  },
                  required: ["employeeId", "name", "avgScore", "costWaste", "reason"],
                  additionalProperties: false,
                },
              },
              optimalSize: { type: "number" },
              compositionAdvice: {
                type: "object",
                properties: {
                  roleGap: { type: "string" },
                  recommendation: { type: "string" },
                },
                required: ["roleGap", "recommendation"],
                additionalProperties: false,
              },
              narrative: { type: "string" },
            },
            required: ["overInvited", "optimalSize", "compositionAdvice", "narrative"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
    overInvitedParticipants = parsed.overInvited ?? [];
    optimalSize = parsed.optimalSize ?? currentParticipants.length;
    compositionAdvice = parsed.compositionAdvice ?? null;
    aiNarrative = parsed.narrative ?? "";
  } catch (e) {
    log.error({ err: e }, "Attendee optimization LLM failed, using heuristic");
    overInvitedParticipants = enrichedParticipants
      .filter((p) => p.avgScore < 30 && p.meetingCount >= 3)
      .map((p) => ({
        employeeId: p.employeeId as string,
        name: p.name as string,
        avgScore: p.avgScore,
        costWaste: Math.round(costPerPerson),
        reason: `平均贡献分${p.avgScore}，参与${p.meetingCount}次会议`,
      }));
    optimalSize = Math.max(3, currentParticipants.length - overInvitedParticipants.length);
  }

  estimatedCostSaving = Math.round(overInvitedParticipants.length * costPerPerson * (durationMinutes / 60));

  await db.execute(sql`DELETE FROM ime_attendee_optimization WHERE meeting_id = ${meetingId}`);
  await db.execute(sql`
    INSERT INTO ime_attendee_optimization
      (meeting_id, scope, meeting_title, meeting_topic, current_participants, recommended_participants,
       over_invited_participants, optimal_size, current_size, estimated_cost_saving, composition_advice, ai_narrative, computed_at)
    VALUES (
      ${meetingId},
      'meeting',
      ${meeting.title || ""},
      ${meeting.objective || ""},
      ${JSON.stringify(enrichedParticipants)},
      ${JSON.stringify(recommendedParticipants)},
      ${JSON.stringify(overInvitedParticipants)},
      ${optimalSize},
      ${currentParticipants.length},
      ${estimatedCostSaving},
      ${compositionAdvice ? JSON.stringify(compositionAdvice) : null},
      ${aiNarrative || ""},
      NOW()
    )
  `);

  return {
    meetingId,
    currentSize: currentParticipants.length,
    optimalSize,
    overInvited: overInvitedParticipants,
    recommended: recommendedParticipants,
    estimatedCostSaving,
    compositionAdvice,
    aiNarrative,
    currentParticipants: enrichedParticipants,
  };
}

export async function getOptimizationDashboard(filters: { department?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const conditions: SQL[] = [sql`1=1`];
  if (filters.department) conditions.push(sql`ao.meeting_title ILIKE ${'%' + filters.department + '%'}`);
  if (filters.dateFrom) conditions.push(sql`ao.computed_at >= ${filters.dateFrom}`);
  if (filters.dateTo) conditions.push(sql`ao.computed_at <= ${filters.dateTo}`);
  const where = sql.join(conditions, sql` AND `);

  const statsResult = await db.execute(sql`
    SELECT COUNT(*) as total_optimized,
           AVG(ao.estimated_cost_saving::numeric) as avg_saving,
           AVG(ao.current_size - ao.optimal_size) as avg_size_gap
    FROM ime_attendee_optimization ao
    WHERE ${where}
  `);
  const stats = (statsResult.rows as OptStatsRow[])[0] || {} as OptStatsRow;

  const recentResult = await db.execute(sql`
    SELECT ao.over_invited_participants FROM ime_attendee_optimization ao WHERE ${where}
  `);
  const overInvitedFreq: Record<string, { name: string; count: number }> = {};
  for (const row of recentResult.rows as OverInvitedRow[]) {
    try {
      const list = JSON.parse(row.over_invited_participants || "[]");
      for (const p of list) {
        const key = p.employeeId || p.name;
        if (!overInvitedFreq[key]) overInvitedFreq[key] = { name: p.name, count: 0 };
        overInvitedFreq[key].count++;
      }
    } catch { /* skip */ }
  }
  const overInvitedRankings = Object.values(overInvitedFreq).sort((a, b) => b.count - a.count).slice(0, 20);

  const recentOptResult = await db.execute(sql`
    SELECT * FROM ime_attendee_optimization ao
    WHERE ${where}
    ORDER BY ao.computed_at DESC LIMIT 20
  `);

  return {
    stats: {
      totalOptimized: Number(stats.total_optimized) || 0,
      avgSaving: Math.round(Number(stats.avg_saving) || 0),
      avgSizeGap: Math.round(Number(stats.avg_size_gap) || 0),
    },
    overInvitedRankings,
    recentOptimizations: recentOptResult.rows,
  };
}

export async function suggestParticipantsForTopic(topic: string, excludeIds?: string[]) {
  const db = await requireDb();

  const topicLike = '%' + topic + '%';
  const topicResult = await db.execute(sql`
    SELECT topic_name, meeting_appearances FROM ime_topic_continuity
    WHERE topic_name ILIKE ${topicLike}
    OR topic_description ILIKE ${topicLike}
    ORDER BY appearance_count DESC
    LIMIT 20
  `);

  const meetingIds = new Set<string>();
  for (const row of topicResult.rows as TopicContinuityRow[]) {
    try {
      const appearances = JSON.parse(row.meeting_appearances || "[]");
      for (const a of appearances) {
        if (a.meetingId) meetingIds.add(a.meetingId);
      }
    } catch { /* skip */ }
  }

  if (meetingIds.size === 0) {
    return { topic, suggestions: [], message: "未找到相关议题的历史会议" };
  }

  const idListSql = sql.join(Array.from(meetingIds).map((id) => sql`${id}`), sql`, `);
  const excludeClause = excludeIds && excludeIds.length > 0
    ? sql`AND mc.employee_id NOT IN (${sql.join(excludeIds.map((id) => sql`${id}`), sql`, `)})`
    : sql``;

  const contribResult = await db.execute(sql`
    SELECT mc.employee_id, mc.employee_name,
           AVG(mc.contribution_score) as avg_score,
           COUNT(*) as topic_meeting_count,
           SUM(mc.decision_count) as total_decisions
    FROM meeting_contributions mc
    WHERE mc.meeting_id IN (${idListSql}) ${excludeClause}
    GROUP BY mc.employee_id, mc.employee_name
    HAVING COUNT(*) >= 1
    ORDER BY avg_score DESC
    LIMIT 10
  `);

  const suggestions = (contribResult.rows as ContribSuggestionRow[]).map((r: ContribSuggestionRow) => ({
    employeeId: r.employee_id,
    name: r.employee_name,
    avgScore: Math.round(Number(r.avg_score)),
    topicMeetingCount: Number(r.topic_meeting_count),
    totalDecisions: Number(r.total_decisions),
    reason: `在${Number(r.topic_meeting_count)}次相关会议中平均贡献分${Math.round(Number(r.avg_score))}`,
  }));

  return { topic, suggestions };
}

// ============================================================================
// Phase 5: Predictive Analytics & Forecasting
// ============================================================================

export async function predictMeetingEffectiveness(meetingId: string) {
  const db = await requireDb();

  const meetingResult = await db.execute(sql`
    SELECT id, title, channel_id, objective FROM meeting_records WHERE id = ${meetingId}
  `);
  const meeting = (meetingResult.rows as MeetingRow[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const participantsResult = await db.execute(sql`
    SELECT mc.employee_id, mc.employee_name,
           AVG(mc.contribution_score) as avg_score,
           STDDEV(mc.contribution_score) as score_variance,
           COUNT(*) as meeting_count,
           AVG(mc.intervention_count) as avg_interventions
    FROM meeting_contributions mc
    WHERE mc.employee_id IN (
      SELECT DISTINCT employee_id FROM meeting_contributions WHERE meeting_id = ${meetingId}
    )
    GROUP BY mc.employee_id, mc.employee_name
  `);
  const participants = participantsResult.rows as ContributionRow[];
  const avgParticipantScore = participants.length > 0
    ? participants.reduce((sum: number, p: ContributionRow) => sum + Number(p.avg_score || 0), 0) / participants.length
    : 50;
  const highPerformerRatio = participants.length > 0
    ? participants.filter((p: ContributionRow) => Number(p.avg_score) >= 70).length / participants.length
    : 0;

  const channelResult = await db.execute(sql`
    SELECT AVG(mes.overall_score) as avg_effectiveness
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE mr.channel_id = ${(meeting.channel_id || "")}
  `);
  const channelAvg = Number((channelResult.rows as AvgRow[])[0]?.avg_effectiveness) || 50;

  const recentResult = await db.execute(sql`
    SELECT mes.overall_score FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE mr.channel_id = ${(meeting.channel_id || "")}
    ORDER BY mr.meeting_date DESC LIMIT 5
  `);
  const recentScores = (recentResult.rows as EffectivenessRow[]).map((r: EffectivenessRow) => Number(r.overall_score));
  const recentTrend = recentScores.length >= 2
    ? (recentScores[0] - recentScores[recentScores.length - 1]) / recentScores.length
    : 0;

  const stalledResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM ime_topic_continuity WHERE status = 'stalled'
  `);
  const stalledTopics = Number((stalledResult.rows as CountRow[])[0]?.cnt) || 0;

  let predictedScore = 50, confidenceLevel = 0.5, riskLevel = "medium";
  let riskFactors: RiskFactor[] = [], recommendations: PredRecommendation[] = [], aiNarrative = "";

  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是会议效能预测专家。根据历史数据预测即将举行的会议的效果。返回JSON。",
        },
        {
          role: "user",
          content: `会议: "${meeting.title}"\n渠道平均效能: ${channelAvg.toFixed(1)}\n参会者数: ${participants.length}\n平均参会者分: ${avgParticipantScore.toFixed(1)}\n高绩效占比: ${(highPerformerRatio * 100).toFixed(0)}%\n近期趋势: ${recentTrend.toFixed(1)}\n停滞议题: ${stalledTopics}\n\n请预测:\n- predictedScore (0-100)\n- confidenceLevel (0-1)\n- riskLevel (high/medium/low/none)\n- riskFactors: [{factor, weight, description}]\n- recommendations: [{action, priority, expectedImpact}]\n- narrative: 2-3句中文预测分析`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "meeting_prediction",
          schema: {
            type: "object",
            properties: {
              predictedScore: { type: "number" },
              confidenceLevel: { type: "number" },
              riskLevel: { type: "string" },
              riskFactors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    factor: { type: "string" },
                    weight: { type: "number" },
                    description: { type: "string" },
                  },
                  required: ["factor", "weight", "description"],
                  additionalProperties: false,
                },
              },
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    action: { type: "string" },
                    priority: { type: "string" },
                    expectedImpact: { type: "string" },
                  },
                  required: ["action", "priority", "expectedImpact"],
                  additionalProperties: false,
                },
              },
              narrative: { type: "string" },
            },
            required: ["predictedScore", "confidenceLevel", "riskLevel", "riskFactors", "recommendations", "narrative"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
    predictedScore = parsed.predictedScore ?? 50;
    confidenceLevel = parsed.confidenceLevel ?? 0.5;
    riskLevel = parsed.riskLevel ?? "medium";
    riskFactors = parsed.riskFactors ?? [];
    recommendations = parsed.recommendations ?? [];
    aiNarrative = parsed.narrative ?? "";
  } catch (e) {
    log.error({ err: e }, "Prediction LLM failed, using heuristic");
    const sizeBonus = participants.length >= 3 && participants.length <= 8 ? 10 : participants.length > 12 ? -10 : 0;
    predictedScore = Math.round(avgParticipantScore * 0.4 + channelAvg * 0.3 + (recentTrend > 0 ? 60 : 40) * 0.2 + (50 + sizeBonus) * 0.1);
    predictedScore = Math.max(0, Math.min(100, predictedScore));
    confidenceLevel = Math.min(0.3 + participants.length * 0.05, 0.8);
    riskLevel = predictedScore >= 70 ? "low" : predictedScore >= 40 ? "medium" : "high";
  }

  await db.execute(sql`
    DELETE FROM ime_meeting_predictions WHERE meeting_id = ${meetingId} AND prediction_type = 'effectiveness'
  `);
  await db.execute(sql`
    INSERT INTO ime_meeting_predictions
      (meeting_id, scope, prediction_type, predicted_score, confidence_level, risk_level,
       risk_factors, features, recommendations, ai_narrative, predicted_at)
    VALUES (
      ${meetingId},
      'meeting',
      'effectiveness',
      ${predictedScore},
      ${confidenceLevel},
      ${riskLevel},
      ${JSON.stringify(riskFactors)},
      '${JSON.stringify({ avgParticipantScore, channelAvg, recentTrend, highPerformerRatio, stalledTopics, participantCount: participants.length })}',
      ${JSON.stringify(recommendations)},
      ${(aiNarrative || "")},
      NOW()
    )
  `);

  return {
    meetingId,
    predictedScore,
    confidenceLevel,
    riskLevel,
    riskFactors,
    recommendations,
    aiNarrative,
    features: { avgParticipantScore, channelAvg, recentTrend, highPerformerRatio, stalledTopics },
  };
}

export async function detectMeetingFatigue(scope: string, scopeId?: string, period?: string) {
  const db = await requireDb();

  const dateRange = period === "monthly" ? "30 days" : period === "quarterly" ? "90 days" : "60 days";
  const scopeCondition = scopeId
    ? sql`AND mr.channel_id = ${scopeId}`
    : sql``;

  const engagementResult = await db.execute(sql`
    SELECT pe.meeting_id, pe.engagement_level, pe.engagement_score,
           mr.meeting_date, mr.channel_id
    FROM ime_participant_engagement pe
    JOIN meeting_records mr ON pe.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL ${sql.raw(`'${dateRange}'`)} ${scopeCondition}
    ORDER BY mr.meeting_date ASC
  `);
  const engagements = engagementResult.rows as EngagementRow[];

  if (engagements.length === 0) {
    return { scope, scopeId, fatigueIndex: 0, message: "数据不足以进行疲劳检测" };
  }

  const scores = engagements.map((e: EngagementRow) => Number(e.engagement_score) || 0);
  const n = scores.length;
  const halfIdx = Math.floor(n / 2);
  const firstHalfAvg = scores.slice(0, halfIdx).reduce((s, v) => s + v, 0) / Math.max(halfIdx, 1);
  const secondHalfAvg = scores.slice(halfIdx).reduce((s, v) => s + v, 0) / Math.max(n - halfIdx, 1);

  const xMean = (n - 1) / 2;
  const yMean = scores.reduce((s, v) => s + v, 0) / n;
  let numerator = 0, denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (scores[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }
  const slope = denominator !== 0 ? numerator / denominator : 0;

  const uniqueDates = new Set(engagements.map((e: EngagementRow) => e.meeting_date?.toISOString?.()?.split("T")?.[0] || ""));
  const weeksInPeriod = Math.max(1, parseInt(dateRange) / 7);
  const meetingsPerWeek = uniqueDates.size / weeksInPeriod;

  let fatigueIndex = 0, trendDirection = "stable", recommendations: PredRecommendation[] = [], aiNarrative = "";
  let trendForecast: TrendForecastItem[] = [];

  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是会议疲劳检测专家。分析参与度趋势，检测会议疲劳信号。返回JSON。",
        },
        {
          role: "user",
          content: `范围: ${scope}\n周期: ${dateRange}\n会议数: ${n}\n参与度趋势斜率: ${slope.toFixed(3)}\n前半段平均: ${firstHalfAvg.toFixed(1)}\n后半段平均: ${secondHalfAvg.toFixed(1)}\n每周会议数: ${meetingsPerWeek.toFixed(1)}\n\n请分析:\n- fatigueIndex (0-100, 越高越疲劳)\n- trendDirection (declining/stable/improving)\n- recommendations: [{action, priority, expectedImpact}]\n- narrative: 2-3句中文疲劳分析`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "fatigue_detection",
          schema: {
            type: "object",
            properties: {
              fatigueIndex: { type: "number" },
              trendDirection: { type: "string" },
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    action: { type: "string" },
                    priority: { type: "string" },
                    expectedImpact: { type: "string" },
                  },
                  required: ["action", "priority", "expectedImpact"],
                  additionalProperties: false,
                },
              },
              narrative: { type: "string" },
            },
            required: ["fatigueIndex", "trendDirection", "recommendations", "narrative"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
    fatigueIndex = parsed.fatigueIndex ?? 0;
    trendDirection = parsed.trendDirection ?? "stable";
    recommendations = parsed.recommendations ?? [];
    aiNarrative = parsed.narrative ?? "";
  } catch (e) {
    log.error({ err: e }, "Fatigue detection LLM failed, using heuristic");
    const declineRatio = firstHalfAvg > 0 ? (firstHalfAvg - secondHalfAvg) / firstHalfAvg : 0;
    fatigueIndex = Math.min(100, Math.max(0, Math.round(declineRatio * 100 + (slope < 0 ? Math.abs(slope) * 20 : 0) + (meetingsPerWeek > 5 ? 15 : 0))));
    trendDirection = slope < -0.5 ? "declining" : slope > 0.5 ? "improving" : "stable";
  }

  const avgScore = yMean;
  trendForecast = [1, 2, 3, 4].map((i) => ({
    period: `+${i}`,
    predictedScore: Math.max(0, Math.min(100, Math.round(avgScore + slope * (n + i * 5)))),
    confidence: Math.max(0.2, 0.8 - i * 0.15),
  }));

  await db.execute(sql`
    INSERT INTO ime_meeting_predictions
      (meeting_id, scope, scope_id, prediction_type, predicted_score, confidence_level, risk_level,
       fatigue_index, trend_forecast, recommendations, ai_narrative, predicted_at)
    VALUES (
      '',
      ${(scope || "")},
      ${scopeId ? `${scopeId}` : "NULL"},
      'fatigue',
      ${Math.round(avgScore)},
      0.7,
      ${fatigueIndex >= 60 ? "high" : fatigueIndex >= 30 ? "medium" : "low"},
      ${fatigueIndex},
      ${JSON.stringify(trendForecast)},
      ${JSON.stringify(recommendations)},
      ${(aiNarrative || "")},
      NOW()
    )
  `);

  return {
    scope,
    scopeId,
    fatigueIndex,
    trendDirection,
    trendForecast,
    recommendations,
    aiNarrative,
    stats: { slope, firstHalfAvg, secondHalfAvg, meetingsPerWeek, totalMeetings: n },
  };
}

export async function getPredictionDashboard(filters: { scope?: string; period?: string }) {
  const db = await requireDb();

  const conditions: SQL[] = [sql`1=1`];
  if (filters.scope) conditions.push(sql`p.scope = ${filters.scope}`);
  const where = sql.join(conditions, sql` AND `);

  const typeStatsResult = await db.execute(sql`
    SELECT p.prediction_type,
           COUNT(*) as cnt,
           AVG(p.predicted_score) as avg_predicted,
           AVG(p.confidence_level) as avg_confidence
    FROM ime_meeting_predictions p
    WHERE ${where}
    GROUP BY p.prediction_type
  `);

  const atRiskResult = await db.execute(sql`
    SELECT p.*, mr.title as meeting_title, mr.meeting_date
    FROM ime_meeting_predictions p
    LEFT JOIN meeting_records mr ON p.meeting_id = mr.id
    WHERE ${where} AND p.prediction_type = 'effectiveness' AND p.risk_level IN ('high', 'medium')
    ORDER BY p.predicted_score ASC
    LIMIT 20
  `);

  const accuracyResult = await db.execute(sql`
    SELECT COUNT(*) as total,
           AVG(p.prediction_accuracy) as avg_accuracy,
           AVG(ABS(p.predicted_score - p.actual_score)) as avg_error
    FROM ime_meeting_predictions p
    WHERE ${where} AND p.actual_score IS NOT NULL
  `);
  const accuracy = (accuracyResult.rows as AccuracyRow[])[0] || {} as AccuracyRow;

  const fatigueResult = await db.execute(sql`
    SELECT DISTINCT ON (p.scope_id) p.scope_id, p.fatigue_index, p.risk_level, p.ai_narrative
    FROM ime_meeting_predictions p
    WHERE p.prediction_type = 'fatigue' AND p.fatigue_index IS NOT NULL
    ORDER BY p.scope_id, p.predicted_at DESC
  `);

  const riskFactorResult = await db.execute(sql`
    SELECT p.risk_factors FROM ime_meeting_predictions p
    WHERE ${where} AND p.risk_factors IS NOT NULL AND p.risk_factors != '[]'
    ORDER BY p.predicted_at DESC LIMIT 50
  `);
  const factorFreq: Record<string, number> = {};
  for (const row of riskFactorResult.rows as RiskFactorRow[]) {
    try {
      const factors = JSON.parse(row.risk_factors || "[]");
      for (const f of factors) {
        const key = f.factor || "unknown";
        factorFreq[key] = (factorFreq[key] || 0) + 1;
      }
    } catch { /* skip */ }
  }
  const riskFactorRankings = Object.entries(factorFreq)
    .map(([factor, count]) => ({ factor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    typeStats: (typeStatsResult.rows as PredTypeStatsRow[]).map((r: PredTypeStatsRow) => ({
      type: r.prediction_type,
      count: Number(r.cnt),
      avgPredicted: Math.round(Number(r.avg_predicted) || 0),
      avgConfidence: Number(Number(r.avg_confidence || 0).toFixed(2)),
    })),
    atRiskMeetings: atRiskResult.rows,
    accuracy: {
      total: Number(accuracy.total) || 0,
      avgAccuracy: Number(Number(accuracy.avg_accuracy || 0).toFixed(1)),
      avgError: Number(Number(accuracy.avg_error || 0).toFixed(1)),
    },
    fatigueData: fatigueResult.rows,
    riskFactorRankings,
  };
}

