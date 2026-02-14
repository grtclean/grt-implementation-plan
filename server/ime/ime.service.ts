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
// Participant Engagement Analysis
// ============================================================================

export interface EngagementOptions {
  excludeSpeakers?: string[];
  includeExternal?: boolean;
}

interface SpeakerEngagement {
  speaker: string;
  contribution_value: number;
  logic_conciseness: number;
  constructiveness: number;
  engagement_score: number;
  role: string;
  behavior_tags: string[];
  key_contribution: string;
  coaching_suggestion: string;
}

const VALID_BEHAVIOR_TAGS = [
  "Strategic", "Risk-Aware", "Solution-Oriented", "Detail-Focused",
  "Collaborative", "Off-Topic", "Passive", "Constructive", "Analytical",
];

const VALID_ROLES = ["Technical", "Strategic", "Process", "Supportive", "Observer"];

export async function analyzeParticipantEngagement(
  meetingId: string,
  options?: EngagementOptions
) {
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

  // 4. Auto-exclude external speakers (not found in hrm_employees)
  const excludeSet = new Set(options?.excludeSpeakers?.map(s => s.toLowerCase()) ?? []);
  const speakersToAnalyze: string[] = [];

  for (const speaker of speakerMap.keys()) {
    if (speaker === "unknown") continue;
    if (excludeSet.has(speaker.toLowerCase())) continue;

    if (!options?.includeExternal) {
      const empResult = await db.execute(sql.raw(`
        SELECT id FROM hrm_employees
        WHERE name = '${speaker.replace(/'/g, "''")}' OR "employeeCode" = '${speaker.replace(/'/g, "''")}'
        LIMIT 1
      `));
      if ((empResult.rows as any[]).length === 0) continue;
    }
    speakersToAnalyze.push(speaker);
  }

  if (speakersToAnalyze.length === 0) {
    return { meetingId, participants: [], message: "No internal speakers found" };
  }

  // 5. Prepare speaker summaries for LLM
  const speakerSummaries = speakersToAnalyze.map(speaker => {
    const data = speakerMap.get(speaker)!;
    return {
      speaker,
      interventionCount: data.interventions,
      speakingTime: data.speakingTime,
      decisions: data.decisions,
      actionItems: data.actionItems,
      questions: data.questions,
      insights: data.insights,
      sampleContent: data.blocks.slice(0, 8).map((b: any) => `[${b.block_type}] ${b.content.substring(0, 300)}`),
    };
  });

  // 6. Call LLM for engagement scoring
  let engagementResults: SpeakerEngagement[] = [];

  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a meeting participant engagement analyst. Evaluate each participant on three dimensions (0-10 scale):
1. Contribution Value: substance and impact of their input
2. Logic & Conciseness: clarity, structure, and efficiency of communication
3. Constructiveness: positive attitude, building on others' ideas, solution orientation

Compute engagement_score as weighted average: 0.4×contribution_value + 0.3×logic_conciseness + 0.3×constructiveness

Assign a role: Technical, Strategic, Process, Supportive, or Observer
Assign 1-3 behavior_tags from: Strategic, Risk-Aware, Solution-Oriented, Detail-Focused, Collaborative, Off-Topic, Passive, Constructive, Analytical
Provide a key_contribution (1 sentence) and coaching_suggestion (1 sentence).

Return strict JSON only.`,
        },
        {
          role: "user",
          content: `Meeting: "${meeting.title}"\nObjective: ${meeting.objective || "N/A"}\nSummary: ${(meeting.summary || "").substring(0, 500)}\n\nParticipant data:\n${JSON.stringify(speakerSummaries, null, 2)}`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "engagement_analysis",
          schema: {
            type: "object",
            properties: {
              participants: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    speaker: { type: "string" },
                    contribution_value: { type: "number" },
                    logic_conciseness: { type: "number" },
                    constructiveness: { type: "number" },
                    engagement_score: { type: "number" },
                    role: { type: "string" },
                    behavior_tags: { type: "array", items: { type: "string" } },
                    key_contribution: { type: "string" },
                    coaching_suggestion: { type: "string" },
                  },
                  required: [
                    "speaker", "contribution_value", "logic_conciseness", "constructiveness",
                    "engagement_score", "role", "behavior_tags", "key_contribution", "coaching_suggestion",
                  ],
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
      engagementResults = parsed.participants.map((p: any) => ({
        speaker: p.speaker,
        contribution_value: Math.max(0, Math.min(10, Number(p.contribution_value) || 0)),
        logic_conciseness: Math.max(0, Math.min(10, Number(p.logic_conciseness) || 0)),
        constructiveness: Math.max(0, Math.min(10, Number(p.constructiveness) || 0)),
        engagement_score: Math.max(0, Math.min(10, Number(p.engagement_score) || 0)),
        role: VALID_ROLES.includes(p.role) ? p.role : "Observer",
        behavior_tags: (p.behavior_tags || []).filter((t: string) => VALID_BEHAVIOR_TAGS.includes(t)),
        key_contribution: p.key_contribution || "",
        coaching_suggestion: p.coaching_suggestion || "",
      }));
    }
  } catch (e) {
    console.error("[IME] Engagement LLM scoring failed, using heuristic:", e);
  }

  // 7. Heuristic fallback for speakers not scored by LLM
  const scoredSpeakers = new Set(engagementResults.map(r => r.speaker));
  for (const speaker of speakersToAnalyze) {
    if (scoredSpeakers.has(speaker)) continue;
    const data = speakerMap.get(speaker)!;

    const cv = Math.min(10, (data.decisions * 2) + (data.insights * 1.5) + (data.actionItems * 1) + (data.interventions * 0.3));
    const lc = Math.min(10, data.interventions > 0 ? 5 + (data.insights / data.interventions) * 3 : 3);
    const co = Math.min(10, (data.actionItems * 2) + (data.questions * 1) + 3);
    const score = Math.round((cv * 0.4 + lc * 0.3 + co * 0.3) * 10) / 10;

    engagementResults.push({
      speaker,
      contribution_value: Math.round(cv * 10) / 10,
      logic_conciseness: Math.round(lc * 10) / 10,
      constructiveness: Math.round(co * 10) / 10,
      engagement_score: score,
      role: data.decisions >= 2 ? "Strategic" : data.insights >= 2 ? "Technical" : "Supportive",
      behavior_tags: [
        ...(data.decisions >= 2 ? ["Strategic"] : []),
        ...(data.insights >= 2 ? ["Analytical"] : []),
        ...(data.actionItems >= 2 ? ["Solution-Oriented"] : []),
        ...(data.interventions <= 1 ? ["Passive"] : ["Collaborative"]),
      ].slice(0, 3),
      key_contribution: data.blocks[0]?.content?.substring(0, 100) || "N/A",
      coaching_suggestion: score < 5 ? "建议更积极参与讨论并提出建设性意见" : "保持当前参与度，可尝试引导更多决策讨论",
    });
  }

  // 8. Merge engagement into existing ai_analysis JSON via UPDATE
  for (const result of engagementResults) {
    // Read existing ai_analysis
    const contribResult = await db.execute(sql.raw(`
      SELECT id, ai_analysis FROM meeting_contributions
      WHERE meeting_id = '${meetingId.replace(/'/g, "''")}'
        AND (employee_name = '${result.speaker.replace(/'/g, "''")}' OR employee_id = '${result.speaker.replace(/'/g, "''")}')
      LIMIT 1
    `));
    const existing = (contribResult.rows as any[])[0];
    if (!existing) continue;

    let analysis: any = {};
    try { analysis = JSON.parse(existing.ai_analysis || "{}"); } catch { /* use empty */ }

    analysis.engagement = {
      contribution_value: result.contribution_value,
      logic_conciseness: result.logic_conciseness,
      constructiveness: result.constructiveness,
      engagement_score: result.engagement_score,
      role: result.role,
      behavior_tags: result.behavior_tags,
      key_contribution: result.key_contribution,
      coaching_suggestion: result.coaching_suggestion,
    };

    const updatedJson = JSON.stringify(analysis).replace(/'/g, "''");
    await db.execute(sql.raw(`
      UPDATE meeting_contributions
      SET ai_analysis = '${updatedJson}'
      WHERE id = ${existing.id}
    `));
  }

  // 9. Return structured output
  return {
    meetingId,
    participants: engagementResults.map(r => ({
      speaker: r.speaker,
      contribution_value: r.contribution_value,
      logic_conciseness: r.logic_conciseness,
      constructiveness: r.constructiveness,
      engagement_score: r.engagement_score,
      role: r.role,
      behavior_tags: r.behavior_tags,
      key_contribution: r.key_contribution,
      coaching_suggestion: r.coaching_suggestion,
    })),
  };
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

// ============================================================================
// Phase 3 — Feature 1: Meeting Cost Calculator
// ============================================================================

export async function computeMeetingCost(meetingId: string) {
  const db = await requireDb();

  // 1. Get meeting record
  const meetingResult = await db.execute(sql`
    SELECT id, title, meeting_date FROM meeting_records WHERE id = ${meetingId}
  `);
  const meeting = (meetingResult.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // 2. Compute duration from content blocks timestamps
  const durationResult = await db.execute(sql`
    SELECT
      MIN(timestamp_start) as min_start,
      MAX(timestamp_end) as max_end
    FROM meeting_content_blocks
    WHERE meeting_id = ${meetingId}
      AND timestamp_start IS NOT NULL
      AND timestamp_end IS NOT NULL
  `);
  const dRow = (durationResult.rows as any[])[0];
  let durationMinutes = 60; // fallback
  if (dRow?.min_start != null && dRow?.max_end != null) {
    durationMinutes = Math.max(1, (Number(dRow.max_end) - Number(dRow.min_start)) / 60);
  }
  const durationHours = durationMinutes / 60;

  // 3. Get participants from meeting_contributions
  const contribResult = await db.execute(sql`
    SELECT employee_id, employee_name FROM meeting_contributions
    WHERE meeting_id = ${meetingId}
  `);
  const participants = contribResult.rows as any[];
  const participantCount = participants.length || 1;

  // 4. Resolve hourly rates
  const DEFAULT_HOURLY_RATE = 150; // yuan/hr fallback
  const breakdown: { name: string; hourlyRate: number; cost: number }[] = [];

  for (const p of participants) {
    let hourlyRate = DEFAULT_HOURLY_RATE;

    // Try salary_calculations first
    try {
      const salaryResult = await db.execute(sql.raw(`
        SELECT "annualTotal" FROM salary_calculations
        WHERE "employeeCode" = '${(p.employee_id || '').replace(/'/g, "''")}'
        ORDER BY "calculatedAt" DESC LIMIT 1
      `));
      const salRow = (salaryResult.rows as any[])[0];
      if (salRow?.annualTotal) {
        hourlyRate = Number(salRow.annualTotal) / 2080;
      } else {
        // Try hrm_salary_structures midpoint
        const structResult = await db.execute(sql.raw(`
          SELECT "midPoint" FROM hrm_salary_structures LIMIT 1
        `));
        const structRow = (structResult.rows as any[])[0];
        if (structRow?.midPoint) {
          hourlyRate = Number(structRow.midPoint) / 2080;
        }
      }
    } catch {
      // Use default
    }

    const cost = hourlyRate * durationHours;
    breakdown.push({
      name: p.employee_name || p.employee_id,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      cost: Math.round(cost * 100) / 100,
    });
  }

  const totalCost = breakdown.reduce((sum, b) => sum + b.cost, 0);

  // 5. Get decision / action item counts
  const blockCountResult = await db.execute(sql`
    SELECT block_type, COUNT(*) as cnt FROM meeting_content_blocks
    WHERE meeting_id = ${meetingId}
    GROUP BY block_type
  `);
  const blockCounts: Record<string, number> = {};
  for (const row of blockCountResult.rows as any[]) {
    blockCounts[row.block_type] = Number(row.cnt);
  }
  const decisionCount = blockCounts["decision"] || 0;
  const actionItemCount = blockCounts["action_item"] || 0;

  const costPerDecision = decisionCount > 0 ? totalCost / decisionCount : null;
  const costPerActionItem = actionItemCount > 0 ? totalCost / actionItemCount : null;

  // 6. ROI score = effectiveness overall_score / (total_cost / 1000)
  let roiScore: number | null = null;
  try {
    const effResult = await db.execute(sql`
      SELECT overall_score FROM meeting_effectiveness_scores
      WHERE meeting_id = ${meetingId} LIMIT 1
    `);
    const effRow = (effResult.rows as any[])[0];
    if (effRow?.overall_score && totalCost > 0) {
      roiScore = Math.round((Number(effRow.overall_score) / (totalCost / 1000)) * 100) / 100;
    }
  } catch { /* no effectiveness data */ }

  // 7. Delete + insert
  await db.execute(sql`DELETE FROM ime_meeting_costs WHERE meeting_id = ${meetingId}`);
  await db.execute(sql.raw(`
    INSERT INTO ime_meeting_costs
      (meeting_id, duration_minutes, participant_count, total_cost, cost_per_decision, cost_per_action_item, roi_score, participant_breakdown, computed_at)
    VALUES (
      '${meetingId.replace(/'/g, "''")}',
      ${durationMinutes},
      ${participantCount},
      ${Math.round(totalCost * 100) / 100},
      ${costPerDecision !== null ? Math.round(costPerDecision * 100) / 100 : 'NULL'},
      ${costPerActionItem !== null ? Math.round(costPerActionItem * 100) / 100 : 'NULL'},
      ${roiScore ?? 'NULL'},
      '${JSON.stringify(breakdown).replace(/'/g, "''")}',
      NOW()
    )
  `));

  return {
    meetingId,
    meetingTitle: meeting.title,
    durationMinutes: Math.round(durationMinutes),
    participantCount,
    totalCost: Math.round(totalCost * 100) / 100,
    costPerDecision: costPerDecision !== null ? Math.round(costPerDecision * 100) / 100 : null,
    costPerActionItem: costPerActionItem !== null ? Math.round(costPerActionItem * 100) / 100 : null,
    roiScore,
    breakdown,
  };
}

export async function getCostDashboard(filters: { channelId?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const conditions: string[] = ["1=1"];
  if (filters.channelId) conditions.push(`mr.channel_id = '${filters.channelId}'`);
  if (filters.dateFrom) conditions.push(`mr.meeting_date >= '${filters.dateFrom}'`);
  if (filters.dateTo) conditions.push(`mr.meeting_date <= '${filters.dateTo}'`);
  const where = conditions.join(" AND ");

  // Aggregate stats
  const statsResult = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as meeting_count,
      COALESCE(SUM(mc.total_cost::numeric), 0) as total_spend,
      COALESCE(AVG(mc.total_cost::numeric), 0) as avg_cost,
      COALESCE(AVG(mc.duration_minutes), 0) as avg_duration
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE ${where}
  `));
  const stats = (statsResult.rows as any[])[0] || {};

  // Top 5 most expensive
  const topResult = await db.execute(sql.raw(`
    SELECT mc.*, mr.title as meeting_title, mr.meeting_date
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE ${where}
    ORDER BY mc.total_cost::numeric DESC
    LIMIT 5
  `));

  // Monthly cost trend (last 12 months)
  const trendResult = await db.execute(sql.raw(`
    SELECT
      TO_CHAR(mr.meeting_date, 'YYYY-MM') as month,
      COUNT(*) as meeting_count,
      SUM(mc.total_cost::numeric) as total_cost,
      AVG(mc.total_cost::numeric) as avg_cost
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE ${where}
    GROUP BY TO_CHAR(mr.meeting_date, 'YYYY-MM')
    ORDER BY month DESC
    LIMIT 12
  `));

  // Cost vs effectiveness scatter data
  const scatterResult = await db.execute(sql.raw(`
    SELECT
      mc.meeting_id,
      mr.title as meeting_title,
      mc.total_cost::numeric as cost,
      mes.overall_score as effectiveness,
      mc.participant_count
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    LEFT JOIN meeting_effectiveness_scores mes ON mc.meeting_id = mes.meeting_id
    WHERE ${where} AND mes.overall_score IS NOT NULL
    ORDER BY mc.total_cost::numeric DESC
    LIMIT 50
  `));

  return {
    stats: {
      meetingCount: Number(stats.meeting_count) || 0,
      totalSpend: Math.round(Number(stats.total_spend) * 100) / 100,
      avgCost: Math.round(Number(stats.avg_cost) * 100) / 100,
      avgDuration: Math.round(Number(stats.avg_duration)),
    },
    topExpensive: topResult.rows,
    monthlyTrend: (trendResult.rows as any[]).reverse(),
    scatterData: scatterResult.rows,
  };
}

export async function batchComputeCosts(meetingIds: string[]) {
  const results: { meetingId: string; success: boolean; error?: string; totalCost?: number }[] = [];
  for (const meetingId of meetingIds) {
    try {
      const result = await computeMeetingCost(meetingId);
      results.push({ meetingId, success: true, totalCost: result.totalCost });
    } catch (e: any) {
      results.push({ meetingId, success: false, error: e.message });
    }
  }
  return results;
}

// ============================================================================
// Phase 3 — Feature 2: Action Item Tracker
// ============================================================================

export async function extractAndTrackActionItems(meetingId: string) {
  const db = await requireDb();

  // 1. Get action_item blocks from this meeting
  const blocksResult = await db.execute(sql`
    SELECT id, content, speaker, sort_order
    FROM meeting_content_blocks
    WHERE meeting_id = ${meetingId} AND block_type = 'action_item'
    ORDER BY sort_order ASC
  `);
  const newBlocks = blocksResult.rows as any[];

  if (newBlocks.length === 0) {
    return { meetingId, matched: 0, created: 0, message: "No action items found in this meeting" };
  }

  // 2. Get existing open/in_progress/stale items
  const existingResult = await db.execute(sql`
    SELECT id, content, owner, status, meeting_appearances, appearance_count
    FROM ime_action_items
    WHERE status IN ('open', 'in_progress', 'stale')
    ORDER BY created_at DESC
    LIMIT 200
  `);
  const existingItems = existingResult.rows as any[];

  // 3. LLM fuzzy-match
  let matches: { newIndex: number; existingId: number; confidence: number }[] = [];
  let newItems: { index: number; content: string; owner: string }[] = [];

  const newItemsSummary = newBlocks.map((b: any, i: number) => ({
    index: i,
    content: b.content,
    speaker: b.speaker,
  }));

  const existingSummary = existingItems.map((item: any) => ({
    id: item.id,
    content: item.content,
    owner: item.owner,
  }));

  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an action item matching assistant. Match new action items from a meeting against existing tracked items. Return JSON only.",
        },
        {
          role: "user",
          content: `New action items from meeting:\n${JSON.stringify(newItemsSummary, null, 2)}\n\nExisting tracked items:\n${JSON.stringify(existingSummary, null, 2)}\n\nFor each new item, determine if it matches an existing item (same task, possibly rephrased). Return:\n- matches: array of {newIndex, existingId, confidence (0-1)}\n- newItems: array of {index, content, owner (speaker name)}`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "action_item_matches",
          schema: {
            type: "object",
            properties: {
              matches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    newIndex: { type: "number" },
                    existingId: { type: "number" },
                    confidence: { type: "number" },
                  },
                  required: ["newIndex", "existingId", "confidence"],
                  additionalProperties: false,
                },
              },
              newItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "number" },
                    content: { type: "string" },
                    owner: { type: "string" },
                  },
                  required: ["index", "content", "owner"],
                  additionalProperties: false,
                },
              },
            },
            required: ["matches", "newItems"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
    matches = parsed.matches || [];
    newItems = parsed.newItems || [];
  } catch (e) {
    console.error("[IME] Action item LLM matching failed, using heuristic:", e);
    // Heuristic fallback: exact content substring matching
    const matchedIndices = new Set<number>();
    for (let i = 0; i < newBlocks.length; i++) {
      const content = (newBlocks[i].content || "").toLowerCase();
      let found = false;
      for (const existing of existingItems) {
        const existingContent = (existing.content || "").toLowerCase();
        if (content.includes(existingContent.substring(0, 30)) || existingContent.includes(content.substring(0, 30))) {
          matches.push({ newIndex: i, existingId: existing.id, confidence: 0.6 });
          matchedIndices.add(i);
          found = true;
          break;
        }
      }
      if (!found) {
        newItems.push({ index: i, content: newBlocks[i].content, owner: newBlocks[i].speaker || "" });
      }
    }
  }

  // 4. Process matches: append meetingId to appearances, increment count
  let matchedCount = 0;
  for (const match of matches) {
    const existing = existingItems.find((e: any) => e.id === match.existingId);
    if (!existing) continue;

    const appearances = JSON.parse(existing.meeting_appearances || "[]");
    if (!appearances.includes(meetingId)) {
      appearances.push(meetingId);
    }
    const newCount = (Number(existing.appearance_count) || 1) + 1;
    const newStatus = newCount >= 3 && existing.status === "open" ? "stale" : existing.status;

    await db.execute(sql.raw(`
      UPDATE ime_action_items
      SET meeting_appearances = '${JSON.stringify(appearances).replace(/'/g, "''")}',
          appearance_count = ${newCount},
          last_seen_date = NOW(),
          status = '${newStatus}',
          ai_match_confidence = ${match.confidence},
          updated_at = NOW()
      WHERE id = ${existing.id}
    `));
    matchedCount++;
  }

  // 5. Insert new items
  let createdCount = 0;
  for (const item of newItems) {
    const block = newBlocks[item.index];
    await db.execute(sql.raw(`
      INSERT INTO ime_action_items
        (content, owner, origin_meeting_id, origin_block_id, status, meeting_appearances, appearance_count, first_seen_date, last_seen_date)
      VALUES (
        '${(item.content || block?.content || "").replace(/'/g, "''")}',
        '${(item.owner || block?.speaker || "").replace(/'/g, "''")}',
        '${meetingId.replace(/'/g, "''")}',
        ${block?.id ?? 'NULL'},
        'open',
        '${JSON.stringify([meetingId])}',
        1,
        NOW(),
        NOW()
      )
    `));
    createdCount++;
  }

  return { meetingId, matched: matchedCount, created: createdCount };
}

export async function getActionItemDashboard(filters: { status?: string; owner?: string }) {
  const db = await requireDb();

  const conditions: string[] = ["1=1"];
  if (filters.status) conditions.push(`status = '${filters.status}'`);
  if (filters.owner) conditions.push(`owner ILIKE '%${filters.owner}%'`);
  const where = conditions.join(" AND ");

  // Status counts
  const statusResult = await db.execute(sql.raw(`
    SELECT status, COUNT(*) as cnt FROM ime_action_items GROUP BY status
  `));
  const statusCounts: Record<string, number> = {};
  for (const row of statusResult.rows as any[]) {
    statusCounts[row.status] = Number(row.cnt);
  }

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const completed = statusCounts["completed"] || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Avg resolution days
  const avgResult = await db.execute(sql.raw(`
    SELECT AVG(EXTRACT(EPOCH FROM (resolved_date - first_seen_date)) / 86400) as avg_days
    FROM ime_action_items
    WHERE status = 'completed' AND resolved_date IS NOT NULL
  `));
  const avgResolutionDays = Math.round(Number((avgResult.rows as any[])[0]?.avg_days) || 0);

  // Stale items (top 20)
  const staleResult = await db.execute(sql.raw(`
    SELECT * FROM ime_action_items
    WHERE status = 'stale'
    ORDER BY appearance_count DESC, last_seen_date DESC
    LIMIT 20
  `));

  // Owner rankings
  const ownerResult = await db.execute(sql.raw(`
    SELECT
      owner,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'stale' THEN 1 ELSE 0 END) as stale
    FROM ime_action_items
    WHERE owner IS NOT NULL AND owner != ''
    GROUP BY owner
    ORDER BY total DESC
    LIMIT 20
  `));

  // All items with filter
  const itemsResult = await db.execute(sql.raw(`
    SELECT * FROM ime_action_items
    WHERE ${where}
    ORDER BY updated_at DESC
    LIMIT 100
  `));

  return {
    statusCounts,
    total,
    completionRate,
    avgResolutionDays,
    staleItems: staleResult.rows,
    ownerRankings: ownerResult.rows,
    items: itemsResult.rows,
  };
}

export async function updateActionItemStatus(itemId: number, status: string) {
  const db = await requireDb();
  const resolvedClause = status === "completed" ? ", resolved_date = NOW()" : "";
  await db.execute(sql.raw(`
    UPDATE ime_action_items
    SET status = '${status}'${resolvedClause}, updated_at = NOW()
    WHERE id = ${itemId}
  `));
  return { success: true, itemId, status };
}

// ============================================================================
// Phase 3 — Feature 3: Topic Continuity
// ============================================================================

export async function extractAndTrackTopics(meetingId: string) {
  const db = await requireDb();

  // 1. Get all content blocks + meeting metadata
  const meetingResult = await db.execute(sql`
    SELECT id, title, objective, summary, meeting_date FROM meeting_records WHERE id = ${meetingId}
  `);
  const meeting = (meetingResult.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const blocksResult = await db.execute(sql`
    SELECT block_type, content, speaker
    FROM meeting_content_blocks
    WHERE meeting_id = ${meetingId}
    ORDER BY sort_order ASC
  `);
  const blocks = blocksResult.rows as any[];

  // 2. Get existing non-closed topics
  const existingResult = await db.execute(sql`
    SELECT id, topic_name, topic_description, status, meeting_appearances, appearance_count
    FROM ime_topic_continuity
    WHERE status NOT IN ('closed', 'decided')
    ORDER BY last_seen_date DESC
    LIMIT 100
  `);
  const existingTopics = existingResult.rows as any[];

  // 3. LLM extracts topics
  let topicResults: {
    matched: { existingId: number; topicName: string; statusInThisMeeting: string; summary: string; confidence: number }[];
    newTopics: { topicName: string; description: string; status: string; summary: string }[];
  } = { matched: [], newTopics: [] };

  const blockSummary = blocks.slice(0, 50).map((b: any) => `[${b.block_type}] ${b.speaker}: ${(b.content || "").substring(0, 200)}`).join("\n");
  const existingSummary = existingTopics.map((t: any) => ({
    id: t.id,
    topicName: t.topic_name,
    status: t.status,
  }));

  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a meeting topic analyst. Extract 3-7 key discussion topics from a meeting and match them against existing tracked topics. Return JSON only.",
        },
        {
          role: "user",
          content: `Meeting: "${meeting.title}"\nObjective: ${meeting.objective || "N/A"}\nSummary: ${meeting.summary || "N/A"}\n\nContent blocks:\n${blockSummary}\n\nExisting tracked topics:\n${JSON.stringify(existingSummary, null, 2)}\n\nExtract 3-7 topics discussed in this meeting. For each topic:\n- If it matches an existing topic, include existingId\n- statusInThisMeeting: one of "introduced", "debated", "decided", "closed"\n- summary: brief description of what was discussed about this topic in this meeting`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "topic_extraction",
          schema: {
            type: "object",
            properties: {
              matched: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    existingId: { type: "number" },
                    topicName: { type: "string" },
                    statusInThisMeeting: { type: "string" },
                    summary: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["existingId", "topicName", "statusInThisMeeting", "summary", "confidence"],
                  additionalProperties: false,
                },
              },
              newTopics: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    topicName: { type: "string" },
                    description: { type: "string" },
                    status: { type: "string" },
                    summary: { type: "string" },
                  },
                  required: ["topicName", "description", "status", "summary"],
                  additionalProperties: false,
                },
              },
            },
            required: ["matched", "newTopics"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
    topicResults = { matched: parsed.matched || [], newTopics: parsed.newTopics || [] };
  } catch (e) {
    console.error("[IME] Topic extraction LLM failed, using heuristic:", e);
    // Heuristic fallback: extract from decision/insight blocks
    const decisionBlocks = blocks.filter((b: any) => b.block_type === "decision" || b.block_type === "insight");
    for (const block of decisionBlocks.slice(0, 5)) {
      const topicName = (block.content || "").substring(0, 100);
      topicResults.newTopics.push({
        topicName,
        description: block.content || "",
        status: block.block_type === "decision" ? "decided" : "introduced",
        summary: block.content || "",
      });
    }
  }

  // 4. Process matched topics
  let matchedCount = 0;
  for (const match of topicResults.matched) {
    const existing = existingTopics.find((t: any) => t.id === match.existingId);
    if (!existing) continue;

    const appearances = JSON.parse(existing.meeting_appearances || "[]");
    appearances.push({
      meetingId,
      date: meeting.meeting_date,
      statusAtMeeting: match.statusInThisMeeting,
      summary: match.summary,
    });
    const newCount = (Number(existing.appearance_count) || 1) + 1;

    // Determine new status
    let newStatus = match.statusInThisMeeting;
    if (newStatus === "decided" || newStatus === "closed") {
      // Keep as decided/closed
    } else if (newCount >= 3 && existing.status !== "decided") {
      newStatus = "stalled";
    }

    const resolvedClause = (newStatus === "decided" || newStatus === "closed")
      ? `, resolved_meeting_id = '${meetingId.replace(/'/g, "''")}', resolved_date = NOW()`
      : "";

    await db.execute(sql.raw(`
      UPDATE ime_topic_continuity
      SET meeting_appearances = '${JSON.stringify(appearances).replace(/'/g, "''")}',
          appearance_count = ${newCount},
          last_seen_date = NOW(),
          status = '${newStatus}',
          ai_match_confidence = ${match.confidence}${resolvedClause},
          updated_at = NOW()
      WHERE id = ${existing.id}
    `));
    matchedCount++;
  }

  // 5. Insert new topics
  let createdCount = 0;
  for (const topic of topicResults.newTopics) {
    const appearance = [{
      meetingId,
      date: meeting.meeting_date,
      statusAtMeeting: topic.status,
      summary: topic.summary,
    }];

    const resolvedClause = (topic.status === "decided" || topic.status === "closed")
      ? `, '${meetingId.replace(/'/g, "''")}', NOW()`
      : ", NULL, NULL";

    await db.execute(sql.raw(`
      INSERT INTO ime_topic_continuity
        (topic_name, topic_description, status, meeting_appearances, appearance_count, first_seen_meeting_id, first_seen_date, last_seen_date, resolved_meeting_id, resolved_date)
      VALUES (
        '${(topic.topicName || "").replace(/'/g, "''")}',
        '${(topic.description || "").replace(/'/g, "''")}',
        '${topic.status}',
        '${JSON.stringify(appearance).replace(/'/g, "''")}',
        1,
        '${meetingId.replace(/'/g, "''")}',
        NOW(),
        NOW()${resolvedClause}
      )
    `));
    createdCount++;
  }

  return { meetingId, matched: matchedCount, created: createdCount };
}

export async function getTopicContinuityDashboard(filters: { status?: string }) {
  const db = await requireDb();

  const conditions: string[] = ["1=1"];
  if (filters.status) conditions.push(`status = '${filters.status}'`);
  const where = conditions.join(" AND ");

  // Status distribution
  const statusResult = await db.execute(sql.raw(`
    SELECT status, COUNT(*) as cnt FROM ime_topic_continuity GROUP BY status
  `));
  const statusCounts: Record<string, number> = {};
  for (const row of statusResult.rows as any[]) {
    statusCounts[row.status] = Number(row.cnt);
  }

  // Stalled topics (top 20)
  const stalledResult = await db.execute(sql.raw(`
    SELECT * FROM ime_topic_continuity
    WHERE status = 'stalled'
    ORDER BY appearance_count DESC, last_seen_date DESC
    LIMIT 20
  `));

  // Resolution stats
  const resResult = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as resolved_count,
      AVG(EXTRACT(EPOCH FROM (resolved_date - first_seen_date)) / 86400) as avg_days
    FROM ime_topic_continuity
    WHERE status IN ('decided', 'closed') AND resolved_date IS NOT NULL
  `));
  const resStats = (resResult.rows as any[])[0] || {};

  // Topic timeline (last 50)
  const timelineResult = await db.execute(sql.raw(`
    SELECT * FROM ime_topic_continuity
    WHERE ${where}
    ORDER BY last_seen_date DESC
    LIMIT 50
  `));

  return {
    statusCounts,
    stalledTopics: stalledResult.rows,
    resolutionStats: {
      resolvedCount: Number(resStats.resolved_count) || 0,
      avgResolutionDays: Math.round(Number(resStats.avg_days) || 0),
    },
    topics: timelineResult.rows,
  };
}

export async function updateTopicStatus(topicId: number, status: string) {
  const db = await requireDb();
  const resolvedClause = (status === "decided" || status === "closed") ? ", resolved_date = NOW()" : "";
  await db.execute(sql.raw(`
    UPDATE ime_topic_continuity
    SET status = '${status}'${resolvedClause}, updated_at = NOW()
    WHERE id = ${topicId}
  `));
  return { success: true, topicId, status };
}

// ============================================================================
// Phase 4 — Feature 1: Meeting Sentiment & Conflict Detection
// ============================================================================

export async function analyzeMeetingSentiment(meetingId: string) {
  const db = await requireDb();

  // 1. Get meeting record
  const meetingResult = await db.execute(sql`
    SELECT id, title, objective, summary FROM meeting_records WHERE id = ${meetingId}
  `);
  const meeting = (meetingResult.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // 2. Get content blocks ordered by sort_order
  const blocksResult = await db.execute(sql`
    SELECT speaker, block_type, content, sort_order
    FROM meeting_content_blocks
    WHERE meeting_id = ${meetingId}
    ORDER BY sort_order ASC
    LIMIT 80
  `);
  const blocks = blocksResult.rows as any[];

  // 3. Build conversation flow text
  const conversationFlow = blocks
    .map((b: any) => `[${b.speaker || "unknown"}] ${b.content}`)
    .join("\n");

  // 4. LLM analysis
  let sentimentData: any = null;
  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个会议情感分析专家。分析会议的整体情感、紧张程度、协作氛围，以及各参会者的情感状态。请用中文回答。Return JSON only.",
        },
        {
          role: "user",
          content: `会议标题: "${meeting.title}"\n目标: ${meeting.objective || "N/A"}\n摘要: ${meeting.summary || "N/A"}\n\n对话记录:\n${conversationFlow}\n\n请分析并返回以下结构:\n- overallSentiment (positive/neutral/negative/mixed)\n- sentimentScore (-1到+1)\n- tensionLevel (0-10)\n- collaborationTone (0-10)\n- frustrationIndicators (负面指标计数)\n- consensusReached (是否达成共识)\n- speakerSentiments: 每位发言者的 [{speaker, sentiment, tensionLevel, keyEmotionalMoments}]\n- emotionalArc: 3-5个阶段 [{phase, sentiment, description}]\n- conflictTopics: 有分歧的议题列表\n- narrative: 2-3句中文情感总结`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "meeting_sentiment",
          schema: {
            type: "object",
            properties: {
              overallSentiment: { type: "string" },
              sentimentScore: { type: "number" },
              tensionLevel: { type: "number" },
              collaborationTone: { type: "number" },
              frustrationIndicators: { type: "number" },
              consensusReached: { type: "boolean" },
              speakerSentiments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    speaker: { type: "string" },
                    sentiment: { type: "string" },
                    tensionLevel: { type: "number" },
                    keyEmotionalMoments: { type: "string" },
                  },
                  required: ["speaker", "sentiment", "tensionLevel", "keyEmotionalMoments"],
                  additionalProperties: false,
                },
              },
              emotionalArc: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    phase: { type: "string" },
                    sentiment: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["phase", "sentiment", "description"],
                  additionalProperties: false,
                },
              },
              conflictTopics: { type: "array", items: { type: "string" } },
              narrative: { type: "string" },
            },
            required: [
              "overallSentiment", "sentimentScore", "tensionLevel", "collaborationTone",
              "frustrationIndicators", "consensusReached", "speakerSentiments",
              "emotionalArc", "conflictTopics", "narrative",
            ],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });
    sentimentData = JSON.parse(llmResult.content);
  } catch {
    // Heuristic fallback
    const text = conversationFlow;
    const negWords = ["反对", "不同意", "问题", "困难", "不行", "不可以", "失败", "担心"];
    const posWords = ["同意", "支持", "好的", "可以", "赞成", "不错", "完成", "成功"];
    let negCount = 0, posCount = 0;
    for (const w of negWords) negCount += (text.match(new RegExp(w, "g")) || []).length;
    for (const w of posWords) posCount += (text.match(new RegExp(w, "g")) || []).length;
    const total = negCount + posCount || 1;
    const ratio = (posCount - negCount) / total;
    sentimentData = {
      overallSentiment: ratio > 0.2 ? "positive" : ratio < -0.2 ? "negative" : "neutral",
      sentimentScore: Math.max(-1, Math.min(1, ratio)),
      tensionLevel: Math.min(10, negCount * 1.5),
      collaborationTone: Math.min(10, posCount * 1.5),
      frustrationIndicators: negCount,
      consensusReached: ratio > 0,
      speakerSentiments: [],
      emotionalArc: [{ phase: "overall", sentiment: ratio > 0 ? "positive" : "neutral", description: "启发式分析" }],
      conflictTopics: [],
      narrative: `基于关键词分析: 正面指标${posCount}个，负面指标${negCount}个。`,
    };
  }

  // 5. Delete+insert
  await db.execute(sql`DELETE FROM ime_meeting_sentiment WHERE meeting_id = ${meetingId}`);
  await db.execute(sql`
    INSERT INTO ime_meeting_sentiment (
      meeting_id, overall_sentiment, sentiment_score, tension_level, collaboration_tone,
      frustration_indicators, consensus_reached, speaker_sentiments, emotional_arc,
      conflict_topics, ai_narrative, analyzed_at
    ) VALUES (
      ${meetingId}, ${sentimentData.overallSentiment},
      ${sentimentData.sentimentScore}, ${sentimentData.tensionLevel},
      ${sentimentData.collaborationTone}, ${sentimentData.frustrationIndicators},
      ${sentimentData.consensusReached},
      ${JSON.stringify(sentimentData.speakerSentiments)},
      ${JSON.stringify(sentimentData.emotionalArc)},
      ${JSON.stringify(sentimentData.conflictTopics)},
      ${sentimentData.narrative}, NOW()
    )
  `);

  return { meetingId, ...sentimentData };
}

export async function getSentimentDashboard(filters: { channelId?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const conditions: string[] = ["1=1"];
  if (filters.channelId) conditions.push(`mr.channel_id = '${filters.channelId}'`);
  if (filters.dateFrom) conditions.push(`ms.analyzed_at >= '${filters.dateFrom}'`);
  if (filters.dateTo) conditions.push(`ms.analyzed_at <= '${filters.dateTo}'`);
  const where = conditions.join(" AND ");

  // Aggregates
  const aggResult = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as total_analyzed,
      AVG(ms.sentiment_score) as avg_sentiment,
      AVG(ms.tension_level) as avg_tension,
      AVG(ms.collaboration_tone) as avg_collaboration
    FROM ime_meeting_sentiment ms
    LEFT JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE ${where}
  `));
  const agg = (aggResult.rows as any[])[0] || {};

  // Sentiment distribution
  const distResult = await db.execute(sql.raw(`
    SELECT ms.overall_sentiment, COUNT(*) as cnt
    FROM ime_meeting_sentiment ms
    LEFT JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE ${where}
    GROUP BY ms.overall_sentiment
  `));
  const distribution: Record<string, number> = {};
  for (const row of distResult.rows as any[]) {
    distribution[row.overall_sentiment] = Number(row.cnt);
  }

  // Tension trend (last 30 meetings)
  const trendResult = await db.execute(sql.raw(`
    SELECT ms.meeting_id, mr.title, ms.tension_level, ms.sentiment_score, ms.analyzed_at
    FROM ime_meeting_sentiment ms
    LEFT JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE ${where}
    ORDER BY ms.analyzed_at DESC
    LIMIT 30
  `));

  // Highest tension meetings
  const highTensionResult = await db.execute(sql.raw(`
    SELECT ms.meeting_id, mr.title, mr.meeting_date, ms.tension_level,
           ms.overall_sentiment, ms.conflict_topics
    FROM ime_meeting_sentiment ms
    LEFT JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE ${where}
    ORDER BY ms.tension_level DESC
    LIMIT 5
  `));

  // Speaker sentiment rankings
  const speakerResult = await db.execute(sql.raw(`
    SELECT ms.speaker_sentiments
    FROM ime_meeting_sentiment ms
    LEFT JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE ${where} AND ms.speaker_sentiments IS NOT NULL
    ORDER BY ms.analyzed_at DESC
    LIMIT 50
  `));
  const speakerMap = new Map<string, { totalSentiment: number; count: number }>();
  for (const row of speakerResult.rows as any[]) {
    try {
      const speakers = JSON.parse(row.speaker_sentiments);
      for (const s of speakers) {
        const entry = speakerMap.get(s.speaker) || { totalSentiment: 0, count: 0 };
        const sentVal = s.sentiment === "positive" ? 1 : s.sentiment === "negative" ? -1 : 0;
        entry.totalSentiment += sentVal;
        entry.count++;
        speakerMap.set(s.speaker, entry);
      }
    } catch { /* skip */ }
  }
  const speakerRankings = Array.from(speakerMap.entries())
    .map(([speaker, data]) => ({ speaker, avgSentiment: data.totalSentiment / data.count, meetings: data.count }))
    .sort((a, b) => b.avgSentiment - a.avgSentiment)
    .slice(0, 10);

  return {
    stats: {
      totalAnalyzed: Number(agg.total_analyzed) || 0,
      avgSentiment: Number(Number(agg.avg_sentiment).toFixed(2)) || 0,
      avgTension: Number(Number(agg.avg_tension).toFixed(1)) || 0,
      avgCollaboration: Number(Number(agg.avg_collaboration).toFixed(1)) || 0,
    },
    distribution,
    tensionTrend: (trendResult.rows as any[]).reverse(),
    highTensionMeetings: highTensionResult.rows,
    speakerRankings,
  };
}

export async function batchAnalyzeSentiment(meetingIds: string[]) {
  const results: { meetingId: string; success: boolean; error?: string }[] = [];
  for (const meetingId of meetingIds) {
    try {
      await analyzeMeetingSentiment(meetingId);
      results.push({ meetingId, success: true });
    } catch (e: any) {
      results.push({ meetingId, success: false, error: e.message });
    }
  }
  return results;
}

// ============================================================================
// Phase 4 — Feature 2: Meeting Health Score & Optimization
// ============================================================================

export async function computeMeetingHealth(scope: string, scopeId?: string, period?: string) {
  const db = await requireDb();

  const dateCondition = period ? `AND mr.meeting_date >= NOW() - INTERVAL '${period}'` : "";
  const scopeCondition = scope === "meeting" && scopeId
    ? `AND mr.id = '${scopeId}'`
    : scope === "department" && scopeId
    ? `AND mr.channel_id = '${scopeId}'`
    : "";

  // 1. Effectiveness scores
  const effResult = await db.execute(sql.raw(`
    SELECT AVG(mes.overall_score) as avg_effectiveness
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE 1=1 ${scopeCondition} ${dateCondition}
  `));
  const avgEffectiveness = Number((effResult.rows as any[])[0]?.avg_effectiveness) || 0;

  // 2. Cost data
  const costResult = await db.execute(sql.raw(`
    SELECT AVG(mc.total_cost) as avg_cost, MAX(mc.total_cost) as max_cost
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE 1=1 ${scopeCondition} ${dateCondition}
  `));
  const avgCost = Number((costResult.rows as any[])[0]?.avg_cost) || 0;
  const maxCost = Number((costResult.rows as any[])[0]?.max_cost) || 1;

  // 3. Sentiment data
  const sentResult = await db.execute(sql.raw(`
    SELECT AVG(ms.sentiment_score) as avg_sentiment
    FROM ime_meeting_sentiment ms
    JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE 1=1 ${scopeCondition} ${dateCondition}
  `));
  const avgSentiment = Number((sentResult.rows as any[])[0]?.avg_sentiment) || 0;

  // 4. Action item completion rate
  const actionResult = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM ime_action_items
  `));
  const actionTotal = Number((actionResult.rows as any[])[0]?.total) || 1;
  const actionCompleted = Number((actionResult.rows as any[])[0]?.completed) || 0;

  // 5. Topic resolution rate
  const topicResult = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status IN ('decided', 'closed') THEN 1 ELSE 0 END) as resolved
    FROM ime_topic_continuity
  `));
  const topicTotal = Number((topicResult.rows as any[])[0]?.total) || 1;
  const topicResolved = Number((topicResult.rows as any[])[0]?.resolved) || 0;

  // 6. Participation balance
  const partResult = await db.execute(sql.raw(`
    SELECT AVG(mes.participation_balance) as avg_balance
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE 1=1 ${scopeCondition} ${dateCondition}
  `));
  const avgBalance = Number((partResult.rows as any[])[0]?.avg_balance) || 0;

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
  let recommendations: any[] = [];
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
    recommendations = JSON.parse(llmResult.content).recommendations;
  } catch {
    recommendations = [
      { type: "improve_agenda", priority: "medium", title: "优化会议议程", description: "确保每次会议有明确目标和议程", expectedImpact: "提升效能5-10分" },
    ];
  }

  // Delete+insert
  const scopeIdVal = scopeId || scope;
  await db.execute(sql.raw(`
    DELETE FROM ime_meeting_health WHERE scope = '${scope}' AND scope_id = '${scopeIdVal}'
  `));
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

  const conditions: string[] = ["1=1"];
  if (filters.scope) conditions.push(`scope = '${filters.scope}'`);
  const where = conditions.join(" AND ");

  // Current health records
  const currentResult = await db.execute(sql.raw(`
    SELECT * FROM ime_meeting_health
    WHERE ${where}
    ORDER BY computed_at DESC
    LIMIT 1
  `));
  const current = (currentResult.rows as any[])[0];

  // Health trend (last 6 records)
  const trendResult = await db.execute(sql.raw(`
    SELECT health_score, grade, dimensions, computed_at
    FROM ime_meeting_health
    WHERE ${where}
    ORDER BY computed_at DESC
    LIMIT 6
  `));

  // Department comparison (all scopes)
  const deptResult = await db.execute(sql.raw(`
    SELECT DISTINCT ON (scope_id) scope_id, health_score, grade, dimensions, computed_at
    FROM ime_meeting_health
    WHERE scope = 'department'
    ORDER BY scope_id, computed_at DESC
  `));

  return {
    current: current ? {
      healthScore: Number(current.health_score),
      grade: current.grade,
      dimensions: JSON.parse(current.dimensions || "{}"),
      recommendations: JSON.parse(current.recommendations || "[]"),
      computedAt: current.computed_at,
    } : null,
    trend: (trendResult.rows as any[]).reverse().map((r: any) => ({
      healthScore: Number(r.health_score),
      grade: r.grade,
      dimensions: JSON.parse(r.dimensions || "{}"),
      computedAt: r.computed_at,
    })),
    departmentComparison: (deptResult.rows as any[]).map((r: any) => ({
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
  const healthResult = await db.execute(sql.raw(`
    SELECT * FROM ime_meeting_health
    WHERE scope = '${scope}' AND scope_id = '${scopeIdVal}'
    ORDER BY computed_at DESC LIMIT 1
  `));
  const health = (healthResult.rows as any[])[0];

  // Get patterns
  const patternsResult = await db.execute(sql.raw(`
    SELECT pattern_type, pattern_data, ai_insight FROM ime_meeting_patterns
    ORDER BY created_at DESC LIMIT 10
  `));

  // Get stale action items count
  const staleResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM ime_action_items WHERE status = 'stale'
  `));
  const staleCount = Number((staleResult.rows as any[])[0]?.cnt) || 0;

  // Get stalled topics count
  const stalledResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM ime_topic_continuity WHERE status = 'stalled'
  `));
  const stalledCount = Number((stalledResult.rows as any[])[0]?.cnt) || 0;

  // Get high tension meetings count
  const tensionResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM ime_meeting_sentiment WHERE tension_level >= 7
  `));
  const highTensionCount = Number((tensionResult.rows as any[])[0]?.cnt) || 0;

  const healthDims = health ? JSON.parse(health.dimensions || "{}") : {};
  const patterns = (patternsResult.rows as any[]).map((p: any) => ({
    type: p.pattern_type,
    insight: p.ai_insight,
  }));

  let recommendations: any[] = [];
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
    recommendations = JSON.parse(llmResult.content).recommendations;
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

  // Determine date range
  const days = digestType === "weekly" ? 7 : digestType === "monthly" ? 30 : 7;
  const dateRange = period || `${days} days`;

  // Aggregate metrics
  const meetingResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM meeting_records WHERE meeting_date >= NOW() - INTERVAL '${dateRange}'
  `));
  const meetingCount = Number((meetingResult.rows as any[])[0]?.cnt) || 0;

  const costResult = await db.execute(sql.raw(`
    SELECT SUM(total_cost) as total, AVG(total_cost) as avg_cost
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL '${dateRange}'
  `));
  const totalCost = Number((costResult.rows as any[])[0]?.total) || 0;

  const effResult = await db.execute(sql.raw(`
    SELECT AVG(overall_score) as avg_eff
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL '${dateRange}'
  `));
  const avgEffectiveness = Number((effResult.rows as any[])[0]?.avg_eff) || 0;

  const sentResult = await db.execute(sql.raw(`
    SELECT AVG(sentiment_score) as avg_sent
    FROM ime_meeting_sentiment ms
    JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL '${dateRange}'
  `));
  const avgSentiment = Number((sentResult.rows as any[])[0]?.avg_sent) || 0;

  // Action items
  const actionResult = await db.execute(sql.raw(`
    SELECT
      SUM(CASE WHEN created_at >= NOW() - INTERVAL '${dateRange}' THEN 1 ELSE 0 END) as new_items,
      SUM(CASE WHEN status = 'completed' AND updated_at >= NOW() - INTERVAL '${dateRange}' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'stale' THEN 1 ELSE 0 END) as stale_count
    FROM ime_action_items
  `));
  const actionStats = (actionResult.rows as any[])[0] || {};

  // Topics
  const topicResult = await db.execute(sql.raw(`
    SELECT
      SUM(CASE WHEN first_seen_date >= NOW() - INTERVAL '${dateRange}' THEN 1 ELSE 0 END) as introduced,
      SUM(CASE WHEN status IN ('decided', 'closed') AND resolved_date >= NOW() - INTERVAL '${dateRange}' THEN 1 ELSE 0 END) as decided,
      SUM(CASE WHEN status = 'stalled' THEN 1 ELSE 0 END) as stalled
    FROM ime_topic_continuity
  `));
  const topicStats = (topicResult.rows as any[])[0] || {};

  // HR signals
  const hrResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM ime_hr_signals WHERE created_at >= NOW() - INTERVAL '${dateRange}'
  `));
  const hrSignalCount = Number((hrResult.rows as any[])[0]?.cnt) || 0;

  // Patterns
  const patternResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM ime_meeting_patterns WHERE created_at >= NOW() - INTERVAL '${dateRange}'
  `));
  const patternCount = Number((patternResult.rows as any[])[0]?.cnt) || 0;

  // Highlights
  const highlights: any[] = [];

  // Most expensive meeting
  const expensiveResult = await db.execute(sql.raw(`
    SELECT mc.meeting_id, mr.title, mc.total_cost
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL '${dateRange}'
    ORDER BY mc.total_cost DESC LIMIT 1
  `));
  if ((expensiveResult.rows as any[])[0]) {
    const m = (expensiveResult.rows as any[])[0];
    highlights.push({ type: "cost", title: "最高成本会议", description: `${m.title}: ¥${Number(m.total_cost).toFixed(0)}`, severity: "info" });
  }

  // Highest tension
  const tensionHighResult = await db.execute(sql.raw(`
    SELECT ms.meeting_id, mr.title, ms.tension_level
    FROM ime_meeting_sentiment ms
    JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL '${dateRange}'
    ORDER BY ms.tension_level DESC LIMIT 1
  `));
  if ((tensionHighResult.rows as any[])[0]) {
    const m = (tensionHighResult.rows as any[])[0];
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
  const alerts: any[] = [];

  // Health grade check
  const healthResult = await db.execute(sql.raw(`
    SELECT health_score, grade FROM ime_meeting_health ORDER BY computed_at DESC LIMIT 1
  `));
  const latestHealth = (healthResult.rows as any[])[0];
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
    narrativeSummary = JSON.parse(llmResult.content).narrative;
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

  const conditions: string[] = ["1=1"];
  if (filters.digestType) conditions.push(`digest_type = '${filters.digestType}'`);
  if (filters.scope) conditions.push(`scope = '${filters.scope}'`);
  const where = conditions.join(" AND ");
  const limit = filters.limit || 10;

  const result = await db.execute(sql.raw(`
    SELECT * FROM ime_digest_alerts
    WHERE ${where}
    ORDER BY generated_at DESC
    LIMIT ${limit}
  `));

  return (result.rows as any[]).map((row: any) => ({
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
  const conditions: string[] = ["1=1"];
  if (scope) conditions.push(`scope = '${scope}'`);
  if (scopeId) conditions.push(`scope_id = '${scopeId}'`);
  const where = conditions.join(" AND ");

  const digestResult = await db.execute(sql.raw(`
    SELECT alerts FROM ime_digest_alerts
    WHERE ${where}
    ORDER BY generated_at DESC LIMIT 1
  `));
  let digestAlerts: any[] = [];
  if ((digestResult.rows as any[])[0]) {
    digestAlerts = JSON.parse((digestResult.rows as any[])[0].alerts || "[]")
      .filter((a: any) => a.severity === "critical" || a.severity === "warning");
  }

  // Real-time: stale action items
  const staleResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM ime_action_items WHERE status = 'stale' AND appearance_count >= 3
  `));
  const staleCount = Number((staleResult.rows as any[])[0]?.cnt) || 0;

  // Real-time: stalled topics
  const stalledResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM ime_topic_continuity WHERE status = 'stalled' AND appearance_count >= 3
  `));
  const stalledCount = Number((stalledResult.rows as any[])[0]?.cnt) || 0;

  // Real-time: health grade
  const healthResult = await db.execute(sql.raw(`
    SELECT health_score, grade FROM ime_meeting_health ORDER BY computed_at DESC LIMIT 1
  `));
  const latestHealth = (healthResult.rows as any[])[0];

  const realTimeAlerts: any[] = [];
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
