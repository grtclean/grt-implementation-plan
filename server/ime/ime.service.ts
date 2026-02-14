/**
 * G-IME: Intelligent Meeting Executive - Service Layer
 * 参会者贡献分析与会议效能评估服务
 */

import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { tracePerformance } from "../services/performance-trace.service";

// ============================================================================
// Analyze Contributions for a Meeting
// ============================================================================

export async function analyzeContributions(meetingId: string) {
  const db = await requireDb();

  // 1. Get meeting info
  const meetingResult = await db.execute(sql`
    SELECT id, title, objective, summary FROM meeting_records WHERE id = ${meetingId}
  `);
  const meeting = (meetingResult.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // 2. Get content blocks grouped by speaker
  const blocksResult = await db.execute(sql`
    SELECT speaker, block_type, content,
           timestamp_start, timestamp_end
    FROM meeting_content_blocks
    WHERE meeting_id = ${meetingId}
    ORDER BY sort_order ASC, created_at ASC
  `);
  const blocks = blocksResult.rows as any[];

  // 3. Group by speaker
  const speakerMap = new Map<string, {
    blocks: any[];
    speakingTime: number;
    decisions: number;
    actionItems: number;
    questions: number;
    insights: number;
    interventions: number;
  }>();

  for (const block of blocks) {
    const speaker = block.speaker || "unknown";
    if (!speakerMap.has(speaker)) {
      speakerMap.set(speaker, {
        blocks: [],
        speakingTime: 0,
        decisions: 0,
        actionItems: 0,
        questions: 0,
        insights: 0,
        interventions: 0,
      });
    }
    const entry = speakerMap.get(speaker)!;
    entry.blocks.push(block);
    entry.interventions++;

    if (block.timestamp_start != null && block.timestamp_end != null) {
      entry.speakingTime += Math.max(0, block.timestamp_end - block.timestamp_start);
    }

    switch (block.block_type) {
      case "decision": entry.decisions++; break;
      case "action_item": entry.actionItems++; break;
      case "question": entry.questions++; break;
      case "insight": entry.insights++; break;
    }
  }

  // 4. Call LLM for composite scoring per speaker
  const speakerSummaries = Array.from(speakerMap.entries()).map(([speaker, data]) => ({
    speaker,
    interventionCount: data.interventions,
    speakingTime: data.speakingTime,
    decisions: data.decisions,
    actionItems: data.actionItems,
    questions: data.questions,
    insights: data.insights,
    sampleContent: data.blocks.slice(0, 5).map((b: any) => `[${b.block_type}] ${b.content.substring(0, 200)}`),
  }));

  let aiScores: Record<string, { score: number; strengths: string[]; improvements: string[]; keyQuotes: string[] }> = {};

  if (speakerSummaries.length > 0) {
    try {
      const llmResult = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a meeting contribution analyst. Score each participant's contribution from 0-100 based on: intervention quality, decision-making, proactivity, and problem-solving. Return JSON only.",
          },
          {
            role: "user",
            content: `Meeting: "${meeting.title}"\nObjective: ${meeting.objective || "N/A"}\n\nParticipant data:\n${JSON.stringify(speakerSummaries, null, 2)}\n\nFor each participant, return:\n- score (0-100)\n- strengths (array of 2-3 strings)\n- improvements (array of 1-2 strings)\n- keyQuotes (array of 1-2 notable quotes from sampleContent)`,
          },
        ],
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "contribution_scores",
            schema: {
              type: "object",
              properties: {
                participants: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      speaker: { type: "string" },
                      score: { type: "number" },
                      strengths: { type: "array", items: { type: "string" } },
                      improvements: { type: "array", items: { type: "string" } },
                      keyQuotes: { type: "array", items: { type: "string" } },
                    },
                    required: ["speaker", "score", "strengths", "improvements", "keyQuotes"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["participants"],
              additionalProperties: false,
            },
            strict: true,
          },
        },
      });

      const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
      if (parsed.participants) {
        for (const p of parsed.participants) {
          aiScores[p.speaker] = {
            score: p.score,
            strengths: p.strengths,
            improvements: p.improvements,
            keyQuotes: p.keyQuotes,
          };
        }
      }
    } catch (e) {
      console.error("[IME] LLM scoring failed, using heuristic scoring:", e);
    }
  }

  // 5. Delete existing contributions for this meeting, then insert new ones
  await db.execute(sql`DELETE FROM meeting_contributions WHERE meeting_id = ${meetingId}`);

  const results: any[] = [];
  for (const [speaker, data] of speakerMap.entries()) {
    if (speaker === "unknown") continue;

    const ai = aiScores[speaker];
    const heuristicScore = Math.min(100,
      (data.decisions * 15) + (data.actionItems * 10) + (data.questions * 8) +
      (data.insights * 12) + (data.interventions * 3) + Math.min(data.speakingTime / 60, 20)
    );
    const contributionScore = ai?.score ?? heuristicScore;

    const analysis = JSON.stringify({
      strengths: ai?.strengths ?? [],
      improvements: ai?.improvements ?? [],
      keyQuotes: ai?.keyQuotes ?? [],
    });

    await db.execute(sql`
      INSERT INTO meeting_contributions (meeting_id, employee_id, employee_name, speaking_time, intervention_count, decision_count, action_item_count, question_count, insight_count, contribution_score, ai_analysis)
      VALUES (${meetingId}, ${speaker}, ${speaker}, ${data.speakingTime}, ${data.interventions}, ${data.decisions}, ${data.actionItems}, ${data.questions}, ${data.insights}, ${contributionScore}, ${analysis})
    `);

    results.push({ speaker, contributionScore, interventions: data.interventions });
  }

  return results;
}

// ============================================================================
// Score Meeting Effectiveness
// ============================================================================

export async function scoreMeetingEffectiveness(meetingId: string) {
  const db = await requireDb();

  // Get meeting + contributions
  const meetingResult = await db.execute(sql`
    SELECT id, title, objective, summary FROM meeting_records WHERE id = ${meetingId}
  `);
  const meeting = (meetingResult.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const contribResult = await db.execute(sql`
    SELECT * FROM meeting_contributions WHERE meeting_id = ${meetingId}
  `);
  const contributions = contribResult.rows as any[];

  const blocksResult = await db.execute(sql`
    SELECT block_type, COUNT(*) as cnt FROM meeting_content_blocks
    WHERE meeting_id = ${meetingId}
    GROUP BY block_type
  `);
  const blockCounts: Record<string, number> = {};
  for (const row of blocksResult.rows as any[]) {
    blockCounts[row.block_type] = Number(row.cnt);
  }

  // Calculate participation balance (Gini-like: 100 = perfectly equal)
  let participationBalance = 100;
  if (contributions.length > 1) {
    const scores = contributions.map((c: any) => Number(c.contribution_score) || 0);
    const mean = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    if (mean > 0) {
      const gini = scores.reduce((sum: number, s: number) =>
        sum + scores.reduce((inner: number, t: number) => inner + Math.abs(s - t), 0), 0
      ) / (2 * scores.length * scores.length * mean);
      participationBalance = Math.round((1 - gini) * 100);
    }
  }

  // Heuristic scores
  const decisionCount = blockCounts["decision"] || 0;
  const actionItemCount = blockCounts["action_item"] || 0;
  const decisionClarity = Math.min(100, decisionCount * 25);
  const actionableOutcomes = Math.min(100, actionItemCount * 20);
  const objectiveAchievement = meeting.objective ? Math.min(100, (decisionCount * 20) + (actionItemCount * 15) + (contributions.length * 10)) : 50;

  // Call LLM for narrative
  let aiNarrative = "";
  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a meeting effectiveness analyst. Write a concise 2-3 sentence narrative summary of this meeting's effectiveness. Write in Chinese.",
        },
        {
          role: "user",
          content: `Meeting: "${meeting.title}"\nObjective: ${meeting.objective || "N/A"}\nParticipants: ${contributions.length}\nDecisions: ${decisionCount}\nAction Items: ${actionItemCount}\nParticipation Balance: ${participationBalance}%\nTop contributor score: ${Math.max(...contributions.map((c: any) => Number(c.contribution_score) || 0), 0)}`,
        },
      ],
    });
    aiNarrative = llmResult.choices[0]?.message?.content || "";
  } catch (e) {
    console.error("[IME] LLM narrative failed:", e);
    aiNarrative = `会议"${meeting.title}"共有${contributions.length}位参会者，产生${decisionCount}个决策和${actionItemCount}个行动项。`;
  }

  const overallScore = Math.round(
    (objectiveAchievement * 0.3) + (participationBalance * 0.25) +
    (decisionClarity * 0.25) + (actionableOutcomes * 0.2)
  );

  // Upsert effectiveness score
  await db.execute(sql`DELETE FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId}`);
  await db.execute(sql`
    INSERT INTO meeting_effectiveness_scores (meeting_id, objective_achievement, participation_balance, decision_clarity, actionable_outcomes, overall_score, ai_narrative)
    VALUES (${meetingId}, ${objectiveAchievement}, ${participationBalance}, ${decisionClarity}, ${actionableOutcomes}, ${overallScore}, ${aiNarrative})
  `);

  return {
    meetingId,
    objectiveAchievement,
    participationBalance,
    decisionClarity,
    actionableOutcomes,
    overallScore,
    aiNarrative,
  };
}

// ============================================================================
// Dashboard Aggregation
// ============================================================================

export async function getContributionDashboard(filters: {
  channelId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const db = await requireDb();

  const conditions: string[] = ["1=1"];
  if (filters.channelId) conditions.push(`mr.channel_id = '${filters.channelId}'`);
  if (filters.dateFrom) conditions.push(`mr.meeting_date >= '${filters.dateFrom}'`);
  if (filters.dateTo) conditions.push(`mr.meeting_date <= '${filters.dateTo}'`);
  const where = conditions.join(" AND ");

  // Stats
  const statsResult = await db.execute(sql.raw(`
    SELECT
      COUNT(DISTINCT mes.meeting_id) as analyzed_meetings,
      AVG(mes.overall_score) as avg_effectiveness,
      COUNT(DISTINCT mc.employee_id) as active_participants
    FROM meeting_effectiveness_scores mes
    LEFT JOIN meeting_records mr ON mes.meeting_id = mr.id
    LEFT JOIN meeting_contributions mc ON mes.meeting_id = mc.meeting_id
    WHERE ${where}
  `));
  const stats = (statsResult.rows as any[])[0] || {};

  // Top contributors
  const topResult = await db.execute(sql.raw(`
    SELECT
      mc.employee_id,
      mc.employee_name,
      COUNT(DISTINCT mc.meeting_id) as meeting_count,
      AVG(mc.contribution_score) as avg_score,
      SUM(mc.decision_count) as total_decisions,
      SUM(mc.action_item_count) as total_actions
    FROM meeting_contributions mc
    LEFT JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE ${where}
    GROUP BY mc.employee_id, mc.employee_name
    ORDER BY avg_score DESC
    LIMIT 10
  `));

  // Effectiveness trend (last 30 days)
  const trendResult = await db.execute(sql.raw(`
    SELECT
      mr.meeting_date::date as date,
      AVG(mes.overall_score) as avg_score,
      COUNT(*) as meeting_count
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE ${where}
    GROUP BY mr.meeting_date::date
    ORDER BY date DESC
    LIMIT 30
  `));

  return {
    stats: {
      analyzedMeetings: Number(stats.analyzed_meetings) || 0,
      avgEffectiveness: Math.round(Number(stats.avg_effectiveness) || 0),
      activeParticipants: Number(stats.active_participants) || 0,
    },
    topContributors: topResult.rows,
    effectivenessTrend: (trendResult.rows as any[]).reverse(),
  };
}

// ============================================================================
// Employee Trend
// ============================================================================

export async function getEmployeeTrend(employeeId: string, dateFrom?: string, dateTo?: string) {
  const db = await requireDb();

  const conditions = [`mc.employee_id = '${employeeId}'`];
  if (dateFrom) conditions.push(`mr.meeting_date >= '${dateFrom}'`);
  if (dateTo) conditions.push(`mr.meeting_date <= '${dateTo}'`);
  const where = conditions.join(" AND ");

  const result = await db.execute(sql.raw(`
    SELECT
      mr.meeting_date::date as date,
      mr.title as meeting_title,
      mc.contribution_score,
      mc.speaking_time,
      mc.intervention_count,
      mc.decision_count,
      mc.action_item_count,
      mc.ai_analysis
    FROM meeting_contributions mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE ${where}
    ORDER BY mr.meeting_date ASC
  `));

  return result.rows;
}

// ============================================================================
// Link to Performance Trace
// ============================================================================

export async function linkToPerformanceTrace(meetingId: string) {
  const db = await requireDb();

  const contribResult = await db.execute(sql`
    SELECT * FROM meeting_contributions WHERE meeting_id = ${meetingId}
  `);
  const contributions = contribResult.rows as any[];

  const traces: any[] = [];
  for (const contrib of contributions) {
    // Resolve numeric userId from employee_id
    const userResult = await db.execute(sql`
      SELECT id FROM users WHERE "openId" = ${contrib.employee_id} LIMIT 1
    `);
    const userId = (userResult.rows as any[])[0]?.id;
    if (!userId) continue;

    const trace = await tracePerformance(userId, "meeting_contribution_score", Number(contrib.contribution_score) || 0, {
      type: "meeting_contribution",
      description: `Meeting contribution for ${meetingId}`,
    });
    traces.push(trace);
  }

  return traces;
}

// ============================================================================
// Phase 2 — Sprint 1: Department Rollup
// ============================================================================

export async function computeDepartmentRollup(department: string, period: string) {
  const db = await requireDb();

  // Join contributions with hrm_employees to scope to department, then aggregate
  const statsResult = await db.execute(sql.raw(`
    SELECT
      COUNT(DISTINCT mc.meeting_id) as meeting_count,
      AVG(mes.overall_score) as avg_effectiveness,
      AVG(mc.contribution_score) as avg_contribution_score,
      SUM(mc.decision_count) as total_decisions,
      SUM(mc.action_item_count) as total_action_items,
      COUNT(DISTINCT mc.employee_id) as active_participants,
      AVG(mes.participation_balance) as participation_balance
    FROM meeting_contributions mc
    JOIN hrm_employees he ON mc.employee_id = he."employeeCode"
    LEFT JOIN meeting_effectiveness_scores mes ON mc.meeting_id = mes.meeting_id
    LEFT JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE he.department = '${department}'
      AND mr.meeting_date::text LIKE '${period}%'
  `));
  const stats = (statsResult.rows as any[])[0] || {};

  // Top contributors for this department
  const topResult = await db.execute(sql.raw(`
    SELECT
      mc.employee_id,
      mc.employee_name,
      AVG(mc.contribution_score) as avg_score
    FROM meeting_contributions mc
    JOIN hrm_employees he ON mc.employee_id = he."employeeCode"
    LEFT JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE he.department = '${department}'
      AND mr.meeting_date::text LIKE '${period}%'
    GROUP BY mc.employee_id, mc.employee_name
    ORDER BY avg_score DESC
    LIMIT 5
  `));

  const topContributors = JSON.stringify(topResult.rows);

  // Upsert rollup
  await db.execute(sql.raw(`
    DELETE FROM ime_department_rollups
    WHERE department = '${department}' AND period = '${period}'
  `));

  await db.execute(sql`
    INSERT INTO ime_department_rollups
      (department, period, meeting_count, avg_effectiveness, avg_contribution_score,
       total_decisions, total_action_items, active_participants, participation_balance,
       top_contributors, computed_at)
    VALUES (
      ${department}, ${period},
      ${Number(stats.meeting_count) || 0},
      ${Number(stats.avg_effectiveness) || null},
      ${Number(stats.avg_contribution_score) || null},
      ${Number(stats.total_decisions) || 0},
      ${Number(stats.total_action_items) || 0},
      ${Number(stats.active_participants) || 0},
      ${Number(stats.participation_balance) || null},
      ${topContributors},
      NOW()
    )
  `);

  return {
    department,
    period,
    meetingCount: Number(stats.meeting_count) || 0,
    avgEffectiveness: Number(stats.avg_effectiveness) || 0,
    avgContributionScore: Number(stats.avg_contribution_score) || 0,
    totalDecisions: Number(stats.total_decisions) || 0,
    totalActionItems: Number(stats.total_action_items) || 0,
    activeParticipants: Number(stats.active_participants) || 0,
    participationBalance: Number(stats.participation_balance) || 0,
    topContributors: topResult.rows,
  };
}

export async function getDepartmentComparison(departments: string[], period: string) {
  const db = await requireDb();

  const results: any[] = [];
  for (const dept of departments) {
    // Try to read from pre-computed rollups first
    const existing = await db.execute(sql.raw(`
      SELECT * FROM ime_department_rollups
      WHERE department = '${dept}' AND period = '${period}'
      ORDER BY computed_at DESC LIMIT 1
    `));

    if ((existing.rows as any[]).length > 0) {
      results.push(existing.rows[0]);
    } else {
      // Compute on-the-fly
      const computed = await computeDepartmentRollup(dept, period);
      results.push(computed);
    }
  }

  return results;
}

export async function getManagementDashboard(scope: string, scopeId?: string, period?: string) {
  const db = await requireDb();
  const periodFilter = period ? `AND mr.meeting_date::text LIKE '${period}%'` : "";
  const deptFilter = scope === "department" && scopeId ? `AND he.department = '${scopeId}'` : "";

  // Rankings by department
  const rankingsResult = await db.execute(sql.raw(`
    SELECT
      he.department,
      COUNT(DISTINCT mc.meeting_id) as meeting_count,
      AVG(mes.overall_score) as avg_effectiveness,
      AVG(mc.contribution_score) as avg_contribution,
      COUNT(DISTINCT mc.employee_id) as participants
    FROM meeting_contributions mc
    JOIN hrm_employees he ON mc.employee_id = he."employeeCode"
    LEFT JOIN meeting_effectiveness_scores mes ON mc.meeting_id = mes.meeting_id
    LEFT JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE 1=1 ${periodFilter} ${deptFilter}
    GROUP BY he.department
    ORDER BY avg_effectiveness DESC
  `));

  // Org averages
  const orgResult = await db.execute(sql.raw(`
    SELECT
      AVG(mes.overall_score) as org_avg_effectiveness,
      AVG(mc.contribution_score) as org_avg_contribution,
      COUNT(DISTINCT mc.meeting_id) as total_meetings,
      COUNT(DISTINCT mc.employee_id) as total_participants
    FROM meeting_contributions mc
    LEFT JOIN meeting_effectiveness_scores mes ON mc.meeting_id = mes.meeting_id
    LEFT JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE 1=1 ${periodFilter}
  `));

  // 6-period trend
  const trendResult = await db.execute(sql.raw(`
    SELECT
      TO_CHAR(mr.meeting_date, 'YYYY-MM') as period,
      AVG(mes.overall_score) as avg_effectiveness,
      COUNT(DISTINCT mc.meeting_id) as meeting_count
    FROM meeting_contributions mc
    LEFT JOIN meeting_effectiveness_scores mes ON mc.meeting_id = mes.meeting_id
    LEFT JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE mr.meeting_date IS NOT NULL ${deptFilter}
    GROUP BY TO_CHAR(mr.meeting_date, 'YYYY-MM')
    ORDER BY period DESC
    LIMIT 6
  `));

  // Worst meetings
  const worstResult = await db.execute(sql.raw(`
    SELECT
      mes.meeting_id,
      mr.title,
      mr.meeting_date,
      mes.overall_score
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE mes.overall_score IS NOT NULL ${periodFilter}
    ORDER BY mes.overall_score ASC
    LIMIT 5
  `));

  return {
    rankings: rankingsResult.rows,
    orgAverages: (orgResult.rows as any[])[0] || {},
    trend: (trendResult.rows as any[]).reverse(),
    worstMeetings: worstResult.rows,
  };
}

// ============================================================================
// Phase 2 — Sprint 2: Meeting Patterns
// ============================================================================

export async function detectMeetingPatterns(
  scope: string,
  scopeId?: string,
  dateFrom?: string,
  dateTo?: string
) {
  const db = await requireDb();

  const dateFilter = [
    dateFrom ? `mr.meeting_date >= '${dateFrom}'` : null,
    dateTo ? `mr.meeting_date <= '${dateTo}'` : null,
  ].filter(Boolean).join(" AND ");
  const dateWhere = dateFilter ? `AND ${dateFilter}` : "";

  const scopeFilter = scope === "department" && scopeId
    ? `AND he.department = '${scopeId}'`
    : scope === "individual" && scopeId
      ? `AND mc.employee_id = '${scopeId}'`
      : "";

  // Gather meeting data
  const meetingsResult = await db.execute(sql.raw(`
    SELECT
      mes.meeting_id,
      mr.title,
      mr.meeting_date,
      mes.overall_score,
      mes.participation_balance,
      (SELECT COUNT(*) FROM meeting_contributions WHERE meeting_id = mes.meeting_id) as participant_count,
      (SELECT SUM(decision_count) FROM meeting_contributions WHERE meeting_id = mes.meeting_id) as total_decisions,
      (SELECT SUM(action_item_count) FROM meeting_contributions WHERE meeting_id = mes.meeting_id) as total_actions
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    LEFT JOIN meeting_contributions mc ON mes.meeting_id = mc.meeting_id
    LEFT JOIN hrm_employees he ON mc.employee_id = he."employeeCode"
    WHERE 1=1 ${dateWhere} ${scopeFilter}
    GROUP BY mes.meeting_id, mes.id, mr.title, mr.meeting_date, mes.overall_score, mes.participation_balance
    ORDER BY mr.meeting_date DESC
    LIMIT 100
  `));
  const meetings = meetingsResult.rows as any[];

  const patterns: any[] = [];

  // Detect: time_waste — low effectiveness + recurring
  const lowEffMeetings = meetings.filter(m => Number(m.overall_score) < 40);
  if (lowEffMeetings.length >= 3) {
    patterns.push({
      patternType: "time_waste",
      scope,
      scopeId: scopeId || null,
      title: `检测到 ${lowEffMeetings.length} 个低效会议`,
      description: `在分析范围内发现 ${lowEffMeetings.length} 个效能低于40分的会议，可能存在时间浪费。`,
      severity: "warning",
      metrics: JSON.stringify({ count: lowEffMeetings.length, avgScore: Math.round(lowEffMeetings.reduce((s, m) => s + Number(m.overall_score), 0) / lowEffMeetings.length) }),
      meetingIds: JSON.stringify(lowEffMeetings.map(m => m.meeting_id)),
      recommendation: "建议审查这些会议的目标设定和参与者名单，考虑合并或取消不必要的会议。",
    });
  }

  // Detect: optimal_pattern — consistently >80
  const highEffMeetings = meetings.filter(m => Number(m.overall_score) >= 80);
  if (highEffMeetings.length >= 3) {
    patterns.push({
      patternType: "optimal_pattern",
      scope,
      scopeId: scopeId || null,
      title: `${highEffMeetings.length} 个高效会议模式`,
      description: `发现 ${highEffMeetings.length} 个效能超过80分的优秀会议，可作为最佳实践参考。`,
      severity: "info",
      metrics: JSON.stringify({ count: highEffMeetings.length, avgScore: Math.round(highEffMeetings.reduce((s, m) => s + Number(m.overall_score), 0) / highEffMeetings.length) }),
      meetingIds: JSON.stringify(highEffMeetings.map(m => m.meeting_id)),
      recommendation: "建议总结这些会议的成功模式，推广到其他会议中。",
    });
  }

  // Detect: recurring_inefficiency — declining effectiveness
  if (meetings.length >= 5) {
    const sorted = [...meetings].sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());
    const recentHalf = sorted.slice(Math.floor(sorted.length / 2));
    const olderHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const recentAvg = recentHalf.reduce((s, m) => s + Number(m.overall_score), 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((s, m) => s + Number(m.overall_score), 0) / olderHalf.length;
    if (recentAvg < olderAvg - 10) {
      patterns.push({
        patternType: "recurring_inefficiency",
        scope,
        scopeId: scopeId || null,
        title: "会议效能呈下降趋势",
        description: `近期会议平均效能 (${Math.round(recentAvg)}) 相比早期 (${Math.round(olderAvg)}) 下降了 ${Math.round(olderAvg - recentAvg)} 分。`,
        severity: "critical",
        metrics: JSON.stringify({ recentAvg: Math.round(recentAvg), olderAvg: Math.round(olderAvg), decline: Math.round(olderAvg - recentAvg) }),
        meetingIds: JSON.stringify(recentHalf.map(m => m.meeting_id)),
        recommendation: "建议分析效能下降原因，可能需要调整会议格式、频率或参与人员。",
      });
    }
  }

  // Call LLM for narrative on detected patterns
  if (patterns.length > 0) {
    try {
      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: "你是会议模式分析师。根据检测到的会议模式，给出简短的综合分析叙述（2-3句话，中文）。" },
          { role: "user", content: `检测到以下会议模式:\n${JSON.stringify(patterns.map(p => ({ type: p.patternType, title: p.title, severity: p.severity })), null, 2)}` },
        ],
      });
      const narrative = llmResult.choices[0]?.message?.content || "";
      // Attach narrative to first pattern as context
      if (patterns[0]) {
        patterns[0].description = narrative + "\n\n" + patterns[0].description;
      }
    } catch (e) {
      console.error("[IME] Pattern LLM narrative failed:", e);
    }
  }

  // Insert patterns into DB
  for (const p of patterns) {
    await db.execute(sql`
      INSERT INTO ime_meeting_patterns
        (pattern_type, scope, scope_id, title, description, severity, metrics, meeting_ids, recommendation)
      VALUES (${p.patternType}, ${p.scope}, ${p.scopeId}, ${p.title}, ${p.description}, ${p.severity}, ${p.metrics}, ${p.meetingIds}, ${p.recommendation})
    `);
  }

  return patterns;
}

export async function getPatternInsights(scope?: string, scopeId?: string, patternType?: string) {
  const db = await requireDb();

  const conditions: string[] = ["1=1"];
  if (scope) conditions.push(`scope = '${scope}'`);
  if (scopeId) conditions.push(`scope_id = '${scopeId}'`);
  if (patternType) conditions.push(`pattern_type = '${patternType}'`);
  const where = conditions.join(" AND ");

  const result = await db.execute(sql.raw(`
    SELECT * FROM ime_meeting_patterns
    WHERE ${where}
    ORDER BY
      CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 WHEN 'info' THEN 2 ELSE 3 END,
      detected_at DESC
    LIMIT 50
  `));

  return result.rows;
}

export async function getMeetingCultureReport(department?: string) {
  const db = await requireDb();
  const deptFilter = department
    ? `AND he.department = '${department}'`
    : "";

  // Culture metrics
  const metricsResult = await db.execute(sql.raw(`
    SELECT
      COUNT(DISTINCT mes.meeting_id) as total_meetings,
      AVG(mes.overall_score) as avg_effectiveness,
      SUM(mc.decision_count) as total_decisions,
      SUM(mc.action_item_count) as total_actions,
      COUNT(DISTINCT mc.employee_id) as unique_participants,
      AVG(mc.speaking_time) as avg_speaking_time
    FROM meeting_effectiveness_scores mes
    JOIN meeting_contributions mc ON mes.meeting_id = mc.meeting_id
    LEFT JOIN hrm_employees he ON mc.employee_id = he."employeeCode"
    LEFT JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE 1=1 ${deptFilter}
  `));
  const metrics = (metricsResult.rows as any[])[0] || {};

  const totalMeetings = Number(metrics.total_meetings) || 1;
  const decisionToMeetingRatio = (Number(metrics.total_decisions) || 0) / totalMeetings;

  const cultureMetrics = {
    totalMeetings,
    avgEffectiveness: Math.round(Number(metrics.avg_effectiveness) || 0),
    decisionToMeetingRatio: Math.round(decisionToMeetingRatio * 100) / 100,
    totalDecisions: Number(metrics.total_decisions) || 0,
    totalActions: Number(metrics.total_actions) || 0,
    uniqueParticipants: Number(metrics.unique_participants) || 0,
    avgSpeakingTimeSeconds: Math.round(Number(metrics.avg_speaking_time) || 0),
  };

  // LLM narrative
  let narrative = "";
  try {
    const llmResult = await invokeLLM({
      messages: [
        { role: "system", content: "你是组织会议文化分析师。根据以下指标数据，撰写一份简洁的会议文化健康报告（3-4句话，中文），包括优势和改进建议。" },
        { role: "user", content: `会议文化指标${department ? ` (部门: ${department})` : " (全组织)"}:\n${JSON.stringify(cultureMetrics, null, 2)}` },
      ],
    });
    narrative = llmResult.choices[0]?.message?.content || "";
  } catch (e) {
    console.error("[IME] Culture report LLM failed:", e);
    narrative = `共分析 ${cultureMetrics.totalMeetings} 个会议，平均效能 ${cultureMetrics.avgEffectiveness} 分，决策会议比 ${cultureMetrics.decisionToMeetingRatio}。`;
  }

  return { metrics: cultureMetrics, narrative };
}

// ============================================================================
// Phase 2 — Sprint 3: HR Signals
// ============================================================================

export async function generateHrSignals(employeeId: string) {
  const db = await requireDb();

  // Fetch last 90 days of contributions
  const contribResult = await db.execute(sql.raw(`
    SELECT
      mc.*,
      mr.title as meeting_title,
      mr.meeting_date
    FROM meeting_contributions mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE mc.employee_id = '${employeeId}'
      AND mr.meeting_date >= NOW() - INTERVAL '90 days'
    ORDER BY mr.meeting_date DESC
  `));
  const contributions = contribResult.rows as any[];

  if (contributions.length === 0) {
    return { employeeId, signals: [], message: "No contribution data in last 90 days" };
  }

  // Get employee name
  const empResult = await db.execute(sql.raw(`
    SELECT name, department, position FROM hrm_employees
    WHERE "employeeCode" = '${employeeId}' LIMIT 1
  `));
  const employee = (empResult.rows as any[])[0];
  const employeeName = employee?.name || contributions[0]?.employee_name || employeeId;

  // Call LLM to classify signals
  let signals: any[] = [];
  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an HR signal analyst. Based on meeting contribution data, identify HR signals. Return JSON only.",
        },
        {
          role: "user",
          content: `Employee: ${employeeName} (${employee?.position || "N/A"}, ${employee?.department || "N/A"})
Contributions (last 90 days, ${contributions.length} meetings):
${JSON.stringify(contributions.map(c => ({
  meeting: c.meeting_title,
  date: c.meeting_date,
  score: c.contribution_score,
  decisions: c.decision_count,
  actions: c.action_item_count,
  interventions: c.intervention_count,
})), null, 2)}

Classify into signal types: promotion_ready, training_needed, declining_engagement, leadership_emerging.
For each applicable signal, provide confidence (0-1), reasoning, and suggested action.`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "hr_signals",
          schema: {
            type: "object",
            properties: {
              signals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    signalType: { type: "string" },
                    confidence: { type: "number" },
                    reasoning: { type: "string" },
                    suggestedAction: { type: "string" },
                  },
                  required: ["signalType", "confidence", "reasoning", "suggestedAction"],
                  additionalProperties: false,
                },
              },
            },
            required: ["signals"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(llmResult.choices[0]?.message?.content || '{"signals":[]}');
    signals = parsed.signals || [];
  } catch (e) {
    console.error("[IME] HR signal LLM failed:", e);
    // Heuristic fallback
    const avgScore = contributions.reduce((s, c) => s + Number(c.contribution_score), 0) / contributions.length;
    if (avgScore >= 80) {
      signals.push({ signalType: "promotion_ready", confidence: 0.6, reasoning: `Average score ${Math.round(avgScore)} over ${contributions.length} meetings`, suggestedAction: "Review for promotion consideration" });
    }
    if (avgScore < 40) {
      signals.push({ signalType: "training_needed", confidence: 0.7, reasoning: `Low average score ${Math.round(avgScore)}`, suggestedAction: "Assign targeted training" });
    }
  }

  // Insert signals into DB
  const meetingIds = contributions.map(c => c.meeting_id);
  for (const signal of signals) {
    const evidence = JSON.stringify({
      meetingIds: meetingIds.slice(0, 10),
      metrics: {
        totalMeetings: contributions.length,
        avgScore: Math.round(contributions.reduce((s, c) => s + Number(c.contribution_score), 0) / contributions.length),
      },
      reasoning: signal.reasoning,
    });

    await db.execute(sql`
      INSERT INTO ime_hr_signals
        (employee_id, employee_name, signal_type, confidence, evidence, suggested_action)
      VALUES (${employeeId}, ${employeeName}, ${signal.signalType}, ${signal.confidence}, ${evidence}, ${signal.suggestedAction})
    `);
  }

  // Trace performance for audit
  try {
    const userResult = await db.execute(sql`
      SELECT id FROM users WHERE "openId" = ${employeeId} LIMIT 1
    `);
    const userId = (userResult.rows as any[])[0]?.id;
    if (userId) {
      await tracePerformance(userId, "hr_signal_generated", signals.length, {
        type: "hr_signal",
        description: `Generated ${signals.length} HR signals from meeting behavior`,
      });
    }
  } catch (e) {
    console.error("[IME] Performance trace for HR signal failed:", e);
  }

  return { employeeId, employeeName, signals };
}

export async function getPromotionCandidates(department?: string, minConfidence?: number) {
  const db = await requireDb();
  const threshold = minConfidence ?? 0.6;

  const deptJoin = department
    ? `JOIN hrm_employees he ON hs.employee_id = he."employeeCode" AND he.department = '${department}'`
    : `LEFT JOIN hrm_employees he ON hs.employee_id = he."employeeCode"`;

  const result = await db.execute(sql.raw(`
    SELECT
      hs.*,
      he.name as hrm_name,
      he.department,
      he.position,
      he.level
    FROM ime_hr_signals hs
    ${deptJoin}
    WHERE hs.signal_type = 'promotion_ready'
      AND hs.confidence >= ${threshold}
      AND hs.status != 'dismissed'
    ORDER BY hs.confidence DESC, hs.created_at DESC
  `));

  return result.rows;
}

export async function recommendTraining(employeeId: string) {
  const db = await requireDb();

  // Get training_needed signals
  const signalsResult = await db.execute(sql.raw(`
    SELECT * FROM ime_hr_signals
    WHERE employee_id = '${employeeId}'
      AND signal_type = 'training_needed'
    ORDER BY created_at DESC
    LIMIT 5
  `));
  const signals = signalsResult.rows as any[];

  // Get existing training plans for this employee
  const empResult = await db.execute(sql.raw(`
    SELECT id FROM hrm_employees WHERE "employeeCode" = '${employeeId}' LIMIT 1
  `));
  const empId = (empResult.rows as any[])[0]?.id;

  let existingPlans: any[] = [];
  if (empId) {
    const plansResult = await db.execute(sql.raw(`
      SELECT * FROM hrm_training_plans
      WHERE "employeeId" = ${empId}
      ORDER BY "createdAt" DESC
      LIMIT 10
    `));
    existingPlans = plansResult.rows as any[];
  }

  // Call LLM for recommendations
  let recommendations: any[] = [];
  try {
    const llmResult = await invokeLLM({
      messages: [
        { role: "system", content: "你是培训推荐专家。根据HR信号和现有培训计划，推荐具体的培训方案。返回JSON。" },
        {
          role: "user",
          content: `员工: ${employeeId}
HR信号 (training_needed):
${JSON.stringify(signals.map(s => ({ evidence: s.evidence, suggestedAction: s.suggested_action })), null, 2)}

现有培训计划:
${JSON.stringify(existingPlans.map(p => ({ name: p.name, type: p.planType, status: p.status, completionRate: p.completionRate })), null, 2)}

请推荐2-3个培训方案，每个包含 name, type, reasoning, priority (high/medium/low)。`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "training_recommendations",
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    reasoning: { type: "string" },
                    priority: { type: "string" },
                  },
                  required: ["name", "type", "reasoning", "priority"],
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

    const parsed = JSON.parse(llmResult.choices[0]?.message?.content || '{"recommendations":[]}');
    recommendations = parsed.recommendations || [];
  } catch (e) {
    console.error("[IME] Training recommendation LLM failed:", e);
    recommendations = [{ name: "综合能力提升培训", type: "skill", reasoning: "基于会议贡献分析的通用建议", priority: "medium" }];
  }

  return { employeeId, signals, existingPlans, recommendations };
}

// ============================================================================
// Phase 2 — Sprint 4: Real-time Assistant
// ============================================================================

export async function startLiveSession(meetingId: string, userId: string) {
  const db = await requireDb();

  // Check for existing active session
  const existing = await db.execute(sql.raw(`
    SELECT id FROM ime_live_sessions
    WHERE meeting_id = '${meetingId}' AND session_status = 'active'
    LIMIT 1
  `));
  if ((existing.rows as any[]).length > 0) {
    return { sessionId: (existing.rows as any[])[0].id, status: "already_active" };
  }

  const result = await db.execute(sql`
    INSERT INTO ime_live_sessions (meeting_id, started_by)
    VALUES (${meetingId}, ${userId})
    RETURNING id
  `);
  const sessionId = (result.rows as any[])[0]?.id;

  return {
    sessionId,
    status: "active",
    wsChannel: `ime-live-${sessionId}`,
  };
}

export async function processLiveSegment(
  sessionId: number,
  segment: { speaker: string; text: string; start?: number; end?: number }
) {
  const db = await requireDb();

  // Get current session
  const sessionResult = await db.execute(sql.raw(`
    SELECT * FROM ime_live_sessions WHERE id = ${sessionId} AND session_status = 'active'
  `));
  const session = (sessionResult.rows as any[])[0];
  if (!session) throw new Error(`Live session ${sessionId} not found or not active`);

  // Update contribution snapshot
  const snapshot: Record<string, { speakingTime: number; segments: number; lastText: string }> =
    JSON.parse(session.live_contribution_snapshot || "{}");

  if (!snapshot[segment.speaker]) {
    snapshot[segment.speaker] = { speakingTime: 0, segments: 0, lastText: "" };
  }
  snapshot[segment.speaker].segments++;
  snapshot[segment.speaker].lastText = segment.text.substring(0, 200);
  if (segment.start != null && segment.end != null) {
    snapshot[segment.speaker].speakingTime += Math.max(0, segment.end - segment.start);
  }

  const totalSegments = (session.total_segments_processed || 0) + 1;

  // Check if we should generate a suggestion (every 10 segments)
  let suggestion: string | null = null;
  if (totalSegments % 10 === 0) {
    try {
      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: "你是实时会议助手。根据当前会议进展，给出一条简短建议（1句话，中文）。" },
          {
            role: "user",
            content: `会议进展 (已处理 ${totalSegments} 个语音段):
参与者贡献快照: ${JSON.stringify(snapshot)}
最新发言: [${segment.speaker}] ${segment.text}`,
          },
        ],
      });
      suggestion = llmResult.choices[0]?.message?.content || null;
    } catch (e) {
      console.error("[IME] Live suggestion LLM failed:", e);
    }
  }

  // Update session
  const suggestions: string[] = JSON.parse(session.live_suggestions || "[]");
  if (suggestion) {
    suggestions.push(suggestion);
  }

  await db.execute(sql.raw(`
    UPDATE ime_live_sessions
    SET live_contribution_snapshot = '${JSON.stringify(snapshot).replace(/'/g, "''")}',
        total_segments_processed = ${totalSegments},
        live_suggestions = '${JSON.stringify(suggestions).replace(/'/g, "''")}'
    WHERE id = ${sessionId}
  `));

  return { updatedSnapshot: snapshot, suggestion, totalSegments };
}

export async function endLiveSession(sessionId: number) {
  const db = await requireDb();

  const sessionResult = await db.execute(sql.raw(`
    SELECT * FROM ime_live_sessions WHERE id = ${sessionId}
  `));
  const session = (sessionResult.rows as any[])[0];
  if (!session) throw new Error(`Live session ${sessionId} not found`);

  // End the session
  await db.execute(sql.raw(`
    UPDATE ime_live_sessions
    SET session_status = 'ended', ended_at = NOW()
    WHERE id = ${sessionId}
  `));

  // Trigger post-session analysis
  let analysisResult = null;
  try {
    const contributions = await analyzeContributions(session.meeting_id);
    const effectiveness = await scoreMeetingEffectiveness(session.meeting_id);
    analysisResult = { contributions, effectiveness };
  } catch (e) {
    console.error("[IME] Post-session analysis failed:", e);
    analysisResult = { error: (e as Error).message };
  }

  return {
    sessionId,
    status: "ended",
    totalSegments: session.total_segments_processed,
    analysis: analysisResult,
  };
}
