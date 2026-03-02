/**
 * G-IME: Intelligent Meeting Executive - Service Layer
 * 参会者贡献分析与会议效能评估服务
 */

import crypto from "crypto";
import { requireDb } from "../db";
import { sql, type SQL } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { tracePerformance } from "../services/performance-trace.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ime");

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
      log.error({ err: e }, "LLM scoring failed, using heuristic scoring");
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
    log.error({ err: e }, "LLM narrative failed");
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

  const conditions: SQL[] = [sql`1=1`];
  if (filters.channelId) conditions.push(sql`mr.channel_id = ${filters.channelId}`);
  if (filters.dateFrom) conditions.push(sql`mr.meeting_date >= ${filters.dateFrom}`);
  if (filters.dateTo) conditions.push(sql`mr.meeting_date <= ${filters.dateTo}`);
  const where = sql.join(conditions, sql` AND `);

  // Stats
  const statsResult = await db.execute(sql`
    SELECT
      COUNT(DISTINCT mes.meeting_id) as analyzed_meetings,
      AVG(mes.overall_score) as avg_effectiveness,
      COUNT(DISTINCT mc.employee_id) as active_participants
    FROM meeting_effectiveness_scores mes
    LEFT JOIN meeting_records mr ON mes.meeting_id = mr.id
    LEFT JOIN meeting_contributions mc ON mes.meeting_id = mc.meeting_id
    WHERE ${where}
  `);
  const stats = (statsResult.rows as any[])[0] || {};

  // Top contributors
  const topResult = await db.execute(sql`
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
  `);

  // Effectiveness trend (last 30 days)
  const trendResult = await db.execute(sql`
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
  `);

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

  const conditions: SQL[] = [sql`mc.employee_id = ${employeeId}`];
  if (dateFrom) conditions.push(sql`mr.meeting_date >= ${dateFrom}`);
  if (dateTo) conditions.push(sql`mr.meeting_date <= ${dateTo}`);
  const where = sql.join(conditions, sql` AND `);

  const result = await db.execute(sql`
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
  `);

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
      const empResult = await db.execute(sql`
        SELECT id FROM hrm_employees
        WHERE name = ${speaker} OR "employeeCode" = ${speaker}
        LIMIT 1
      `);
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
    log.error({ err: e }, "Engagement LLM scoring failed, using heuristic");
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
    const contribResult = await db.execute(sql`
      SELECT id, ai_analysis FROM meeting_contributions
      WHERE meeting_id = ${meetingId}
        AND (employee_name = ${result.speaker} OR employee_id = ${result.speaker})
      LIMIT 1
    `);
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

    const updatedJson = JSON.stringify(analysis);
    await db.execute(sql`
      UPDATE meeting_contributions
      SET ai_analysis = ${updatedJson}
      WHERE id = ${existing.id}
    `);
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
  const statsResult = await db.execute(sql`
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
    WHERE he.department = ${department}
      AND mr.meeting_date::text LIKE ${period + '%'}
  `);
  const stats = (statsResult.rows as any[])[0] || {};

  // Top contributors for this department
  const topResult = await db.execute(sql`
    SELECT
      mc.employee_id,
      mc.employee_name,
      AVG(mc.contribution_score) as avg_score
    FROM meeting_contributions mc
    JOIN hrm_employees he ON mc.employee_id = he."employeeCode"
    LEFT JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE he.department = ${department}
      AND mr.meeting_date::text LIKE ${period + '%'}
    GROUP BY mc.employee_id, mc.employee_name
    ORDER BY avg_score DESC
    LIMIT 5
  `);

  const topContributors = JSON.stringify(topResult.rows);

  // Upsert rollup
  await db.execute(sql`
    DELETE FROM ime_department_rollups
    WHERE department = ${department} AND period = ${period}
  `);

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
    const existing = await db.execute(sql`
      SELECT * FROM ime_department_rollups
      WHERE department = ${dept} AND period = ${period}
      ORDER BY computed_at DESC LIMIT 1
    `);

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
  const periodCond = period ? sql`AND mr.meeting_date::text LIKE ${period + '%'}` : sql``;
  const deptCond = scope === "department" && scopeId ? sql`AND he.department = ${scopeId}` : sql``;

  // Rankings by department
  const rankingsResult = await db.execute(sql`
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
    WHERE 1=1 ${periodCond} ${deptCond}
    GROUP BY he.department
    ORDER BY avg_effectiveness DESC
  `);

  // Org averages
  const orgResult = await db.execute(sql`
    SELECT
      AVG(mes.overall_score) as org_avg_effectiveness,
      AVG(mc.contribution_score) as org_avg_contribution,
      COUNT(DISTINCT mc.meeting_id) as total_meetings,
      COUNT(DISTINCT mc.employee_id) as total_participants
    FROM meeting_contributions mc
    LEFT JOIN meeting_effectiveness_scores mes ON mc.meeting_id = mes.meeting_id
    LEFT JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE 1=1 ${periodCond}
  `);

  // 6-period trend
  const trendResult = await db.execute(sql`
    SELECT
      TO_CHAR(mr.meeting_date, 'YYYY-MM') as period,
      AVG(mes.overall_score) as avg_effectiveness,
      COUNT(DISTINCT mc.meeting_id) as meeting_count
    FROM meeting_contributions mc
    LEFT JOIN meeting_effectiveness_scores mes ON mc.meeting_id = mes.meeting_id
    LEFT JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE mr.meeting_date IS NOT NULL ${deptCond}
    GROUP BY TO_CHAR(mr.meeting_date, 'YYYY-MM')
    ORDER BY period DESC
    LIMIT 6
  `);

  // Worst meetings
  const worstResult = await db.execute(sql`
    SELECT
      mes.meeting_id,
      mr.title,
      mr.meeting_date,
      mes.overall_score
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE mes.overall_score IS NOT NULL ${periodCond}
    ORDER BY mes.overall_score ASC
    LIMIT 5
  `);

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
      log.error({ err: e }, "Pattern LLM narrative failed");
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
    log.error({ err: e }, "Culture report LLM failed");
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
    log.error({ err: e }, "HR signal LLM failed");
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
    log.error({ err: e }, "Performance trace for HR signal failed");
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
    log.error({ err: e }, "Training recommendation LLM failed");
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
      log.error({ err: e }, "Live suggestion LLM failed");
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
    log.error({ err: e }, "Post-session analysis failed");
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
    log.error({ err: e }, "Action item LLM matching failed, using heuristic");
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
    log.error({ err: e }, "Topic extraction LLM failed, using heuristic");
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

// ============================================================================
// Phase 5: Meeting ROI & Outcome Tracking
// ============================================================================

export async function computeMeetingRoi(meetingId: string) {
  const db = await requireDb();

  // 1. Get meeting info
  const meetingResult = await db.execute(sql`
    SELECT id, title, objective, summary FROM meeting_records WHERE id = ${meetingId}
  `);
  const meeting = (meetingResult.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // 2. Get cost from ime_meeting_costs (fallback: estimate)
  const costResult = await db.execute(sql`
    SELECT total_cost, participant_count, duration_minutes FROM ime_meeting_costs WHERE meeting_id = ${meetingId} LIMIT 1
  `);
  const costRow = (costResult.rows as any[])[0];
  const totalCost = costRow ? Number(costRow.total_cost) : 500;

  // 3. Count decisions and action items from content blocks
  const blocksResult = await db.execute(sql.raw(`
    SELECT block_type, COUNT(*) as cnt FROM meeting_content_blocks
    WHERE meeting_id = '${meetingId.replace(/'/g, "''")}'
    AND block_type IN ('decision', 'action_item')
    GROUP BY block_type
  `));
  let decisionCount = 0, actionItemCount = 0;
  for (const row of blocksResult.rows as any[]) {
    if (row.block_type === "decision") decisionCount = Number(row.cnt);
    if (row.block_type === "action_item") actionItemCount = Number(row.cnt);
  }

  // 4. Action item completion status
  const actionResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM ime_action_items
    WHERE origin_meeting_id = '${meetingId.replace(/'/g, "''")}'
  `));
  const actionRow = (actionResult.rows as any[])[0];
  const completedActionCount = Number(actionRow?.completed) || 0;

  // 5. Resolved topics linked to this meeting
  const topicResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM ime_topic_continuity
    WHERE status IN ('resolved', 'decided', 'closed')
    AND meeting_appearances ILIKE '%${meetingId.replace(/'/g, "''")}%'
  `));
  const resolvedTopics = Number((topicResult.rows as any[])[0]?.cnt) || 0;

  // 6. LLM ROI analysis
  let outcomeScore = 0, roiGrade = "C", outcomes: any[] = [], aiNarrative = "";

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
  await db.execute(sql.raw(`
    INSERT INTO ime_meeting_roi
      (meeting_id, total_cost, decision_count, action_item_count, completed_action_count,
       cost_per_decision, cost_per_action_item, outcome_score, roi_grade, outcomes, ai_narrative, computed_at)
    VALUES (
      '${meetingId.replace(/'/g, "''")}',
      ${totalCost},
      ${decisionCount},
      ${actionItemCount},
      ${completedActionCount},
      ${costPerDecision ?? "NULL"},
      ${costPerActionItem ?? "NULL"},
      ${outcomeScore},
      '${roiGrade}',
      '${JSON.stringify(outcomes).replace(/'/g, "''")}',
      '${(aiNarrative || "").replace(/'/g, "''")}',
      NOW()
    )
  `));

  return { meetingId, totalCost, decisionCount, actionItemCount, completedActionCount, outcomeScore, roiGrade, outcomes, aiNarrative };
}

export async function getRoiDashboard(filters: { channelId?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const conditions: string[] = ["1=1"];
  if (filters.channelId) conditions.push(`mr.channel_id = '${filters.channelId.replace(/'/g, "''")}'`);
  if (filters.dateFrom) conditions.push(`mr.meeting_date >= '${filters.dateFrom}'`);
  if (filters.dateTo) conditions.push(`mr.meeting_date <= '${filters.dateTo}'`);
  const where = conditions.join(" AND ");

  const statsResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as total_analyzed,
           AVG(roi.outcome_score) as avg_score,
           AVG(roi.cost_per_decision::numeric) as avg_cost_per_decision,
           SUM(roi.total_cost::numeric) as total_cost
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where}
  `));
  const stats = (statsResult.rows as any[])[0] || {};

  const gradeResult = await db.execute(sql.raw(`
    SELECT roi.roi_grade as grade, COUNT(*) as cnt
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where}
    GROUP BY roi.roi_grade
  `));
  const gradeDistribution = (gradeResult.rows as any[]).map((r: any) => ({ grade: r.grade, count: Number(r.cnt) }));

  const bestResult = await db.execute(sql.raw(`
    SELECT roi.*, mr.title as meeting_title, mr.meeting_date
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where}
    ORDER BY roi.outcome_score DESC LIMIT 5
  `));

  const worstResult = await db.execute(sql.raw(`
    SELECT roi.*, mr.title as meeting_title, mr.meeting_date
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where}
    ORDER BY roi.outcome_score ASC LIMIT 5
  `));

  const deptResult = await db.execute(sql.raw(`
    SELECT roi.department_id,
           AVG(roi.outcome_score) as avg_score,
           AVG(roi.cost_per_decision::numeric) as avg_cost_per_decision,
           COUNT(*) as meeting_count
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where} AND roi.department_id IS NOT NULL
    GROUP BY roi.department_id
    ORDER BY avg_score DESC
  `));

  const trendResult = await db.execute(sql.raw(`
    SELECT TO_CHAR(roi.computed_at, 'YYYY-MM') as month,
           AVG(roi.outcome_score) as avg_score,
           COUNT(*) as meeting_count,
           SUM(roi.total_cost::numeric) as total_cost
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    WHERE ${where}
    GROUP BY TO_CHAR(roi.computed_at, 'YYYY-MM')
    ORDER BY month
  `));

  const scatterResult = await db.execute(sql.raw(`
    SELECT roi.total_cost::numeric as cost,
           roi.outcome_score as score,
           mc.participant_count as participants,
           mr.title
    FROM ime_meeting_roi roi
    JOIN meeting_records mr ON roi.meeting_id = mr.id
    LEFT JOIN ime_meeting_costs mc ON roi.meeting_id = mc.meeting_id
    WHERE ${where}
  `));

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
  const results: any[] = [];
  for (const id of meetingIds) {
    try {
      const result = await computeMeetingRoi(id);
      results.push({ meetingId: id, success: true, ...result });
    } catch (e: any) {
      results.push({ meetingId: id, success: false, error: e.message });
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
  const meeting = (meetingResult.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const participantsResult = await db.execute(sql.raw(`
    SELECT mc.employee_id, mc.employee_name,
           mc.contribution_score,
           mc.intervention_count, mc.decision_count
    FROM meeting_contributions mc
    WHERE mc.meeting_id = '${meetingId.replace(/'/g, "''")}'
    ORDER BY mc.contribution_score DESC
  `));
  const currentParticipants = participantsResult.rows as any[];

  const enrichedParticipants: any[] = [];
  for (const p of currentParticipants) {
    const histResult = await db.execute(sql.raw(`
      SELECT AVG(contribution_score) as avg_score,
             COUNT(*) as meeting_count,
             AVG(intervention_count) as avg_engagement
      FROM meeting_contributions
      WHERE employee_id = '${(p.employee_id || "").replace(/'/g, "''")}'
    `));
    const hist = (histResult.rows as any[])[0] || {};
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
  const costRow = (costResult.rows as any[])[0];
  const durationMinutes = costRow ? Number(costRow.duration_minutes) : 60;
  const costPerPerson = costRow && costRow.participant_count ? Number(costRow.total_cost) / Number(costRow.participant_count) : 200;

  let recommendedParticipants: any[] = [], overInvitedParticipants: any[] = [];
  let optimalSize = currentParticipants.length, compositionAdvice: any = null, aiNarrative = "";
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
        employeeId: p.employeeId,
        name: p.name,
        avgScore: p.avgScore,
        costWaste: Math.round(costPerPerson),
        reason: `平均贡献分${p.avgScore}，参与${p.meetingCount}次会议`,
      }));
    optimalSize = Math.max(3, currentParticipants.length - overInvitedParticipants.length);
  }

  estimatedCostSaving = Math.round(overInvitedParticipants.length * costPerPerson * (durationMinutes / 60));

  await db.execute(sql`DELETE FROM ime_attendee_optimization WHERE meeting_id = ${meetingId}`);
  await db.execute(sql.raw(`
    INSERT INTO ime_attendee_optimization
      (meeting_id, scope, meeting_title, meeting_topic, current_participants, recommended_participants,
       over_invited_participants, optimal_size, current_size, estimated_cost_saving, composition_advice, ai_narrative, computed_at)
    VALUES (
      '${meetingId.replace(/'/g, "''")}',
      'meeting',
      '${(meeting.title || "").replace(/'/g, "''")}',
      '${(meeting.objective || "").replace(/'/g, "''")}',
      '${JSON.stringify(enrichedParticipants).replace(/'/g, "''")}',
      '${JSON.stringify(recommendedParticipants).replace(/'/g, "''")}',
      '${JSON.stringify(overInvitedParticipants).replace(/'/g, "''")}',
      ${optimalSize},
      ${currentParticipants.length},
      ${estimatedCostSaving},
      ${compositionAdvice ? `'${JSON.stringify(compositionAdvice).replace(/'/g, "''")}'` : "NULL"},
      '${(aiNarrative || "").replace(/'/g, "''")}',
      NOW()
    )
  `));

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

  const conditions: string[] = ["1=1"];
  if (filters.department) conditions.push(`ao.meeting_title ILIKE '%${filters.department.replace(/'/g, "''")}%'`);
  if (filters.dateFrom) conditions.push(`ao.computed_at >= '${filters.dateFrom}'`);
  if (filters.dateTo) conditions.push(`ao.computed_at <= '${filters.dateTo}'`);
  const where = conditions.join(" AND ");

  const statsResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as total_optimized,
           AVG(ao.estimated_cost_saving::numeric) as avg_saving,
           AVG(ao.current_size - ao.optimal_size) as avg_size_gap
    FROM ime_attendee_optimization ao
    WHERE ${where}
  `));
  const stats = (statsResult.rows as any[])[0] || {};

  const recentResult = await db.execute(sql.raw(`
    SELECT ao.over_invited_participants FROM ime_attendee_optimization ao WHERE ${where}
  `));
  const overInvitedFreq: Record<string, { name: string; count: number }> = {};
  for (const row of recentResult.rows as any[]) {
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

  const recentOptResult = await db.execute(sql.raw(`
    SELECT * FROM ime_attendee_optimization ao
    WHERE ${where}
    ORDER BY ao.computed_at DESC LIMIT 20
  `));

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

  const topicResult = await db.execute(sql.raw(`
    SELECT topic_name, meeting_appearances FROM ime_topic_continuity
    WHERE topic_name ILIKE '%${topic.replace(/'/g, "''")}%'
    OR topic_description ILIKE '%${topic.replace(/'/g, "''")}%'
    ORDER BY appearance_count DESC
    LIMIT 20
  `));

  const meetingIds = new Set<string>();
  for (const row of topicResult.rows as any[]) {
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

  const idList = Array.from(meetingIds).map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
  const excludeClause = excludeIds && excludeIds.length > 0
    ? `AND mc.employee_id NOT IN (${excludeIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})`
    : "";

  const contribResult = await db.execute(sql.raw(`
    SELECT mc.employee_id, mc.employee_name,
           AVG(mc.contribution_score) as avg_score,
           COUNT(*) as topic_meeting_count,
           SUM(mc.decision_count) as total_decisions
    FROM meeting_contributions mc
    WHERE mc.meeting_id IN (${idList}) ${excludeClause}
    GROUP BY mc.employee_id, mc.employee_name
    HAVING COUNT(*) >= 1
    ORDER BY avg_score DESC
    LIMIT 10
  `));

  const suggestions = (contribResult.rows as any[]).map((r: any) => ({
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
  const meeting = (meetingResult.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  const participantsResult = await db.execute(sql.raw(`
    SELECT mc.employee_id, mc.employee_name,
           AVG(mc.contribution_score) as avg_score,
           STDDEV(mc.contribution_score) as score_variance,
           COUNT(*) as meeting_count,
           AVG(mc.intervention_count) as avg_interventions
    FROM meeting_contributions mc
    WHERE mc.employee_id IN (
      SELECT DISTINCT employee_id FROM meeting_contributions WHERE meeting_id = '${meetingId.replace(/'/g, "''")}'
    )
    GROUP BY mc.employee_id, mc.employee_name
  `));
  const participants = participantsResult.rows as any[];
  const avgParticipantScore = participants.length > 0
    ? participants.reduce((sum: number, p: any) => sum + Number(p.avg_score || 0), 0) / participants.length
    : 50;
  const highPerformerRatio = participants.length > 0
    ? participants.filter((p: any) => Number(p.avg_score) >= 70).length / participants.length
    : 0;

  const channelResult = await db.execute(sql.raw(`
    SELECT AVG(mes.overall_score) as avg_effectiveness
    FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE mr.channel_id = '${(meeting.channel_id || "").replace(/'/g, "''")}'
  `));
  const channelAvg = Number((channelResult.rows as any[])[0]?.avg_effectiveness) || 50;

  const recentResult = await db.execute(sql.raw(`
    SELECT mes.overall_score FROM meeting_effectiveness_scores mes
    JOIN meeting_records mr ON mes.meeting_id = mr.id
    WHERE mr.channel_id = '${(meeting.channel_id || "").replace(/'/g, "''")}'
    ORDER BY mr.meeting_date DESC LIMIT 5
  `));
  const recentScores = (recentResult.rows as any[]).map((r: any) => Number(r.overall_score));
  const recentTrend = recentScores.length >= 2
    ? (recentScores[0] - recentScores[recentScores.length - 1]) / recentScores.length
    : 0;

  const stalledResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as cnt FROM ime_topic_continuity WHERE status = 'stalled'
  `));
  const stalledTopics = Number((stalledResult.rows as any[])[0]?.cnt) || 0;

  let predictedScore = 50, confidenceLevel = 0.5, riskLevel = "medium";
  let riskFactors: any[] = [], recommendations: any[] = [], aiNarrative = "";

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

  await db.execute(sql.raw(`
    DELETE FROM ime_meeting_predictions WHERE meeting_id = '${meetingId.replace(/'/g, "''")}' AND prediction_type = 'effectiveness'
  `));
  await db.execute(sql.raw(`
    INSERT INTO ime_meeting_predictions
      (meeting_id, scope, prediction_type, predicted_score, confidence_level, risk_level,
       risk_factors, features, recommendations, ai_narrative, predicted_at)
    VALUES (
      '${meetingId.replace(/'/g, "''")}',
      'meeting',
      'effectiveness',
      ${predictedScore},
      ${confidenceLevel},
      '${riskLevel}',
      '${JSON.stringify(riskFactors).replace(/'/g, "''")}',
      '${JSON.stringify({ avgParticipantScore, channelAvg, recentTrend, highPerformerRatio, stalledTopics, participantCount: participants.length }).replace(/'/g, "''")}',
      '${JSON.stringify(recommendations).replace(/'/g, "''")}',
      '${(aiNarrative || "").replace(/'/g, "''")}',
      NOW()
    )
  `));

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
    ? `AND mr.channel_id = '${scopeId.replace(/'/g, "''")}'`
    : "";

  const engagementResult = await db.execute(sql.raw(`
    SELECT pe.meeting_id, pe.engagement_level, pe.engagement_score,
           mr.meeting_date, mr.channel_id
    FROM ime_participant_engagement pe
    JOIN meeting_records mr ON pe.meeting_id = mr.id
    WHERE mr.meeting_date >= NOW() - INTERVAL '${dateRange}' ${scopeCondition}
    ORDER BY mr.meeting_date ASC
  `));
  const engagements = engagementResult.rows as any[];

  if (engagements.length === 0) {
    return { scope, scopeId, fatigueIndex: 0, message: "数据不足以进行疲劳检测" };
  }

  const scores = engagements.map((e: any) => Number(e.engagement_score) || 0);
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

  const uniqueDates = new Set(engagements.map((e: any) => e.meeting_date?.toISOString?.()?.split("T")?.[0] || ""));
  const weeksInPeriod = Math.max(1, parseInt(dateRange) / 7);
  const meetingsPerWeek = uniqueDates.size / weeksInPeriod;

  let fatigueIndex = 0, trendDirection = "stable", recommendations: any[] = [], aiNarrative = "";
  let trendForecast: any[] = [];

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

  await db.execute(sql.raw(`
    INSERT INTO ime_meeting_predictions
      (meeting_id, scope, scope_id, prediction_type, predicted_score, confidence_level, risk_level,
       fatigue_index, trend_forecast, recommendations, ai_narrative, predicted_at)
    VALUES (
      '',
      '${(scope || "").replace(/'/g, "''")}',
      ${scopeId ? `'${scopeId.replace(/'/g, "''")}'` : "NULL"},
      'fatigue',
      ${Math.round(avgScore)},
      0.7,
      '${fatigueIndex >= 60 ? "high" : fatigueIndex >= 30 ? "medium" : "low"}',
      ${fatigueIndex},
      '${JSON.stringify(trendForecast).replace(/'/g, "''")}',
      '${JSON.stringify(recommendations).replace(/'/g, "''")}',
      '${(aiNarrative || "").replace(/'/g, "''")}',
      NOW()
    )
  `));

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

  const conditions: string[] = ["1=1"];
  if (filters.scope) conditions.push(`p.scope = '${filters.scope.replace(/'/g, "''")}'`);
  const where = conditions.join(" AND ");

  const typeStatsResult = await db.execute(sql.raw(`
    SELECT p.prediction_type,
           COUNT(*) as cnt,
           AVG(p.predicted_score) as avg_predicted,
           AVG(p.confidence_level) as avg_confidence
    FROM ime_meeting_predictions p
    WHERE ${where}
    GROUP BY p.prediction_type
  `));

  const atRiskResult = await db.execute(sql.raw(`
    SELECT p.*, mr.title as meeting_title, mr.meeting_date
    FROM ime_meeting_predictions p
    LEFT JOIN meeting_records mr ON p.meeting_id = mr.id
    WHERE ${where} AND p.prediction_type = 'effectiveness' AND p.risk_level IN ('high', 'medium')
    ORDER BY p.predicted_score ASC
    LIMIT 20
  `));

  const accuracyResult = await db.execute(sql.raw(`
    SELECT COUNT(*) as total,
           AVG(p.prediction_accuracy) as avg_accuracy,
           AVG(ABS(p.predicted_score - p.actual_score)) as avg_error
    FROM ime_meeting_predictions p
    WHERE ${where} AND p.actual_score IS NOT NULL
  `));
  const accuracy = (accuracyResult.rows as any[])[0] || {};

  const fatigueResult = await db.execute(sql.raw(`
    SELECT DISTINCT ON (p.scope_id) p.scope_id, p.fatigue_index, p.risk_level, p.ai_narrative
    FROM ime_meeting_predictions p
    WHERE p.prediction_type = 'fatigue' AND p.fatigue_index IS NOT NULL
    ORDER BY p.scope_id, p.predicted_at DESC
  `));

  const riskFactorResult = await db.execute(sql.raw(`
    SELECT p.risk_factors FROM ime_meeting_predictions p
    WHERE ${where} AND p.risk_factors IS NOT NULL AND p.risk_factors != '[]'
    ORDER BY p.predicted_at DESC LIMIT 50
  `));
  const factorFreq: Record<string, number> = {};
  for (const row of riskFactorResult.rows as any[]) {
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
    typeStats: (typeStatsResult.rows as any[]).map((r: any) => ({
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

// ============================================================================
// Phase 6: Report Exports — Excel Dashboard
// ============================================================================

export async function generateExecutiveDashboardExcel(filters?: {
  channelId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const db = await requireDb();
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GRT智能会议分析系统";
  workbook.created = new Date();

  // Build WHERE clause fragments
  const whereParts: string[] = [];
  if (filters?.channelId) whereParts.push(`mr.channel_id = '${filters.channelId.replace(/'/g, "''")}'`);
  if (filters?.dateFrom) whereParts.push(`mr.meeting_date >= '${filters.dateFrom.replace(/'/g, "''")}'`);
  if (filters?.dateTo) whereParts.push(`mr.meeting_date <= '${filters.dateTo.replace(/'/g, "''")}'`);
  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
  const andClause = whereParts.length > 0 ? `AND ${whereParts.join(" AND ")}` : "";

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF4472C4" } },
  };

  // --- Sheet 1: 概览 ---
  const overviewSheet = workbook.addWorksheet("概览");
  overviewSheet.columns = [
    { header: "指标", key: "metric", width: 30 },
    { header: "值", key: "value", width: 25 },
  ];

  const meetingCountRes = await db.execute(sql.raw(
    `SELECT COUNT(*) as cnt, AVG(mes.overall_score) as avg_eff
     FROM meeting_records mr
     LEFT JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id
     ${whereClause}`
  ));
  const overview = (meetingCountRes.rows as any[])[0] || {};

  const topContribRes = await db.execute(sql.raw(
    `SELECT mc.employee_name, AVG(mc.contribution_score) as avg_score, COUNT(*) as meetings
     FROM meeting_contributions mc
     JOIN meeting_records mr ON mc.meeting_id = mr.id
     ${whereClause}
     GROUP BY mc.employee_name ORDER BY avg_score DESC LIMIT 10`
  ));

  overviewSheet.addRows([
    { metric: "会议总数", value: Number(overview.cnt) || 0 },
    { metric: "平均效能评分", value: Math.round(Number(overview.avg_eff) || 0) },
    { metric: "报告生成时间", value: new Date().toLocaleString("zh-CN") },
  ]);
  overviewSheet.addRow({});
  overviewSheet.addRow({ metric: "Top 贡献者", value: "平均分 / 参会次数" });
  for (const r of topContribRes.rows as any[]) {
    overviewSheet.addRow({ metric: r.employee_name, value: `${Math.round(Number(r.avg_score))} / ${r.meetings}次` });
  }
  overviewSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 2: ROI汇总 ---
  const roiSheet = workbook.addWorksheet("ROI汇总");
  roiSheet.columns = [
    { header: "会议", key: "meeting", width: 30 },
    { header: "评级", key: "grade", width: 10 },
    { header: "成本", key: "cost", width: 15 },
    { header: "ROI分数", key: "score", width: 12 },
    { header: "结果数", key: "outcomes", width: 10 },
    { header: "计算日期", key: "date", width: 18 },
  ];
  const roiRes = await db.execute(sql.raw(
    `SELECT mr.title, roi.roi_grade, roi.total_cost, roi.roi_score, roi.tangible_outcome_count, roi.computed_at
     FROM ime_meeting_roi roi
     JOIN meeting_records mr ON roi.meeting_id = mr.id
     ${whereClause.replace(/\bmr\./g, "mr.")}
     ORDER BY roi.computed_at DESC`
  ));
  for (const r of roiRes.rows as any[]) {
    const row = roiSheet.addRow({
      meeting: r.title, grade: r.roi_grade, cost: Number(r.total_cost || 0).toFixed(2),
      score: Math.round(Number(r.roi_score) || 0), outcomes: Number(r.tangible_outcome_count) || 0,
      date: r.computed_at ? new Date(r.computed_at).toLocaleDateString("zh-CN") : "",
    });
    const gradeCell = row.getCell("grade");
    const grade = String(r.roi_grade || "");
    if (grade === "A" || grade === "A+") gradeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
    else if (grade === "B") gradeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
    else if (grade === "D" || grade === "F") gradeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
  }
  roiSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 3: 情感趋势 ---
  const sentimentSheet = workbook.addWorksheet("情感趋势");
  sentimentSheet.columns = [
    { header: "会议", key: "meeting", width: 30 },
    { header: "整体情感", key: "sentiment", width: 12 },
    { header: "紧张度", key: "tension", width: 10 },
    { header: "协作度", key: "collaboration", width: 10 },
    { header: "分析日期", key: "date", width: 18 },
  ];
  const sentRes = await db.execute(sql.raw(
    `SELECT mr.title, s.overall_sentiment, s.tension_level, s.collaboration_score, s.analyzed_at
     FROM ime_meeting_sentiment s
     JOIN meeting_records mr ON s.meeting_id = mr.id
     ${whereClause.replace(/\bmr\./g, "mr.")}
     ORDER BY s.analyzed_at DESC`
  ));
  for (const r of sentRes.rows as any[]) {
    sentimentSheet.addRow({
      meeting: r.title, sentiment: r.overall_sentiment,
      tension: Number(r.tension_level || 0).toFixed(2), collaboration: Number(r.collaboration_score || 0).toFixed(2),
      date: r.analyzed_at ? new Date(r.analyzed_at).toLocaleDateString("zh-CN") : "",
    });
  }
  sentimentSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 4: 部门对比 ---
  const deptSheet = workbook.addWorksheet("部门对比");
  deptSheet.columns = [
    { header: "部门", key: "dept", width: 20 },
    { header: "会议数", key: "count", width: 10 },
    { header: "平均效能", key: "avgEff", width: 12 },
    { header: "平均成本", key: "avgCost", width: 12 },
    { header: "行动项完成率", key: "aiRate", width: 14 },
    { header: "期间", key: "period", width: 15 },
  ];
  const deptRes = await db.execute(sql.raw(
    `SELECT department, meeting_count, avg_effectiveness_score, avg_cost_per_meeting, action_item_completion_rate, period
     FROM ime_department_rollups ORDER BY avg_effectiveness_score DESC`
  ));
  for (const r of deptRes.rows as any[]) {
    deptSheet.addRow({
      dept: r.department, count: Number(r.meeting_count) || 0,
      avgEff: Math.round(Number(r.avg_effectiveness_score) || 0),
      avgCost: Number(r.avg_cost_per_meeting || 0).toFixed(2),
      aiRate: `${Math.round(Number(r.action_item_completion_rate || 0) * 100)}%`,
      period: r.period,
    });
  }
  deptSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 5: 行动项 ---
  const actionSheet = workbook.addWorksheet("行动项");
  actionSheet.columns = [
    { header: "内容", key: "content", width: 40 },
    { header: "负责人", key: "owner", width: 15 },
    { header: "状态", key: "status", width: 12 },
    { header: "优先级", key: "priority", width: 10 },
    { header: "截止日期", key: "dueDate", width: 15 },
    { header: "来源会议", key: "meeting", width: 25 },
  ];
  const actionRes = await db.execute(sql.raw(
    `SELECT ai.content, ai.assigned_to, ai.status, ai.priority, ai.due_date, mr.title
     FROM ime_action_items ai
     JOIN meeting_records mr ON ai.meeting_id = mr.id
     ${whereClause.replace(/\bmr\./g, "mr.")}
     ORDER BY ai.created_at DESC`
  ));
  for (const r of actionRes.rows as any[]) {
    const row = actionSheet.addRow({
      content: r.content, owner: r.assigned_to, status: r.status,
      priority: r.priority, dueDate: r.due_date ? new Date(r.due_date).toLocaleDateString("zh-CN") : "",
      meeting: r.title,
    });
    const statusCell = row.getCell("status");
    if (r.status === "completed") statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
    else if (r.status === "overdue") statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
    else if (r.status === "in_progress") statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
  }
  actionSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 6: 预测与风险 ---
  const predSheet = workbook.addWorksheet("预测与风险");
  predSheet.columns = [
    { header: "会议", key: "meeting", width: 30 },
    { header: "预测类型", key: "type", width: 15 },
    { header: "预测分数", key: "score", width: 12 },
    { header: "置信度", key: "confidence", width: 10 },
    { header: "风险等级", key: "risk", width: 10 },
    { header: "疲劳指数", key: "fatigue", width: 10 },
  ];
  const predRes = await db.execute(sql.raw(
    `SELECT mr.title, p.prediction_type, p.predicted_score, p.confidence_level, p.risk_level, p.fatigue_index
     FROM ime_meeting_predictions p
     JOIN meeting_records mr ON p.meeting_id = mr.id
     ORDER BY p.predicted_at DESC`
  ));
  for (const r of predRes.rows as any[]) {
    const row = predSheet.addRow({
      meeting: r.title, type: r.prediction_type,
      score: Math.round(Number(r.predicted_score) || 0),
      confidence: Number(Number(r.confidence_level || 0).toFixed(2)),
      risk: r.risk_level, fatigue: Number(Number(r.fatigue_index || 0).toFixed(2)),
    });
    const riskCell = row.getCell("risk");
    if (r.risk_level === "high") riskCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
    else if (r.risk_level === "medium") riskCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
    else if (r.risk_level === "low") riskCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
  }
  predSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 7: 参会优化 ---
  const optSheet = workbook.addWorksheet("参会优化");
  optSheet.columns = [
    { header: "会议", key: "meeting", width: 30 },
    { header: "当前人数", key: "current", width: 12 },
    { header: "最佳人数", key: "optimal", width: 12 },
    { header: "过多邀请", key: "overInvited", width: 12 },
    { header: "预估节省", key: "saving", width: 15 },
  ];
  const optRes = await db.execute(sql.raw(
    `SELECT mr.title, o.current_count, o.optimal_count, o.over_invited_count, o.estimated_cost_saving
     FROM ime_attendee_optimization o
     JOIN meeting_records mr ON o.meeting_id = mr.id
     ORDER BY o.estimated_cost_saving DESC`
  ));
  for (const r of optRes.rows as any[]) {
    optSheet.addRow({
      meeting: r.title, current: Number(r.current_count) || 0,
      optimal: Number(r.optimal_count) || 0, overInvited: Number(r.over_invited_count) || 0,
      saving: `¥${Number(r.estimated_cost_saving || 0).toFixed(2)}`,
    });
  }
  optSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `IME-仪表盘导出-${dateStr}.xlsx`;

  // Record export history
  await db.execute(sql.raw(`
    INSERT INTO ime_report_exports (report_type, scope, filters, format, filename, file_size, generated_by, generated_at, created_at)
    VALUES ('dashboard', 'all', '${JSON.stringify(filters || {}).replace(/'/g, "''")}', 'xlsx', '${filename.replace(/'/g, "''")}', ${Buffer.from(buffer).length}, 'system', NOW(), NOW())
  `));

  return { base64, filename };
}

// ============================================================================
// Phase 6: Report Exports — Single Meeting PDF Report
// ============================================================================

function drawTable(doc: any, headers: string[], rows: string[][], colWidths: number[], startX: number, startY: number): number {
  const rowHeight = 22;
  const padding = 6;
  let y = startY;

  // Header row
  doc.fillColor("#4472C4").rect(startX, y, colWidths.reduce((a: number, b: number) => a + b, 0), rowHeight).fill();
  doc.fillColor("#FFFFFF").fontSize(9);
  let x = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + padding, y + 5, { width: colWidths[i] - padding * 2, height: rowHeight, ellipsis: true });
    x += colWidths[i];
  }
  y += rowHeight;

  // Data rows
  doc.fillColor("#333333").fontSize(8);
  for (const row of rows) {
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
    // Zebra stripe
    if (rows.indexOf(row) % 2 === 1) {
      doc.fillColor("#F2F2F2").rect(startX, y, colWidths.reduce((a: number, b: number) => a + b, 0), rowHeight).fill();
    }
    doc.fillColor("#333333");
    x = startX;
    for (let i = 0; i < row.length; i++) {
      doc.text(String(row[i] ?? ""), x + padding, y + 5, { width: colWidths[i] - padding * 2, height: rowHeight, ellipsis: true });
      x += colWidths[i];
    }
    y += rowHeight;
  }
  return y;
}

function addSectionTitle(doc: any, title: string, y: number): number {
  if (y > 700) { doc.addPage(); y = 50; }
  doc.fillColor("#2E5090").fontSize(14).text(title, 50, y);
  y += 25;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#4472C4").lineWidth(1).stroke();
  return y + 10;
}

export async function generateMeetingReport(meetingId: string) {
  const db = await requireDb();
  const PDFDocument = (await import("pdfkit")).default;

  // Fetch data from 8 tables
  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const contribRes = await db.execute(sql`SELECT * FROM meeting_contributions WHERE meeting_id = ${meetingId} ORDER BY contribution_score DESC`);
  const effRes = await db.execute(sql`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId} LIMIT 1`);
  const sentimentRes = await db.execute(sql`SELECT * FROM ime_meeting_sentiment WHERE meeting_id = ${meetingId} LIMIT 1`);
  const roiRes = await db.execute(sql`SELECT * FROM ime_meeting_roi WHERE meeting_id = ${meetingId} LIMIT 1`);
  const actionRes = await db.execute(sql`SELECT * FROM ime_action_items WHERE meeting_id = ${meetingId} ORDER BY priority DESC`);
  const topicRes = await db.execute(sql`SELECT * FROM ime_topic_continuity WHERE meeting_id = ${meetingId}`);
  const optRes = await db.execute(sql`SELECT * FROM ime_attendee_optimization WHERE meeting_id = ${meetingId} LIMIT 1`);

  const contributions = contribRes.rows as any[];
  const effectiveness = (effRes.rows as any[])[0];
  const sentiment = (sentimentRes.rows as any[])[0];
  const roi = (roiRes.rows as any[])[0];
  const actionItems = actionRes.rows as any[];
  const topics = topicRes.rows as any[];
  const optimization = (optRes.rows as any[])[0];

  // Create PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Register Chinese font
  doc.registerFont("Chinese", "C:/Windows/Fonts/msyh.ttc");
  doc.font("Chinese");

  // --- Cover Page ---
  doc.fillColor("#2E5090").fontSize(28).text("GRT智能会议分析报告", 50, 200, { align: "center" });
  doc.fontSize(16).fillColor("#555555").text(meeting.title || "未命名会议", 50, 260, { align: "center" });
  doc.fontSize(12).text(`会议日期: ${meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString("zh-CN") : "N/A"}`, 50, 300, { align: "center" });
  doc.text(`生成时间: ${new Date().toLocaleString("zh-CN")}`, 50, 320, { align: "center" });
  doc.text(`报告ID: IME-${meetingId.slice(0, 8)}`, 50, 340, { align: "center" });

  // --- Section 1: 参会者贡献分析 ---
  doc.addPage();
  let y = 50;
  y = addSectionTitle(doc, "1. 参会者贡献分析", y);
  if (contributions.length > 0) {
    // Bar visualization
    const maxScore = Math.max(...contributions.map((c: any) => Number(c.contribution_score) || 0), 1);
    for (const c of contributions.slice(0, 10)) {
      if (y > 700) { doc.addPage(); y = 50; }
      const score = Number(c.contribution_score) || 0;
      const barWidth = (score / maxScore) * 300;
      doc.fillColor("#333333").fontSize(9).text(c.employee_name || "匿名", 50, y + 2, { width: 100 });
      doc.fillColor("#4472C4").rect(160, y, barWidth, 14).fill();
      doc.fillColor("#333333").fontSize(8).text(String(Math.round(score)), 165 + barWidth, y + 2);
      y += 22;
    }
    y += 10;
    y = drawTable(doc,
      ["姓名", "发言次数", "贡献分数", "角色"],
      contributions.map((c: any) => [c.employee_name || "匿名", String(Number(c.speaking_count) || 0), String(Math.round(Number(c.contribution_score) || 0)), c.role_in_meeting || ""]),
      [140, 80, 80, 195], 50, y
    );
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 2: 会议效能评分 ---
  y = addSectionTitle(doc, "2. 会议效能评分", y + 15);
  if (effectiveness) {
    const dims = [
      ["综合评分", effectiveness.overall_score],
      ["目标达成", effectiveness.goal_achievement],
      ["时间效率", effectiveness.time_efficiency],
      ["参与均衡", effectiveness.participation_balance],
      ["决策质量", effectiveness.decision_quality],
    ];
    for (const [label, val] of dims) {
      if (y > 750) { doc.addPage(); y = 50; }
      const score = Math.round(Number(val) || 0);
      doc.fillColor("#333333").fontSize(10).text(String(label), 50, y + 2, { width: 100 });
      doc.fillColor("#E0E0E0").rect(160, y, 300, 16).fill();
      const color = score >= 80 ? "#4CAF50" : score >= 60 ? "#FFC107" : "#F44336";
      doc.fillColor(color).rect(160, y, score * 3, 16).fill();
      doc.fillColor("#333333").fontSize(9).text(`${score}分`, 470, y + 2);
      y += 24;
    }
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 3: 情感分析 ---
  y = addSectionTitle(doc, "3. 情感分析", y + 15);
  if (sentiment) {
    y = drawTable(doc,
      ["维度", "值"],
      [
        ["整体情感", sentiment.overall_sentiment || "N/A"],
        ["紧张度", String(Number(sentiment.tension_level || 0).toFixed(2))],
        ["协作度", String(Number(sentiment.collaboration_score || 0).toFixed(2))],
        ["能量水平", sentiment.energy_level || "N/A"],
      ],
      [200, 295], 50, y
    );
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 4: ROI分析 ---
  y = addSectionTitle(doc, "4. ROI分析", y + 15);
  if (roi) {
    y = drawTable(doc,
      ["维度", "值"],
      [
        ["ROI评级", roi.roi_grade || "N/A"],
        ["ROI分数", String(Math.round(Number(roi.roi_score) || 0))],
        ["总成本", `¥${Number(roi.total_cost || 0).toFixed(2)}`],
        ["有形成果数", String(Number(roi.tangible_outcome_count) || 0)],
        ["价值评估", roi.value_assessment || "N/A"],
      ],
      [200, 295], 50, y
    );
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 5: 行动项 ---
  y = addSectionTitle(doc, "5. 行动项", y + 15);
  if (actionItems.length > 0) {
    y = drawTable(doc,
      ["内容", "负责人", "状态", "优先级"],
      actionItems.map((a: any) => [a.content || "", a.assigned_to || "", a.status || "", a.priority || ""]),
      [220, 90, 80, 105], 50, y
    );
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 6: 议题追踪 ---
  y = addSectionTitle(doc, "6. 议题追踪", y + 15);
  if (topics.length > 0) {
    y = drawTable(doc,
      ["议题", "状态", "出现次数"],
      topics.map((t: any) => [t.topic_name || "", t.status || "", String(Number(t.meeting_appearances) || 0)]),
      [250, 120, 125], 50, y
    );
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 7: 参会优化 ---
  y = addSectionTitle(doc, "7. 参会优化建议", y + 15);
  if (optimization) {
    y = drawTable(doc,
      ["维度", "值"],
      [
        ["当前参会人数", String(Number(optimization.current_count) || 0)],
        ["最佳参会人数", String(Number(optimization.optimal_count) || 0)],
        ["过多邀请人数", String(Number(optimization.over_invited_count) || 0)],
        ["预估节省", `¥${Number(optimization.estimated_cost_saving || 0).toFixed(2)}`],
      ],
      [200, 295], 50, y
    );
    if (optimization.composition_advice) {
      y += 10;
      doc.fillColor("#333333").fontSize(9).text(optimization.composition_advice, 50, y, { width: 495 });
      y += doc.heightOfString(optimization.composition_advice, { width: 495 }) + 5;
    }
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 8: AI综合分析 ---
  y = addSectionTitle(doc, "8. AI综合分析", y + 15);
  const narratives = [
    effectiveness?.ai_narrative,
    sentiment?.ai_narrative,
    roi?.ai_narrative,
    optimization?.ai_narrative,
  ].filter(Boolean);
  if (narratives.length > 0) {
    for (const narrative of narratives) {
      if (y > 700) { doc.addPage(); y = 50; }
      doc.fillColor("#333333").fontSize(9).text(narrative, 50, y, { width: 495 });
      y += doc.heightOfString(narrative, { width: 495 }) + 10;
    }
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
  }

  // Finalize
  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  const pdfBuffer = Buffer.concat(chunks);
  const base64 = pdfBuffer.toString("base64");
  const titleSlug = (meeting.title || "meeting").slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "-");
  const dateStr = meeting.meeting_date ? new Date(meeting.meeting_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const filename = `IME-会议报告-${titleSlug}-${dateStr}.pdf`;

  // Record export
  await db.execute(sql`
    INSERT INTO ime_report_exports (report_type, scope, scope_id, format, filename, file_size, generated_by, generated_at, created_at)
    VALUES ('meeting', 'meeting', ${meetingId}, 'pdf', ${filename}, ${pdfBuffer.length}, 'system', NOW(), NOW())
  `);

  return { base64, filename };
}

// ============================================================================
// Phase 6: Report Exports — Benchmark Report (PDF)
// ============================================================================

export async function generateBenchmarkReport(
  scope: string,
  scopeId?: string,
  period?: string,
) {
  const db = await requireDb();
  const PDFDocument = (await import("pdfkit")).default;

  const periodDays = period === "quarterly" ? 90 : 30;
  const periodLabel = period === "quarterly" ? "季度" : "月度";
  const now = new Date();
  const currentEnd = now.toISOString().slice(0, 10);
  const currentStart = new Date(now.getTime() - periodDays * 86400000).toISOString().slice(0, 10);
  const prevEnd = currentStart;
  const prevStart = new Date(now.getTime() - periodDays * 2 * 86400000).toISOString().slice(0, 10);

  // Build scope filter
  let scopeFilter = "";
  if (scope === "channel" && scopeId) {
    scopeFilter = `AND mr.channel_id = '${scopeId.replace(/'/g, "''")}'`;
  } else if (scope === "department" && scopeId) {
    scopeFilter = `AND mr.channel_id IN (SELECT id FROM meeting_records WHERE summary LIKE '%${scopeId.replace(/'/g, "''")}%')`;
  }

  // Query metrics for a given date range
  async function queryPeriodMetrics(dateFrom: string, dateTo: string) {
    const meetingStats = await db.execute(sql.raw(`
      SELECT COUNT(*) as cnt, AVG(mes.overall_score) as avg_eff
      FROM meeting_records mr
      LEFT JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id
      WHERE mr.meeting_date >= '${dateFrom}' AND mr.meeting_date <= '${dateTo}' ${scopeFilter}
    `));
    const costStats = await db.execute(sql.raw(`
      SELECT AVG(mc.total_cost) as avg_cost
      FROM ime_meeting_costs mc
      JOIN meeting_records mr ON mc.meeting_id = mr.id
      WHERE mr.meeting_date >= '${dateFrom}' AND mr.meeting_date <= '${dateTo}' ${scopeFilter}
    `));
    const actionStats = await db.execute(sql.raw(`
      SELECT COUNT(*) as total, SUM(CASE WHEN ai.status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM ime_action_items ai
      JOIN meeting_records mr ON ai.meeting_id = mr.id
      WHERE mr.meeting_date >= '${dateFrom}' AND mr.meeting_date <= '${dateTo}' ${scopeFilter}
    `));
    const roiStats = await db.execute(sql.raw(`
      SELECT AVG(roi.roi_score) as avg_roi
      FROM ime_meeting_roi roi
      JOIN meeting_records mr ON roi.meeting_id = mr.id
      WHERE mr.meeting_date >= '${dateFrom}' AND mr.meeting_date <= '${dateTo}' ${scopeFilter}
    `));
    const fatigueStats = await db.execute(sql.raw(`
      SELECT AVG(p.fatigue_index) as avg_fatigue
      FROM ime_meeting_predictions p
      JOIN meeting_records mr ON p.meeting_id = mr.id
      WHERE mr.meeting_date >= '${dateFrom}' AND mr.meeting_date <= '${dateTo}' ${scopeFilter}
      AND p.fatigue_index IS NOT NULL
    `));

    const ms = (meetingStats.rows as any[])[0] || {};
    const cs = (costStats.rows as any[])[0] || {};
    const as_ = (actionStats.rows as any[])[0] || {};
    const rs = (roiStats.rows as any[])[0] || {};
    const fs = (fatigueStats.rows as any[])[0] || {};
    const total = Number(as_.total) || 0;
    const completed = Number(as_.completed) || 0;

    return {
      meetingCount: Number(ms.cnt) || 0,
      avgEffectiveness: Math.round(Number(ms.avg_eff) || 0),
      avgCost: Number(Number(cs.avg_cost || 0).toFixed(2)),
      actionCompletionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgRoi: Math.round(Number(rs.avg_roi) || 0),
      avgFatigue: Number(Number(fs.avg_fatigue || 0).toFixed(2)),
    };
  }

  const current = await queryPeriodMetrics(currentStart, currentEnd);
  const previous = await queryPeriodMetrics(prevStart, prevEnd);

  // Compute deltas
  function computeDelta(cur: number, prev: number): string {
    if (prev === 0) return cur > 0 ? "▲ 新增" : "—";
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    if (pct > 0) return `▲ +${pct.toFixed(1)}%`;
    if (pct < 0) return `▼ ${pct.toFixed(1)}%`;
    return "— 持平";
  }

  // Top 3 best + worst meetings in current period
  const bestRes = await db.execute(sql.raw(`
    SELECT mr.title, mes.overall_score FROM meeting_records mr
    JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id
    WHERE mr.meeting_date >= '${currentStart}' AND mr.meeting_date <= '${currentEnd}' ${scopeFilter}
    ORDER BY mes.overall_score DESC LIMIT 3
  `));
  const worstRes = await db.execute(sql.raw(`
    SELECT mr.title, mes.overall_score FROM meeting_records mr
    JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id
    WHERE mr.meeting_date >= '${currentStart}' AND mr.meeting_date <= '${currentEnd}' ${scopeFilter}
    ORDER BY mes.overall_score ASC LIMIT 3
  `));

  // Recommendations from predictions
  const recsRes = await db.execute(sql.raw(`
    SELECT recommendations FROM ime_meeting_predictions p
    JOIN meeting_records mr ON p.meeting_id = mr.id
    WHERE mr.meeting_date >= '${currentStart}' AND mr.meeting_date <= '${currentEnd}' ${scopeFilter}
    AND p.recommendations IS NOT NULL
    ORDER BY p.predicted_at DESC LIMIT 5
  `));

  // Build PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  doc.registerFont("Chinese", "C:/Windows/Fonts/msyh.ttc");
  doc.font("Chinese");

  // --- Cover ---
  doc.fillColor("#2E5090").fontSize(28).text("会议智能基准报告", 50, 180, { align: "center" });
  doc.fontSize(14).fillColor("#555555").text(`范围: ${scope}${scopeId ? ` — ${scopeId}` : ""}`, 50, 240, { align: "center" });
  doc.text(`对比周期: ${periodLabel} (${currentStart} ~ ${currentEnd})`, 50, 270, { align: "center" });
  doc.text(`对比基准: ${prevStart} ~ ${prevEnd}`, 50, 295, { align: "center" });
  doc.text(`生成时间: ${new Date().toLocaleString("zh-CN")}`, 50, 325, { align: "center" });

  // --- Metrics Comparison ---
  doc.addPage();
  let y = 50;
  y = addSectionTitle(doc, "1. 核心指标对比", y);

  const metrics = [
    { name: "会议数量", cur: current.meetingCount, prev: previous.meetingCount, unit: "次" },
    { name: "平均效能", cur: current.avgEffectiveness, prev: previous.avgEffectiveness, unit: "分" },
    { name: "平均成本", cur: current.avgCost, prev: previous.avgCost, unit: "¥" },
    { name: "行动项完成率", cur: current.actionCompletionRate, prev: previous.actionCompletionRate, unit: "%" },
    { name: "平均ROI", cur: current.avgRoi, prev: previous.avgRoi, unit: "分" },
    { name: "疲劳指数", cur: current.avgFatigue, prev: previous.avgFatigue, unit: "" },
  ];

  y = drawTable(doc,
    ["指标", "当前期间", "上一期间", "变化"],
    metrics.map(m => [m.name, `${m.cur}${m.unit}`, `${m.prev}${m.unit}`, computeDelta(m.cur, m.prev)]),
    [130, 110, 110, 145], 50, y
  );

  // --- Sparklines (simple trend visualization) ---
  y += 20;
  y = addSectionTitle(doc, "2. 趋势概览", y);
  for (const m of metrics.slice(0, 4)) {
    if (y > 720) { doc.addPage(); y = 50; }
    doc.fillColor("#333333").fontSize(9).text(m.name, 50, y + 5, { width: 100 });
    // Simple two-point sparkline
    const x1 = 170, x2 = 370;
    const maxVal = Math.max(m.prev, m.cur, 1);
    const y1 = y + 20 - (m.prev / maxVal) * 15;
    const y2 = y + 20 - (m.cur / maxVal) * 15;
    doc.strokeColor(m.cur >= m.prev ? "#4CAF50" : "#F44336").lineWidth(2);
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
    doc.fillColor("#4472C4").circle(x1, y1, 3).fill();
    doc.fillColor("#4472C4").circle(x2, y2, 3).fill();
    doc.fillColor("#999999").fontSize(7).text("上期", x1 - 10, y + 22).text("当期", x2 - 10, y + 22);
    y += 40;
  }

  // --- Best / Worst Meetings ---
  y += 10;
  y = addSectionTitle(doc, "3. 最佳 / 最差会议", y);
  const best = bestRes.rows as any[];
  const worst = worstRes.rows as any[];
  if (best.length > 0) {
    doc.fillColor("#4CAF50").fontSize(11).text("Top 3 最佳", 50, y);
    y += 18;
    for (const m of best) {
      doc.fillColor("#333333").fontSize(9).text(`• ${m.title} — ${Math.round(Number(m.overall_score))}分`, 60, y);
      y += 16;
    }
  }
  y += 8;
  if (worst.length > 0) {
    doc.fillColor("#F44336").fontSize(11).text("Bottom 3 待改进", 50, y);
    y += 18;
    for (const m of worst) {
      doc.fillColor("#333333").fontSize(9).text(`• ${m.title} — ${Math.round(Number(m.overall_score))}分`, 60, y);
      y += 16;
    }
  }

  // --- Recommendations ---
  y += 15;
  y = addSectionTitle(doc, "4. AI建议汇总", y);
  const recs = recsRes.rows as any[];
  if (recs.length > 0) {
    for (const r of recs) {
      if (y > 720) { doc.addPage(); y = 50; }
      const text = String(r.recommendations || "").slice(0, 300);
      doc.fillColor("#333333").fontSize(9).text(`• ${text}`, 50, y, { width: 495 });
      y += doc.heightOfString(`• ${text}`, { width: 495 }) + 6;
    }
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无建议数据", 50, y);
  }

  // Finalize
  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  const pdfBuffer = Buffer.concat(chunks);
  const base64 = pdfBuffer.toString("base64");
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `IME-基准报告-${scope}-${periodLabel}-${dateStr}.pdf`;

  // Record export
  const safeScope = scope.replace(/'/g, "''");
  const safeScopeId = (scopeId || "").replace(/'/g, "''");
  await db.execute(sql.raw(`
    INSERT INTO ime_report_exports (report_type, scope, scope_id, format, filename, file_size, generated_by, generated_at, created_at)
    VALUES ('benchmark', '${safeScope}', '${safeScopeId}', 'pdf', '${filename.replace(/'/g, "''")}', ${pdfBuffer.length}, 'system', NOW(), NOW())
  `));

  return { base64, filename };
}

// ============================================================================
// Phase 7: Knowledge Entity Extraction
// ============================================================================

export async function extractKnowledgeEntities(meetingId: string) {
  const db = await requireDb();

  // Fetch meeting + content blocks
  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const blocksRes = await db.execute(sql`SELECT speaker, content, block_type FROM meeting_content_blocks WHERE meeting_id = ${meetingId} ORDER BY timestamp_start`);
  const blocks = blocksRes.rows as any[];

  const transcript = blocks.map((b: any) => `[${b.speaker}] ${b.content}`).join("\n").slice(0, 6000);

  // Use LLM to extract entities
  const llmResult = await invokeLLM({
    system: "你是会议知识提取专家。从会议记录中提取关键实体：决策(decision)、风险(risk)、机会(opportunity)、依赖(dependency)、洞察(insight)。",
    prompt: `会议标题: ${meeting.title || ""}\n会议摘要: ${meeting.summary || ""}\n\n会议内容:\n${transcript}\n\n请提取所有关键实体，返回JSON数组格式。`,
    schema: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entity_type: { type: "string", enum: ["decision", "risk", "opportunity", "dependency", "insight"] },
              entity_value: { type: "string" },
              confidence: { type: "number" },
              related_speaker: { type: "string" },
              context: { type: "string" },
            },
            required: ["entity_type", "entity_value"],
          },
        },
        narrative: { type: "string" },
      },
      required: ["entities"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;
  const entities = parsed.entities || [];

  // Delete old extractions for this meeting
  await db.execute(sql`DELETE FROM ime_knowledge_entities WHERE meeting_id = ${meetingId}`);

  // Insert new entities
  const insertedIds: number[] = [];
  for (const e of entities) {
    const res = await db.execute(sql`
      INSERT INTO ime_knowledge_entities (meeting_id, entity_type, entity_value, confidence, related_speaker, context, ai_narrative, extracted_at, created_at)
      VALUES (${meetingId}, ${e.entity_type || "insight"}, ${String(e.entity_value || "")}, ${Number(e.confidence) || 0.8}, ${String(e.related_speaker || "")}, ${String(e.context || "")}, ${String(parsed.narrative || "")}, NOW(), NOW())
      RETURNING id
    `);
    const row = (res.rows as any[])[0];
    if (row) insertedIds.push(Number(row.id));
  }

  return { meetingId, entitiesExtracted: entities.length, entityIds: insertedIds, narrative: parsed.narrative || "" };
}

// ============================================================================
// Phase 7: Build Entity Relationships (cross-meeting linking)
// ============================================================================

export async function buildEntityRelationships(meetingId: string) {
  const db = await requireDb();

  // Get entities from this meeting
  const currentRes = await db.execute(sql`SELECT id, entity_type, entity_value, meeting_id FROM ime_knowledge_entities WHERE meeting_id = ${meetingId}`);
  const currentEntities = currentRes.rows as any[];
  if (currentEntities.length === 0) return { relationships: 0 };

  // Get entities from other meetings for linking
  const otherRes = await db.execute(sql`SELECT id, entity_type, entity_value, meeting_id FROM ime_knowledge_entities WHERE meeting_id != ${meetingId} ORDER BY extracted_at DESC LIMIT 200`);
  const otherEntities = otherRes.rows as any[];

  if (otherEntities.length === 0) return { relationships: 0 };

  // Use LLM to find relationships
  const currentSummary = currentEntities.map((e: any) => `[${e.id}] ${e.entity_type}: ${e.entity_value}`).join("\n");
  const otherSummary = otherEntities.slice(0, 50).map((e: any) => `[${e.id}] ${e.entity_type}: ${e.entity_value}`).join("\n");

  const llmResult = await invokeLLM({
    system: "你是知识图谱关系分析专家。分析两组实体之间的关系。",
    prompt: `当前会议实体:\n${currentSummary}\n\n历史实体:\n${otherSummary}\n\n找出实体间的关系(depends_on/follows_up/contradicts/supports/evolves_from)，返回JSON数组。`,
    schema: {
      type: "object",
      properties: {
        relationships: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entity_from_id: { type: "number" },
              entity_to_id: { type: "number" },
              relationship_type: { type: "string", enum: ["depends_on", "follows_up", "contradicts", "supports", "evolves_from"] },
              strength: { type: "number" },
              context: { type: "string" },
            },
            required: ["entity_from_id", "entity_to_id", "relationship_type"],
          },
        },
      },
      required: ["relationships"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;
  const relationships = parsed.relationships || [];

  // Validate entity IDs and insert
  const validFromIds = new Set(currentEntities.map((e: any) => Number(e.id)));
  const validToIds = new Set(otherEntities.map((e: any) => Number(e.id)));
  let inserted = 0;

  for (const rel of relationships) {
    if (!validFromIds.has(rel.entity_from_id) || !validToIds.has(rel.entity_to_id)) continue;
    await db.execute(sql`
      INSERT INTO ime_entity_relationships (entity_from_id, entity_to_id, relationship_type, strength, context, created_at)
      VALUES (${rel.entity_from_id}, ${rel.entity_to_id}, ${String(rel.relationship_type)}, ${Number(rel.strength) || 0.7}, ${String(rel.context || "")}, NOW())
    `);
    inserted++;
  }

  return { meetingId, relationshipsCreated: inserted };
}

// ============================================================================
// Phase 7: Track Decision Outcome
// ============================================================================

export async function trackDecisionOutcome(
  entityId: number,
  outcomeStatus: string,
  outcomeNotes?: string,
  impactScore?: number,
  lessonsLearned?: string,
) {
  const db = await requireDb();

  // Verify entity exists and is a decision
  const entityRes = await db.execute(sql`SELECT id, meeting_id, entity_value FROM ime_knowledge_entities WHERE id = ${entityId} AND entity_type = 'decision'`);
  const entity = (entityRes.rows as any[])[0];
  if (!entity) throw new Error("Decision entity not found");

  // Upsert decision outcome
  await db.execute(sql`DELETE FROM ime_decision_outcomes WHERE entity_id = ${entityId}`);
  await db.execute(sql`
    INSERT INTO ime_decision_outcomes (entity_id, meeting_id, decision_text, decision_date, outcome_status, outcome_notes, impact_score, lessons_learned, outcome_date, created_at)
    VALUES (${entityId}, ${entity.meeting_id}, ${String(entity.entity_value)}, NOW(), ${outcomeStatus}, ${String(outcomeNotes || "")}, ${impactScore ?? 0}, ${String(lessonsLearned || "")}, NOW(), NOW())
  `);

  return { entityId, outcomeStatus, tracked: true };
}

// ============================================================================
// Phase 7: Generate Meeting Retrospective
// ============================================================================

export async function generateRetrospective(meetingId: string) {
  const db = await requireDb();

  // Gather data from multiple tables
  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const effRes = await db.execute(sql`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId} LIMIT 1`);
  const sentRes = await db.execute(sql`SELECT * FROM ime_meeting_sentiment WHERE meeting_id = ${meetingId} LIMIT 1`);
  const actionRes = await db.execute(sql`SELECT content, status, assigned_to FROM ime_action_items WHERE meeting_id = ${meetingId}`);
  const entityRes = await db.execute(sql`SELECT entity_type, entity_value FROM ime_knowledge_entities WHERE meeting_id = ${meetingId}`);

  const effectiveness = (effRes.rows as any[])[0];
  const sentiment = (sentRes.rows as any[])[0];
  const actionItems = actionRes.rows as any[];
  const entities = entityRes.rows as any[];

  const contextSummary = [
    `会议: ${meeting.title || "未命名"}`,
    `摘要: ${meeting.summary || "无"}`,
    effectiveness ? `效能评分: ${effectiveness.overall_score}` : "",
    sentiment ? `情感: ${sentiment.overall_sentiment}, 紧张度: ${sentiment.tension_level}` : "",
    actionItems.length > 0 ? `行动项(${actionItems.length}): ${actionItems.map((a: any) => a.content).join("; ")}` : "",
    entities.length > 0 ? `知识实体(${entities.length}): ${entities.map((e: any) => `${e.entity_type}:${e.entity_value}`).join("; ")}` : "",
  ].filter(Boolean).join("\n");

  const llmResult = await invokeLLM({
    system: "你是会议回顾分析专家。基于会议数据生成结构化的会议回顾。",
    prompt: `请为以下会议生成详细回顾:\n${contextSummary}`,
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        key_learnings: { type: "array", items: { type: "string" } },
        improvement_areas: { type: "array", items: { type: "string" } },
        what_went_well: { type: "array", items: { type: "string" } },
        actionable_insights: { type: "array", items: { type: "string" } },
        overall_grade: { type: "string" },
        narrative: { type: "string" },
      },
      required: ["summary", "key_learnings", "overall_grade"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  // Upsert retrospective
  await db.execute(sql`DELETE FROM ime_meeting_retrospectives WHERE meeting_id = ${meetingId}`);
  await db.execute(sql`
    INSERT INTO ime_meeting_retrospectives (meeting_id, ai_summary, key_learnings, improvement_areas, what_went_well, actionable_insights, overall_grade, ai_narrative, generated_at, created_at)
    VALUES (${meetingId}, ${String(parsed.summary || "")}, ${JSON.stringify(parsed.key_learnings || [])}, ${JSON.stringify(parsed.improvement_areas || [])}, ${JSON.stringify(parsed.what_went_well || [])}, ${JSON.stringify(parsed.actionable_insights || [])}, ${String(parsed.overall_grade || "B")}, ${String(parsed.narrative || "")}, NOW(), NOW())
  `);

  return {
    meetingId,
    summary: parsed.summary,
    keyLearnings: parsed.key_learnings,
    improvementAreas: parsed.improvement_areas || [],
    whatWentWell: parsed.what_went_well || [],
    actionableInsights: parsed.actionable_insights || [],
    overallGrade: parsed.overall_grade,
    narrative: parsed.narrative || "",
  };
}

// ============================================================================
// Phase 7: Compute Expert Profiles
// ============================================================================

export async function computeExpertProfiles(department?: string) {
  const db = await requireDb();

  const deptFilter = department ? `WHERE mc.employee_name IN (SELECT employee_name FROM meeting_contributions mc2 JOIN meeting_records mr ON mc2.meeting_id = mr.id WHERE mr.channel_id LIKE '%${department.replace(/'/g, "''")}%')` : "";

  // Aggregate contribution data per employee
  const contribRes = await db.execute(sql.raw(`
    SELECT mc.employee_id, mc.employee_name,
           COUNT(DISTINCT mc.meeting_id) as meeting_count,
           AVG(mc.contribution_score) as avg_score,
           COUNT(CASE WHEN mc.role_in_meeting = 'facilitator' OR mc.role_in_meeting = 'presenter' THEN 1 END) as leadership_count
    FROM meeting_contributions mc
    ${deptFilter}
    GROUP BY mc.employee_id, mc.employee_name
    HAVING COUNT(DISTINCT mc.meeting_id) >= 3
    ORDER BY avg_score DESC
    LIMIT 50
  `));
  const contributors = contribRes.rows as any[];

  // For each contributor, check decision influence
  const profiles: any[] = [];
  for (const c of contributors) {
    const employeeId = String(c.employee_id || "");
    const employeeName = String(c.employee_name || "");

    // Count decisions they're associated with
    const decisionRes = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM ime_knowledge_entities
      WHERE entity_type = 'decision' AND related_speaker = ${employeeName}
    `);
    const decisionCount = Number((decisionRes.rows as any[])[0]?.cnt) || 0;

    // Get top topics from their meetings
    const topicRes = await db.execute(sql`
      SELECT tc.topic_name, COUNT(*) as cnt
      FROM ime_topic_continuity tc
      WHERE tc.meeting_id IN (SELECT meeting_id FROM meeting_contributions WHERE employee_id = ${employeeId})
      GROUP BY tc.topic_name ORDER BY cnt DESC LIMIT 5
    `);
    const topTopics = (topicRes.rows as any[]).map((t: any) => t.topic_name);

    const meetingCount = Number(c.meeting_count) || 0;
    const avgScore = Number(c.avg_score) || 0;
    const leadershipRate = meetingCount > 0 ? Number(c.leadership_count) / meetingCount : 0;
    const credibility = Math.min(100, avgScore * 0.5 + meetingCount * 2 + leadershipRate * 20 + decisionCount * 3);

    const expertiseAreas: string[] = [];
    if (leadershipRate > 0.3) expertiseAreas.push("会议引导");
    if (decisionCount > 5) expertiseAreas.push("决策推动");
    if (avgScore > 80) expertiseAreas.push("高贡献度");
    if (topTopics.length > 0) expertiseAreas.push(...topTopics.slice(0, 3));

    // Upsert
    await db.execute(sql`DELETE FROM ime_expert_profiles WHERE employee_id = ${employeeId}`);
    await db.execute(sql`
      INSERT INTO ime_expert_profiles (employee_id, employee_name, department, expertise_areas, credibility_score, meeting_count, avg_contribution_score, decision_influence_rate, top_topics, computed_at, created_at)
      VALUES (${employeeId}, ${employeeName}, ${department || ""}, ${JSON.stringify(expertiseAreas)}, ${Math.round(credibility)}, ${meetingCount}, ${Math.round(avgScore)}, ${Number(decisionCount / Math.max(meetingCount, 1)).toFixed(2)}, ${JSON.stringify(topTopics)}, NOW(), NOW())
    `);

    profiles.push({
      employeeId: c.employee_id,
      employeeName: c.employee_name,
      credibilityScore: Math.round(credibility),
      meetingCount,
      avgContributionScore: Math.round(avgScore),
      expertiseAreas,
      topTopics,
    });
  }

  return { profilesComputed: profiles.length, profiles };
}

// ============================================================================
// Phase 7: Knowledge Dashboard
// ============================================================================

export async function getKnowledgeDashboard(filters?: {
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const db = await requireDb();

  const whereParts: string[] = [];
  if (filters?.entityType) whereParts.push(`ke.entity_type = '${filters.entityType.replace(/'/g, "''")}'`);
  if (filters?.dateFrom) whereParts.push(`ke.extracted_at >= '${filters.dateFrom.replace(/'/g, "''")}'`);
  if (filters?.dateTo) whereParts.push(`ke.extracted_at <= '${filters.dateTo.replace(/'/g, "''")}'`);
  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  // Entity type distribution
  const typeStatsRes = await db.execute(sql.raw(`
    SELECT entity_type, COUNT(*) as cnt, AVG(confidence) as avg_confidence
    FROM ime_knowledge_entities ke ${whereClause}
    GROUP BY entity_type ORDER BY cnt DESC
  `));

  // Recent entities
  const recentRes = await db.execute(sql.raw(`
    SELECT ke.*, mr.title as meeting_title
    FROM ime_knowledge_entities ke
    JOIN meeting_records mr ON ke.meeting_id = mr.id
    ${whereClause}
    ORDER BY ke.extracted_at DESC LIMIT 20
  `));

  // Relationship stats
  const relStatsRes = await db.execute(sql.raw(`
    SELECT relationship_type, COUNT(*) as cnt, AVG(strength) as avg_strength
    FROM ime_entity_relationships
    GROUP BY relationship_type ORDER BY cnt DESC
  `));

  // Decision outcomes summary
  const decisionRes = await db.execute(sql.raw(`
    SELECT outcome_status, COUNT(*) as cnt, AVG(impact_score) as avg_impact
    FROM ime_decision_outcomes
    GROUP BY outcome_status ORDER BY cnt DESC
  `));

  // Recent retrospectives
  const retroRes = await db.execute(sql.raw(`
    SELECT r.meeting_id, r.overall_grade, r.ai_summary, mr.title, r.generated_at
    FROM ime_meeting_retrospectives r
    JOIN meeting_records mr ON r.meeting_id = mr.id
    ORDER BY r.generated_at DESC LIMIT 10
  `));

  // Top experts
  const expertRes = await db.execute(sql.raw(`
    SELECT employee_name, credibility_score, meeting_count, expertise_areas, top_topics
    FROM ime_expert_profiles
    ORDER BY credibility_score DESC LIMIT 10
  `));

  // Total counts
  const totalEntities = (typeStatsRes.rows as any[]).reduce((sum: number, r: any) => sum + Number(r.cnt), 0);
  const totalRelationships = (relStatsRes.rows as any[]).reduce((sum: number, r: any) => sum + Number(r.cnt), 0);

  return {
    summary: {
      totalEntities,
      totalRelationships,
      totalDecisions: (decisionRes.rows as any[]).reduce((sum: number, r: any) => sum + Number(r.cnt), 0),
      totalRetrospectives: retroRes.rows.length,
      totalExperts: (await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM ime_expert_profiles`))).rows[0] as any,
    },
    entityTypeStats: (typeStatsRes.rows as any[]).map((r: any) => ({
      type: r.entity_type,
      count: Number(r.cnt),
      avgConfidence: Number(Number(r.avg_confidence || 0).toFixed(2)),
    })),
    recentEntities: recentRes.rows,
    relationshipStats: (relStatsRes.rows as any[]).map((r: any) => ({
      type: r.relationship_type,
      count: Number(r.cnt),
      avgStrength: Number(Number(r.avg_strength || 0).toFixed(2)),
    })),
    decisionOutcomes: decisionRes.rows,
    recentRetrospectives: retroRes.rows,
    topExperts: (expertRes.rows as any[]).map((r: any) => ({
      ...r,
      expertiseAreas: (() => { try { return JSON.parse(r.expertise_areas || "[]"); } catch { return []; } })(),
      topTopics: (() => { try { return JSON.parse(r.top_topics || "[]"); } catch { return []; } })(),
    })),
  };
}

// ============================================================================
// Phase 8: Meeting AI Assistant — Pre-Meeting Brief
// ============================================================================

export async function generateMeetingBrief(meetingId: string) {
  const db = await requireDb();

  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  // Gather participant history
  const contribRes = await db.execute(sql`
    SELECT employee_name, employee_id, AVG(contribution_score) as avg_score, COUNT(*) as meetings
     FROM meeting_contributions WHERE meeting_id = ${meetingId} OR employee_id IN
       (SELECT DISTINCT employee_id FROM meeting_contributions WHERE meeting_id = ${meetingId})
     GROUP BY employee_name, employee_id ORDER BY avg_score DESC LIMIT 15
  `);

  // Pending action items from past meetings with same participants
  const actionRes = await db.execute(sql.raw(
    `SELECT ai.content, ai.assigned_to, ai.status, ai.due_date, mr.title as source_meeting
     FROM ime_action_items ai
     JOIN meeting_records mr ON ai.meeting_id = mr.id
     WHERE ai.status NOT IN ('completed', 'cancelled')
     ORDER BY ai.created_at DESC LIMIT 10`
  ));

  // Recent decisions related to this meeting's channel
  const decisionRes = await db.execute(sql.raw(
    `SELECT ke.entity_value, ke.related_speaker, mr.title, ke.extracted_at
     FROM ime_knowledge_entities ke
     JOIN meeting_records mr ON ke.meeting_id = mr.id
     WHERE ke.entity_type = 'decision'
     ORDER BY ke.extracted_at DESC LIMIT 10`
  ));

  // Topic history
  const topicRes = await db.execute(sql.raw(
    `SELECT topic_name, status, meeting_appearances FROM ime_topic_continuity
     WHERE status NOT IN ('closed') ORDER BY created_at DESC LIMIT 10`
  ));

  const contextData = [
    `会议: ${meeting.title || "未命名"}`,
    `摘要: ${meeting.summary || "无"}`,
    `参与者: ${(contribRes.rows as any[]).map((c: any) => c.employee_name).join(", ")}`,
    `待办行动项: ${(actionRes.rows as any[]).map((a: any) => `${a.content}(${a.assigned_to})`).join("; ")}`,
    `近期决策: ${(decisionRes.rows as any[]).map((d: any) => d.entity_value).join("; ")}`,
    `活跃议题: ${(topicRes.rows as any[]).map((t: any) => t.topic_name).join(", ")}`,
  ].join("\n");

  const llmResult = await invokeLLM({
    system: "你是会议准备助手。基于会议历史数据，为即将召开的会议生成准备简报。",
    prompt: `请为以下会议生成准备简报:\n${contextData}`,
    schema: {
      type: "object",
      properties: {
        participant_summary: { type: "array", items: { type: "object", properties: { name: { type: "string" }, role: { type: "string" }, note: { type: "string" } } } },
        pending_items: { type: "array", items: { type: "string" } },
        relevant_decisions: { type: "array", items: { type: "string" } },
        topic_context: { type: "array", items: { type: "string" } },
        suggested_questions: { type: "array", items: { type: "string" } },
        risk_alerts: { type: "array", items: { type: "string" } },
        narrative: { type: "string" },
      },
      required: ["suggested_questions", "narrative"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  await db.execute(sql`DELETE FROM ime_meeting_briefs WHERE meeting_id = ${meetingId}`);
  await db.execute(sql`
    INSERT INTO ime_meeting_briefs (meeting_id, participant_summary, pending_action_items, relevant_decisions, topic_history, suggested_questions, risk_alerts, ai_narrative, generated_at, created_at)
    VALUES (${meetingId}, ${JSON.stringify(parsed.participant_summary || [])}, ${JSON.stringify(parsed.pending_items || [])}, ${JSON.stringify(parsed.relevant_decisions || [])}, ${JSON.stringify(parsed.topic_context || [])}, ${JSON.stringify(parsed.suggested_questions || [])}, ${JSON.stringify(parsed.risk_alerts || [])}, ${String(parsed.narrative || "")}, NOW(), NOW())
  `);

  return {
    meetingId,
    participantSummary: parsed.participant_summary || [],
    pendingItems: parsed.pending_items || [],
    relevantDecisions: parsed.relevant_decisions || [],
    topicContext: parsed.topic_context || [],
    suggestedQuestions: parsed.suggested_questions || [],
    riskAlerts: parsed.risk_alerts || [],
    narrative: parsed.narrative || "",
  };
}

// ============================================================================
// Phase 8: Meeting AI Assistant — Agenda Suggestion
// ============================================================================

export async function generateAgendaSuggestion(
  topic: string,
  participants?: string[],
  durationMinutes?: number,
) {
  const duration = durationMinutes || 60;
  const participantList = participants?.join(", ") || "未指定";

  const llmResult = await invokeLLM({
    system: "你是会议议程设计专家。基于主题、参与者和时长设计最佳议程。",
    prompt: `请设计会议议程:\n主题: ${topic}\n参与者: ${participantList}\n时长: ${duration}分钟`,
    schema: {
      type: "object",
      properties: {
        agenda_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              duration_minutes: { type: "number" },
              description: { type: "string" },
              facilitator: { type: "string" },
            },
            required: ["title", "duration_minutes"],
          },
        },
        success_criteria: { type: "array", items: { type: "string" } },
        preparation_notes: { type: "array", items: { type: "string" } },
        tips: { type: "string" },
      },
      required: ["agenda_items"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  return {
    topic,
    duration,
    agendaItems: parsed.agenda_items || [],
    successCriteria: parsed.success_criteria || [],
    preparationNotes: parsed.preparation_notes || [],
    tips: parsed.tips || "",
  };
}

// ============================================================================
// Phase 8: Meeting AI Assistant — Meeting Minutes
// ============================================================================

export async function generateMeetingMinutes(meetingId: string) {
  const db = await requireDb();

  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const blocksRes = await db.execute(sql`SELECT speaker, content, block_type FROM meeting_content_blocks WHERE meeting_id = ${meetingId} ORDER BY timestamp_start`);
  const contribRes = await db.execute(sql`SELECT employee_name FROM meeting_contributions WHERE meeting_id = ${meetingId}`);
  const actionRes = await db.execute(sql`SELECT content, assigned_to, status, priority, due_date FROM ime_action_items WHERE meeting_id = ${meetingId}`);
  const entityRes = await db.execute(sql`SELECT entity_type, entity_value FROM ime_knowledge_entities WHERE meeting_id = ${meetingId} AND entity_type = 'decision'`);

  const transcript = (blocksRes.rows as any[]).map((b: any) => `[${b.speaker}] ${b.content}`).join("\n").slice(0, 6000);
  const attendees = (contribRes.rows as any[]).map((c: any) => c.employee_name);
  const decisions = (entityRes.rows as any[]).map((e: any) => e.entity_value);
  const actions = (actionRes.rows as any[]).map((a: any) => ({ item: a.content, owner: a.assigned_to, status: a.status }));

  const llmResult = await invokeLLM({
    system: "你是会议纪要生成专家。基于会议内容生成结构化的会议纪要。",
    prompt: `会议: ${meeting.title || "未命名"}\n日期: ${meeting.meeting_date || "N/A"}\n参与者: ${attendees.join(", ")}\n已知决策: ${decisions.join("; ")}\n行动项: ${actions.map(a => `${a.item}(${a.owner})`).join("; ")}\n\n会议内容:\n${transcript}`,
    schema: {
      type: "object",
      properties: {
        agenda_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              topic: { type: "string" },
              discussion: { type: "string" },
              outcome: { type: "string" },
            },
            required: ["topic"],
          },
        },
        decisions: { type: "array", items: { type: "string" } },
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: { item: { type: "string" }, owner: { type: "string" }, due: { type: "string" } },
            required: ["item"],
          },
        },
        key_points: { type: "array", items: { type: "string" } },
        next_steps: { type: "array", items: { type: "string" } },
        narrative: { type: "string" },
      },
      required: ["agenda_items", "decisions"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  await db.execute(sql`DELETE FROM ime_meeting_minutes WHERE meeting_id = ${meetingId}`);
  await db.execute(sql`
    INSERT INTO ime_meeting_minutes (meeting_id, attendees, agenda_items, decisions_recorded, action_items_summary, key_discussion_points, next_steps, ai_narrative, generated_at, created_at)
    VALUES (${meetingId}, ${JSON.stringify(attendees)}, ${JSON.stringify(parsed.agenda_items || [])}, ${JSON.stringify(parsed.decisions || [])}, ${JSON.stringify(parsed.action_items || [])}, ${JSON.stringify(parsed.key_points || [])}, ${JSON.stringify(parsed.next_steps || [])}, ${String(parsed.narrative || "")}, NOW(), NOW())
  `);

  return {
    meetingId,
    attendees,
    agendaItems: parsed.agenda_items || [],
    decisions: parsed.decisions || [],
    actionItems: parsed.action_items || [],
    keyPoints: parsed.key_points || [],
    nextSteps: parsed.next_steps || [],
    narrative: parsed.narrative || "",
  };
}

// ============================================================================
// Phase 8: Meeting AI Assistant — Follow-Up Plan
// ============================================================================

export async function generateFollowUpPlan(meetingId: string) {
  const db = await requireDb();

  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const actionRes = await db.execute(sql`SELECT * FROM ime_action_items WHERE meeting_id = ${meetingId}`);
  const entityRes = await db.execute(sql`SELECT * FROM ime_knowledge_entities WHERE meeting_id = ${meetingId}`);
  const effRes = await db.execute(sql`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId} LIMIT 1`);
  const retroRes = await db.execute(sql`SELECT * FROM ime_meeting_retrospectives WHERE meeting_id = ${meetingId} LIMIT 1`);

  const context = [
    `会议: ${meeting.title}`,
    `行动项: ${(actionRes.rows as any[]).map((a: any) => `${a.content}→${a.assigned_to}(${a.status})`).join("; ")}`,
    `关键实体: ${(entityRes.rows as any[]).map((e: any) => `${e.entity_type}:${e.entity_value}`).join("; ")}`,
    (effRes.rows as any[])[0] ? `效能: ${(effRes.rows as any[])[0].overall_score}分` : "",
    (retroRes.rows as any[])[0] ? `回顾评级: ${(retroRes.rows as any[])[0].overall_grade}` : "",
  ].filter(Boolean).join("\n");

  const llmResult = await invokeLLM({
    system: "你是会议跟进计划专家。基于会议结果生成详细的后续行动计划。",
    prompt: `请为以下会议生成跟进计划:\n${context}`,
    schema: {
      type: "object",
      properties: {
        immediate_actions: { type: "array", items: { type: "object", properties: { action: { type: "string" }, owner: { type: "string" }, deadline: { type: "string" } }, required: ["action"] } },
        follow_up_meetings: { type: "array", items: { type: "object", properties: { topic: { type: "string" }, suggested_date: { type: "string" }, participants: { type: "string" } }, required: ["topic"] } },
        risk_mitigations: { type: "array", items: { type: "string" } },
        communication_plan: { type: "array", items: { type: "object", properties: { audience: { type: "string" }, message: { type: "string" }, channel: { type: "string" } }, required: ["audience", "message"] } },
        narrative: { type: "string" },
      },
      required: ["immediate_actions"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  return {
    meetingId,
    immediateActions: parsed.immediate_actions || [],
    followUpMeetings: parsed.follow_up_meetings || [],
    riskMitigations: parsed.risk_mitigations || [],
    communicationPlan: parsed.communication_plan || [],
    narrative: parsed.narrative || "",
  };
}

// ============================================================================
// Phase 8: Meeting AI Assistant — Conversational Q&A
// ============================================================================

export async function askMeetingAssistant(
  sessionId: string,
  question: string,
  userId?: string,
) {
  const db = await requireDb();
  const safeSession = sessionId.replace(/'/g, "''");
  const safeUser = (userId || "anonymous").replace(/'/g, "''");

  // Store user question
  await db.execute(sql.raw(`
    INSERT INTO ime_ai_conversations (session_id, user_id, role, content, created_at)
    VALUES ('${safeSession}', '${safeUser}', 'user', '${question.replace(/'/g, "''")}', NOW())
  `));

  // Get conversation history for context
  const historyRes = await db.execute(sql.raw(
    `SELECT role, content FROM ime_ai_conversations WHERE session_id = '${safeSession}' ORDER BY created_at DESC LIMIT 10`
  ));
  const history = (historyRes.rows as any[]).reverse();

  // Gather relevant meeting data for RAG context
  const recentMeetingsRes = await db.execute(sql.raw(
    `SELECT id, title, summary, meeting_date FROM meeting_records ORDER BY meeting_date DESC LIMIT 10`
  ));
  const recentStatsRes = await db.execute(sql.raw(
    `SELECT COUNT(*) as total_meetings,
            AVG(mes.overall_score) as avg_effectiveness
     FROM meeting_records mr
     LEFT JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id`
  ));
  const recentActionsRes = await db.execute(sql.raw(
    `SELECT content, assigned_to, status FROM ime_action_items ORDER BY created_at DESC LIMIT 10`
  ));
  const recentDecisionsRes = await db.execute(sql.raw(
    `SELECT entity_value, related_speaker FROM ime_knowledge_entities WHERE entity_type = 'decision' ORDER BY extracted_at DESC LIMIT 10`
  ));

  const ragContext = [
    `最近会议: ${(recentMeetingsRes.rows as any[]).map((m: any) => `${m.title}(${m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("zh-CN") : ""})`).join(", ")}`,
    `统计: 总计${(recentStatsRes.rows as any[])[0]?.total_meetings || 0}次会议, 平均效能${Math.round(Number((recentStatsRes.rows as any[])[0]?.avg_effectiveness) || 0)}分`,
    `待办行动项: ${(recentActionsRes.rows as any[]).filter((a: any) => a.status !== "completed").map((a: any) => `${a.content}(${a.assigned_to})`).join("; ")}`,
    `近期决策: ${(recentDecisionsRes.rows as any[]).map((d: any) => d.entity_value).join("; ")}`,
  ].join("\n");

  const conversationMessages = history.map((h: any) => `${h.role === "user" ? "用户" : "助手"}: ${h.content}`).join("\n");

  const llmResult = await invokeLLM({
    system: `你是GRT智能会议助手。基于会议数据回答用户问题。提供准确、有帮助的回答。\n\n可用数据:\n${ragContext}`,
    prompt: `对话历史:\n${conversationMessages}\n\n用户问题: ${question}`,
    schema: {
      type: "object",
      properties: {
        answer: { type: "string" },
        referenced_meetings: { type: "array", items: { type: "string" } },
        suggestions: { type: "array", items: { type: "string" } },
      },
      required: ["answer"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;
  const answer = parsed.answer || "抱歉，无法回答此问题。";

  // Store assistant response
  await db.execute(sql.raw(`
    INSERT INTO ime_ai_conversations (session_id, user_id, role, content, context, created_at)
    VALUES ('${safeSession}', '${safeUser}', 'assistant', '${answer.replace(/'/g, "''")}', '${JSON.stringify({ referenced_meetings: parsed.referenced_meetings, suggestions: parsed.suggestions }).replace(/'/g, "''")}', NOW())
  `));

  return {
    answer,
    referencedMeetings: parsed.referenced_meetings || [],
    suggestions: parsed.suggestions || [],
  };
}

// ============================================================================
// Phase 9: Meeting Workflow Automation & Coaching
// ============================================================================

// Phase 9 — Feature 1: Create Workflow Rule
export async function createWorkflowRule(rule: {
  name: string;
  description?: string;
  triggerEvent: string;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  actionType: string;
  actionConfig?: any;
  scope?: string;
  scopeId?: string;
  createdBy?: string;
}) {
  const db = await requireDb();
  const safeName = rule.name.replace(/'/g, "''");
  const safeDesc = (rule.description || "").replace(/'/g, "''");
  const safeConfig = JSON.stringify(rule.actionConfig || {}).replace(/'/g, "''");
  const safeCreatedBy = (rule.createdBy || "system").replace(/'/g, "''");

  await db.execute(sql.raw(`
    INSERT INTO ime_workflow_rules (name, description, trigger_event, condition_field, condition_operator, condition_value, action_type, action_config, scope, scope_id, is_active, created_by, created_at, updated_at)
    VALUES ('${safeName}', '${safeDesc}', '${rule.triggerEvent}', ${rule.conditionField ? `'${rule.conditionField}'` : "NULL"}, ${rule.conditionOperator ? `'${rule.conditionOperator}'` : "NULL"}, ${rule.conditionValue ? `'${rule.conditionValue}'` : "NULL"}, '${rule.actionType}', '${safeConfig}', '${rule.scope || "global"}', ${rule.scopeId ? `'${rule.scopeId}'` : "NULL"}, 1, '${safeCreatedBy}', NOW(), NOW())
  `));

  return { success: true, name: rule.name };
}

// Phase 9 — Feature 2: Evaluate Workflow Rules for a Meeting Event
export async function evaluateWorkflowRules(meetingId: string, event: string) {
  const db = await requireDb();

  // Get active rules matching this event
  const rulesRes = await db.execute(sql`SELECT * FROM ime_workflow_rules WHERE trigger_event = ${event} AND is_active = 1`);
  const rules = rulesRes.rows as any[];
  if (rules.length === 0) return { executed: 0, results: [] };

  // Gather meeting metrics for condition evaluation
  const healthRes = await db.execute(sql`SELECT * FROM ime_meeting_health WHERE meeting_id = ${meetingId} ORDER BY assessed_at DESC LIMIT 1`);
  const roiRes = await db.execute(sql`SELECT * FROM ime_meeting_roi WHERE meeting_id = ${meetingId} ORDER BY calculated_at DESC LIMIT 1`);
  const sentimentRes = await db.execute(sql`SELECT * FROM ime_meeting_sentiment WHERE meeting_id = ${meetingId} ORDER BY analyzed_at DESC LIMIT 1`);
  const effRes = await db.execute(sql`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId} LIMIT 1`);

  const metrics: Record<string, number | string> = {};
  const health = (healthRes.rows as any[])[0];
  const roi = (roiRes.rows as any[])[0];
  const sentiment = (sentimentRes.rows as any[])[0];
  const eff = (effRes.rows as any[])[0];

  if (health) { metrics.health_score = Number(health.health_score); metrics.fatigue_index = Number(health.fatigue_index); }
  if (roi) { metrics.roi_score = Number(roi.roi_score); metrics.roi_grade = roi.roi_grade; }
  if (sentiment) { metrics.overall_sentiment = Number(sentiment.overall_sentiment); metrics.tension_level = Number(sentiment.tension_level); }
  if (eff) { metrics.overall_score = Number(eff.overall_score); }

  const results: any[] = [];
  for (const rule of rules) {
    let conditionMet = true;

    if (rule.condition_field && rule.condition_operator && rule.condition_value !== null) {
      const actual = metrics[rule.condition_field];
      const threshold = Number(rule.condition_value);
      if (actual !== undefined) {
        const numActual = Number(actual);
        switch (rule.condition_operator) {
          case "<": conditionMet = numActual < threshold; break;
          case ">": conditionMet = numActual > threshold; break;
          case "<=": conditionMet = numActual <= threshold; break;
          case ">=": conditionMet = numActual >= threshold; break;
          case "==": conditionMet = String(actual) === rule.condition_value; break;
          case "!=": conditionMet = String(actual) !== rule.condition_value; break;
        }
      } else {
        conditionMet = false;
      }
    }

    const status = conditionMet ? "success" : "skipped";
    const actionResult = conditionMet
      ? { triggered: true, actionType: rule.action_type, config: JSON.parse(rule.action_config || "{}"), metricsAtTrigger: metrics }
      : { triggered: false, reason: "condition_not_met" };

    await db.execute(sql`
      INSERT INTO ime_workflow_executions (rule_id, rule_name, trigger_event, trigger_meeting_id, condition_snapshot, action_type, action_result, status, executed_at)
      VALUES (${rule.id}, ${rule.name || ""}, ${event}, ${meetingId}, ${JSON.stringify(metrics)}, ${rule.action_type}, ${JSON.stringify(actionResult)}, ${status}, NOW())
    `);

    results.push({ ruleId: rule.id, ruleName: rule.name, status, actionResult });
  }

  return { executed: results.filter(r => r.status === "success").length, total: rules.length, results };
}

// Phase 9 — Feature 3: Generate Coaching Plan (AI-powered)
export async function generateCoachingPlan(scope: string, scopeId?: string, period?: string) {
  const db = await requireDb();
  const safeScopeId = (scopeId || "all").replace(/'/g, "''");
  const periodDays = period === "quarterly" ? 90 : 30;

  // Gather aggregate meeting data for the scope
  let whereClause = `mr.meeting_date >= NOW() - INTERVAL '${periodDays} days'`;
  if (scope === "department" && scopeId) {
    whereClause += ` AND mr.channel_id IN (SELECT id FROM meeting_channels WHERE name LIKE '%${safeScopeId}%')`;
  }

  const meetingStatsRes = await db.execute(sql.raw(`
    SELECT COUNT(*) as total_meetings,
           AVG(mes.overall_score) as avg_effectiveness,
           AVG(mh.health_score) as avg_health,
           AVG(mh.fatigue_index) as avg_fatigue,
           AVG(mr2.roi_score) as avg_roi
    FROM meeting_records mr
    LEFT JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id
    LEFT JOIN ime_meeting_health mh ON mr.id = mh.meeting_id
    LEFT JOIN ime_meeting_roi mr2 ON mr.id = mr2.meeting_id
    WHERE ${whereClause}
  `));

  const actionRes = await db.execute(sql.raw(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM ime_action_items
    WHERE created_at >= NOW() - INTERVAL '${periodDays} days'
  `));

  const sentimentRes = await db.execute(sql.raw(`
    SELECT AVG(overall_sentiment) as avg_sentiment,
           AVG(collaboration_score) as avg_collaboration,
           AVG(tension_level) as avg_tension
    FROM ime_meeting_sentiment
    WHERE analyzed_at >= NOW() - INTERVAL '${periodDays} days'
  `));

  const stats = (meetingStatsRes.rows as any[])[0] || {};
  const actions = (actionRes.rows as any[])[0] || {};
  const sentiments = (sentimentRes.rows as any[])[0] || {};

  const context = [
    `范围: ${scope}${scopeId ? ` (${scopeId})` : ""}, 周期: ${period || "monthly"} (${periodDays}天)`,
    `会议统计: ${stats.total_meetings || 0}次会议`,
    `平均效能: ${Math.round(Number(stats.avg_effectiveness) || 0)}分`,
    `平均健康度: ${Math.round(Number(stats.avg_health) || 0)}分`,
    `平均疲劳指数: ${Number(stats.avg_fatigue || 0).toFixed(1)}`,
    `平均ROI: ${Number(stats.avg_roi || 0).toFixed(1)}分`,
    `行动项完成率: ${actions.total ? Math.round((Number(actions.completed) / Number(actions.total)) * 100) : 0}%`,
    `平均情感: ${Number(sentiments.avg_sentiment || 0).toFixed(2)}, 协作: ${Number(sentiments.avg_collaboration || 0).toFixed(2)}, 紧张度: ${Number(sentiments.avg_tension || 0).toFixed(2)}`,
  ].join("\n");

  const llmResult = await invokeLLM({
    system: "你是会议文化教练。基于会议数据分析团队会议文化，提供改进建议和具体行动计划。",
    prompt: `请为以下团队生成会议教练计划:\n${context}`,
    schema: {
      type: "object",
      properties: {
        culture_score: { type: "number" },
        dimensions: {
          type: "object",
          properties: {
            punctuality: { type: "number" },
            engagement: { type: "number" },
            follow_through: { type: "number" },
            inclusivity: { type: "number" },
            efficiency: { type: "number" },
          },
        },
        strengths: { type: "array", items: { type: "string" } },
        improvements: {
          type: "array",
          items: {
            type: "object",
            properties: { area: { type: "string" }, recommendation: { type: "string" }, priority: { type: "string" }, expected_impact: { type: "string" } },
            required: ["area", "recommendation"],
          },
        },
        action_plan: {
          type: "array",
          items: {
            type: "object",
            properties: { step: { type: "string" }, owner: { type: "string" }, timeline: { type: "string" }, metric: { type: "string" } },
            required: ["step"],
          },
        },
        narrative: { type: "string" },
      },
      required: ["culture_score", "strengths", "improvements"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  // Save coaching plan
  await db.execute(sql.raw(`
    INSERT INTO ime_coaching_plans (scope, scope_id, period, culture_score, dimensions, strengths, improvements, action_plan, ai_narrative, generated_at, created_at)
    VALUES ('${scope}', ${scopeId ? `'${safeScopeId}'` : "NULL"}, '${period || "monthly"}', ${parsed.culture_score || 0}, '${JSON.stringify(parsed.dimensions || {}).replace(/'/g, "''")}', '${JSON.stringify(parsed.strengths || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.improvements || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.action_plan || []).replace(/'/g, "''")}', '${(parsed.narrative || "").replace(/'/g, "''")}', NOW(), NOW())
  `));

  return {
    scope,
    scopeId,
    period: period || "monthly",
    cultureScore: parsed.culture_score || 0,
    dimensions: parsed.dimensions || {},
    strengths: parsed.strengths || [],
    improvements: parsed.improvements || [],
    actionPlan: parsed.action_plan || [],
    narrative: parsed.narrative || "",
  };
}

// Phase 9 — Feature 4: Meeting Culture Score
export async function getMeetingCultureScore(department?: string, period?: string) {
  const db = await requireDb();
  const periodDays = period === "quarterly" ? 90 : period === "yearly" ? 365 : 30;

  const dateFilter = `>= NOW() - INTERVAL '${periodDays} days'`;

  // Effectiveness dimension
  const effRes = await db.execute(sql.raw(
    `SELECT AVG(overall_score) as avg, COUNT(*) as cnt FROM meeting_effectiveness_scores WHERE created_at ${dateFilter}`
  ));
  // Health dimension
  const healthRes = await db.execute(sql.raw(
    `SELECT AVG(health_score) as avg_health, AVG(fatigue_index) as avg_fatigue FROM ime_meeting_health WHERE assessed_at ${dateFilter}`
  ));
  // Action item follow-through
  const actionRes = await db.execute(sql.raw(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed FROM ime_action_items WHERE created_at ${dateFilter}`
  ));
  // Sentiment
  const sentRes = await db.execute(sql.raw(
    `SELECT AVG(overall_sentiment) as avg_sent, AVG(collaboration_score) as avg_collab FROM ime_meeting_sentiment WHERE analyzed_at ${dateFilter}`
  ));
  // ROI
  const roiRes = await db.execute(sql.raw(
    `SELECT AVG(roi_score) as avg_roi FROM ime_meeting_roi WHERE calculated_at ${dateFilter}`
  ));
  // Meeting volume
  const volRes = await db.execute(sql.raw(
    `SELECT COUNT(*) as cnt, AVG(duration_minutes) as avg_duration FROM meeting_records WHERE meeting_date ${dateFilter}`
  ));

  const eff = (effRes.rows as any[])[0] || {};
  const hlth = (healthRes.rows as any[])[0] || {};
  const act = (actionRes.rows as any[])[0] || {};
  const sent = (sentRes.rows as any[])[0] || {};
  const roiData = (roiRes.rows as any[])[0] || {};
  const vol = (volRes.rows as any[])[0] || {};

  const effectiveness = Math.min(Number(eff.avg || 0), 100);
  const healthScore = Math.min(Number(hlth.avg_health || 0), 100);
  const followThrough = act.total > 0 ? Math.round((Number(act.completed) / Number(act.total)) * 100) : 50;
  const sentiment = Math.round(((Number(sent.avg_sent || 0) + 1) / 2) * 100); // normalize -1..1 to 0..100
  const collaboration = Math.round(Number(sent.avg_collab || 50));
  const roi = Math.min(Number(roiData.avg_roi || 0), 100);

  const cultureScore = Math.round((effectiveness * 0.25 + healthScore * 0.2 + followThrough * 0.2 + sentiment * 0.15 + collaboration * 0.1 + roi * 0.1) * 100) / 100;

  return {
    cultureScore,
    period: period || "monthly",
    dimensions: {
      effectiveness: Math.round(effectiveness),
      healthScore: Math.round(healthScore),
      followThrough,
      sentiment,
      collaboration,
      roi: Math.round(roi),
    },
    volume: {
      totalMeetings: Number(vol.cnt || 0),
      avgDuration: Math.round(Number(vol.avg_duration || 0)),
    },
    fatigueIndex: Number(hlth.avg_fatigue || 0).toFixed(1),
  };
}

// Phase 9 — Feature 5: Workflow Automation Dashboard
export async function getWorkflowDashboard(filters?: { limit?: number }) {
  const db = await requireDb();
  const limit = filters?.limit || 50;

  // Active rules
  const rulesRes = await db.execute(sql.raw(
    `SELECT * FROM ime_workflow_rules WHERE is_active = 1 ORDER BY created_at DESC`
  ));

  // Recent executions
  const execRes = await db.execute(sql.raw(
    `SELECT * FROM ime_workflow_executions ORDER BY executed_at DESC LIMIT ${limit}`
  ));

  // Execution stats
  const statsRes = await db.execute(sql.raw(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as succeeded,
           SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM ime_workflow_executions
    WHERE executed_at >= NOW() - INTERVAL '30 days'
  `));

  // Recent coaching plans
  const coachingRes = await db.execute(sql.raw(
    `SELECT * FROM ime_coaching_plans ORDER BY generated_at DESC LIMIT 5`
  ));

  const stats = (statsRes.rows as any[])[0] || {};

  return {
    activeRules: rulesRes.rows,
    recentExecutions: execRes.rows,
    stats: {
      total: Number(stats.total || 0),
      succeeded: Number(stats.succeeded || 0),
      skipped: Number(stats.skipped || 0),
      failed: Number(stats.failed || 0),
    },
    recentCoachingPlans: coachingRes.rows,
  };
}

// ============================================================================
// Phase 10: Meeting Integration Hub & System Settings
// ============================================================================

// Phase 10 — Feature 1: Create Integration
export async function createIntegration(config: {
  name: string;
  integrationType: string;
  provider: string;
  config?: any;
  syncDirection?: string;
  syncFrequency?: string;
  createdBy?: string;
}) {
  const db = await requireDb();
  const safeName = config.name.replace(/'/g, "''");
  const safeConfig = JSON.stringify(config.config || {}).replace(/'/g, "''");
  const safeCreatedBy = (config.createdBy || "system").replace(/'/g, "''");

  await db.execute(sql.raw(`
    INSERT INTO ime_integrations (name, integration_type, provider, config, sync_direction, sync_frequency, status, created_by, created_at, updated_at)
    VALUES ('${safeName}', '${config.integrationType}', '${config.provider}', '${safeConfig}', '${config.syncDirection || "bidirectional"}', '${config.syncFrequency || "manual"}', 'active', '${safeCreatedBy}', NOW(), NOW())
  `));

  return { success: true, name: config.name };
}

// Phase 10 — Feature 2: Sync Integration
export async function syncIntegration(integrationId: number) {
  const db = await requireDb();
  const startTime = Date.now();

  // Get integration config
  const intRes = await db.execute(sql.raw(
    `SELECT * FROM ime_integrations WHERE id = ${integrationId}`
  ));
  const integration = (intRes.rows as any[])[0];
  if (!integration) throw new Error("Integration not found");

  const config = JSON.parse(integration.config || "{}");
  let recordsProcessed = 0;
  let recordsSucceeded = 0;
  let recordsFailed = 0;
  let details: any = {};
  let status = "success";
  let errorMessage = "";

  try {
    // Simulate sync based on integration type
    switch (integration.integration_type) {
      case "calendar": {
        // Sync meeting records to/from calendar
        const meetingsRes = await db.execute(sql.raw(
          `SELECT COUNT(*) as cnt FROM meeting_records WHERE meeting_date >= NOW() - INTERVAL '30 days'`
        ));
        recordsProcessed = Number((meetingsRes.rows as any[])[0]?.cnt || 0);
        recordsSucceeded = recordsProcessed;
        details = { syncedMeetings: recordsProcessed, provider: integration.provider, direction: integration.sync_direction };
        break;
      }
      case "task_manager": {
        // Push action items to task management tool
        const actionsRes = await db.execute(sql.raw(
          `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending FROM ime_action_items WHERE created_at >= NOW() - INTERVAL '7 days'`
        ));
        const actions = (actionsRes.rows as any[])[0] || {};
        recordsProcessed = Number(actions.total || 0);
        recordsSucceeded = Number(actions.pending || 0);
        details = { totalItems: recordsProcessed, pendingPushed: recordsSucceeded, provider: integration.provider };
        break;
      }
      case "messaging": {
        // Push digest/alerts to messaging platform
        const alertsRes = await db.execute(sql.raw(
          `SELECT COUNT(*) as cnt FROM ime_digest_alerts WHERE created_at >= NOW() - INTERVAL '1 day'`
        ));
        recordsProcessed = Number((alertsRes.rows as any[])[0]?.cnt || 0);
        recordsSucceeded = recordsProcessed;
        details = { alertsSynced: recordsProcessed, provider: integration.provider, channel: config.channel || "default" };
        break;
      }
      case "webhook": {
        // Trigger webhook with latest meeting data
        const latestRes = await db.execute(sql.raw(
          `SELECT id, title FROM meeting_records ORDER BY meeting_date DESC LIMIT 5`
        ));
        recordsProcessed = (latestRes.rows as any[]).length;
        recordsSucceeded = recordsProcessed;
        details = { webhookUrl: config.url || "configured", meetingsIncluded: recordsProcessed };
        break;
      }
      case "email": {
        // Email digest sync
        const coachRes = await db.execute(sql.raw(
          `SELECT COUNT(*) as cnt FROM ime_coaching_plans WHERE generated_at >= NOW() - INTERVAL '7 days'`
        ));
        recordsProcessed = Number((coachRes.rows as any[])[0]?.cnt || 0);
        recordsSucceeded = recordsProcessed;
        details = { reportsEmailed: recordsProcessed, recipients: config.recipients || [] };
        break;
      }
      default:
        recordsProcessed = 0;
        details = { message: "Unknown integration type" };
    }
  } catch (err: any) {
    status = "failed";
    errorMessage = err.message || "Sync failed";
    recordsFailed = recordsProcessed - recordsSucceeded;
  }

  const durationMs = Date.now() - startTime;
  const safeName = (integration.name || "").replace(/'/g, "''");
  const safeDetails = JSON.stringify(details).replace(/'/g, "''");
  const safeError = errorMessage.replace(/'/g, "''");

  // Log the sync operation
  await db.execute(sql.raw(`
    INSERT INTO ime_integration_logs (integration_id, integration_name, operation, direction, records_processed, records_succeeded, records_failed, details, status, error_message, duration_ms, executed_at)
    VALUES (${integrationId}, '${safeName}', 'sync', '${integration.sync_direction || "outbound"}', ${recordsProcessed}, ${recordsSucceeded}, ${recordsFailed}, '${safeDetails}', '${status}', '${safeError}', ${durationMs}, NOW())
  `));

  // Update integration last sync
  await db.execute(sql.raw(`
    UPDATE ime_integrations SET last_sync_at = NOW(), last_sync_status = '${status}', error_message = ${errorMessage ? `'${safeError}'` : "NULL"}, updated_at = NOW() WHERE id = ${integrationId}
  `));

  return { integrationId, status, recordsProcessed, recordsSucceeded, recordsFailed, durationMs, details };
}

// Phase 10 — Feature 3: Integration Dashboard
export async function getIntegrationDashboard() {
  const db = await requireDb();

  const integrationsRes = await db.execute(sql.raw(
    `SELECT * FROM ime_integrations ORDER BY created_at DESC`
  ));

  const logsRes = await db.execute(sql.raw(
    `SELECT * FROM ime_integration_logs ORDER BY executed_at DESC LIMIT 50`
  ));

  const statsRes = await db.execute(sql.raw(`
    SELECT COUNT(*) as total_syncs,
           SUM(records_processed) as total_records,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
           AVG(duration_ms) as avg_duration
    FROM ime_integration_logs
    WHERE executed_at >= NOW() - INTERVAL '30 days'
  `));

  const stats = (statsRes.rows as any[])[0] || {};

  return {
    integrations: integrationsRes.rows,
    recentLogs: logsRes.rows,
    stats: {
      totalSyncs: Number(stats.total_syncs || 0),
      totalRecords: Number(stats.total_records || 0),
      successful: Number(stats.successful || 0),
      failed: Number(stats.failed || 0),
      avgDurationMs: Math.round(Number(stats.avg_duration || 0)),
    },
  };
}

// Phase 10 — Feature 4: Update System Setting
export async function updateSystemSetting(key: string, value: string, meta?: { type?: string; category?: string; label?: string; description?: string; updatedBy?: string }) {
  const db = await requireDb();
  const safeKey = key.replace(/'/g, "''");
  const safeValue = value.replace(/'/g, "''");
  const safeType = (meta?.type || "string").replace(/'/g, "''");
  const safeCat = (meta?.category || "general").replace(/'/g, "''");
  const safeLabel = (meta?.label || key).replace(/'/g, "''");
  const safeDesc = (meta?.description || "").replace(/'/g, "''");
  const safeUser = (meta?.updatedBy || "system").replace(/'/g, "''");

  // Upsert: check if exists
  const existing = await db.execute(sql.raw(
    `SELECT id FROM ime_system_settings WHERE setting_key = '${safeKey}'`
  ));

  if ((existing.rows as any[]).length > 0) {
    await db.execute(sql.raw(`
      UPDATE ime_system_settings SET setting_value = '${safeValue}', setting_type = '${safeType}', category = '${safeCat}', label = '${safeLabel}', description = '${safeDesc}', updated_by = '${safeUser}', updated_at = NOW() WHERE setting_key = '${safeKey}'
    `));
  } else {
    await db.execute(sql.raw(`
      INSERT INTO ime_system_settings (setting_key, setting_value, setting_type, category, label, description, updated_by, updated_at, created_at)
      VALUES ('${safeKey}', '${safeValue}', '${safeType}', '${safeCat}', '${safeLabel}', '${safeDesc}', '${safeUser}', NOW(), NOW())
    `));
  }

  return { success: true, key, value };
}

// Phase 10 — Feature 5: Get System Settings
export async function getSystemSettings(category?: string) {
  const db = await requireDb();
  const where = category ? `WHERE category = '${category.replace(/'/g, "''")}'` : "";
  const result = await db.execute(sql.raw(
    `SELECT * FROM ime_system_settings ${where} ORDER BY category, setting_key`
  ));
  return result.rows;
}

// ============================================================================
// Phase 11: Meeting Gamification & Engagement
// ============================================================================

// Phase 11 — Feature 1: Evaluate Achievements for a User
export async function evaluateAchievements(userId: string) {
  const db = await requireDb();
  const safeUser = userId.replace(/'/g, "''");

  // Ensure default achievement definitions exist
  const defsRes = await db.execute(sql.raw(
    `SELECT COUNT(*) as cnt FROM ime_achievements WHERE is_global = 1`
  ));
  if (Number((defsRes.rows as any[])[0]?.cnt || 0) === 0) {
    const defaults = [
      { key: "first_meeting", name: "初次亮相", desc: "参加第一次被分析的会议", icon: "Star", cat: "general", tier: "bronze", criteria: { metric: "meetings_attended", operator: ">=", value: 1 }, points: 10 },
      { key: "contributor_10", name: "活跃贡献者", desc: "在10次会议中贡献度超过70分", icon: "TrendingUp", cat: "contribution", tier: "silver", criteria: { metric: "high_contribution_count", operator: ">=", value: 10 }, points: 30 },
      { key: "action_hero_5", name: "行动达人", desc: "完成5个行动项", icon: "CheckCircle", cat: "efficiency", tier: "bronze", criteria: { metric: "actions_completed", operator: ">=", value: 5 }, points: 15 },
      { key: "action_hero_20", name: "执行大师", desc: "完成20个行动项", icon: "Award", cat: "efficiency", tier: "gold", criteria: { metric: "actions_completed", operator: ">=", value: 20 }, points: 50 },
      { key: "team_player", name: "协作之星", desc: "协作评分平均超过80", icon: "Users", cat: "collaboration", tier: "silver", criteria: { metric: "avg_collaboration", operator: ">=", value: 80 }, points: 25 },
      { key: "streak_5", name: "连续参会", desc: "连续5次会议效能评分超过70", icon: "Flame", cat: "streak", tier: "silver", criteria: { metric: "effectiveness_streak", operator: ">=", value: 5 }, points: 35 },
      { key: "meeting_lead_10", name: "会议领袖", desc: "主持10次会议", icon: "Crown", cat: "general", tier: "gold", criteria: { metric: "meetings_led", operator: ">=", value: 10 }, points: 40 },
      { key: "roi_champion", name: "ROI冠军", desc: "参与的会议平均ROI评分超过80", icon: "Trophy", cat: "efficiency", tier: "platinum", criteria: { metric: "avg_roi", operator: ">=", value: 80 }, points: 60 },
    ];
    for (const d of defaults) {
      await db.execute(sql.raw(`
        INSERT INTO ime_achievements (achievement_key, name, description, icon, category, tier, criteria, points, is_global, created_at)
        VALUES ('${d.key}', '${d.name}', '${d.desc}', '${d.icon}', '${d.cat}', '${d.tier}', '${JSON.stringify(d.criteria)}', ${d.points}, 1, NOW())
      `));
    }
  }

  // Get all definitions
  const allDefs = await db.execute(sql.raw(`SELECT * FROM ime_achievements WHERE is_global = 1`));
  const definitions = allDefs.rows as any[];

  // Get already awarded
  const awardedRes = await db.execute(sql.raw(
    `SELECT achievement_key FROM ime_achievements WHERE user_id = '${safeUser}' AND is_global = 0`
  ));
  const awardedKeys = new Set((awardedRes.rows as any[]).map((a: any) => a.achievement_key));

  // Compute user metrics
  const contribRes = await db.execute(sql.raw(
    `SELECT COUNT(*) as meetings_attended, SUM(CASE WHEN contribution_score >= 70 THEN 1 ELSE 0 END) as high_contribution_count FROM meeting_contributions WHERE speaker_name = '${safeUser}' OR speaker_id = '${safeUser}'`
  ));
  const actionsRes = await db.execute(sql.raw(
    `SELECT COUNT(*) as completed FROM ime_action_items WHERE assigned_to = '${safeUser}' AND status = 'completed'`
  ));
  const effRes = await db.execute(sql.raw(
    `SELECT AVG(mes.overall_score) as avg_eff FROM meeting_effectiveness_scores mes JOIN meeting_records mr ON mes.meeting_id = mr.id`
  ));
  const roiRes = await db.execute(sql.raw(
    `SELECT AVG(roi_score) as avg_roi FROM ime_meeting_roi`
  ));

  const contribs = (contribRes.rows as any[])[0] || {};
  const actions = (actionsRes.rows as any[])[0] || {};
  const effData = (effRes.rows as any[])[0] || {};
  const roiData = (roiRes.rows as any[])[0] || {};

  const metrics: Record<string, number> = {
    meetings_attended: Number(contribs.meetings_attended || 0),
    high_contribution_count: Number(contribs.high_contribution_count || 0),
    actions_completed: Number(actions.completed || 0),
    avg_collaboration: 65, // placeholder — would come from sentiment data
    effectiveness_streak: Math.min(Number(contribs.meetings_attended || 0), 5),
    meetings_led: Math.floor(Number(contribs.meetings_attended || 0) / 3),
    avg_roi: Number(roiData.avg_roi || 0),
  };

  // Evaluate and award
  const newAwards: any[] = [];
  for (const def of definitions) {
    if (awardedKeys.has(def.achievement_key)) continue;
    const criteria = JSON.parse(def.criteria || "{}");
    const actual = metrics[criteria.metric] ?? 0;
    let met = false;
    switch (criteria.operator) {
      case ">=": met = actual >= criteria.value; break;
      case ">": met = actual > criteria.value; break;
      case "==": met = actual === criteria.value; break;
    }
    if (met) {
      await db.execute(sql.raw(`
        INSERT INTO ime_achievements (achievement_key, name, description, icon, category, tier, criteria, points, is_global, user_id, awarded_at, created_at)
        VALUES ('${def.achievement_key}', '${(def.name || "").replace(/'/g, "''")}', '${(def.description || "").replace(/'/g, "''")}', '${def.icon || ""}', '${def.category}', '${def.tier}', '${(def.criteria || "{}").replace(/'/g, "''")}', ${def.points}, 0, '${safeUser}', NOW(), NOW())
      `));
      newAwards.push({ key: def.achievement_key, name: def.name, tier: def.tier, points: def.points });
    }
  }

  return { userId, newAwards, totalEvaluated: definitions.length, metrics };
}

// Phase 11 — Feature 2: Get Leaderboard
export async function getLeaderboard(period?: string, metric?: string) {
  const db = await requireDb();
  const targetMetric = metric || "contribution_score";
  const periodDays = period === "quarterly" ? 90 : period === "weekly" ? 7 : 30;

  let query = "";
  switch (targetMetric) {
    case "contribution_score":
      query = `SELECT speaker_name as user_id, speaker_name as user_name, AVG(contribution_score) as score, COUNT(*) as meeting_count FROM meeting_contributions WHERE created_at >= NOW() - INTERVAL '${periodDays} days' GROUP BY speaker_name ORDER BY score DESC LIMIT 20`;
      break;
    case "action_completion":
      query = `SELECT assigned_to as user_id, assigned_to as user_name, COUNT(*) as score FROM ime_action_items WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '${periodDays} days' GROUP BY assigned_to ORDER BY score DESC LIMIT 20`;
      break;
    case "effectiveness":
      query = `SELECT 'team' as user_id, 'Team Average' as user_name, AVG(overall_score) as score FROM meeting_effectiveness_scores WHERE created_at >= NOW() - INTERVAL '${periodDays} days'`;
      break;
    default:
      query = `SELECT speaker_name as user_id, speaker_name as user_name, AVG(contribution_score) as score FROM meeting_contributions WHERE created_at >= NOW() - INTERVAL '${periodDays} days' GROUP BY speaker_name ORDER BY score DESC LIMIT 20`;
  }

  const result = await db.execute(sql.raw(query));
  const rows = result.rows as any[];

  return rows.map((r: any, i: number) => ({
    rank: i + 1,
    userId: r.user_id,
    userName: r.user_name,
    score: Math.round(Number(r.score || 0) * 100) / 100,
    trend: "stable" as const,
  }));
}

// Phase 11 — Feature 3: Create Team Challenge
export async function createTeamChallenge(challenge: {
  title: string;
  description?: string;
  challengeType: string;
  targetMetric: string;
  targetValue: number;
  scope?: string;
  scopeId?: string;
  startDate?: string;
  endDate?: string;
  rewardDescription?: string;
  createdBy?: string;
}) {
  const db = await requireDb();
  const safeTitle = challenge.title.replace(/'/g, "''");
  const safeDesc = (challenge.description || "").replace(/'/g, "''");
  const safeReward = (challenge.rewardDescription || "").replace(/'/g, "''");
  const safeCreatedBy = (challenge.createdBy || "system").replace(/'/g, "''");

  // Get baseline value
  let baseline = 0;
  switch (challenge.targetMetric) {
    case "avg_effectiveness": {
      const r = await db.execute(sql.raw(`SELECT AVG(overall_score) as v FROM meeting_effectiveness_scores WHERE created_at >= NOW() - INTERVAL '30 days'`));
      baseline = Number((r.rows as any[])[0]?.v || 0);
      break;
    }
    case "avg_duration": {
      const r = await db.execute(sql.raw(`SELECT AVG(duration_minutes) as v FROM meeting_records WHERE meeting_date >= NOW() - INTERVAL '30 days'`));
      baseline = Number((r.rows as any[])[0]?.v || 0);
      break;
    }
    case "action_completion_rate": {
      const r = await db.execute(sql.raw(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done FROM ime_action_items WHERE created_at >= NOW() - INTERVAL '30 days'`));
      const row = (r.rows as any[])[0] || {};
      baseline = row.total > 0 ? Math.round((Number(row.done) / Number(row.total)) * 100) : 0;
      break;
    }
    case "avg_cost": {
      const r = await db.execute(sql.raw(`SELECT AVG(total_cost) as v FROM ime_meeting_costs WHERE calculated_at >= NOW() - INTERVAL '30 days'`));
      baseline = Number((r.rows as any[])[0]?.v || 0);
      break;
    }
  }

  await db.execute(sql.raw(`
    INSERT INTO ime_team_challenges (title, description, challenge_type, target_metric, target_value, current_value, baseline_value, scope, scope_id, start_date, end_date, status, reward_description, created_by, created_at, updated_at)
    VALUES ('${safeTitle}', '${safeDesc}', '${challenge.challengeType}', '${challenge.targetMetric}', ${challenge.targetValue}, ${baseline}, ${baseline}, '${challenge.scope || "organization"}', ${challenge.scopeId ? `'${challenge.scopeId}'` : "NULL"}, ${challenge.startDate ? `'${challenge.startDate}'` : "NOW()"}, ${challenge.endDate ? `'${challenge.endDate}'` : "NOW() + INTERVAL '30 days'"}, 'active', '${safeReward}', '${safeCreatedBy}', NOW(), NOW())
  `));

  return { success: true, title: challenge.title, baseline };
}

// Phase 11 — Feature 4: Update Challenge Progress
export async function updateChallengeProgress(challengeId: number) {
  const db = await requireDb();
  const chalRes = await db.execute(sql`SELECT * FROM ime_team_challenges WHERE id = ${challengeId}`);
  const challenge = (chalRes.rows as any[])[0];
  if (!challenge) throw new Error("Challenge not found");

  let currentValue = 0;
  switch (challenge.target_metric) {
    case "avg_effectiveness": {
      const r = await db.execute(sql`SELECT AVG(overall_score) as v FROM meeting_effectiveness_scores WHERE created_at >= ${challenge.start_date}`);
      currentValue = Number((r.rows as any[])[0]?.v || 0);
      break;
    }
    case "avg_duration": {
      const r = await db.execute(sql`SELECT AVG(duration_minutes) as v FROM meeting_records WHERE meeting_date >= ${challenge.start_date}`);
      currentValue = Number((r.rows as any[])[0]?.v || 0);
      break;
    }
    case "action_completion_rate": {
      const r = await db.execute(sql`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done FROM ime_action_items WHERE created_at >= ${challenge.start_date}`);
      const row = (r.rows as any[])[0] || {};
      currentValue = row.total > 0 ? Math.round((Number(row.done) / Number(row.total)) * 100) : 0;
      break;
    }
    case "avg_cost": {
      const r = await db.execute(sql`SELECT AVG(total_cost) as v FROM ime_meeting_costs WHERE calculated_at >= ${challenge.start_date}`);
      currentValue = Number((r.rows as any[])[0]?.v || 0);
      break;
    }
  }

  // Determine if challenge is met
  const isImprove = challenge.challenge_type === "improve_effectiveness" || challenge.challenge_type === "action_completion" || challenge.challenge_type === "boost_engagement";
  const met = isImprove ? currentValue >= challenge.target_value : currentValue <= challenge.target_value;
  const newStatus = met ? "completed" : (challenge.end_date && new Date(challenge.end_date) < new Date() ? "failed" : "active");

  await db.execute(sql`
    UPDATE ime_team_challenges SET current_value = ${currentValue}, status = ${newStatus}, updated_at = NOW() WHERE id = ${challengeId}
  `);

  const progress = Math.min(100, Math.round(
    isImprove
      ? ((currentValue - Number(challenge.baseline_value)) / (Number(challenge.target_value) - Number(challenge.baseline_value))) * 100
      : ((Number(challenge.baseline_value) - currentValue) / (Number(challenge.baseline_value) - Number(challenge.target_value))) * 100
  ));

  return { challengeId, currentValue, targetValue: Number(challenge.target_value), baseline: Number(challenge.baseline_value), progress: Math.max(0, progress), status: newStatus };
}

// Phase 11 — Feature 5: Gamification Dashboard
export async function getGamificationDashboard(userId?: string) {
  const db = await requireDb();

  // Achievement definitions
  const defsRes = await db.execute(sql.raw(`SELECT * FROM ime_achievements WHERE is_global = 1 ORDER BY points ASC`));

  // User awards
  const awardsRes = userId
    ? await db.execute(sql`SELECT * FROM ime_achievements WHERE user_id = ${userId} AND is_global = 0 ORDER BY awarded_at DESC`)
    : await db.execute(sql.raw(`SELECT * FROM ime_achievements WHERE is_global = 0 ORDER BY awarded_at DESC`));

  // Total points
  const pointsRes = userId
    ? await db.execute(sql`SELECT user_id, SUM(points) as total_points, COUNT(*) as badge_count FROM ime_achievements WHERE is_global = 0 AND user_id = ${userId}`)
    : await db.execute(sql.raw(`SELECT SUM(points) as total_points, COUNT(*) as badge_count FROM ime_achievements WHERE is_global = 0 GROUP BY user_id ORDER BY total_points DESC LIMIT 10`));

  // Active challenges
  const challengesRes = await db.execute(sql.raw(`SELECT * FROM ime_team_challenges WHERE status = 'active' ORDER BY created_at DESC`));

  // Recent completions
  const recentRes = await db.execute(sql.raw(`SELECT * FROM ime_team_challenges WHERE status = 'completed' ORDER BY updated_at DESC LIMIT 5`));

  return {
    definitions: defsRes.rows,
    awards: awardsRes.rows,
    pointsSummary: pointsRes.rows,
    activeChallenges: challengesRes.rows,
    recentCompletions: recentRes.rows,
  };
}

// ============================================================================
// Phase 12: Meeting Feedback & Continuous Improvement
// ============================================================================

// Phase 12 — Feature 1: Submit Meeting Feedback
export async function submitMeetingFeedback(meetingId: string, userId: string, feedback: {
  overallRating: number;
  contentRelevance?: number;
  timeEfficiency?: number;
  facilitation?: number;
  actionClarity?: number;
  wouldRecommend?: number;
  highlights?: string;
  improvements?: string;
  suggestions?: string;
  anonymous?: boolean;
}) {
  const db = await requireDb();

  await db.execute(sql`
    INSERT INTO ime_meeting_feedback (meeting_id, user_id, overall_rating, content_relevance, time_efficiency, facilitation, action_clarity, would_recommend, highlights, improvements, suggestions, anonymous, submitted_at)
    VALUES (${meetingId}, ${userId}, ${feedback.overallRating}, ${feedback.contentRelevance ?? null}, ${feedback.timeEfficiency ?? null}, ${feedback.facilitation ?? null}, ${feedback.actionClarity ?? null}, ${feedback.wouldRecommend ?? null}, ${feedback.highlights || ""}, ${feedback.improvements || ""}, ${feedback.suggestions || ""}, ${feedback.anonymous ? 1 : 0}, NOW())
  `);

  return { success: true, meetingId, userId: feedback.anonymous ? "anonymous" : userId };
}

// Phase 12 — Feature 2: Analyze Feedback Trends
export async function analyzeFeedbackTrends(filters?: { period?: string; scope?: string; scopeId?: string }) {
  const db = await requireDb();
  const periodDays = filters?.period === "quarterly" ? 90 : filters?.period === "weekly" ? 7 : 30;

  const avgRes = await db.execute(sql.raw(`
    SELECT COUNT(*) as total_responses,
           AVG(overall_rating) as avg_overall,
           AVG(content_relevance) as avg_content,
           AVG(time_efficiency) as avg_time,
           AVG(facilitation) as avg_facilitation,
           AVG(action_clarity) as avg_action,
           SUM(CASE WHEN would_recommend = 1 THEN 1 ELSE 0 END) as promoters,
           SUM(CASE WHEN would_recommend = 0 THEN 1 ELSE 0 END) as detractors
    FROM ime_meeting_feedback
    WHERE submitted_at >= NOW() - INTERVAL '${periodDays} days'
  `));

  const avg = (avgRes.rows as any[])[0] || {};
  const total = Number(avg.total_responses || 0);
  const nps = total > 0
    ? Math.round(((Number(avg.promoters || 0) - Number(avg.detractors || 0)) / total) * 100)
    : 0;

  // Get previous period for trend
  const prevRes = await db.execute(sql.raw(`
    SELECT AVG(overall_rating) as prev_avg
    FROM ime_meeting_feedback
    WHERE submitted_at >= NOW() - INTERVAL '${periodDays * 2} days' AND submitted_at < NOW() - INTERVAL '${periodDays} days'
  `));
  const prevAvg = Number((prevRes.rows as any[])[0]?.prev_avg || 0);
  const currentAvg = Number(avg.avg_overall || 0);
  const trend = currentAvg > prevAvg + 0.1 ? "up" : currentAvg < prevAvg - 0.1 ? "down" : "stable";

  // Common feedback themes (top highlights and improvements)
  const highlightsRes = await db.execute(sql.raw(
    `SELECT highlights FROM ime_meeting_feedback WHERE highlights != '' AND submitted_at >= NOW() - INTERVAL '${periodDays} days' ORDER BY submitted_at DESC LIMIT 20`
  ));
  const improvementsRes = await db.execute(sql.raw(
    `SELECT improvements FROM ime_meeting_feedback WHERE improvements != '' AND submitted_at >= NOW() - INTERVAL '${periodDays} days' ORDER BY submitted_at DESC LIMIT 20`
  ));

  // Save analytics snapshot
  await db.execute(sql.raw(`
    INSERT INTO ime_feedback_analytics (scope, scope_id, period, total_responses, avg_overall_rating, avg_content_relevance, avg_time_efficiency, avg_facilitation, avg_action_clarity, nps_score, top_highlights, top_improvements, trend_direction, analyzed_at)
    VALUES ('${filters?.scope || "organization"}', ${filters?.scopeId ? `'${filters.scopeId.replace(/'/g, "''")}'` : "NULL"}, '${filters?.period || "monthly"}', ${total}, ${currentAvg.toFixed(2)}, ${Number(avg.avg_content || 0).toFixed(2)}, ${Number(avg.avg_time || 0).toFixed(2)}, ${Number(avg.avg_facilitation || 0).toFixed(2)}, ${Number(avg.avg_action || 0).toFixed(2)}, ${nps}, '${JSON.stringify((highlightsRes.rows as any[]).map((r: any) => r.highlights).slice(0, 5)).replace(/'/g, "''")}', '${JSON.stringify((improvementsRes.rows as any[]).map((r: any) => r.improvements).slice(0, 5)).replace(/'/g, "''")}', '${trend}', NOW())
  `));

  return {
    totalResponses: total,
    avgOverall: Number(currentAvg.toFixed(2)),
    avgContent: Number(Number(avg.avg_content || 0).toFixed(2)),
    avgTime: Number(Number(avg.avg_time || 0).toFixed(2)),
    avgFacilitation: Number(Number(avg.avg_facilitation || 0).toFixed(2)),
    avgAction: Number(Number(avg.avg_action || 0).toFixed(2)),
    npsScore: nps,
    trend,
    topHighlights: (highlightsRes.rows as any[]).map((r: any) => r.highlights).slice(0, 5),
    topImprovements: (improvementsRes.rows as any[]).map((r: any) => r.improvements).slice(0, 5),
  };
}

// Phase 12 — Feature 3: Generate Improvement Initiative (AI-powered)
export async function generateImprovementInitiative(scope: string, scopeId?: string) {
  const db = await requireDb();

  // Gather recent feedback data
  const fbRes = await db.execute(sql.raw(
    `SELECT AVG(overall_rating) as avg_rating, AVG(content_relevance) as avg_content, AVG(time_efficiency) as avg_time, AVG(facilitation) as avg_fac, AVG(action_clarity) as avg_action, COUNT(*) as cnt FROM ime_meeting_feedback WHERE submitted_at >= NOW() - INTERVAL '30 days'`
  ));
  const improvRes = await db.execute(sql.raw(
    `SELECT improvements FROM ime_meeting_feedback WHERE improvements != '' AND submitted_at >= NOW() - INTERVAL '30 days' ORDER BY submitted_at DESC LIMIT 15`
  ));
  const healthRes = await db.execute(sql.raw(
    `SELECT AVG(health_score) as avg_health FROM ime_meeting_health WHERE assessed_at >= NOW() - INTERVAL '30 days'`
  ));

  const fb = (fbRes.rows as any[])[0] || {};
  const health = (healthRes.rows as any[])[0] || {};
  const improvementTexts = (improvRes.rows as any[]).map((r: any) => r.improvements);

  const context = [
    `范围: ${scope}${scopeId ? ` (${scopeId})` : ""}`,
    `平均评分: ${Number(fb.avg_rating || 0).toFixed(1)}/5 (${fb.cnt || 0}条反馈)`,
    `内容相关性: ${Number(fb.avg_content || 0).toFixed(1)}, 时间效率: ${Number(fb.avg_time || 0).toFixed(1)}, 主持质量: ${Number(fb.avg_fac || 0).toFixed(1)}, 行动清晰度: ${Number(fb.avg_action || 0).toFixed(1)}`,
    `会议健康度: ${Number(health.avg_health || 0).toFixed(0)}分`,
    `改进反馈: ${improvementTexts.join("; ")}`,
  ].join("\n");

  const llmResult = await invokeLLM({
    system: "你是会议改进顾问。基于反馈数据生成具体可执行的改进计划。",
    prompt: `请基于以下反馈数据生成改进建议:\n${context}`,
    schema: {
      type: "object",
      properties: {
        initiatives: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              priority: { type: "string" },
              target_metric: { type: "string" },
              target_improvement: { type: "string" },
              owner_suggestion: { type: "string" },
            },
            required: ["title", "description", "category"],
          },
        },
        narrative: { type: "string" },
      },
      required: ["initiatives"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;
  const safeScopeId = (scopeId || "").replace(/'/g, "''");

  for (const init of (parsed.initiatives || [])) {
    await db.execute(sql.raw(`
      INSERT INTO ime_improvement_initiatives (title, description, category, priority, source, scope, scope_id, target_metric, status, ai_narrative, created_by, created_at, updated_at)
      VALUES ('${(init.title || "").replace(/'/g, "''")}', '${(init.description || "").replace(/'/g, "''")}', '${init.category || "general"}', '${init.priority || "P2"}', 'ai_analysis', '${scope}', ${scopeId ? `'${safeScopeId}'` : "NULL"}, ${init.target_metric ? `'${init.target_metric}'` : "NULL"}, 'proposed', '${(parsed.narrative || "").replace(/'/g, "''")}', 'ai', NOW(), NOW())
    `));
  }

  return {
    initiatives: parsed.initiatives || [],
    narrative: parsed.narrative || "",
    count: (parsed.initiatives || []).length,
  };
}

// Phase 12 — Feature 4: Meeting Feedback Summary
export async function getMeetingFeedbackSummary(meetingId: string) {
  const db = await requireDb();

  const fbRes = await db.execute(sql`
    SELECT COUNT(*) as total, AVG(overall_rating) as avg_overall, AVG(content_relevance) as avg_content,
           AVG(time_efficiency) as avg_time, AVG(facilitation) as avg_fac, AVG(action_clarity) as avg_action,
           SUM(CASE WHEN would_recommend = 1 THEN 1 ELSE 0 END) as promoters,
           SUM(CASE WHEN would_recommend = 0 THEN 1 ELSE 0 END) as detractors
    FROM ime_meeting_feedback WHERE meeting_id = ${meetingId}
  `);
  const commentsRes = await db.execute(sql`SELECT highlights, improvements, suggestions, overall_rating FROM ime_meeting_feedback WHERE meeting_id = ${meetingId} ORDER BY submitted_at DESC`);

  const stats = (fbRes.rows as any[])[0] || {};
  const total = Number(stats.total || 0);
  const nps = total > 0 ? Math.round(((Number(stats.promoters || 0) - Number(stats.detractors || 0)) / total) * 100) : 0;

  return {
    meetingId,
    totalResponses: total,
    avgOverall: Number(Number(stats.avg_overall || 0).toFixed(2)),
    avgContent: Number(Number(stats.avg_content || 0).toFixed(2)),
    avgTime: Number(Number(stats.avg_time || 0).toFixed(2)),
    avgFacilitation: Number(Number(stats.avg_fac || 0).toFixed(2)),
    avgAction: Number(Number(stats.avg_action || 0).toFixed(2)),
    npsScore: nps,
    comments: commentsRes.rows,
  };
}

// Phase 12 — Feature 5: Feedback Dashboard
export async function getFeedbackDashboard(filters?: { period?: string }) {
  const db = await requireDb();
  const periodDays = filters?.period === "quarterly" ? 90 : filters?.period === "weekly" ? 7 : 30;

  const statsRes = await db.execute(sql.raw(`
    SELECT COUNT(*) as total, AVG(overall_rating) as avg_rating,
           SUM(CASE WHEN would_recommend = 1 THEN 1 ELSE 0 END) as promoters,
           SUM(CASE WHEN would_recommend = 0 THEN 1 ELSE 0 END) as detractors
    FROM ime_meeting_feedback WHERE submitted_at >= NOW() - INTERVAL '${periodDays} days'
  `));

  const analyticsRes = await db.execute(sql.raw(
    `SELECT * FROM ime_feedback_analytics ORDER BY analyzed_at DESC LIMIT 10`
  ));

  const initiativesRes = await db.execute(sql.raw(
    `SELECT * FROM ime_improvement_initiatives ORDER BY created_at DESC LIMIT 20`
  ));

  const recentFbRes = await db.execute(sql.raw(
    `SELECT mf.*, mr.title as meeting_title FROM ime_meeting_feedback mf LEFT JOIN meeting_records mr ON mf.meeting_id = mr.id ORDER BY mf.submitted_at DESC LIMIT 10`
  ));

  const stats = (statsRes.rows as any[])[0] || {};
  const total = Number(stats.total || 0);
  const nps = total > 0 ? Math.round(((Number(stats.promoters || 0) - Number(stats.detractors || 0)) / total) * 100) : 0;

  return {
    stats: { totalResponses: total, avgRating: Number(Number(stats.avg_rating || 0).toFixed(2)), npsScore: nps },
    analyticsHistory: analyticsRes.rows,
    initiatives: initiativesRes.rows,
    recentFeedback: recentFbRes.rows,
  };
}

// ============================================================================
// Phase 13: Meeting Compliance & Governance
// ============================================================================

// Phase 13 — Feature 1: Create Compliance Policy
export async function createCompliancePolicy(policy: {
  name: string;
  description?: string;
  policyType: string;
  checkField?: string;
  operator?: string;
  threshold?: string;
  severity?: string;
  scope?: string;
  scopeId?: string;
  createdBy?: string;
}) {
  const db = await requireDb();
  const safeName = policy.name.replace(/'/g, "''");
  const safeDesc = (policy.description || "").replace(/'/g, "''");
  const safeCreatedBy = (policy.createdBy || "system").replace(/'/g, "''");

  await db.execute(sql.raw(`
    INSERT INTO ime_compliance_policies (name, description, policy_type, check_field, operator, threshold, severity, scope, scope_id, is_active, created_by, created_at, updated_at)
    VALUES ('${safeName}', '${safeDesc}', '${policy.policyType}', ${policy.checkField ? `'${policy.checkField}'` : "NULL"}, ${policy.operator ? `'${policy.operator}'` : "NULL"}, ${policy.threshold ? `'${policy.threshold}'` : "NULL"}, '${policy.severity || "warning"}', '${policy.scope || "global"}', ${policy.scopeId ? `'${policy.scopeId}'` : "NULL"}, 1, '${safeCreatedBy}', NOW(), NOW())
  `));

  return { success: true, name: policy.name };
}

// Phase 13 — Feature 2: Audit Meeting Compliance
export async function auditMeetingCompliance(meetingId: string) {
  const db = await requireDb();

  // Get meeting data
  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  // Get related data
  const effRes = await db.execute(sql`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId} LIMIT 1`);
  const actionRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ime_action_items WHERE meeting_id = ${meetingId}`);
  const contribRes = await db.execute(sql`SELECT COUNT(DISTINCT speaker_name) as participants FROM meeting_contributions WHERE meeting_id = ${meetingId}`);

  const eff = (effRes.rows as any[])[0];
  const actionCount = Number((actionRes.rows as any[])[0]?.cnt || 0);
  const participantCount = Number((contribRes.rows as any[])[0]?.participants || 0);

  const meetingData: Record<string, any> = {
    duration_minutes: Number(meeting.duration_minutes || 0),
    participant_count: participantCount,
    has_agenda: meeting.agenda ? 1 : 0,
    has_summary: meeting.summary ? 1 : 0,
    action_item_count: actionCount,
    effectiveness_score: eff ? Number(eff.overall_score || 0) : null,
  };

  // Get active policies
  const policiesRes = await db.execute(sql.raw(`SELECT * FROM ime_compliance_policies WHERE is_active = 1`));
  const policies = policiesRes.rows as any[];

  const results: any[] = [];
  const safeTitle = (meeting.title || "").replace(/'/g, "''");

  for (const policy of policies) {
    const field = policy.check_field;
    const actual = field ? meetingData[field] : null;
    let result = "na";
    let actualStr = String(actual ?? "N/A");

    if (actual !== null && actual !== undefined && policy.operator && policy.threshold) {
      const threshold = Number(policy.threshold);
      const numActual = Number(actual);

      switch (policy.operator) {
        case "<": result = numActual < threshold ? "pass" : "fail"; break;
        case ">": result = numActual > threshold ? "pass" : "fail"; break;
        case "<=": result = numActual <= threshold ? "pass" : "fail"; break;
        case ">=": result = numActual >= threshold ? "pass" : "fail"; break;
        case "==": result = numActual === threshold ? "pass" : "fail"; break;
        case "!=": result = numActual !== threshold ? "pass" : "fail"; break;
        case "exists": result = actual ? "pass" : "fail"; break;
      }
    } else if (policy.operator === "exists") {
      result = actual ? "pass" : "fail";
    }

    const severity = result === "fail" ? (policy.severity || "warning") : "info";

    const details = result === "fail" ? "不合规" : result === "pass" ? "合规" : "不适用";
    const expectedValue = `${policy.operator || ""} ${policy.threshold || ""}`;
    await db.execute(sql`
      INSERT INTO ime_compliance_audits (meeting_id, meeting_title, policy_id, policy_name, policy_type, result, severity, actual_value, expected_value, details, audited_at)
      VALUES (${meetingId}, ${meeting.title || ""}, ${policy.id}, ${policy.name || ""}, ${policy.policy_type}, ${result}, ${severity}, ${actualStr}, ${expectedValue}, ${details}, NOW())
    `);

    results.push({ policyId: policy.id, policyName: policy.name, policyType: policy.policy_type, result, severity, actual: actualStr, expected: `${policy.operator || ""} ${policy.threshold || ""}` });
  }

  const passed = results.filter(r => r.result === "pass").length;
  const failed = results.filter(r => r.result === "fail").length;

  return { meetingId, meetingTitle: meeting.title, totalPolicies: results.length, passed, failed, complianceRate: results.length > 0 ? Math.round((passed / (passed + failed || 1)) * 100) : 100, results };
}

// Phase 13 — Feature 3: Compliance Overview
export async function getComplianceOverview(filters?: { period?: string }) {
  const db = await requireDb();
  const periodDays = filters?.period === "quarterly" ? 90 : filters?.period === "weekly" ? 7 : 30;

  const policiesRes = await db.execute(sql.raw(`SELECT * FROM ime_compliance_policies WHERE is_active = 1 ORDER BY created_at DESC`));

  const statsRes = await db.execute(sql.raw(`
    SELECT COUNT(*) as total, SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed,
           SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as failed,
           SUM(CASE WHEN result = 'fail' AND severity = 'critical' THEN 1 ELSE 0 END) as critical,
           SUM(CASE WHEN result = 'fail' AND severity = 'violation' THEN 1 ELSE 0 END) as violations,
           COUNT(DISTINCT meeting_id) as meetings_audited
    FROM ime_compliance_audits WHERE audited_at >= NOW() - INTERVAL '${periodDays} days'
  `));

  const topViolationsRes = await db.execute(sql.raw(`
    SELECT policy_name, policy_type, severity, COUNT(*) as cnt
    FROM ime_compliance_audits
    WHERE result = 'fail' AND audited_at >= NOW() - INTERVAL '${periodDays} days'
    GROUP BY policy_name, policy_type, severity ORDER BY cnt DESC LIMIT 10
  `));

  const recentAuditsRes = await db.execute(sql.raw(
    `SELECT * FROM ime_compliance_audits WHERE result = 'fail' ORDER BY audited_at DESC LIMIT 20`
  ));

  const stats = (statsRes.rows as any[])[0] || {};
  const total = Number(stats.total || 0);
  const passed = Number(stats.passed || 0);
  const failed = Number(stats.failed || 0);

  return {
    policies: policiesRes.rows,
    stats: {
      totalChecks: total,
      passed,
      failed,
      critical: Number(stats.critical || 0),
      violations: Number(stats.violations || 0),
      meetingsAudited: Number(stats.meetings_audited || 0),
      complianceRate: (passed + failed) > 0 ? Math.round((passed / (passed + failed)) * 100) : 100,
    },
    topViolations: topViolationsRes.rows,
    recentFailures: recentAuditsRes.rows,
  };
}

// Phase 13 — Feature 4: Generate Governance Report (AI-powered)
export async function generateGovernanceReport(period?: string) {
  const db = await requireDb();
  const periodDays = period === "quarterly" ? 90 : period === "weekly" ? 7 : 30;

  const statsRes = await db.execute(sql.raw(`
    SELECT COUNT(DISTINCT meeting_id) as meetings, COUNT(*) as checks,
           SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed,
           SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as failed
    FROM ime_compliance_audits WHERE audited_at >= NOW() - INTERVAL '${periodDays} days'
  `));
  const violationsRes = await db.execute(sql.raw(`
    SELECT policy_name, policy_type, severity, COUNT(*) as cnt
    FROM ime_compliance_audits WHERE result = 'fail' AND audited_at >= NOW() - INTERVAL '${periodDays} days'
    GROUP BY policy_name, policy_type, severity ORDER BY cnt DESC LIMIT 5
  `));

  const stats = (statsRes.rows as any[])[0] || {};
  const violations = violationsRes.rows as any[];
  const passed = Number(stats.passed || 0);
  const failed = Number(stats.failed || 0);
  const complianceRate = (passed + failed) > 0 ? Math.round((passed / (passed + failed)) * 100) : 100;

  const context = [
    `周期: ${period || "monthly"} (${periodDays}天)`,
    `审计会议数: ${stats.meetings || 0}`,
    `总检查项: ${stats.checks || 0}, 通过: ${passed}, 不合规: ${failed}`,
    `合规率: ${complianceRate}%`,
    `主要违规: ${violations.map((v: any) => `${v.policy_name}(${v.cnt}次,${v.severity})`).join("; ")}`,
  ].join("\n");

  const llmResult = await invokeLLM({
    system: "你是企业会议治理顾问。基于合规审计数据生成治理报告，包括风险区域和改进建议。",
    prompt: `请生成会议治理报告:\n${context}`,
    schema: {
      type: "object",
      properties: {
        risk_areas: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
        narrative: { type: "string" },
      },
      required: ["risk_areas", "recommendations"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  await db.execute(sql.raw(`
    INSERT INTO ime_governance_reports (period, period_start, period_end, total_meetings_audited, compliance_rate, total_violations, total_warnings, top_violations, risk_areas, recommendations, ai_narrative, generated_at)
    VALUES ('${period || "monthly"}', NOW() - INTERVAL '${periodDays} days', NOW(), ${stats.meetings || 0}, ${complianceRate}, ${failed}, 0, '${JSON.stringify(violations.map((v: any) => ({ policyName: v.policy_name, count: v.cnt, severity: v.severity }))).replace(/'/g, "''")}', '${JSON.stringify(parsed.risk_areas || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.recommendations || []).replace(/'/g, "''")}', '${(parsed.narrative || "").replace(/'/g, "''")}', NOW())
  `));

  return {
    period: period || "monthly",
    meetingsAudited: Number(stats.meetings || 0),
    complianceRate,
    totalViolations: failed,
    topViolations: violations,
    riskAreas: parsed.risk_areas || [],
    recommendations: parsed.recommendations || [],
    narrative: parsed.narrative || "",
  };
}

// Phase 13 — Feature 5: Compliance History
export async function getComplianceHistory(meetingId?: string) {
  const db = await requireDb();
  if (meetingId) {
    const safeId = meetingId.replace(/'/g, "''");
    const result = await db.execute(sql.raw(
      `SELECT * FROM ime_compliance_audits WHERE meeting_id = '${safeId}' ORDER BY audited_at DESC`
    ));
    return result.rows;
  }
  // Governance reports
  const reports = await db.execute(sql.raw(
    `SELECT * FROM ime_governance_reports ORDER BY generated_at DESC LIMIT 10`
  ));
  return reports.rows;
}

// ============================================================================
// Phase 14: HR & Performance Linkage — CRUD
// ============================================================================

export async function createLinkageRule(input: {
  name: string;
  description?: string;
  conditionType: string;
  conditionField?: string;
  conditionOperator: string;
  conditionThreshold: string;
  actionType: string;
  actionTarget?: string;
  actionValue?: string;
  actionDescription?: string;
  scope?: string;
  scopeId?: string;
  impactDimension?: string;
  priority?: number;
  createdBy?: string;
}) {
  const db = await requireDb();
  const safeName = input.name.replace(/'/g, "''");
  const safeDesc = (input.description || "").replace(/'/g, "''");
  const safeField = (input.conditionField || "").replace(/'/g, "''");
  const safeTarget = (input.actionTarget || "").replace(/'/g, "''");
  const safeValue = (input.actionValue || "").replace(/'/g, "''");
  const safeActDesc = (input.actionDescription || "").replace(/'/g, "''");
  const safeScopeId = (input.scopeId || "").replace(/'/g, "''");
  const safeDim = (input.impactDimension || "").replace(/'/g, "''");
  const safeCreatedBy = (input.createdBy || "system").replace(/'/g, "''");

  const result = await db.execute(sql.raw(`
    INSERT INTO ime_linkage_rules (name, description, condition_type, condition_field, condition_operator, condition_threshold, action_type, action_target, action_value, action_description, scope, scope_id, impact_dimension, priority, is_active, created_by, created_at, updated_at)
    VALUES ('${safeName}', '${safeDesc}', '${input.conditionType}', '${safeField}', '${input.conditionOperator}', '${input.conditionThreshold}', '${input.actionType}', '${safeTarget}', '${safeValue}', '${safeActDesc}', '${input.scope || "individual"}', '${safeScopeId}', '${safeDim}', ${input.priority || 0}, 1, '${safeCreatedBy}', NOW(), NOW())
    RETURNING *
  `));
  return result.rows[0];
}

export async function listLinkageRules(activeOnly?: boolean) {
  const db = await requireDb();
  const where = activeOnly ? "WHERE is_active = 1" : "";
  const result = await db.execute(sql.raw(
    `SELECT * FROM ime_linkage_rules ${where} ORDER BY priority DESC, created_at DESC`
  ));
  return result.rows;
}

export async function updateLinkageRule(id: number, updates: Record<string, any>) {
  const db = await requireDb();
  const setClauses: SQL[] = [];
  if (updates.name !== undefined) setClauses.push(sql`name = ${String(updates.name)}`);
  if (updates.description !== undefined) setClauses.push(sql`description = ${String(updates.description)}`);
  if (updates.conditionType !== undefined) setClauses.push(sql`condition_type = ${updates.conditionType}`);
  if (updates.conditionField !== undefined) setClauses.push(sql`condition_field = ${String(updates.conditionField)}`);
  if (updates.conditionOperator !== undefined) setClauses.push(sql`condition_operator = ${updates.conditionOperator}`);
  if (updates.conditionThreshold !== undefined) setClauses.push(sql`condition_threshold = ${String(updates.conditionThreshold)}`);
  if (updates.actionType !== undefined) setClauses.push(sql`action_type = ${updates.actionType}`);
  if (updates.actionTarget !== undefined) setClauses.push(sql`action_target = ${String(updates.actionTarget)}`);
  if (updates.actionValue !== undefined) setClauses.push(sql`action_value = ${String(updates.actionValue)}`);
  if (updates.actionDescription !== undefined) setClauses.push(sql`action_description = ${String(updates.actionDescription)}`);
  if (updates.scope !== undefined) setClauses.push(sql`scope = ${updates.scope}`);
  if (updates.impactDimension !== undefined) setClauses.push(sql`impact_dimension = ${String(updates.impactDimension)}`);
  if (updates.priority !== undefined) setClauses.push(sql`priority = ${Number(updates.priority)}`);
  if (updates.isActive !== undefined) setClauses.push(sql`is_active = ${updates.isActive ? 1 : 0}`);
  if (setClauses.length === 0) return { success: true };
  setClauses.push(sql`updated_at = NOW()`);
  await db.execute(sql`UPDATE ime_linkage_rules SET ${sql.join(setClauses, sql`, `)} WHERE id = ${id}`);
  return { success: true };
}

export async function deleteLinkageRule(id: number) {
  const db = await requireDb();
  await db.execute(sql`DELETE FROM ime_linkage_rules WHERE id = ${id}`);
  return { success: true };
}

// ============================================================================
// Phase 14: HR & Performance Linkage — Core Engine
// ============================================================================

export async function evaluateLinkage(meetingId: string) {
    const db = await requireDb();

    // 1. Get meeting contributions
    const contribs = await db.execute(sql`SELECT * FROM meeting_contributions WHERE meeting_id = ${meetingId}`);
    const contributions = contribs.rows as any[];

    // 2. Get AI analysis
    const analysis = await db.execute(sql`SELECT * FROM ime_ai_analysis WHERE meeting_id = ${meetingId}`);
    const analyses = analysis.rows as any[];

    // 3. Get HR signals for participants
    const signals = await db.execute(sql`SELECT * FROM ime_hr_signals WHERE meeting_id = ${meetingId}`);
    const hrSignals = signals.rows as any[];

    // 4. Load active rules ordered by priority
    const rulesResult = await db.execute(sql.raw(
      `SELECT * FROM ime_linkage_rules WHERE is_active = 1 ORDER BY priority DESC`
    ));
    const rules = rulesResult.rows as any[];

    if (rules.length === 0) {
      return { meetingId, actionsGenerated: 0, byEmployee: [], message: "No active linkage rules found" };
    }

    // 5. Build participant data map
    const participantMap = new Map<string, any>();
    for (const c of contributions) {
      const key = c.participant_id || c.speaker_name || c.employee_id;
      if (!key) continue;
      if (!participantMap.has(key)) {
        participantMap.set(key, {
          employeeId: c.employee_id || key,
          employeeName: c.speaker_name || c.participant_name || key,
          department: c.department || "",
          contributionScore: 0,
          engagementScore: 0,
          behaviorTags: [] as string[],
          questionCount: 0,
          insightCount: 0,
          decisionCount: 0,
          actionItemAccepted: 0,
          signalTypes: [] as string[],
        });
      }
      const p = participantMap.get(key)!;
      p.contributionScore = Math.max(p.contributionScore, Number(c.contribution_score || c.overall_score || 0));
      p.engagementScore = Math.max(p.engagementScore, Number(c.engagement_score || c.participation_score || 0));
      p.questionCount += Number(c.questions_asked || 0);
      p.insightCount += Number(c.insights_provided || 0);
      p.decisionCount += Number(c.decisions_made || 0);
      p.actionItemAccepted += Number(c.action_items_accepted || 0);
      if (c.behavior_tags) {
        const tags = typeof c.behavior_tags === "string" ? JSON.parse(c.behavior_tags) : c.behavior_tags;
        if (Array.isArray(tags)) p.behaviorTags.push(...tags);
      }
    }

    // Enrich with HR signals
    for (const s of hrSignals) {
      const key = s.employee_id || s.employee_name;
      if (!key || !participantMap.has(key)) continue;
      participantMap.get(key)!.signalTypes.push(s.signal_type || s.type || "");
    }

    // Enrich from AI analysis
    for (const a of analyses) {
      const key = a.employee_id || a.participant_id;
      if (!key || !participantMap.has(key)) continue;
      const p = participantMap.get(key)!;
      if (a.tags) {
        const tags = typeof a.tags === "string" ? JSON.parse(a.tags) : a.tags;
        if (Array.isArray(tags)) p.behaviorTags.push(...tags);
      }
    }

    // 6. Evaluate rules against each participant
    const actionsToInsert: any[] = [];
    const participantKeys = Array.from(participantMap.keys());
    for (const key of participantKeys) {
      const participant = participantMap.get(key)!;
      for (const rule of rules) {
        const matched = evaluateCondition(participant, rule);
        if (!matched) continue;
        actionsToInsert.push({ participant, rule });
      }
    }

    // 7. Generate actions with LLM-enhanced descriptions
    const meetingResult = await db.execute(sql`
      SELECT title FROM meeting_records WHERE id = ${meetingId} LIMIT 1
    `);
    const meetingTitle = (meetingResult.rows[0] as any)?.title || meetingId;

    const byEmployee: any[] = [];
    for (const { participant, rule } of actionsToInsert) {
      let reason = `Rule "${rule.name}": ${rule.condition_type} ${rule.condition_operator} ${rule.condition_threshold}`;
      let actionDesc = rule.action_description || `${rule.action_type} for ${participant.employeeName}`;

      try {
        const llmResult = await invokeLLM({
          system: "你是HR绩效联动分析师。基于会议数据和规则匹配结果，生成简洁的中文HR操作理由和描述。",
          prompt: `员工: ${participant.employeeName}\n规则: ${rule.name}\n条件: ${rule.condition_type} ${rule.condition_operator} ${rule.condition_threshold}\n实际值: ${getConditionValue(participant, rule)}\n操作类型: ${rule.action_type}\n请生成reason和actionDescription。`,
          schema: {
            type: "object",
            properties: {
              reason: { type: "string" },
              actionDescription: { type: "string" },
            },
            required: ["reason", "actionDescription"],
          },
        });
        const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;
        reason = parsed.reason || reason;
        actionDesc = parsed.actionDescription || actionDesc;
      } catch {
        // fallback to default reason/description
      }

      const sourceData = JSON.stringify({
        contributionScore: participant.contributionScore,
        engagementScore: participant.engagementScore,
        behaviorTags: participant.behaviorTags,
        questionCount: participant.questionCount,
        signalTypes: participant.signalTypes,
      });

      await db.execute(sql`
        INSERT INTO ime_hr_actions (employee_id, employee_name, department, rule_id, rule_name, meeting_id, meeting_title, action_type, action_description, reason, impact_dimension, impact_value, source_data, status, created_at, updated_at)
        VALUES (${participant.employeeId}, ${participant.employeeName}, ${participant.department}, ${rule.id}, ${rule.name || ""}, ${meetingId}, ${meetingTitle}, ${rule.action_type}, ${actionDesc}, ${reason}, ${rule.impact_dimension || ""}, ${rule.action_value || ""}, ${sourceData}, 'pending', NOW(), NOW())
      `);

      const existing = byEmployee.find(e => e.employeeId === participant.employeeId);
      if (existing) {
        existing.actions.push({ ruleName: rule.name, actionType: rule.action_type, reason });
      } else {
        byEmployee.push({
          employeeId: participant.employeeId,
          employeeName: participant.employeeName,
          actions: [{ ruleName: rule.name, actionType: rule.action_type, reason }],
        });
      }
    }

    return { meetingId, actionsGenerated: actionsToInsert.length, byEmployee };
}

function getConditionValue(participant: any, rule: any): any {
  switch (rule.condition_type) {
    case "engagement_score": return participant.engagementScore;
    case "contribution_score": return participant.contributionScore;
    case "behavior_tag": return participant.behaviorTags.join(", ");
    case "action_item_accepted": return participant.actionItemAccepted;
    case "decision_count": return participant.decisionCount;
    case "signal_type": return participant.signalTypes.join(", ");
    case "question_count": return participant.questionCount;
    case "insight_count": return participant.insightCount;
    default: return null;
  }
}

function evaluateCondition(participant: any, rule: any): boolean {
  const value = getConditionValue(participant, rule);
  const threshold = rule.condition_threshold;

  if (rule.condition_operator === "contains") {
    if (Array.isArray(value)) return value.some((v: string) => v.toLowerCase().includes(threshold.toLowerCase()));
    return String(value).toLowerCase().includes(threshold.toLowerCase());
  }

  const numValue = Number(value);
  const numThreshold = Number(threshold);
  if (isNaN(numValue) || isNaN(numThreshold)) {
    if (rule.condition_operator === "==") return String(value) === threshold;
    if (rule.condition_operator === "!=") return String(value) !== threshold;
    return false;
  }

  switch (rule.condition_operator) {
    case ">=": return numValue >= numThreshold;
    case "<=": return numValue <= numThreshold;
    case ">": return numValue > numThreshold;
    case "<": return numValue < numThreshold;
    case "==": return numValue === numThreshold;
    case "!=": return numValue !== numThreshold;
    default: return false;
  }
}

// ============================================================================
// Phase 14: HR & Performance Linkage — Approval Workflow
// ============================================================================

export async function getHrActionLog(filters?: {
  status?: string;
  employeeId?: string;
  actionType?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const db = await requireDb();
  const conditions: string[] = [];
  if (filters?.status) conditions.push(`status = '${filters.status.replace(/'/g, "''")}'`);
  if (filters?.employeeId) conditions.push(`employee_id = '${filters.employeeId.replace(/'/g, "''")}'`);
  if (filters?.actionType) conditions.push(`action_type = '${filters.actionType.replace(/'/g, "''")}'`);
  if (filters?.department) conditions.push(`department LIKE '%${filters.department.replace(/'/g, "''")}%'`);
  if (filters?.dateFrom) conditions.push(`created_at >= '${filters.dateFrom}'`);
  if (filters?.dateTo) conditions.push(`created_at <= '${filters.dateTo}'`);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await db.execute(sql.raw(
    `SELECT * FROM ime_hr_actions ${where} ORDER BY created_at DESC LIMIT 200`
  ));
  return result.rows;
}

export async function approveHrAction(id: number, reviewedBy: string, notes?: string) {
  const db = await requireDb();
  const safeReviewer = reviewedBy.replace(/'/g, "''");
  const safeNotes = (notes || "").replace(/'/g, "''");
  await db.execute(sql.raw(`
    UPDATE ime_hr_actions SET status = 'approved', reviewed_by = '${safeReviewer}', reviewed_at = NOW(), review_notes = '${safeNotes}', updated_at = NOW()
    WHERE id = ${id} AND status = 'pending'
  `));
  return { success: true };
}

export async function rejectHrAction(id: number, reviewedBy: string, notes?: string) {
  const db = await requireDb();
  const safeReviewer = reviewedBy.replace(/'/g, "''");
  const safeNotes = (notes || "").replace(/'/g, "''");
  await db.execute(sql.raw(`
    UPDATE ime_hr_actions SET status = 'rejected', reviewed_by = '${safeReviewer}', reviewed_at = NOW(), review_notes = '${safeNotes}', updated_at = NOW()
    WHERE id = ${id} AND status = 'pending'
  `));
  return { success: true };
}

// ============================================================================
// Phase 14: HR & Performance Linkage — Execution
// ============================================================================

export async function executeHrActions(actionIds: number[]) {
  const db = await requireDb();
  const results: any[] = [];

  for (const actionId of actionIds) {
    const actionResult = await db.execute(sql.raw(
      `SELECT * FROM ime_hr_actions WHERE id = ${actionId} AND status = 'approved'`
    ));
    const action = actionResult.rows[0] as any;
    if (!action) {
      results.push({ id: actionId, success: false, error: "Action not found or not approved" });
      continue;
    }

    let executionResult: any = { executed: true };
    try {
      switch (action.action_type) {
        case "update_kpi": {
          await db.execute(sql.raw(`
            INSERT INTO kpi_score_records (employee_id, dimension, score, source, notes, created_at)
            VALUES ('${action.employee_id}', '${(action.impact_dimension || "meeting_contribution").replace(/'/g, "''")}', ${Number(action.impact_value) || 0}, 'ime_linkage', '${(action.reason || "").replace(/'/g, "''")}', NOW())
          `));
          executionResult = { type: "update_kpi", dimension: action.impact_dimension, value: action.impact_value };
          break;
        }
        case "flag_training": {
          await db.execute(sql.raw(`
            INSERT INTO hrm_training_plans (employee_id, training_type, title, reason, status, created_at)
            VALUES ('${action.employee_id}', 'skills', '${(action.action_description || "Training Required").replace(/'/g, "''")}', '${(action.reason || "").replace(/'/g, "''")}', 'planned', NOW())
          `));
          executionResult = { type: "flag_training", description: action.action_description };
          break;
        }
        case "add_achievement": {
          await db.execute(sql.raw(`
            INSERT INTO performance_traces (employee_id, metric, value, source, notes, traced_at)
            VALUES ('${action.employee_id}', 'achievement_tag', '${(action.action_value || "meeting_excellence").replace(/'/g, "''")}', 'ime_linkage', '${(action.reason || "").replace(/'/g, "''")}', NOW())
          `));
          executionResult = { type: "add_achievement", tag: action.action_value };
          break;
        }
        case "adjust_score": {
          await db.execute(sql.raw(`
            INSERT INTO kpi_score_records (employee_id, dimension, score, source, notes, created_at)
            VALUES ('${action.employee_id}', '${(action.impact_dimension || "performance_adjustment").replace(/'/g, "''")}', ${Number(action.impact_value) || 0}, 'ime_linkage_adjust', '${(action.reason || "").replace(/'/g, "''")}', NOW())
          `));
          executionResult = { type: "adjust_score", dimension: action.impact_dimension, value: action.impact_value };
          break;
        }
        case "create_key_result": {
          await db.execute(sql.raw(`
            INSERT INTO performance_traces (employee_id, metric, value, source, notes, traced_at)
            VALUES ('${action.employee_id}', 'key_result_in_progress', '${(action.action_value || "").replace(/'/g, "''")}', 'ime_linkage', '${(action.reason || "").replace(/'/g, "''")}', NOW())
          `));
          executionResult = { type: "create_key_result", value: action.action_value };
          break;
        }
        case "coaching_suggestion": {
          await db.execute(sql.raw(`
            INSERT INTO kpi_communication_suggestions (employee_id, suggestion_type, content, source, created_at)
            VALUES ('${action.employee_id}', 'coaching', '${(action.action_description || "").replace(/'/g, "''")}', 'ime_linkage', NOW())
          `));
          executionResult = { type: "coaching_suggestion", content: action.action_description };
          break;
        }
        default:
          executionResult = { type: action.action_type, note: "No specific handler, marked as executed" };
      }

      await db.execute(sql.raw(`
        UPDATE ime_hr_actions SET status = 'executed', executed_at = NOW(), execution_result = '${JSON.stringify(executionResult).replace(/'/g, "''")}', updated_at = NOW()
        WHERE id = ${actionId}
      `));
      results.push({ id: actionId, success: true, result: executionResult });
    } catch (err: any) {
      results.push({ id: actionId, success: false, error: err.message });
    }
  }

  return { executed: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results };
}

// ============================================================================
// Phase 14: HR & Performance Linkage — Dashboard
// ============================================================================

export async function getLinkageDashboard(period?: string, department?: string) {
  const db = await requireDb();
  const deptFilter = department ? `AND department LIKE '%${department.replace(/'/g, "''")}%'` : "";

  // Active rules count
  const rulesCount = await db.execute(sql.raw(
    `SELECT COUNT(*) as cnt FROM ime_linkage_rules WHERE is_active = 1`
  ));
  const activeRules = Number((rulesCount.rows[0] as any)?.cnt || 0);

  // Actions by status
  const statusCounts = await db.execute(sql.raw(
    `SELECT status, COUNT(*) as cnt FROM ime_hr_actions WHERE 1=1 ${deptFilter} GROUP BY status`
  ));
  const statusMap: Record<string, number> = {};
  for (const row of statusCounts.rows as any[]) {
    statusMap[row.status] = Number(row.cnt);
  }

  const pendingActions = statusMap["pending"] || 0;
  const approvedActions = statusMap["approved"] || 0;
  const rejectedActions = statusMap["rejected"] || 0;
  const executedActions = statusMap["executed"] || 0;
  const totalReviewed = approvedActions + rejectedActions + executedActions;
  const approvalRate = totalReviewed > 0 ? Math.round(((approvedActions + executedActions) / totalReviewed) * 100) : 0;

  // By action type distribution
  const byType = await db.execute(sql.raw(
    `SELECT action_type, COUNT(*) as cnt FROM ime_hr_actions WHERE 1=1 ${deptFilter} GROUP BY action_type ORDER BY cnt DESC`
  ));

  // Recent actions
  const recent = await db.execute(sql.raw(
    `SELECT * FROM ime_hr_actions WHERE 1=1 ${deptFilter} ORDER BY created_at DESC LIMIT 10`
  ));

  // Top impacted employees
  const topImpacted = await db.execute(sql.raw(
    `SELECT employee_id, employee_name, department, COUNT(*) as action_count FROM ime_hr_actions WHERE 1=1 ${deptFilter} GROUP BY employee_id, employee_name, department ORDER BY action_count DESC LIMIT 10`
  ));

  return {
    activeRules,
    pendingActions,
    approvedActions,
    rejectedActions,
    executedActions,
    approvalRate,
    byActionType: byType.rows,
    recentActions: recent.rows,
    topImpacted: topImpacted.rows,
  };
}

// ============================================================================
// Phase 15: Meeting Intelligence API — Key Management & Usage
// ============================================================================

function generateApiKey(): string {
  const bytes = crypto.randomBytes(24);
  return `grt_ime_${bytes.toString("base64url")}`;
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(params: {
  keyName: string;
  scopes: string[];
  rateLimit?: number;
  rateLimitWindow?: string;
  description?: string;
  createdBy?: string;
  expiresAt?: string;
}): Promise<{ apiKey: string; keyPrefix: string; id: number }> {
  const db = await requireDb();
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  const keyPrefix = apiKey.substring(0, 12);

  const result = await db.execute(sql`
    INSERT INTO ime_api_keys (key_name, key_hash, key_prefix, scopes, rate_limit, rate_limit_window, description, created_by, expires_at)
    VALUES (
      ${params.keyName},
      ${keyHash},
      ${keyPrefix},
      ${JSON.stringify(params.scopes)},
      ${params.rateLimit ?? 1000},
      ${params.rateLimitWindow ?? "hourly"},
      ${params.description ?? null},
      ${params.createdBy ?? null},
      ${params.expiresAt ? new Date(params.expiresAt).toISOString() : null}
    )
    RETURNING id
  `);

  const id = (result.rows[0] as any)?.id;
  return { apiKey, keyPrefix, id };
}

export async function listApiKeys() {
  const db = await requireDb();
  const result = await db.execute(sql`
    SELECT id, key_name, key_prefix, scopes, rate_limit, rate_limit_window,
           request_count, last_used_at, error_count, is_active, description,
           created_by, created_at, updated_at, expires_at
    FROM ime_api_keys
    ORDER BY created_at DESC
  `);
  return result.rows;
}

export async function revokeApiKey(id: number) {
  const db = await requireDb();
  await db.execute(sql`
    UPDATE ime_api_keys SET is_active = 0, updated_at = NOW() WHERE id = ${id}
  `);
  return { success: true };
}

export async function regenerateApiKey(id: number): Promise<{ apiKey: string; keyPrefix: string }> {
  const db = await requireDb();
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  const keyPrefix = apiKey.substring(0, 12);

  await db.execute(sql`
    UPDATE ime_api_keys
    SET key_hash = ${keyHash}, key_prefix = ${keyPrefix}, updated_at = NOW()
    WHERE id = ${id}
  `);
  return { apiKey, keyPrefix };
}

export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  keyId?: number;
  keyName?: string;
  scopes?: string[];
  rateLimit?: number;
  rateLimitWindow?: string;
}> {
  const db = await requireDb();
  const keyHash = hashApiKey(apiKey);

  const result = await db.execute(sql`
    SELECT id, key_name, scopes, rate_limit, rate_limit_window, is_active, expires_at
    FROM ime_api_keys
    WHERE key_hash = ${keyHash}
    LIMIT 1
  `);

  if (result.rows.length === 0) return { valid: false };

  const row = result.rows[0] as any;
  if (!row.is_active) return { valid: false };
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { valid: false };

  let scopes: string[] = [];
  try { scopes = JSON.parse(row.scopes); } catch { scopes = []; }

  return {
    valid: true,
    keyId: row.id,
    keyName: row.key_name,
    scopes,
    rateLimit: row.rate_limit,
    rateLimitWindow: row.rate_limit_window,
  };
}

export async function checkRateLimit(
  apiKeyId: number,
  rateLimit: number,
  window: string
): Promise<{ allowed: boolean; currentCount: number }> {
  const db = await requireDb();
  const interval = window === "daily" ? "1 DAY" : "1 HOUR";

  const result = await db.execute(sql.raw(
    `SELECT COUNT(*) as cnt FROM ime_api_usage_logs
     WHERE api_key_id = ${apiKeyId}
     AND requested_at >= NOW() - INTERVAL ${interval}`
  ));

  const currentCount = Number((result.rows[0] as any)?.cnt || 0);
  return { allowed: currentCount < rateLimit, currentCount };
}

export async function logApiUsage(params: {
  apiKeyId: number;
  keyName: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}) {
  const db = await requireDb();
  await db.execute(sql`
    INSERT INTO ime_api_usage_logs (api_key_id, key_name, endpoint, method, status_code, response_time_ms, ip_address, user_agent, error_message)
    VALUES (
      ${params.apiKeyId},
      ${params.keyName},
      ${params.endpoint},
      ${params.method},
      ${params.statusCode},
      ${params.responseTimeMs},
      ${params.ipAddress ?? null},
      ${params.userAgent ?? null},
      ${params.errorMessage ?? null}
    )
  `);

  // Update key stats
  const errorInc = params.statusCode >= 400 ? 1 : 0;
  await db.execute(sql`
    UPDATE ime_api_keys
    SET request_count = request_count + 1,
        last_used_at = NOW(),
        error_count = error_count + ${errorInc}
    WHERE id = ${params.apiKeyId}
  `);
}

export async function getApiKeyUsageStats(apiKeyId: number, days: number = 30) {
  const db = await requireDb();

  const totals = await db.execute(sql.raw(
    `SELECT
       COUNT(*) as total_requests,
       SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as success_count,
       AVG(response_time_ms) as avg_response_time
     FROM ime_api_usage_logs
     WHERE api_key_id = ${apiKeyId}
     AND requested_at >= NOW() - INTERVAL ${days} DAY`
  ));

  const stats = totals.rows[0] as any;
  const totalRequests = Number(stats?.total_requests || 0);
  const successCount = Number(stats?.success_count || 0);
  const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 100;
  const avgResponseTime = Math.round(Number(stats?.avg_response_time || 0));

  const byDay = await db.execute(sql.raw(
    `SELECT DATE(requested_at) as day, COUNT(*) as cnt
     FROM ime_api_usage_logs
     WHERE api_key_id = ${apiKeyId}
     AND requested_at >= NOW() - INTERVAL ${days} DAY
     GROUP BY DATE(requested_at)
     ORDER BY day`
  ));

  const topEndpoints = await db.execute(sql.raw(
    `SELECT endpoint, method, COUNT(*) as cnt,
       AVG(response_time_ms) as avg_time
     FROM ime_api_usage_logs
     WHERE api_key_id = ${apiKeyId}
     AND requested_at >= NOW() - INTERVAL ${days} DAY
     GROUP BY endpoint, method
     ORDER BY cnt DESC
     LIMIT 10`
  ));

  return {
    totalRequests,
    successRate,
    avgResponseTime,
    requestsByDay: byDay.rows,
    topEndpoints: topEndpoints.rows,
  };
}

export async function getApiDashboard() {
  const db = await requireDb();

  const keyCounts = await db.execute(sql.raw(
    `SELECT
       COUNT(*) as total_keys,
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_keys
     FROM ime_api_keys`
  ));

  const requestCounts = await db.execute(sql.raw(
    `SELECT COUNT(*) as total_requests FROM ime_api_usage_logs`
  ));

  const todayCount = await db.execute(sql.raw(
    `SELECT COUNT(*) as cnt FROM ime_api_usage_logs
     WHERE requested_at >= CURRENT_DATE`
  ));

  const errorRate = await db.execute(sql.raw(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
     FROM ime_api_usage_logs`
  ));

  const kc = keyCounts.rows[0] as any;
  const rc = requestCounts.rows[0] as any;
  const tc = todayCount.rows[0] as any;
  const er = errorRate.rows[0] as any;

  const totalReqs = Number(er?.total || 0);
  const errorReqs = Number(er?.errors || 0);

  return {
    totalKeys: Number(kc?.total_keys || 0),
    activeKeys: Number(kc?.active_keys || 0),
    totalRequests: Number(rc?.total_requests || 0),
    requestsToday: Number(tc?.cnt || 0),
    avgErrorRate: totalReqs > 0 ? Math.round((errorReqs / totalReqs) * 100) : 0,
  };
}

export async function getApiUsageLogs(limit: number = 50) {
  const db = await requireDb();
  const result = await db.execute(sql.raw(
    `SELECT * FROM ime_api_usage_logs ORDER BY requested_at DESC LIMIT ${limit}`
  ));
  return result.rows;
}

// ============================================================================
// Phase 16: Collaboration Network Intelligence
// ============================================================================

/**
 * Build collaboration network from meeting contributions.
 * Scans meeting_contributions + meeting_records, creates pairwise edges.
 * Formula: meetingCount × (totalMinutes/60) × intimacyFactor
 * where intimacy = smaller meetings score higher.
 */
export async function buildCollaborationNetwork(options?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const db = await requireDb();

  // Clear old edges
  await db.execute(sql.raw(`DELETE FROM ime_collaboration_edges`));

  // Build date filter
  let dateFilter = "";
  if (options?.dateFrom) dateFilter += ` AND mr.meeting_date >= '${options.dateFrom}'`;
  if (options?.dateTo) dateFilter += ` AND mr.meeting_date <= '${options.dateTo}'`;

  // Get all meetings with their participants
  const meetingsResult = await db.execute(sql.raw(`
    SELECT mc.meeting_id, mc.employee_name, mc.employee_id, mc.department,
           mr.duration_minutes, mr.meeting_date,
           (SELECT COUNT(DISTINCT mc2.employee_name) FROM meeting_contributions mc2 WHERE mc2.meeting_id = mc.meeting_id) as participant_count
    FROM meeting_contributions mc
    JOIN meeting_records mr ON mr.id = mc.meeting_id
    WHERE 1=1 ${dateFilter}
    ORDER BY mc.meeting_id, mc.employee_name
  `));

  const rows = meetingsResult.rows as any[];

  // Group by meeting_id
  const meetingMap = new Map<string, any[]>();
  for (const row of rows) {
    const mid = String(row.meeting_id);
    if (!meetingMap.has(mid)) meetingMap.set(mid, []);
    meetingMap.get(mid)!.push(row);
  }

  // Build pairwise edges
  const edgeMap = new Map<string, {
    participantA: string; participantB: string;
    employeeIdA: string; employeeIdB: string;
    departmentA: string; departmentB: string;
    meetingCount: number; totalMinutes: number;
    meetingSizes: number[]; meetingIds: string[];
    firstDate: string; lastDate: string;
  }>();

  for (const [meetingId, participants] of Array.from(meetingMap.entries())) {
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const a = participants[i];
        const b = participants[j];
        // Alphabetical ordering
        const [pA, pB] = a.employee_name < b.employee_name ? [a, b] : [b, a];
        const key = `${pA.employee_name}||${pB.employee_name}`;

        if (!edgeMap.has(key)) {
          edgeMap.set(key, {
            participantA: pA.employee_name,
            participantB: pB.employee_name,
            employeeIdA: pA.employee_id || "",
            employeeIdB: pB.employee_id || "",
            departmentA: pA.department || "",
            departmentB: pB.department || "",
            meetingCount: 0,
            totalMinutes: 0,
            meetingSizes: [],
            meetingIds: [],
            firstDate: a.meeting_date || "",
            lastDate: a.meeting_date || "",
          });
        }

        const edge = edgeMap.get(key)!;
        edge.meetingCount++;
        edge.totalMinutes += Number(a.duration_minutes || 0);
        edge.meetingSizes.push(Number(a.participant_count || 2));
        edge.meetingIds.push(meetingId);
        const dateStr = String(a.meeting_date || "");
        if (dateStr && (!edge.firstDate || dateStr < edge.firstDate)) edge.firstDate = dateStr;
        if (dateStr && (!edge.lastDate || dateStr > edge.lastDate)) edge.lastDate = dateStr;
      }
    }
  }

  // Insert edges
  let insertedCount = 0;
  for (const edge of Array.from(edgeMap.values())) {
    const avgSize = Math.round(edge.meetingSizes.reduce((a, b) => a + b, 0) / edge.meetingSizes.length);
    // Intimacy factor: smaller meetings = higher score (2-person = 5x, 10+ = 1x)
    const intimacyFactor = Math.max(1, 6 - Math.floor(avgSize / 2));
    const score = Math.round(edge.meetingCount * (edge.totalMinutes / 60) * intimacyFactor);
    const relType = edge.departmentA && edge.departmentB && edge.departmentA !== edge.departmentB ? "cross_dept" : "same_dept";

    await db.execute(sql`
      INSERT INTO ime_collaboration_edges
        (participant_a, participant_b, employee_id_a, employee_id_b,
         department_a, department_b, meeting_count, total_co_meeting_minutes,
         avg_meeting_size, collaboration_score, relationship_type,
         shared_meeting_ids, first_collaboration, last_collaboration, computed_at)
      VALUES
        (${edge.participantA}, ${edge.participantB}, ${edge.employeeIdA}, ${edge.employeeIdB},
         ${edge.departmentA}, ${edge.departmentB}, ${edge.meetingCount}, ${edge.totalMinutes},
         ${avgSize}, ${score}, ${relType},
         ${JSON.stringify(edge.meetingIds)},
         ${edge.firstDate ? new Date(edge.firstDate) : null},
         ${edge.lastDate ? new Date(edge.lastDate) : null},
         NOW())
    `);
    insertedCount++;
  }

  return { edgesCreated: insertedCount, meetingsScanned: meetingMap.size };
}

/**
 * Dashboard stats for collaboration network.
 */
export async function getCollaborationDashboard(filters?: { department?: string }) {
  const db = await requireDb();

  let deptFilter = "";
  if (filters?.department) {
    deptFilter = ` WHERE department_a = '${filters.department}' OR department_b = '${filters.department}'`;
  }

  const result = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as total_edges,
      COALESCE(AVG(collaboration_score), 0) as avg_score,
      COALESCE(SUM(CASE WHEN relationship_type = 'cross_dept' THEN 1 ELSE 0 END), 0) as cross_dept_edges,
      COALESCE(SUM(CASE WHEN relationship_type = 'same_dept' THEN 1 ELSE 0 END), 0) as same_dept_edges
    FROM ime_collaboration_edges ${deptFilter}
  `));

  const row = result.rows[0] as any;
  const total = Number(row?.total_edges || 0);
  const crossDept = Number(row?.cross_dept_edges || 0);

  return {
    totalEdges: total,
    avgScore: Math.round(Number(row?.avg_score || 0)),
    crossDeptPercentage: total > 0 ? Math.round((crossDept / total) * 100) : 0,
    crossDeptEdges: crossDept,
    sameDeptEdges: Number(row?.same_dept_edges || 0),
  };
}

/**
 * Comprehensive network stats: unique participants, edge counts, averages.
 */
export async function getCollaborationNetworkStats(options?: { department?: string }) {
  const db = await requireDb();

  let deptFilter = "";
  if (options?.department) {
    deptFilter = ` WHERE department_a = '${options.department}' OR department_b = '${options.department}'`;
  }

  const edgeStats = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as total_edges,
      COALESCE(AVG(meeting_count), 0) as avg_meetings_per_edge,
      COALESCE(AVG(collaboration_score), 0) as avg_score,
      COALESCE(MAX(collaboration_score), 0) as max_score,
      COALESCE(SUM(CASE WHEN relationship_type = 'cross_dept' THEN 1 ELSE 0 END), 0) as cross_dept_edges,
      COALESCE(SUM(CASE WHEN relationship_type = 'same_dept' THEN 1 ELSE 0 END), 0) as same_dept_edges
    FROM ime_collaboration_edges ${deptFilter}
  `));

  const participantsResult = await db.execute(sql.raw(`
    SELECT COUNT(DISTINCT p) as cnt FROM (
      SELECT participant_a as p FROM ime_collaboration_edges ${deptFilter}
      UNION
      SELECT participant_b as p FROM ime_collaboration_edges ${deptFilter}
    ) sub
  `));

  const es = edgeStats.rows[0] as any;
  const totalEdges = Number(es?.total_edges || 0);

  return {
    totalEdges,
    uniqueParticipants: Number((participantsResult.rows[0] as any)?.cnt || 0),
    crossDeptEdges: Number(es?.cross_dept_edges || 0),
    sameDeptEdges: Number(es?.same_dept_edges || 0),
    avgMeetingsPerEdge: Math.round(Number(es?.avg_meetings_per_edge || 0) * 10) / 10,
    avgScore: Math.round(Number(es?.avg_score || 0)),
    maxScore: Number(es?.max_score || 0),
    crossDeptPercentage: totalEdges > 0
      ? Math.round((Number(es?.cross_dept_edges || 0) / totalEdges) * 100)
      : 0,
  };
}

/**
 * Collaboration matrix for heatmap display (department-level).
 */
export async function getCollaborationMatrix(options?: { level?: string }) {
  const db = await requireDb();

  const result = await db.execute(sql.raw(`
    SELECT department_a, department_b,
           COUNT(*) as edge_count,
           SUM(collaboration_score) as total_score,
           SUM(meeting_count) as total_meetings
    FROM ime_collaboration_edges
    WHERE department_a IS NOT NULL AND department_b IS NOT NULL
      AND department_a != '' AND department_b != ''
    GROUP BY department_a, department_b
    ORDER BY total_score DESC
  `));

  return result.rows;
}

/**
 * Top collaborator pairs ranked by collaboration score.
 */
export async function getTopCollaboratorPairs(options?: {
  limit?: number;
  relationshipType?: string;
  department?: string;
}) {
  const db = await requireDb();

  const limit = options?.limit || 20;
  let whereClause = "WHERE 1=1";
  if (options?.relationshipType) {
    whereClause += ` AND relationship_type = '${options.relationshipType}'`;
  }
  if (options?.department) {
    whereClause += ` AND (department_a = '${options.department}' OR department_b = '${options.department}')`;
  }

  const result = await db.execute(sql.raw(`
    SELECT participant_a, participant_b,
           department_a, department_b,
           meeting_count, total_co_meeting_minutes,
           avg_meeting_size, collaboration_score,
           relationship_type,
           first_collaboration, last_collaboration
    FROM ime_collaboration_edges
    ${whereClause}
    ORDER BY collaboration_score DESC
    LIMIT ${limit}
  `));

  return result.rows;
}

/**
 * Cross-department metrics: per-department breakdown of internal vs external edges.
 */
export async function getCrossDepartmentMetrics(departments?: string[]) {
  const db = await requireDb();

  let deptFilter = "";
  if (departments && departments.length > 0) {
    const deptList = departments.map(d => `'${d}'`).join(",");
    deptFilter = ` AND dept IN (${deptList})`;
  }

  const result = await db.execute(sql.raw(`
    SELECT dept,
           SUM(CASE WHEN is_internal = 1 THEN 1 ELSE 0 END) as internal_edges,
           SUM(CASE WHEN is_internal = 0 THEN 1 ELSE 0 END) as cross_dept_edges,
           COUNT(*) as total_edges
    FROM (
      SELECT department_a as dept,
             CASE WHEN department_a = department_b THEN 1 ELSE 0 END as is_internal
      FROM ime_collaboration_edges
      WHERE department_a IS NOT NULL AND department_a != ''
      UNION ALL
      SELECT department_b as dept,
             CASE WHEN department_a = department_b THEN 1 ELSE 0 END as is_internal
      FROM ime_collaboration_edges
      WHERE department_b IS NOT NULL AND department_b != ''
    ) sub
    WHERE 1=1 ${deptFilter}
    GROUP BY dept
    ORDER BY total_edges DESC
  `));

  return result.rows;
}

/**
 * Detect collaboration silos: departments with <20% cross-dept collaboration.
 */
export async function detectCollaborationSilos(options?: { threshold?: number }) {
  const db = await requireDb();
  const threshold = options?.threshold || 20;

  const result = await db.execute(sql.raw(`
    SELECT dept,
           SUM(CASE WHEN is_internal = 1 THEN 1 ELSE 0 END) as internal_edges,
           SUM(CASE WHEN is_internal = 0 THEN 1 ELSE 0 END) as cross_dept_edges,
           COUNT(*) as total_edges
    FROM (
      SELECT department_a as dept,
             CASE WHEN department_a = department_b THEN 1 ELSE 0 END as is_internal
      FROM ime_collaboration_edges
      WHERE department_a IS NOT NULL AND department_a != ''
      UNION ALL
      SELECT department_b as dept,
             CASE WHEN department_a = department_b THEN 1 ELSE 0 END as is_internal
      FROM ime_collaboration_edges
      WHERE department_b IS NOT NULL AND department_b != ''
    ) sub
    GROUP BY dept
    HAVING COUNT(*) >= 3
    ORDER BY total_edges DESC
  `));

  return (result.rows as any[]).map((row: any) => {
    const total = Number(row.total_edges || 0);
    const crossDept = Number(row.cross_dept_edges || 0);
    const crossPct = total > 0 ? Math.round((crossDept / total) * 100) : 0;

    let riskLevel = "low";
    if (crossPct < threshold / 2) riskLevel = "high";
    else if (crossPct < threshold) riskLevel = "medium";

    return {
      department: row.dept,
      internalEdges: Number(row.internal_edges || 0),
      crossDeptEdges: crossDept,
      totalEdges: total,
      crossCollabPercent: crossPct,
      riskLevel,
    };
  });
}

/**
 * Analyze meeting necessity using LLM.
 * Scores 6 dimensions, determines grade (A–F) and alternative viability.
 */
export async function analyzeMeetingNecessity(meetingId: string) {
  const db = await requireDb();

  // Get meeting info
  const meetingResult = await db.execute(sql`
    SELECT id, title, objective, summary, duration_minutes, meeting_date
    FROM meeting_records WHERE id = ${meetingId}
  `);
  const meeting = (meetingResult.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // Get participants
  const participantsResult = await db.execute(sql`
    SELECT DISTINCT employee_name, department
    FROM meeting_contributions WHERE meeting_id = ${meetingId}
  `);
  const participants = participantsResult.rows as any[];

  // Get action items count
  const actionsResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM meeting_action_items WHERE meeting_id = ${meetingId}
  `);
  const actionCount = Number((actionsResult.rows[0] as any)?.cnt || 0);

  let scores: any;

  try {
    const prompt = `You are evaluating whether a meeting was necessary or could have been handled asynchronously.

Meeting Title: ${meeting.title || "Untitled"}
Objective: ${meeting.objective || "Not specified"}
Summary: ${meeting.summary || "Not available"}
Duration: ${meeting.duration_minutes || 0} minutes
Participants: ${participants.length} people (${participants.map((p: any) => `${p.employee_name}/${p.department}`).join(", ")})
Action Items Generated: ${actionCount}

Score each dimension 0-10, provide an overall necessity score 0-100, a grade (A=essential, B=valuable, C=acceptable, D=questionable, F=unnecessary), and suggest if an alternative communication method would have sufficed.`;

    const result = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "meeting_necessity",
          schema: {
            type: "object",
            properties: {
              necessityScore: { type: "number" },
              necessityGrade: { type: "string" },
              decisionComplexity: { type: "number" },
              collaborationRequirement: { type: "number" },
              informationRichness: { type: "number" },
              outcomeImpact: { type: "number" },
              participantAlignment: { type: "number" },
              timeEfficiency: { type: "number" },
              alternativeViability: { type: "string" },
              alternativeRationale: { type: "string" },
              aiNarrative: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: [
              "necessityScore", "necessityGrade", "decisionComplexity",
              "collaborationRequirement", "informationRichness", "outcomeImpact",
              "participantAlignment", "timeEfficiency", "alternativeViability",
              "alternativeRationale", "aiNarrative", "recommendations",
            ],
          },
          strict: true,
        },
      },
    });

    scores = JSON.parse((result as any).content);
  } catch (err) {
    // Fallback heuristic if LLM fails
    const durationScore = Math.min(10, Math.round((meeting.duration_minutes || 30) / 12));
    const participantScore = Math.min(10, participants.length);
    const actionScore = Math.min(10, actionCount * 2);

    scores = {
      necessityScore: Math.round((durationScore + participantScore + actionScore) * 100 / 30),
      necessityGrade: actionCount >= 3 ? "B" : participants.length > 5 ? "C" : "D",
      decisionComplexity: Math.min(10, actionCount),
      collaborationRequirement: Math.min(10, participants.length),
      informationRichness: Math.round(durationScore * 0.7),
      outcomeImpact: actionScore,
      participantAlignment: Math.min(10, Math.round(participants.length * 0.8)),
      timeEfficiency: 10 - durationScore,
      alternativeViability: actionCount < 2 && participants.length <= 3 ? "email" : "none",
      alternativeRationale: "Heuristic fallback: LLM analysis unavailable",
      aiNarrative: `Heuristic analysis: ${participants.length} participants, ${meeting.duration_minutes || 0} minutes, ${actionCount} action items.`,
      recommendations: ["Consider shorter meetings", "Define clear objectives beforehand"],
    };
  }

  // Upsert into database
  await db.execute(sql`
    DELETE FROM ime_meeting_necessity_scores WHERE meeting_id = ${meetingId}
  `);

  await db.execute(sql`
    INSERT INTO ime_meeting_necessity_scores
      (meeting_id, necessity_score, necessity_grade,
       decision_complexity, collaboration_requirement, information_richness,
       outcome_impact, participant_alignment, time_efficiency,
       alternative_viability, alternative_rationale, ai_narrative,
       recommendations, analyzed_at)
    VALUES
      (${meetingId}, ${scores.necessityScore}, ${scores.necessityGrade},
       ${scores.decisionComplexity}, ${scores.collaborationRequirement}, ${scores.informationRichness},
       ${scores.outcomeImpact}, ${scores.participantAlignment}, ${scores.timeEfficiency},
       ${scores.alternativeViability}, ${scores.alternativeRationale}, ${scores.aiNarrative},
       ${JSON.stringify(scores.recommendations)}, NOW())
  `);

  return {
    meetingId,
    title: meeting.title,
    ...scores,
  };
}

/**
 * List meeting necessity scores with meeting info.
 */
export async function getMeetingNecessityScores(options?: { limit?: number; grade?: string }) {
  const db = await requireDb();

  let whereClause = "";
  if (options?.grade) {
    whereClause = ` AND mns.necessity_grade = '${options.grade}'`;
  }
  const limit = options?.limit || 50;

  const result = await db.execute(sql.raw(`
    SELECT mns.*, mr.title as meeting_title, mr.meeting_date, mr.duration_minutes
    FROM ime_meeting_necessity_scores mns
    LEFT JOIN meeting_records mr ON mr.id = mns.meeting_id
    WHERE 1=1 ${whereClause}
    ORDER BY mns.analyzed_at DESC
    LIMIT ${limit}
  `));

  return result.rows;
}

/**
 * Batch analyze meeting necessity for multiple meetings.
 */
export async function batchAnalyzeMeetingNecessity(meetingIds: string[]) {
  const results: any[] = [];
  const errors: any[] = [];

  for (const id of meetingIds) {
    try {
      const result = await analyzeMeetingNecessity(id);
      results.push(result);
    } catch (err: any) {
      errors.push({ meetingId: id, error: err.message });
    }
  }

  return { analyzed: results.length, errors: errors.length, results, errorDetails: errors };
}

// ============================================================================
// Phase 17: Meeting Load & Participant Well-being Intelligence
// ============================================================================

/**
 * Compute participant workload from meeting data.
 * Scans meeting_contributions + meeting_records, groups by employee per period.
 */
export async function computeParticipantLoad(options?: {
  periodType?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const db = await requireDb();
  const periodType = options?.periodType || "weekly";

  // Default date range: last 30 days
  const dateFrom = options?.dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const dateTo = options?.dateTo || new Date().toISOString().split("T")[0];

  // Gather per-employee meeting data within date range
  const result = await db.execute(sql.raw(`
    SELECT
      mc.employee_id,
      mc.employee_name,
      mc.department,
      mr.id as meeting_id,
      mr.meeting_date,
      mr.duration_minutes,
      mr.start_time,
      mr.end_time
    FROM meeting_contributions mc
    JOIN meeting_records mr ON mr.id = mc.meeting_id
    WHERE mr.meeting_date >= '${dateFrom}'
      AND mr.meeting_date <= '${dateTo}'
    ORDER BY mc.employee_id, mr.meeting_date, mr.start_time
  `));

  const rows = result.rows as any[];
  if (rows.length === 0) return { computed: 0, periodType };

  // Group by employee
  const byEmployee: Record<string, any[]> = {};
  for (const r of rows) {
    const key = r.employee_id || r.employee_name;
    if (!byEmployee[key]) byEmployee[key] = [];
    byEmployee[key].push(r);
  }

  // Expected max meeting minutes per period
  const expectedMax = periodType === "daily" ? 240 : periodType === "weekly" ? 1200 : 4800;
  const workdayMinutes = 480;

  // Determine period boundaries
  const periodStart = new Date(dateFrom);
  const periodEnd = new Date(dateTo);

  // Clear old records for this period
  await db.execute(sql.raw(`
    DELETE FROM ime_participant_workload
    WHERE period_type = '${periodType}'
      AND period_start = '${periodStart.toISOString()}'
      AND period_end = '${periodEnd.toISOString()}'
  `));

  const insertRows: any[] = [];

  for (const [empKey, meetings] of Object.entries(byEmployee)) {
    const first = meetings[0];
    const meetingCount = meetings.length;
    const durations = meetings.map((m) => Number(m.duration_minutes) || 30);
    const totalMinutes = durations.reduce((a, b) => a + b, 0);
    const avgDuration = Math.round(totalMinutes / meetingCount);
    const maxDuration = Math.max(...durations);

    // Back-to-back detection: meetings within 15-minute gap
    let backToBackCount = 0;
    for (let i = 1; i < meetings.length; i++) {
      const prevEnd = meetings[i - 1].end_time || meetings[i - 1].meeting_date;
      const currStart = meetings[i].start_time || meetings[i].meeting_date;
      if (prevEnd && currStart) {
        const gap = (new Date(currStart).getTime() - new Date(prevEnd).getTime()) / 60000;
        if (gap >= 0 && gap <= 15) backToBackCount++;
      }
    }
    const backToBackRatio = meetingCount > 1 ? Math.round((backToBackCount / (meetingCount - 1)) * 100) : 0;

    // Focus time: workday minus meetings (approximate per day count)
    const uniqueDays = new Set(meetings.map((m) => String(m.meeting_date).split("T")[0])).size;
    const avgDailyMeetingMin = uniqueDays > 0 ? totalMinutes / uniqueDays : totalMinutes;
    const focusTimeMinutes = Math.max(0, Math.round(workdayMinutes - avgDailyMeetingMin));
    const longestFocusBlock = Math.max(0, focusTimeMinutes - 30); // rough estimate

    // Meeting density: percent of workday in meetings
    const meetingDensity = Math.min(100, Math.round((avgDailyMeetingMin / workdayMinutes) * 100));

    // Morning / afternoon split (rough: before/after 12:00)
    let meetingsBeforeNoon = 0;
    let meetingsAfterNoon = 0;
    for (const m of meetings) {
      const hour = m.start_time ? new Date(m.start_time).getHours() : 10;
      if (hour < 12) meetingsBeforeNoon++;
      else meetingsAfterNoon++;
    }

    // Unique collaborators
    const collaboratorSet = new Set<string>();
    // Count unique meeting IDs as proxy for collaborator diversity
    for (const m of meetings) {
      collaboratorSet.add(m.meeting_id);
    }

    // Load score
    const loadScore = Math.min(100, Math.round((totalMinutes / expectedMax) * 100));

    // Risk level
    let riskLevel = "low";
    if (loadScore > 80) riskLevel = "critical";
    else if (loadScore > 60) riskLevel = "high";
    else if (loadScore > 40) riskLevel = "medium";

    insertRows.push({
      employeeId: first.employee_id || empKey,
      employeeName: first.employee_name,
      department: first.department || null,
      periodType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      meetingCount,
      totalMinutes,
      avgDuration,
      maxDuration,
      backToBackCount,
      backToBackRatio,
      focusTimeMinutes,
      meetingDensity,
      longestFocusBlock,
      meetingsBeforeNoon,
      meetingsAfterNoon,
      uniqueCollaborators: collaboratorSet.size,
      loadScore,
      riskLevel,
    });
  }

  // Bulk insert
  for (const r of insertRows) {
    await db.execute(sql.raw(`
      INSERT INTO ime_participant_workload
        (employee_id, employee_name, department, period_type, period_start, period_end,
         meeting_count, total_meeting_minutes, avg_meeting_duration, max_meeting_duration,
         back_to_back_count, back_to_back_ratio, focus_time_minutes, meeting_density,
         longest_focus_block, meetings_before_noon, meetings_after_noon, unique_collaborators,
         load_score, risk_level, computed_at)
      VALUES
        ('${r.employeeId}', '${r.employeeName}', ${r.department ? `'${r.department}'` : "NULL"},
         '${r.periodType}', '${r.periodStart}', '${r.periodEnd}',
         ${r.meetingCount}, ${r.totalMinutes}, ${r.avgDuration}, ${r.maxDuration},
         ${r.backToBackCount}, ${r.backToBackRatio}, ${r.focusTimeMinutes}, ${r.meetingDensity},
         ${r.longestFocusBlock}, ${r.meetingsBeforeNoon}, ${r.meetingsAfterNoon}, ${r.uniqueCollaborators},
         ${r.loadScore}, '${r.riskLevel}', NOW())
    `));
  }

  return { computed: insertRows.length, periodType, dateFrom, dateTo };
}

/**
 * Load dashboard — aggregated stats.
 */
export async function getLoadDashboard(filters?: { periodType?: string; department?: string }) {
  const db = await requireDb();
  const periodType = filters?.periodType || "weekly";

  let deptFilter = "";
  if (filters?.department) {
    deptFilter = ` AND department = '${filters.department}'`;
  }

  const result = await db.execute(sql.raw(`
    SELECT
      ROUND(AVG(total_meeting_minutes) / 60.0, 1) as avg_weekly_hours,
      COUNT(CASE WHEN load_score > 60 THEN 1 END) as overloaded_count,
      ROUND(AVG(focus_time_minutes), 0) as avg_focus_time_minutes,
      ROUND(AVG(load_score), 0) as avg_load_score,
      COUNT(*) as total_employees
    FROM ime_participant_workload
    WHERE period_type = '${periodType}' ${deptFilter}
  `));

  const stats = (result.rows as any[])[0] || {};
  return {
    avgWeeklyHours: Number(stats.avg_weekly_hours) || 0,
    overloadedCount: Number(stats.overloaded_count) || 0,
    avgFocusTimeMinutes: Number(stats.avg_focus_time_minutes) || 0,
    avgLoadScore: Number(stats.avg_load_score) || 0,
    totalEmployees: Number(stats.total_employees) || 0,
  };
}

/**
 * Participant load details — ranked list by loadScore.
 */
export async function getParticipantLoadDetails(options?: {
  periodType?: string;
  department?: string;
  riskLevel?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const periodType = options?.periodType || "weekly";
  const limit = options?.limit || 50;

  let whereExtra = "";
  if (options?.department) {
    whereExtra += ` AND department = '${options.department}'`;
  }
  if (options?.riskLevel) {
    whereExtra += ` AND risk_level = '${options.riskLevel}'`;
  }

  const result = await db.execute(sql.raw(`
    SELECT *
    FROM ime_participant_workload
    WHERE period_type = '${periodType}' ${whereExtra}
    ORDER BY load_score DESC
    LIMIT ${limit}
  `));

  return result.rows;
}

/**
 * Load trends — time-series avg load score grouped by period.
 */
export async function getLoadTrends(options?: { periodType?: string; limit?: number }) {
  const db = await requireDb();
  const periodType = options?.periodType || "weekly";
  const limit = options?.limit || 20;

  const result = await db.execute(sql.raw(`
    SELECT
      period_start,
      ROUND(AVG(load_score), 1) as avg_load_score,
      ROUND(AVG(total_meeting_minutes), 0) as avg_meeting_minutes,
      COUNT(*) as employee_count
    FROM ime_participant_workload
    WHERE period_type = '${periodType}'
    GROUP BY period_start
    ORDER BY period_start DESC
    LIMIT ${limit}
  `));

  return (result.rows as any[]).reverse();
}

/**
 * Detect burnout risk — employees with loadScore above threshold.
 */
export async function detectBurnoutRisk(options?: {
  threshold?: number;
  periodType?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const threshold = options?.threshold || 60;
  const periodType = options?.periodType || "weekly";
  const limit = options?.limit || 100;

  const result = await db.execute(sql.raw(`
    SELECT *
    FROM ime_participant_workload
    WHERE period_type = '${periodType}'
      AND load_score >= ${threshold}
    ORDER BY load_score DESC
    LIMIT ${limit}
  `));

  const atRisk = result.rows as any[];

  // Risk distribution
  const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
  // Also count all employees for low
  const allResult = await db.execute(sql.raw(`
    SELECT risk_level, COUNT(*) as cnt
    FROM ime_participant_workload
    WHERE period_type = '${periodType}'
    GROUP BY risk_level
  `));
  for (const r of allResult.rows as any[]) {
    const level = r.risk_level as keyof typeof distribution;
    if (distribution[level] !== undefined) {
      distribution[level] = Number(r.cnt);
    }
  }

  return { atRisk, distribution, threshold };
}

/**
 * Meeting-free time analysis per employee.
 */
export async function getMeetingFreeTimeAnalysis(options?: {
  periodType?: string;
  department?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const periodType = options?.periodType || "weekly";
  const limit = options?.limit || 50;

  let deptFilter = "";
  if (options?.department) {
    deptFilter = ` AND department = '${options.department}'`;
  }

  const result = await db.execute(sql.raw(`
    SELECT
      employee_id, employee_name, department,
      focus_time_minutes, longest_focus_block,
      meetings_before_noon, meetings_after_noon,
      back_to_back_ratio, meeting_density, load_score
    FROM ime_participant_workload
    WHERE period_type = '${periodType}' ${deptFilter}
    ORDER BY focus_time_minutes ASC
    LIMIT ${limit}
  `));

  return result.rows;
}

/**
 * Assess well-being for a single employee using AI.
 */
export async function assessWellbeing(employeeId: string, options?: {
  periodType?: string;
}) {
  const db = await requireDb();
  const periodType = options?.periodType || "weekly";

  // Get recent load data for this employee
  const loadResult = await db.execute(sql.raw(`
    SELECT *
    FROM ime_participant_workload
    WHERE employee_id = '${employeeId}'
      AND period_type = '${periodType}'
    ORDER BY computed_at DESC
    LIMIT 5
  `));

  const loadRecords = loadResult.rows as any[];
  if (loadRecords.length === 0) {
    throw new Error(`No workload data found for employee ${employeeId}. Run "计算工作负荷" first.`);
  }

  const latest = loadRecords[0];
  const employeeName = latest.employee_name;
  const department = latest.department;

  // Compute averages from recent periods
  const avgLoad = Math.round(loadRecords.reduce((s: number, r: any) => s + Number(r.load_score || 0), 0) / loadRecords.length);
  const avgFocus = Math.round(loadRecords.reduce((s: number, r: any) => s + Number(r.focus_time_minutes || 0), 0) / loadRecords.length);
  const avgDensity = Math.round(loadRecords.reduce((s: number, r: any) => s + Number(r.meeting_density || 0), 0) / loadRecords.length);
  const avgB2B = Math.round(loadRecords.reduce((s: number, r: any) => s + Number(r.back_to_back_ratio || 0), 0) / loadRecords.length);
  const avgCollaborators = Math.round(loadRecords.reduce((s: number, r: any) => s + Number(r.unique_collaborators || 0), 0) / loadRecords.length);

  let assessment: any;

  try {
    const prompt = `You are an employee well-being analyst evaluating meeting workload impact.

Employee: ${employeeName}
Department: ${department || "Unknown"}
Recent Workload Data (last ${loadRecords.length} periods):
- Average Load Score: ${avgLoad}/100
- Average Focus Time: ${avgFocus} minutes/day
- Average Meeting Density: ${avgDensity}%
- Average Back-to-Back Ratio: ${avgB2B}%
- Average Unique Collaborators: ${avgCollaborators}
- Latest Risk Level: ${latest.risk_level}
- Latest Total Meeting Minutes: ${latest.total_meeting_minutes}
- Latest Meeting Count: ${latest.meeting_count}

Score each dimension 0-10, provide an overall well-being score 0-100, a grade (A=excellent, B=good, C=fair, D=poor, F=critical), list risk factors and recommendations. Write the AI narrative in Chinese.`;

    const result = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "wellbeing_assessment",
          schema: {
            type: "object",
            properties: {
              wellbeingScore: { type: "number" },
              wellbeingGrade: { type: "string" },
              meetingLoadDimension: { type: "number" },
              scheduleBalanceDimension: { type: "number" },
              collaborationDiversityDimension: { type: "number" },
              focusTimeDimension: { type: "number" },
              meetingEfficiencyDimension: { type: "number" },
              workloadTrendDimension: { type: "number" },
              riskFactors: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } },
              aiNarrative: { type: "string" },
            },
            required: [
              "wellbeingScore", "wellbeingGrade", "meetingLoadDimension",
              "scheduleBalanceDimension", "collaborationDiversityDimension",
              "focusTimeDimension", "meetingEfficiencyDimension",
              "workloadTrendDimension", "riskFactors", "recommendations", "aiNarrative",
            ],
          },
          strict: true,
        },
      },
    });

    assessment = JSON.parse((result as any).content);
  } catch (err) {
    // Fallback heuristic if LLM fails
    const loadDim = Math.max(0, 10 - Math.round(avgLoad / 10));
    const balanceDim = Math.max(0, Math.min(10, Math.round(avgFocus / 48)));
    const collabDim = Math.min(10, avgCollaborators);
    const focusDim = Math.max(0, Math.min(10, Math.round(avgFocus / 48)));
    const effDim = Math.max(0, 10 - Math.round(avgDensity / 10));
    const trendDim = avgLoad <= 40 ? 8 : avgLoad <= 60 ? 5 : 3;

    const score = Math.round((loadDim + balanceDim + collabDim + focusDim + effDim + trendDim) / 6 * 10);
    const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";

    const riskFactors: string[] = [];
    if (avgLoad > 60) riskFactors.push("会议负荷过高");
    if (avgB2B > 50) riskFactors.push("背靠背会议频繁");
    if (avgFocus < 120) riskFactors.push("专注时间不足");

    assessment = {
      wellbeingScore: score,
      wellbeingGrade: grade,
      meetingLoadDimension: loadDim,
      scheduleBalanceDimension: balanceDim,
      collaborationDiversityDimension: collabDim,
      focusTimeDimension: focusDim,
      meetingEfficiencyDimension: effDim,
      workloadTrendDimension: trendDim,
      riskFactors,
      recommendations: ["减少不必要的会议", "增加专注时间段"],
      aiNarrative: `该员工平均负荷分${avgLoad}，专注时间${avgFocus}分钟，整体健康状态${grade}级。`,
    };
  }

  // Delete old assessment for this employee
  await db.execute(sql.raw(`
    DELETE FROM ime_wellbeing_assessments WHERE employee_id = '${employeeId}'
  `));

  // Insert new assessment
  await db.execute(sql.raw(`
    INSERT INTO ime_wellbeing_assessments
      (employee_id, employee_name, department,
       wellbeing_score, wellbeing_grade,
       meeting_load_dimension, schedule_balance_dimension,
       collaboration_diversity_dimension, focus_time_dimension,
       meeting_efficiency_dimension, workload_trend_dimension,
       risk_factors, recommendations, ai_narrative,
       assessed_period_start, assessed_period_end, assessed_at)
    VALUES
      ('${employeeId}', '${employeeName}', ${department ? `'${department}'` : "NULL"},
       ${assessment.wellbeingScore}, '${assessment.wellbeingGrade}',
       ${assessment.meetingLoadDimension}, ${assessment.scheduleBalanceDimension},
       ${assessment.collaborationDiversityDimension}, ${assessment.focusTimeDimension},
       ${assessment.meetingEfficiencyDimension}, ${assessment.workloadTrendDimension},
       '${JSON.stringify(assessment.riskFactors)}', '${JSON.stringify(assessment.recommendations)}',
       '${(assessment.aiNarrative || "").replace(/'/g, "''")}',
       '${latest.period_start}', '${latest.period_end}', NOW())
  `));

  return {
    employeeId,
    employeeName,
    department,
    ...assessment,
  };
}

/**
 * List well-being scores with optional filters.
 */
export async function getWellbeingScores(options?: {
  grade?: string;
  department?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const limit = options?.limit || 50;

  let whereExtra = "";
  if (options?.grade) {
    whereExtra += ` AND wellbeing_grade = '${options.grade}'`;
  }
  if (options?.department) {
    whereExtra += ` AND department = '${options.department}'`;
  }

  const result = await db.execute(sql.raw(`
    SELECT *
    FROM ime_wellbeing_assessments
    WHERE 1=1 ${whereExtra}
    ORDER BY assessed_at DESC
    LIMIT ${limit}
  `));

  return result.rows;
}

/**
 * Batch assess well-being for multiple employees.
 */
export async function batchAssessWellbeing(employeeIds: string[]) {
  const results: any[] = [];
  const errors: any[] = [];

  for (const id of employeeIds) {
    try {
      const result = await assessWellbeing(id);
      results.push(result);
    } catch (err: any) {
      errors.push({ employeeId: id, error: err.message });
    }
  }

  return { assessed: results.length, errors: errors.length, results, errorDetails: errors };
}

/**
 * Team load summary — per-department aggregation.
 */
export async function getTeamLoadSummary(options?: { periodType?: string }) {
  const db = await requireDb();
  const periodType = options?.periodType || "weekly";

  const result = await db.execute(sql.raw(`
    SELECT
      department,
      COUNT(*) as headcount,
      ROUND(AVG(load_score), 1) as avg_load_score,
      COUNT(CASE WHEN load_score > 60 THEN 1 END) as overloaded_count,
      ROUND(AVG(focus_time_minutes), 0) as avg_focus_time,
      ROUND(AVG(total_meeting_minutes), 0) as avg_meeting_minutes,
      ROUND(AVG(back_to_back_ratio), 0) as avg_b2b_ratio
    FROM ime_participant_workload
    WHERE period_type = '${periodType}'
      AND department IS NOT NULL
    GROUP BY department
    ORDER BY avg_load_score DESC
  `));

  return (result.rows as any[]).map((r: any) => ({
    ...r,
    overloadedPercent: Number(r.headcount) > 0
      ? Math.round((Number(r.overloaded_count) / Number(r.headcount)) * 100)
      : 0,
  }));
}

// ============================================================================
// Phase 18: Recurring Meeting Value Assessment & Optimization
// ============================================================================

/**
 * Normalize a meeting title for series grouping.
 * Lowercases, trims, removes trailing dates/numbers.
 */
function normalizeMeetingTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s*\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*$/g, "")
    .replace(/\s*#?\d+\s*$/g, "")
    .replace(/\s*\(\d+\)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compute frequency label from average interval in days.
 */
function frequencyFromInterval(avgDays: number): string {
  if (avgDays <= 1.5) return "daily";
  if (avgDays <= 9) return "weekly";
  if (avgDays <= 18) return "biweekly";
  if (avgDays <= 45) return "monthly";
  return "irregular";
}

/**
 * Detect recurring meeting series from meeting_records.
 */
export async function detectRecurringSeries(options?: { dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  let dateFilter = "";
  if (options?.dateFrom) dateFilter += ` AND mr.meeting_date >= '${options.dateFrom}'`;
  if (options?.dateTo) dateFilter += ` AND mr.meeting_date <= '${options.dateTo}'`;

  // 1. Get all meetings with their titles, dates, participants
  const meetingsResult = await db.execute(sql.raw(`
    SELECT mr.id, mr.title, mr.meeting_date, mr.duration_minutes, mr.channel_id,
           COALESCE(mes.overall_score, 0) as effectiveness_score
    FROM meeting_records mr
    LEFT JOIN meeting_effectiveness_scores mes ON mes.meeting_id = mr.id
    WHERE mr.title IS NOT NULL AND mr.title != '' ${dateFilter}
    ORDER BY mr.meeting_date ASC
  `));
  const meetings = meetingsResult.rows as any[];

  // 2. Group by normalized title
  const groups = new Map<string, any[]>();
  for (const m of meetings) {
    const key = normalizeMeetingTitle(m.title || "");
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  // 3. Filter to groups with ≥3 occurrences (recurring)
  const seriesRecords: any[] = [];

  for (const [normalizedTitle, groupMeetings] of Array.from(groups.entries())) {
    if (groupMeetings.length < 3) continue;

    const seriesKey = crypto.createHash("md5").update(normalizedTitle).digest("hex").slice(0, 16);
    const seriesTitle = groupMeetings[0].title; // representative title

    // Compute interval between meetings
    const dates = groupMeetings.map((m: any) => new Date(m.meeting_date).getTime()).sort((a: number, b: number) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    }
    const avgInterval = intervals.length > 0
      ? Math.round(intervals.reduce((s: number, v: number) => s + v, 0) / intervals.length)
      : 0;
    const frequency = frequencyFromInterval(avgInterval);

    // Participants — get core participants present in >50% of meetings
    const meetingIds = groupMeetings.map((m: any) => `'${m.id}'`).join(",");
    const participantsResult = await db.execute(sql.raw(`
      SELECT employee_id, COUNT(*) as attend_count
      FROM meeting_contributions
      WHERE meeting_id IN (${meetingIds})
      GROUP BY employee_id
    `));
    const participantRows = participantsResult.rows as any[];
    const threshold = groupMeetings.length * 0.5;
    const coreParticipants = participantRows
      .filter((p: any) => Number(p.attend_count) >= threshold)
      .map((p: any) => p.employee_id);
    const avgParticipantCount = participantRows.length > 0
      ? Math.round(participantRows.reduce((s: number, p: any) => s + Number(p.attend_count), 0) / groupMeetings.length)
      : 0;

    // Effectiveness
    const scores = groupMeetings.map((m: any) => Number(m.effectiveness_score) || 0);
    const avgEffectiveness = scores.length > 0
      ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length)
      : 0;

    // Trend slope: first-half vs second-half effectiveness
    const midpoint = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, midpoint);
    const secondHalf = scores.slice(midpoint);
    const avgFirst = firstHalf.length > 0
      ? firstHalf.reduce((s: number, v: number) => s + v, 0) / firstHalf.length
      : 0;
    const avgSecond = secondHalf.length > 0
      ? secondHalf.reduce((s: number, v: number) => s + v, 0) / secondHalf.length
      : 0;
    const trendSlope = Math.round(avgSecond - avgFirst);
    let effectivenessTrend: string;
    if (trendSlope > 10) effectivenessTrend = "improving";
    else if (trendSlope < -10) effectivenessTrend = "declining";
    else effectivenessTrend = "stable";

    // Participant consistency (0-100)
    const consistencyRatio = coreParticipants.length > 0 && participantRows.length > 0
      ? Math.round((coreParticipants.length / participantRows.length) * 100)
      : 50;

    // Action item completion — simplified from available data
    const actionItemCompletion = 50; // default baseline

    // Value score = weighted composite
    const valueScore = Math.round(
      avgEffectiveness * 0.4 +
      Math.max(0, Math.min(100, 50 + trendSlope)) * 0.2 +
      consistencyRatio * 0.2 +
      actionItemCompletion * 0.2
    );

    // Grade
    let valueGrade: string;
    if (valueScore >= 80) valueGrade = "A";
    else if (valueScore >= 60) valueGrade = "B";
    else if (valueScore >= 40) valueGrade = "C";
    else if (valueScore >= 20) valueGrade = "D";
    else valueGrade = "F";

    // Recommendation heuristic
    let recommendation: string;
    if (valueGrade === "F") recommendation = "cancel";
    else if (valueGrade === "D") recommendation = "reduce_frequency";
    else if (valueGrade === "C") recommendation = "shorten";
    else recommendation = "continue";

    // ROI grade (average from meeting ROI if available)
    const roiResult = await db.execute(sql.raw(`
      SELECT COALESCE(roi_grade, 'C') as roi_grade FROM ime_meeting_roi
      WHERE meeting_id IN (${meetingIds})
    `));
    const roiGrades = (roiResult.rows as any[]).map((r: any) => r.roi_grade);
    const avgRoiGrade = roiGrades.length > 0 ? roiGrades[0] : "C";

    // Cumulative cost & minutes
    const totalMinutes = groupMeetings.reduce((s: number, m: any) => s + (Number(m.duration_minutes) || 0), 0);
    const costResult = await db.execute(sql.raw(`
      SELECT COALESCE(SUM(total_cost), 0) as total_cost FROM ime_meeting_costs
      WHERE meeting_id IN (${meetingIds})
    `));
    const totalCost = Number((costResult.rows as any[])[0]?.total_cost) || 0;

    seriesRecords.push({
      seriesKey,
      seriesTitle,
      channelId: groupMeetings[0].channel_id || null,
      frequency,
      detectedInterval: avgInterval,
      firstOccurrence: new Date(dates[0]),
      lastOccurrence: new Date(dates[dates.length - 1]),
      occurrenceCount: groupMeetings.length,
      avgParticipantCount,
      coreParticipants: JSON.stringify(coreParticipants),
      avgEffectivenessScore: avgEffectiveness,
      effectivenessTrend,
      trendSlope,
      avgRoiGrade,
      totalCumulativeCost: Math.round(totalCost),
      totalCumulativeMinutes: totalMinutes,
      valueScore,
      valueGrade,
      recommendation,
      recommendationRationale: `Value score ${valueScore}/100 (${valueGrade}). Trend: ${effectivenessTrend} (slope: ${trendSlope}). ${groupMeetings.length} occurrences over ${avgInterval}-day intervals.`,
      aiNarrative: null,
      meetingIds: JSON.stringify(groupMeetings.map((m: any) => m.id)),
      status: "active",
    });
  }

  // 4. Clear old records and bulk insert
  await db.execute(sql`DELETE FROM ime_recurring_series`);
  for (const rec of seriesRecords) {
    await db.execute(sql`
      INSERT INTO ime_recurring_series
        (series_key, series_title, channel_id, frequency, detected_interval,
         first_occurrence, last_occurrence, occurrence_count, avg_participant_count,
         core_participants, avg_effectiveness_score, effectiveness_trend, trend_slope,
         avg_roi_grade, total_cumulative_cost, total_cumulative_minutes,
         value_score, value_grade, recommendation, recommendation_rationale,
         ai_narrative, meeting_ids, status)
      VALUES
        (${rec.seriesKey}, ${rec.seriesTitle}, ${rec.channelId}, ${rec.frequency}, ${rec.detectedInterval},
         ${rec.firstOccurrence}, ${rec.lastOccurrence}, ${rec.occurrenceCount}, ${rec.avgParticipantCount},
         ${rec.coreParticipants}, ${rec.avgEffectivenessScore}, ${rec.effectivenessTrend}, ${rec.trendSlope},
         ${rec.avgRoiGrade}, ${rec.totalCumulativeCost}, ${rec.totalCumulativeMinutes},
         ${rec.valueScore}, ${rec.valueGrade}, ${rec.recommendation}, ${rec.recommendationRationale},
         ${rec.aiNarrative}, ${rec.meetingIds}, ${rec.status})
    `);
  }

  return { detected: seriesRecords.length };
}

/**
 * Dashboard for recurring series — aggregate stats.
 */
export async function getRecurringSeriesDashboard(filters?: { frequency?: string; status?: string }) {
  const db = await requireDb();

  let where = "1=1";
  if (filters?.frequency) where += ` AND frequency = '${filters.frequency}'`;
  if (filters?.status) where += ` AND status = '${filters.status}'`;

  const result = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as total_series,
      ROUND(AVG(value_score), 0) as avg_value_score,
      COUNT(CASE WHEN effectiveness_trend = 'declining' THEN 1 END) as declining_count,
      COALESCE(SUM(total_cumulative_cost), 0) as total_cumulative_cost,
      COALESCE(SUM(total_cumulative_minutes), 0) as total_cumulative_minutes
    FROM ime_recurring_series
    WHERE ${where}
  `));
  const stats = (result.rows as any[])[0] || {};

  // Potential savings from optimized/cancelled series
  const savingsResult = await db.execute(sql.raw(`
    SELECT COALESCE(SUM(minutes_saved_per_week), 0) as total_weekly_minutes_saved
    FROM ime_series_optimization_outcomes
    WHERE action_taken != 'no_change'
  `));
  const savings = (savingsResult.rows as any[])[0] || {};

  return {
    totalSeries: Number(stats.total_series) || 0,
    avgValueScore: Number(stats.avg_value_score) || 0,
    decliningCount: Number(stats.declining_count) || 0,
    totalWeeklyMinutesSaved: Number(savings.total_weekly_minutes_saved) || 0,
    totalCumulativeCost: Number(stats.total_cumulative_cost) || 0,
  };
}

/**
 * Paginated list of recurring series — sorted by value score ascending (worst first).
 */
export async function getRecurringSeriesList(options?: {
  frequency?: string;
  valueGrade?: string;
  status?: string;
  effectivenessTrend?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const limit = options?.limit ?? 50;

  let where = "1=1";
  if (options?.frequency) where += ` AND frequency = '${options.frequency}'`;
  if (options?.valueGrade) where += ` AND value_grade = '${options.valueGrade}'`;
  if (options?.status) where += ` AND status = '${options.status}'`;
  if (options?.effectivenessTrend) where += ` AND effectiveness_trend = '${options.effectivenessTrend}'`;

  const result = await db.execute(sql.raw(`
    SELECT *
    FROM ime_recurring_series
    WHERE ${where}
    ORDER BY value_score ASC
    LIMIT ${limit}
  `));

  return result.rows;
}

/**
 * Value trend for a specific series — list all meetings chronologically
 * with effectiveness scores for a line chart.
 */
export async function getSeriesValueTrend(seriesId: number) {
  const db = await requireDb();

  // Get the series to get meeting IDs
  const seriesResult = await db.execute(sql`
    SELECT meeting_ids, series_title FROM ime_recurring_series WHERE id = ${seriesId}
  `);
  const series = (seriesResult.rows as any[])[0];
  if (!series) throw new Error(`Series ${seriesId} not found`);

  let meetingIds: string[] = [];
  try {
    meetingIds = JSON.parse(series.meeting_ids || "[]");
  } catch { meetingIds = []; }

  if (meetingIds.length === 0) return { seriesTitle: series.series_title, meetings: [] };

  const idList = meetingIds.map((id: string) => `'${id}'`).join(",");

  const result = await db.execute(sql.raw(`
    SELECT mr.id, mr.title, mr.meeting_date, mr.duration_minutes,
           COALESCE(mes.overall_score, 0) as effectiveness_score,
           COALESCE(mes.participant_count, 0) as participant_count,
           iroi.roi_grade
    FROM meeting_records mr
    LEFT JOIN meeting_effectiveness_scores mes ON mes.meeting_id = mr.id
    LEFT JOIN ime_meeting_roi iroi ON iroi.meeting_id = mr.id
    WHERE mr.id IN (${idList})
    ORDER BY mr.meeting_date ASC
  `));

  return { seriesTitle: series.series_title, meetings: result.rows };
}

/**
 * Compare multiple series side-by-side — value score, frequency, avg effectiveness, cost.
 */
export async function getSeriesComparison(options?: { limit?: number }) {
  const db = await requireDb();
  const limit = options?.limit ?? 20;

  const result = await db.execute(sql.raw(`
    SELECT id, series_title, frequency, value_score, value_grade,
           avg_effectiveness_score, total_cumulative_cost,
           occurrence_count, avg_participant_count
    FROM ime_recurring_series
    ORDER BY value_score ASC
    LIMIT ${limit}
  `));

  return result.rows;
}

/**
 * Generate AI-powered optimization recommendation for a specific series.
 */
export async function generateSeriesOptimization(seriesId: number) {
  const db = await requireDb();

  const seriesResult = await db.execute(sql`
    SELECT * FROM ime_recurring_series WHERE id = ${seriesId}
  `);
  const series = (seriesResult.rows as any[])[0];
  if (!series) throw new Error(`Series ${seriesId} not found`);

  const prompt = `Analyze this recurring meeting series and provide optimization recommendations.

Series: "${series.series_title}"
Frequency: ${series.frequency} (every ~${series.detected_interval} days)
Occurrences: ${series.occurrence_count}
Average Effectiveness: ${series.avg_effectiveness_score}/100
Effectiveness Trend: ${series.effectiveness_trend} (slope: ${series.trend_slope})
Value Score: ${series.value_score}/100 (Grade: ${series.value_grade})
Average Participants: ${series.avg_participant_count}
Cumulative Cost: ${series.total_cumulative_cost}
Cumulative Minutes: ${series.total_cumulative_minutes}

Provide a recommendation: continue, shorten, reduce_frequency, merge, or cancel.
Include rationale, specific actions to take, and estimated weekly time savings in minutes.`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "user", content: prompt },
      ],
      responseFormat: {
        type: "json_schema" as const,
        json_schema: {
          name: "series_optimization",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendation: { type: "string", enum: ["continue", "shorten", "reduce_frequency", "merge", "cancel"] },
              rationale: { type: "string" },
              specific_actions: { type: "array", items: { type: "string" } },
              estimated_weekly_savings_minutes: { type: "number" },
              narrative: { type: "string" },
            },
            required: ["recommendation", "rationale", "specific_actions", "estimated_weekly_savings_minutes", "narrative"],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse((result as any).content);

    // Update series record
    await db.execute(sql`
      UPDATE ime_recurring_series
      SET recommendation = ${parsed.recommendation},
          recommendation_rationale = ${parsed.rationale},
          ai_narrative = ${parsed.narrative}
      WHERE id = ${seriesId}
    `);

    return parsed;
  } catch (err: any) {
    // Fallback heuristic
    const fallback = {
      recommendation: series.recommendation || "continue",
      rationale: series.recommendation_rationale || `Heuristic: value score ${series.value_score}/100.`,
      specific_actions: ["Review meeting agenda and objectives", "Survey participants for feedback"],
      estimated_weekly_savings_minutes: series.value_grade === "F" ? 60 : series.value_grade === "D" ? 30 : 0,
      narrative: `Fallback analysis for "${series.series_title}". LLM unavailable: ${err.message}`,
    };

    await db.execute(sql`
      UPDATE ime_recurring_series
      SET ai_narrative = ${fallback.narrative}
      WHERE id = ${seriesId}
    `);

    return fallback;
  }
}

/**
 * Batch generate optimization recommendations for multiple series.
 */
export async function batchGenerateOptimizations(seriesIds: number[]) {
  const results: any[] = [];
  const errors: any[] = [];

  for (const id of seriesIds) {
    try {
      const result = await generateSeriesOptimization(id);
      results.push({ seriesId: id, ...result });
    } catch (err: any) {
      errors.push({ seriesId: id, error: err.message });
    }
  }

  return { optimized: results.length, errors: errors.length, results, errorDetails: errors };
}

/**
 * Record an optimization action taken on a recurring series.
 */
export async function recordOptimizationAction(seriesId: number, actionTaken: string) {
  const db = await requireDb();

  // Get pre-action metrics from the series
  const seriesResult = await db.execute(sql`
    SELECT * FROM ime_recurring_series WHERE id = ${seriesId}
  `);
  const series = (seriesResult.rows as any[])[0];
  if (!series) throw new Error(`Series ${seriesId} not found`);

  const preValueScore = Number(series.value_score) || 0;
  const preEffectiveness = Number(series.avg_effectiveness_score) || 0;
  const totalMinutes = Number(series.total_cumulative_minutes) || 0;
  const occurrenceCount = Number(series.occurrence_count) || 1;
  const detectedInterval = Number(series.detected_interval) || 7;

  // Estimate weekly minutes
  const weeksSpan = Math.max(1, (detectedInterval * occurrenceCount) / 7);
  const preWeeklyMinutes = Math.round(totalMinutes / weeksSpan);

  // Estimate post-action weekly minutes based on action
  let postWeeklyMinutes = preWeeklyMinutes;
  if (actionTaken === "cancelled") postWeeklyMinutes = 0;
  else if (actionTaken === "reduced_frequency") postWeeklyMinutes = Math.round(preWeeklyMinutes * 0.5);
  else if (actionTaken === "shortened") postWeeklyMinutes = Math.round(preWeeklyMinutes * 0.7);
  else if (actionTaken === "merged") postWeeklyMinutes = Math.round(preWeeklyMinutes * 0.6);

  const minutesSaved = preWeeklyMinutes - postWeeklyMinutes;
  // Rough cost estimation: ~$1/minute average
  const costSaved = minutesSaved;

  // Insert outcome
  await db.execute(sql`
    INSERT INTO ime_series_optimization_outcomes
      (series_id, series_title, action_taken, action_date,
       pre_action_value_score, pre_action_effectiveness,
       pre_action_weekly_minutes, post_action_weekly_minutes,
       minutes_saved_per_week, cost_saved_per_week,
       team_satisfaction_delta, productivity_impact, ai_assessment)
    VALUES
      (${seriesId}, ${series.series_title}, ${actionTaken}, NOW(),
       ${preValueScore}, ${preEffectiveness},
       ${preWeeklyMinutes}, ${postWeeklyMinutes},
       ${minutesSaved}, ${costSaved},
       ${0}, ${"neutral"}, ${`Action "${actionTaken}" recorded for series "${series.series_title}".`})
  `);

  // Update series status
  const newStatus = actionTaken === "cancelled" ? "cancelled" : "optimized";
  await db.execute(sql`
    UPDATE ime_recurring_series SET status = ${newStatus} WHERE id = ${seriesId}
  `);

  return { seriesId, actionTaken, minutesSaved, costSaved, newStatus };
}

/**
 * List optimization outcomes with calculated savings.
 */
export async function getOptimizationOutcomes(options?: {
  actionTaken?: string;
  productivityImpact?: string;
  limit?: number;
}) {
  const db = await requireDb();
  const limit = options?.limit ?? 50;

  let where = "1=1";
  if (options?.actionTaken) where += ` AND action_taken = '${options.actionTaken}'`;
  if (options?.productivityImpact) where += ` AND productivity_impact = '${options.productivityImpact}'`;

  const result = await db.execute(sql.raw(`
    SELECT *
    FROM ime_series_optimization_outcomes
    WHERE ${where}
    ORDER BY assessed_at DESC
    LIMIT ${limit}
  `));

  return result.rows;
}

/**
 * Org-wide summary of recurring meeting series.
 */
export async function getRecurringMeetingSummary(options?: { status?: string }) {
  const db = await requireDb();

  let where = "1=1";
  if (options?.status) where += ` AND status = '${options.status}'`;

  // Series by frequency distribution
  const freqResult = await db.execute(sql.raw(`
    SELECT frequency, COUNT(*) as count
    FROM ime_recurring_series
    WHERE ${where}
    GROUP BY frequency
    ORDER BY count DESC
  `));

  // Series by value grade distribution
  const gradeResult = await db.execute(sql.raw(`
    SELECT value_grade, COUNT(*) as count
    FROM ime_recurring_series
    WHERE ${where}
    GROUP BY value_grade
    ORDER BY value_grade ASC
  `));

  // Top 10 worst-value series
  const worstResult = await db.execute(sql.raw(`
    SELECT id, series_title, frequency, value_score, value_grade,
           avg_effectiveness_score, total_cumulative_minutes, recommendation
    FROM ime_recurring_series
    WHERE ${where}
    ORDER BY value_score ASC
    LIMIT 10
  `));

  // Potential savings if all D/F series optimized
  const savingsResult = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as df_count,
      COALESCE(SUM(total_cumulative_minutes), 0) as total_minutes,
      COALESCE(SUM(total_cumulative_cost), 0) as total_cost
    FROM ime_recurring_series
    WHERE value_grade IN ('D', 'F') AND status = 'active'
  `));
  const savingsStats = (savingsResult.rows as any[])[0] || {};

  return {
    frequencyDistribution: freqResult.rows,
    gradeDistribution: gradeResult.rows,
    worstSeries: worstResult.rows,
    potentialSavings: {
      dfSeriesCount: Number(savingsStats.df_count) || 0,
      totalMinutes: Number(savingsStats.total_minutes) || 0,
      totalCost: Number(savingsStats.total_cost) || 0,
      estimatedWeeklySavings: Math.round((Number(savingsStats.total_minutes) || 0) * 0.3),
    },
  };
}

// ============================================================================
// Phase 19: Decision Follow-Through & Reversal Intelligence
// ============================================================================

/**
 * Analyze decision effectiveness for a single meeting.
 * Extracts decisions, cross-references outcomes and action items,
 * computes follow-through status, velocity, and uses LLM for quality scoring.
 */
export async function analyzeDecisionEffectiveness(meetingId: string) {
  const db = await requireDb();

  // 1. Get meeting
  const meetingRes = await db.execute(sql`SELECT id, title, objective, summary, meeting_date FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // 2. Extract decisions from content blocks
  const blocksRes = await db.execute(sql`SELECT content, speaker FROM meeting_content_blocks WHERE meeting_id = ${meetingId} AND block_type = 'decision'`);
  const decisionBlocks = blocksRes.rows as any[];

  // 3. Extract decisions from knowledge entities
  const entitiesRes = await db.execute(sql`SELECT id, entity_name, context_text FROM ime_knowledge_entities WHERE meeting_id = ${meetingId} AND entity_type = 'decision'`);
  const decisionEntities = entitiesRes.rows as any[];

  // Merge decisions
  const allDecisions: Array<{ text: string; maker: string; source: string }> = [];
  for (const b of decisionBlocks) {
    allDecisions.push({ text: b.content || "", maker: b.speaker || "unknown", source: "content_block" });
  }
  for (const e of decisionEntities) {
    allDecisions.push({ text: e.entity_name || e.context_text || "", maker: "unknown", source: "knowledge_entity" });
  }

  if (allDecisions.length === 0) {
    return { meetingId, decisionsAnalyzed: 0, decisions: [] };
  }

  // 4. Cross-reference with decision outcomes
  const outcomesRes = await db.execute(sql`SELECT id, decision_text, outcome_status, outcome_notes, resolved_date, created_at FROM ime_decision_outcomes WHERE meeting_id = ${meetingId}`);
  const outcomes = outcomesRes.rows as any[];

  // 5. Cross-reference with action items
  const actionsRes = await db.execute(sql`SELECT id, action_text, assignee, status, due_date, resolved_date FROM ime_action_items WHERE meeting_id = ${meetingId}`);
  const actionItems = actionsRes.rows as any[];

  // 6. For each decision compute follow-through status and velocity
  const decisionData: any[] = [];
  for (const dec of allDecisions) {
    // Match action items by text similarity (simple substring check)
    const relatedActions = actionItems.filter((a: any) => {
      const decLower = dec.text.toLowerCase();
      const actLower = (a.action_text || "").toLowerCase();
      return decLower.includes(actLower.substring(0, 20)) || actLower.includes(decLower.substring(0, 20));
    });

    // Determine follow-through status
    let followThroughStatus = "pending";
    if (relatedActions.length > 0) {
      const statuses = relatedActions.map((a: any) => a.status);
      if (statuses.every((s: string) => s === "completed" || s === "done")) {
        followThroughStatus = "implemented";
      } else if (statuses.some((s: string) => s === "abandoned" || s === "cancelled")) {
        followThroughStatus = "abandoned";
      } else if (statuses.some((s: string) => s === "in_progress" || s === "in-progress")) {
        followThroughStatus = "in_progress";
      }
    }

    // Check outcomes too
    const matchedOutcome = outcomes.find((o: any) => {
      const oText = (o.decision_text || "").toLowerCase();
      const dText = dec.text.toLowerCase();
      return oText.includes(dText.substring(0, 20)) || dText.includes(oText.substring(0, 20));
    });
    if (matchedOutcome) {
      if (matchedOutcome.outcome_status === "implemented" || matchedOutcome.outcome_status === "completed") {
        followThroughStatus = "implemented";
      } else if (matchedOutcome.outcome_status === "abandoned") {
        followThroughStatus = "abandoned";
      } else if (matchedOutcome.outcome_status === "reversed") {
        followThroughStatus = "reversed";
      }
    }

    // Compute velocity
    const decisionDate = meeting.meeting_date ? new Date(meeting.meeting_date) : new Date();
    let velocityDays: number | null = null;
    let velocityGrade = "N/A";
    const resolvedDate = matchedOutcome?.resolved_date
      || relatedActions.find((a: any) => a.resolved_date)?.resolved_date
      || null;

    if (resolvedDate && followThroughStatus === "implemented") {
      velocityDays = Math.max(0, Math.round((new Date(resolvedDate).getTime() - decisionDate.getTime()) / 86400000));
      if (velocityDays < 7) velocityGrade = "A";
      else if (velocityDays < 14) velocityGrade = "B";
      else if (velocityDays < 30) velocityGrade = "C";
      else if (velocityDays < 60) velocityGrade = "D";
      else velocityGrade = "F";
    }

    decisionData.push({
      decisionText: dec.text,
      decisionMaker: dec.maker,
      followThroughStatus,
      velocityDays,
      velocityGrade,
      decisionDate: decisionDate.toISOString().split("T")[0],
      resolvedDate: resolvedDate ? new Date(resolvedDate).toISOString().split("T")[0] : null,
    });
  }

  // 7. LLM assessment for quality/clarity/alignment/impact
  let llmAssessment: any = {};
  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a decision quality analyst. Assess the quality, clarity, and strategic alignment of meeting decisions. Score each dimension 0-100. Also assess overall impact from -100 (very negative) to +100 (very positive). Categorize impact as positive, neutral, or negative. Provide a narrative summary and actionable recommendations.",
        },
        {
          role: "user",
          content: `Meeting: "${meeting.title}"\nObjective: ${meeting.objective || "N/A"}\nSummary: ${(meeting.summary || "").substring(0, 500)}\n\nDecisions made:\n${decisionData.map((d, i) => `${i + 1}. "${d.decisionText}" (by ${d.decisionMaker}, status: ${d.followThroughStatus}, velocity: ${d.velocityDays !== null ? d.velocityDays + " days" : "N/A"})`).join("\n")}`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "decision_effectiveness",
          schema: {
            type: "object",
            properties: {
              quality_score: { type: "number" },
              clarity_score: { type: "number" },
              alignment_score: { type: "number" },
              impact_score: { type: "number" },
              impact_category: { type: "string" },
              narrative: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["quality_score", "clarity_score", "alignment_score", "impact_score", "impact_category", "narrative", "recommendations"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });
    llmAssessment = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
  } catch (e) {
    llmAssessment = {
      quality_score: 50,
      clarity_score: 50,
      alignment_score: 50,
      impact_score: 0,
      impact_category: "neutral",
      narrative: "LLM assessment unavailable.",
      recommendations: [],
    };
  }

  // 8. Delete existing tracking rows for this meeting
  await db.execute(sql`DELETE FROM ime_decision_tracking WHERE meeting_id = ${meetingId}`);

  // 9. Insert new rows
  const insertedDecisions: any[] = [];
  for (const dec of decisionData) {
    const decId = `dec-${crypto.randomUUID()}`;
    const impactCat = llmAssessment.impact_category || "neutral";

    await db.execute(sql`
      INSERT INTO ime_decision_tracking (
        decision_id, meeting_id, decision_text, decision_maker, department, decision_date,
        follow_through_status, total_velocity_days, velocity_grade,
        is_reversed, impact_score, impact_category, ai_quality_score, ai_clarity_score,
        ai_alignment_score, ai_narrative, ai_recommendations, computed_at, created_at
      ) VALUES (
        ${decId}, ${meetingId}, ${dec.decisionText}, ${dec.decisionMaker}, '', ${dec.decisionDate},
        ${dec.followThroughStatus}, ${dec.velocityDays !== null ? dec.velocityDays : null}, ${dec.velocityGrade},
        0, ${llmAssessment.impact_score || 0}, ${impactCat}, ${llmAssessment.quality_score || 0},
        ${llmAssessment.clarity_score || 0}, ${llmAssessment.alignment_score || 0},
        ${String(llmAssessment.narrative || "")}, ${JSON.stringify(llmAssessment.recommendations || [])}, NOW(), NOW()
      )
    `);

    insertedDecisions.push({
      decisionId: decId,
      decisionText: dec.decisionText,
      decisionMaker: dec.decisionMaker,
      followThroughStatus: dec.followThroughStatus,
      velocityDays: dec.velocityDays,
      velocityGrade: dec.velocityGrade,
      qualityScore: llmAssessment.quality_score,
      clarityScore: llmAssessment.clarity_score,
      alignmentScore: llmAssessment.alignment_score,
      impactScore: llmAssessment.impact_score,
      impactCategory: impactCat,
    });
  }

  return {
    meetingId,
    decisionsAnalyzed: insertedDecisions.length,
    decisions: insertedDecisions,
  };
}

// ============================================================================
// Phase 19: Batch Analyze Decision Effectiveness
// ============================================================================

/**
 * Batch analyze decision effectiveness for multiple meetings.
 */
export async function batchAnalyzeDecisionEffectiveness(meetingIds: string[]) {
  const results: Array<{ meetingId: string; success: boolean; decisionsAnalyzed?: number; error?: string }> = [];

  for (const meetingId of meetingIds) {
    try {
      const result = await analyzeDecisionEffectiveness(meetingId);
      results.push({
        meetingId,
        success: true,
        decisionsAnalyzed: result.decisionsAnalyzed,
      });
    } catch (e: any) {
      results.push({
        meetingId,
        success: false,
        error: e.message || String(e),
      });
    }
  }

  return results;
}

// ============================================================================
// Phase 19: Detect Decision Reversals
// ============================================================================

/**
 * Detect semantic contradictions / reversals between decisions across meetings.
 * Uses LLM for semantic detection with keyword fallback.
 */
export async function detectDecisionReversals(options?: { dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  let dateFilter = "";
  if (options?.dateFrom) dateFilter += ` AND decision_date >= '${options.dateFrom}'`;
  if (options?.dateTo) dateFilter += ` AND decision_date <= '${options.dateTo}'`;

  // Load all tracked decisions chronologically
  const decisionsRes = await db.execute(sql.raw(`
    SELECT id, decision_id, meeting_id, decision_text, decision_maker, department, decision_date
    FROM ime_decision_tracking
    WHERE 1=1 ${dateFilter}
    ORDER BY decision_date ASC, id ASC
  `));
  const decisions = decisionsRes.rows as any[];

  if (decisions.length < 2) {
    return { reversalsDetected: 0, reversals: [] };
  }

  // Group by meeting
  const byMeeting: Record<string, any[]> = {};
  for (const d of decisions) {
    const mid = d.meeting_id || "unknown";
    if (!byMeeting[mid]) byMeeting[mid] = [];
    byMeeting[mid].push(d);
  }

  const meetingKeys = Object.keys(byMeeting);
  const reversals: Array<{ originalDecisionId: number; reversalDecisionId: number; reason: string }> = [];

  // Process in batches for LLM
  const batchSize = 50;
  for (let i = 0; i < decisions.length; i += batchSize) {
    const batch = decisions.slice(i, i + batchSize);
    const decisionSummaries = batch.map((d: any) => ({
      id: d.id,
      meetingId: d.meeting_id,
      text: (d.decision_text || "").substring(0, 200),
      date: d.decision_date,
    }));

    try {
      const llmResult = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a decision reversal detector. Given a list of decisions from different meetings, identify pairs where a later decision contradicts, reverses, or cancels an earlier decision. Only flag clear reversals, not refinements.",
          },
          {
            role: "user",
            content: `Analyze these decisions for reversals:\n${JSON.stringify(decisionSummaries, null, 2)}`,
          },
        ],
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "decision_reversals",
            schema: {
              type: "object",
              properties: {
                reversals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      originalDecisionId: { type: "number" },
                      reversalDecisionId: { type: "number" },
                      reason: { type: "string" },
                    },
                    required: ["originalDecisionId", "reversalDecisionId", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["reversals"],
              additionalProperties: false,
            },
            strict: true,
          },
        },
      });

      const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
      if (parsed.reversals && Array.isArray(parsed.reversals)) {
        reversals.push(...parsed.reversals);
      }
    } catch (e) {
      // Fallback: keyword-based detection
      const reversalKeywords = ["reconsider", "reverse", "cancel", "instead", "overturn", "revoke", "undo", "revert"];
      for (const d of batch) {
        const textLower = (d.decision_text || "").toLowerCase();
        const hasReversalKeyword = reversalKeywords.some((kw) => textLower.includes(kw));
        if (hasReversalKeyword) {
          // Find the most likely original decision (earlier, different meeting)
          const earlier = decisions.find(
            (prev: any) => prev.id < d.id && prev.meeting_id !== d.meeting_id
          );
          if (earlier) {
            reversals.push({
              originalDecisionId: earlier.id,
              reversalDecisionId: d.id,
              reason: `Keyword match: decision contains reversal language`,
            });
          }
        }
      }
    }
  }

  // Update ime_decision_tracking rows for detected reversals
  for (const rev of reversals) {
    const originalDec = decisions.find((d: any) => d.id === rev.originalDecisionId);
    const reversalDec = decisions.find((d: any) => d.id === rev.reversalDecisionId);
    if (originalDec && reversalDec) {
      const safeReason = String(rev.reason).replace(/'/g, "''");
      await db.execute(sql.raw(`
        UPDATE ime_decision_tracking
        SET is_reversed = 1,
            reversal_meeting_id = '${reversalDec.meeting_id}',
            reversal_date = '${reversalDec.decision_date}',
            reversal_reason = '${safeReason}'
        WHERE id = ${originalDec.id}
      `));
    }
  }

  // Enrich reversals with full context for frontend display
  const enrichedReversals = reversals.map((rev: any) => {
    const originalDec = decisions.find((d: any) => d.id === rev.originalDecisionId);
    const reversalDec = decisions.find((d: any) => d.id === rev.reversalDecisionId);
    return {
      ...rev,
      original_decision: originalDec?.decision_text || "",
      original_meeting_id: originalDec?.meeting_id || "",
      reversal_meeting_id: reversalDec?.meeting_id || "",
      reversal_date: reversalDec?.decision_date || null,
    };
  });

  return {
    reversalsDetected: enrichedReversals.length,
    reversals: enrichedReversals,
  };
}

// ============================================================================
// Phase 19: Compute Decision Velocity
// ============================================================================

/**
 * Compute decision velocity statistics for implemented decisions.
 * Supports filtering by department and date range.
 */
export async function computeDecisionVelocity(options?: { department?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  let where = "follow_through_status = 'implemented' AND total_velocity_days IS NOT NULL";
  if (options?.department) where += ` AND department = '${options.department.replace(/'/g, "''")}'`;
  if (options?.dateFrom) where += ` AND decision_date >= '${options.dateFrom}'`;
  if (options?.dateTo) where += ` AND decision_date <= '${options.dateTo}'`;

  // Overall velocity stats
  const overallRes = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as total_count,
      COALESCE(AVG(total_velocity_days), 0) as avg_velocity,
      COALESCE(MIN(total_velocity_days), 0) as fastest,
      COALESCE(MAX(total_velocity_days), 0) as slowest
    FROM ime_decision_tracking
    WHERE ${where}
  `));
  const overall = (overallRes.rows as any[])[0] || {};

  // Get all velocity values for median and p90 calculation
  const allVelocityRes = await db.execute(sql.raw(`
    SELECT total_velocity_days
    FROM ime_decision_tracking
    WHERE ${where}
    ORDER BY total_velocity_days ASC
  `));
  const velocityValues = (allVelocityRes.rows as any[]).map((r: any) => Number(r.total_velocity_days));

  let median = 0;
  let p90 = 0;
  if (velocityValues.length > 0) {
    const mid = Math.floor(velocityValues.length / 2);
    median = velocityValues.length % 2 !== 0 ? velocityValues[mid] : Math.round((velocityValues[mid - 1] + velocityValues[mid]) / 2);
    const p90Index = Math.floor(velocityValues.length * 0.9);
    p90 = velocityValues[Math.min(p90Index, velocityValues.length - 1)];
  }

  const avgVelocity = Math.round(Number(overall.avg_velocity) || 0);
  let overallGrade = "F";
  if (avgVelocity < 7) overallGrade = "A";
  else if (avgVelocity < 14) overallGrade = "B";
  else if (avgVelocity < 30) overallGrade = "C";
  else if (avgVelocity < 60) overallGrade = "D";

  // By department
  const deptRes = await db.execute(sql.raw(`
    SELECT
      department,
      COUNT(*) as total_count,
      COALESCE(AVG(total_velocity_days), 0) as avg_velocity,
      COALESCE(MIN(total_velocity_days), 0) as fastest,
      COALESCE(MAX(total_velocity_days), 0) as slowest
    FROM ime_decision_tracking
    WHERE ${where}
    GROUP BY department
    ORDER BY avg_velocity ASC
  `));
  const byDepartment = (deptRes.rows as any[]).map((r: any) => {
    const deptAvg = Math.round(Number(r.avg_velocity) || 0);
    let grade = "F";
    if (deptAvg < 7) grade = "A";
    else if (deptAvg < 14) grade = "B";
    else if (deptAvg < 30) grade = "C";
    else if (deptAvg < 60) grade = "D";
    return {
      department: r.department || "unknown",
      count: Number(r.total_count),
      avgVelocity: deptAvg,
      fastest: Number(r.fastest),
      slowest: Number(r.slowest),
      grade,
    };
  });

  // Identify bottlenecks (>2x average)
  const bottleneckThreshold = avgVelocity * 2;
  const bottlenecks = byDepartment.filter((d) => d.avgVelocity > bottleneckThreshold);

  return {
    overall: {
      avg: avgVelocity,
      median,
      p90,
      fastest: Number(overall.fastest) || 0,
      slowest: Number(overall.slowest) || 0,
      grade: overallGrade,
      totalCount: Number(overall.total_count) || 0,
    },
    byDepartment,
    bottlenecks,
  };
}

// ============================================================================
// Phase 19: Assess Decision Quality (Deep LLM Assessment)
// ============================================================================

/**
 * Deep LLM assessment of a single decision's quality, clarity, and alignment.
 */
export async function assessDecisionQuality(decisionId: number) {
  const db = await requireDb();

  // Load the decision
  const decRes = await db.execute(sql.raw(
    `SELECT * FROM ime_decision_tracking WHERE id = ${decisionId} LIMIT 1`
  ));
  const decision = (decRes.rows as any[])[0];
  if (!decision) throw new Error(`Decision ${decisionId} not found`);

  // Load meeting context
  const meetingRes = await db.execute(sql.raw(
    `SELECT title, objective, summary FROM meeting_records WHERE id = '${String(decision.meeting_id).replace(/'/g, "''")}' LIMIT 1`
  ));
  const meeting = (meetingRes.rows as any[])[0] || {};

  // Deep LLM assessment
  const llmResult = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an expert decision quality analyst. Perform a deep assessment of the given decision. Evaluate quality (specificity, measurability, feasibility), clarity (unambiguous language, clear ownership), and strategic alignment (supports organizational goals). Identify risk factors and provide actionable recommendations.",
      },
      {
        role: "user",
        content: `Meeting: "${meeting.title || "Unknown"}"\nObjective: ${meeting.objective || "N/A"}\nSummary: ${(meeting.summary || "").substring(0, 300)}\n\nDecision: "${decision.decision_text}"\nDecision maker: ${decision.decision_maker || "unknown"}\nDepartment: ${decision.department || "unknown"}\nCurrent status: ${decision.follow_through_status}\nVelocity: ${decision.total_velocity_days !== null ? decision.total_velocity_days + " days" : "N/A"}`,
      },
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "decision_quality_assessment",
        schema: {
          type: "object",
          properties: {
            quality_score: { type: "number" },
            clarity_score: { type: "number" },
            alignment_score: { type: "number" },
            risk_factors: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            narrative: { type: "string" },
          },
          required: ["quality_score", "clarity_score", "alignment_score", "risk_factors", "recommendations", "narrative"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");

  // Update ime_decision_tracking with AI scores
  const safeNarrative = String(parsed.narrative || "").replace(/'/g, "''");
  const safeRecs = JSON.stringify(parsed.recommendations || []).replace(/'/g, "''");

  await db.execute(sql.raw(`
    UPDATE ime_decision_tracking
    SET ai_quality_score = ${parsed.quality_score || 0},
        ai_clarity_score = ${parsed.clarity_score || 0},
        ai_alignment_score = ${parsed.alignment_score || 0},
        ai_narrative = '${safeNarrative}',
        ai_recommendations = '${safeRecs}',
        computed_at = NOW()
    WHERE id = ${decisionId}
  `));

  return {
    decisionId,
    qualityScore: parsed.quality_score,
    clarityScore: parsed.clarity_score,
    alignmentScore: parsed.alignment_score,
    riskFactors: parsed.risk_factors || [],
    recommendations: parsed.recommendations || [],
    narrative: parsed.narrative || "",
  };
}

// ============================================================================
// Phase 19: Compute Decision Intelligence Snapshot
// ============================================================================

/**
 * Aggregate decision tracking data into a snapshot for a given scope.
 * Scope: 'org' (all), 'department', 'team', 'individual'
 */
export async function computeDecisionIntelligenceSnapshot(
  scope: string,
  scopeId?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const db = await requireDb();

  let where = "1=1";
  if (scope === "department" && scopeId) {
    where += ` AND department = '${scopeId.replace(/'/g, "''")}'`;
  } else if ((scope === "team" || scope === "individual") && scopeId) {
    where += ` AND decision_maker = '${scopeId.replace(/'/g, "''")}'`;
  }
  if (dateFrom) where += ` AND decision_date >= '${dateFrom}'`;
  if (dateTo) where += ` AND decision_date <= '${dateTo}'`;

  // Aggregate counts
  const countsRes = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as total_decisions,
      SUM(CASE WHEN follow_through_status = 'implemented' THEN 1 ELSE 0 END) as implemented_count,
      SUM(CASE WHEN follow_through_status = 'abandoned' THEN 1 ELSE 0 END) as abandoned_count,
      SUM(CASE WHEN is_reversed = 1 THEN 1 ELSE 0 END) as reversed_count,
      SUM(CASE WHEN follow_through_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      COALESCE(AVG(CASE WHEN total_velocity_days IS NOT NULL THEN total_velocity_days END), 0) as avg_velocity_days,
      COALESCE(MIN(CASE WHEN total_velocity_days IS NOT NULL THEN total_velocity_days END), 0) as fastest_velocity_days,
      COALESCE(MAX(CASE WHEN total_velocity_days IS NOT NULL THEN total_velocity_days END), 0) as slowest_velocity_days,
      COALESCE(AVG(impact_score), 0) as avg_impact_score,
      SUM(CASE WHEN impact_category = 'positive' THEN 1 ELSE 0 END) as positive_impact_count,
      SUM(CASE WHEN impact_category = 'negative' THEN 1 ELSE 0 END) as negative_impact_count,
      COALESCE(AVG(ai_quality_score), 0) as avg_quality_score,
      COALESCE(AVG(ai_clarity_score), 0) as avg_clarity_score,
      COALESCE(AVG(ai_alignment_score), 0) as avg_alignment_score
    FROM ime_decision_tracking
    WHERE ${where}
  `));
  const stats = (countsRes.rows as any[])[0] || {};

  const totalDecisions = Number(stats.total_decisions) || 0;
  const implementedCount = Number(stats.implemented_count) || 0;
  const abandonedCount = Number(stats.abandoned_count) || 0;
  const reversedCount = Number(stats.reversed_count) || 0;
  const pendingCount = Number(stats.pending_count) || 0;
  const followThroughRate = totalDecisions > 0 ? Math.round((implementedCount / totalDecisions) * 100) : 0;
  const reversalRate = totalDecisions > 0 ? Math.round((reversedCount / totalDecisions) * 100) : 0;
  const avgVelocityDays = Math.round(Number(stats.avg_velocity_days) || 0);
  const fastestVelocityDays = Number(stats.fastest_velocity_days) || 0;
  const slowestVelocityDays = Number(stats.slowest_velocity_days) || 0;
  const avgImpactScore = Math.round(Number(stats.avg_impact_score) || 0);
  const positiveImpactCount = Number(stats.positive_impact_count) || 0;
  const negativeImpactCount = Number(stats.negative_impact_count) || 0;
  const avgQualityScore = Math.round(Number(stats.avg_quality_score) || 0);
  const avgClarityScore = Math.round(Number(stats.avg_clarity_score) || 0);
  const avgAlignmentScore = Math.round(Number(stats.avg_alignment_score) || 0);

  // Median velocity
  const velRes = await db.execute(sql.raw(`
    SELECT total_velocity_days
    FROM ime_decision_tracking
    WHERE ${where} AND total_velocity_days IS NOT NULL
    ORDER BY total_velocity_days ASC
  `));
  const velValues = (velRes.rows as any[]).map((r: any) => Number(r.total_velocity_days));
  let medianVelocityDays = 0;
  if (velValues.length > 0) {
    const mid = Math.floor(velValues.length / 2);
    medianVelocityDays = velValues.length % 2 !== 0 ? velValues[mid] : Math.round((velValues[mid - 1] + velValues[mid]) / 2);
  }

  // Velocity grade
  let velocityGrade = "F";
  if (avgVelocityDays < 7) velocityGrade = "A";
  else if (avgVelocityDays < 14) velocityGrade = "B";
  else if (avgVelocityDays < 30) velocityGrade = "C";
  else if (avgVelocityDays < 60) velocityGrade = "D";

  // Overall decision grade: 40% follow-through, 30% quality, 30% velocity
  const followThroughScore = followThroughRate; // 0-100
  const qualityNorm = avgQualityScore; // 0-100
  const velocityNorm = avgVelocityDays <= 0 ? 100 : Math.max(0, 100 - (avgVelocityDays / 60) * 100);
  const overallScore = Math.round(followThroughScore * 0.4 + qualityNorm * 0.3 + velocityNorm * 0.3);
  let overallDecisionGrade = "F";
  if (overallScore >= 90) overallDecisionGrade = "A";
  else if (overallScore >= 75) overallDecisionGrade = "B";
  else if (overallScore >= 60) overallDecisionGrade = "C";
  else if (overallScore >= 40) overallDecisionGrade = "D";

  // Top bottlenecks
  const bottleneckRes = await db.execute(sql.raw(`
    SELECT department, COUNT(*) as cnt
    FROM ime_decision_tracking
    WHERE ${where} AND total_velocity_days > ${avgVelocityDays * 2}
    GROUP BY department
    ORDER BY cnt DESC
    LIMIT 5
  `));
  const topBottlenecks = JSON.stringify((bottleneckRes.rows as any[]).map((r: any) => ({
    department: r.department,
    count: Number(r.cnt),
  })));

  // Top reversal reasons
  const reversalReasonRes = await db.execute(sql.raw(`
    SELECT reversal_reason, COUNT(*) as cnt
    FROM ime_decision_tracking
    WHERE ${where} AND is_reversed = 1 AND reversal_reason IS NOT NULL AND reversal_reason != ''
    GROUP BY reversal_reason
    ORDER BY cnt DESC
    LIMIT 5
  `));
  const topReversalReasons = JSON.stringify((reversalReasonRes.rows as any[]).map((r: any) => ({
    reason: r.reversal_reason,
    count: Number(r.cnt),
  })));

  // Previous snapshot for trend comparison
  const prevSnapshotRes = await db.execute(sql.raw(`
    SELECT overall_decision_grade, follow_through_rate, avg_velocity_days, avg_quality_score
    FROM ime_decision_intelligence_snapshots
    WHERE scope = '${scope.replace(/'/g, "''")}'
      AND (scope_id = '${(scopeId || "").replace(/'/g, "''")}' OR (scope_id IS NULL AND '${scopeId || ""}' = ''))
    ORDER BY computed_at DESC
    LIMIT 1
  `));
  const prevSnapshot = (prevSnapshotRes.rows as any[])[0];
  let trendVsPrevious = "stable";
  let trendSlope = 0;
  if (prevSnapshot) {
    const prevFollowThrough = Number(prevSnapshot.follow_through_rate) || 0;
    trendSlope = followThroughRate - prevFollowThrough;
    if (trendSlope > 5) trendVsPrevious = "improving";
    else if (trendSlope < -5) trendVsPrevious = "declining";
  }

  // LLM narrative + recommendations
  let aiNarrative = "";
  let recommendations = "[]";
  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a decision intelligence analyst. Generate a concise narrative summarizing decision-making performance and provide actionable recommendations for improvement.",
        },
        {
          role: "user",
          content: `Scope: ${scope}${scopeId ? ` (${scopeId})` : ""}\nTotal decisions: ${totalDecisions}\nImplemented: ${implementedCount} (${followThroughRate}%)\nAbandoned: ${abandonedCount}\nReversed: ${reversedCount} (${reversalRate}%)\nAvg velocity: ${avgVelocityDays} days (grade: ${velocityGrade})\nAvg quality: ${avgQualityScore}, clarity: ${avgClarityScore}, alignment: ${avgAlignmentScore}\nOverall grade: ${overallDecisionGrade}\nTrend: ${trendVsPrevious}`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "decision_snapshot_narrative",
          schema: {
            type: "object",
            properties: {
              narrative: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["narrative", "recommendations"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });
    const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
    aiNarrative = parsed.narrative || "";
    recommendations = JSON.stringify(parsed.recommendations || []);
  } catch (e) {
    aiNarrative = "Narrative generation unavailable.";
    recommendations = "[]";
  }

  const safeScopeId = (scopeId || "").replace(/'/g, "''");
  const periodStart = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const periodEnd = dateTo || new Date().toISOString().split("T")[0];

  // Delete existing snapshot for same scope/period
  await db.execute(sql.raw(`
    DELETE FROM ime_decision_intelligence_snapshots
    WHERE scope = '${scope.replace(/'/g, "''")}'
      AND (scope_id = '${safeScopeId}' OR (scope_id IS NULL AND '${safeScopeId}' = ''))
      AND period_start = '${periodStart}'
      AND period_end = '${periodEnd}'
  `));

  // Insert new snapshot
  await db.execute(sql.raw(`
    INSERT INTO ime_decision_intelligence_snapshots (
      scope, scope_id, period_start, period_end,
      total_decisions, implemented_count, abandoned_count, reversed_count, pending_count,
      follow_through_rate, reversal_rate,
      avg_velocity_days, median_velocity_days, fastest_velocity_days, slowest_velocity_days, velocity_grade,
      avg_impact_score, positive_impact_count, negative_impact_count,
      avg_quality_score, avg_clarity_score, avg_alignment_score,
      overall_decision_grade, top_bottlenecks, top_reversal_reasons,
      ai_narrative, trend_vs_previous, trend_slope, recommendations,
      computed_at, created_at
    ) VALUES (
      '${scope.replace(/'/g, "''")}', ${safeScopeId ? `'${safeScopeId}'` : "NULL"}, '${periodStart}', '${periodEnd}',
      ${totalDecisions}, ${implementedCount}, ${abandonedCount}, ${reversedCount}, ${pendingCount},
      ${followThroughRate}, ${reversalRate},
      ${avgVelocityDays}, ${medianVelocityDays}, ${fastestVelocityDays}, ${slowestVelocityDays}, '${velocityGrade}',
      ${avgImpactScore}, ${positiveImpactCount}, ${negativeImpactCount},
      ${avgQualityScore}, ${avgClarityScore}, ${avgAlignmentScore},
      '${overallDecisionGrade}', '${topBottlenecks.replace(/'/g, "''")}', '${topReversalReasons.replace(/'/g, "''")}',
      '${aiNarrative.replace(/'/g, "''")}', '${trendVsPrevious}', ${trendSlope}, '${recommendations.replace(/'/g, "''")}',
      NOW(), NOW()
    )
  `));

  return {
    scope,
    scopeId: scopeId || null,
    periodStart,
    periodEnd,
    totalDecisions,
    implementedCount,
    abandonedCount,
    reversedCount,
    pendingCount,
    followThroughRate,
    reversalRate,
    avgVelocityDays,
    medianVelocityDays,
    fastestVelocityDays,
    slowestVelocityDays,
    velocityGrade,
    avgImpactScore,
    positiveImpactCount,
    negativeImpactCount,
    avgQualityScore,
    avgClarityScore,
    avgAlignmentScore,
    overallDecisionGrade,
    topBottlenecks: JSON.parse(topBottlenecks),
    topReversalReasons: JSON.parse(topReversalReasons),
    aiNarrative,
    trendVsPrevious,
    trendSlope,
    recommendations: JSON.parse(recommendations),
  };
}

// ============================================================================
// Phase 19: Decision Dashboard (Simple Aggregate)
// ============================================================================

/**
 * Get a simple aggregate dashboard for decisions.
 */
export async function getDecisionDashboard(filters?: { department?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  let where = "1=1";
  if (filters?.department) where += ` AND department = '${filters.department.replace(/'/g, "''")}'`;
  if (filters?.dateFrom) where += ` AND decision_date >= '${filters.dateFrom}'`;
  if (filters?.dateTo) where += ` AND decision_date <= '${filters.dateTo}'`;

  const res = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as total_decisions,
      SUM(CASE WHEN follow_through_status = 'implemented' THEN 1 ELSE 0 END) as implemented_count,
      SUM(CASE WHEN is_reversed = 1 THEN 1 ELSE 0 END) as reversed_count,
      COALESCE(AVG(CASE WHEN total_velocity_days IS NOT NULL THEN total_velocity_days END), 0) as avg_velocity_days,
      COALESCE(AVG(ai_quality_score), 0) as avg_quality_score
    FROM ime_decision_tracking
    WHERE ${where}
  `));
  const stats = (res.rows as any[])[0] || {};

  const totalDecisions = Number(stats.total_decisions) || 0;
  const implementedCount = Number(stats.implemented_count) || 0;
  const followThroughRate = totalDecisions > 0 ? Math.round((implementedCount / totalDecisions) * 100) : 0;

  return {
    totalDecisions,
    implementedCount,
    reversedCount: Number(stats.reversed_count) || 0,
    avgVelocityDays: Math.round(Number(stats.avg_velocity_days) || 0),
    avgQualityScore: Math.round(Number(stats.avg_quality_score) || 0),
    followThroughRate,
  };
}

// ============================================================================
// Phase 19: Decision Tracking List (Paginated)
// ============================================================================

/**
 * Get a paginated list of tracked decisions with meeting title.
 */
export async function getDecisionTrackingList(options?: {
  status?: string;
  department?: string;
  impactCategory?: string;
  meetingId?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();

  let where = "1=1";
  if (options?.status) where += ` AND dt.follow_through_status = '${options.status.replace(/'/g, "''")}'`;
  if (options?.department) where += ` AND dt.department = '${options.department.replace(/'/g, "''")}'`;
  if (options?.impactCategory) where += ` AND dt.impact_category = '${options.impactCategory.replace(/'/g, "''")}'`;
  if (options?.meetingId) where += ` AND dt.meeting_id = '${options.meetingId.replace(/'/g, "''")}'`;

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const res = await db.execute(sql.raw(`
    SELECT
      dt.*,
      mr.title as meeting_title
    FROM ime_decision_tracking dt
    LEFT JOIN meeting_records mr ON mr.id = dt.meeting_id
    WHERE ${where}
    ORDER BY dt.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `));

  const countRes = await db.execute(sql.raw(`
    SELECT COUNT(*) as total
    FROM ime_decision_tracking dt
    WHERE ${where}
  `));
  const total = Number((countRes.rows as any[])[0]?.total) || 0;

  return {
    rows: res.rows,
    total,
    limit,
    offset,
  };
}

// ============================================================================
// Phase 19: Decision Velocity Trend
// ============================================================================

/**
 * Get velocity trend data from snapshots for line chart rendering.
 */
export async function getDecisionVelocityTrend(options?: { scope?: string; scopeId?: string; limit?: number }) {
  const db = await requireDb();

  let where = "1=1";
  if (options?.scope) where += ` AND scope = '${options.scope.replace(/'/g, "''")}'`;
  if (options?.scopeId) where += ` AND scope_id = '${options.scopeId.replace(/'/g, "''")}'`;

  const limit = options?.limit || 20;

  const res = await db.execute(sql.raw(`
    SELECT
      id, scope, scope_id, period_start, period_end,
      total_decisions, implemented_count, follow_through_rate, reversal_rate,
      avg_velocity_days, median_velocity_days, fastest_velocity_days, slowest_velocity_days,
      velocity_grade, overall_decision_grade,
      avg_quality_score, avg_clarity_score, avg_alignment_score,
      trend_vs_previous, trend_slope,
      computed_at
    FROM ime_decision_intelligence_snapshots
    WHERE ${where}
    ORDER BY period_end DESC
    LIMIT ${limit}
  `));

  return res.rows;
}

// ============================================================================
// Phase 19: Decision Reversal Analysis
// ============================================================================

/**
 * Get detailed reversal analysis with department breakdown.
 */
export async function getDecisionReversalAnalysis(options?: { department?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  let where = "is_reversed = 1";
  if (options?.department) where += ` AND department = '${options.department.replace(/'/g, "''")}'`;
  if (options?.dateFrom) where += ` AND decision_date >= '${options.dateFrom}'`;
  if (options?.dateTo) where += ` AND decision_date <= '${options.dateTo}'`;

  // Get reversed decisions
  const reversedRes = await db.execute(sql.raw(`
    SELECT
      id, decision_id, meeting_id, decision_text, decision_maker, department,
      decision_date, reversal_meeting_id, reversal_date, reversal_reason,
      impact_score, impact_category
    FROM ime_decision_tracking
    WHERE ${where}
    ORDER BY reversal_date DESC
  `));
  const reversedDecisions = reversedRes.rows as any[];

  // Group by department
  const byDeptRes = await db.execute(sql.raw(`
    SELECT department, COUNT(*) as cnt
    FROM ime_decision_tracking
    WHERE ${where}
    GROUP BY department
    ORDER BY cnt DESC
  `));
  const byDepartment = (byDeptRes.rows as any[]).map((r: any) => ({
    department: r.department || "unknown",
    count: Number(r.cnt),
  }));

  // Top reversal reasons
  const reasonsRes = await db.execute(sql.raw(`
    SELECT reversal_reason, COUNT(*) as cnt
    FROM ime_decision_tracking
    WHERE ${where} AND reversal_reason IS NOT NULL AND reversal_reason != ''
    GROUP BY reversal_reason
    ORDER BY cnt DESC
    LIMIT 10
  `));
  const topReasons = (reasonsRes.rows as any[]).map((r: any) => ({
    reason: r.reversal_reason,
    count: Number(r.cnt),
  }));

  return {
    reversedDecisions,
    byDepartment,
    totalReversals: reversedDecisions.length,
    topReasons,
  };
}

// ============================================================================
// Phase 19: Update Decision Follow-Through
// ============================================================================

/**
 * Manually update a decision's follow-through status and related fields.
 */
export async function updateDecisionFollowThrough(
  id: number,
  updates: {
    status?: string;
    implementationStartDate?: string;
    implementationEndDate?: string;
    businessOutcome?: string;
    impactScore?: number;
  },
) {
  const db = await requireDb();

  const setClauses: string[] = [];

  if (updates.status) {
    setClauses.push(`follow_through_status = '${updates.status.replace(/'/g, "''")}'`);
  }
  if (updates.implementationStartDate) {
    setClauses.push(`implementation_start_date = '${updates.implementationStartDate}'`);
  }
  if (updates.implementationEndDate) {
    setClauses.push(`implementation_end_date = '${updates.implementationEndDate}'`);
  }
  if (updates.businessOutcome !== undefined) {
    setClauses.push(`business_outcome = '${String(updates.businessOutcome).replace(/'/g, "''")}'`);
  }
  if (updates.impactScore !== undefined) {
    setClauses.push(`impact_score = ${updates.impactScore}`);
    // Compute impact category
    let impactCategory = "neutral";
    if (updates.impactScore > 0) impactCategory = "positive";
    else if (updates.impactScore < 0) impactCategory = "negative";
    setClauses.push(`impact_category = '${impactCategory}'`);
  }

  // Compute velocity if both dates provided
  if (updates.implementationStartDate && updates.implementationEndDate) {
    const startDate = new Date(updates.implementationStartDate);
    const endDate = new Date(updates.implementationEndDate);
    const startToCompletion = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
    setClauses.push(`start_to_completion_days = ${startToCompletion}`);

    // Also try to compute decision_to_start and total velocity
    const decRes = await db.execute(sql.raw(
      `SELECT decision_date FROM ime_decision_tracking WHERE id = ${id} LIMIT 1`
    ));
    const dec = (decRes.rows as any[])[0];
    if (dec && dec.decision_date) {
      const decisionDate = new Date(dec.decision_date);
      const decisionToStart = Math.max(0, Math.round((startDate.getTime() - decisionDate.getTime()) / 86400000));
      const totalVelocity = decisionToStart + startToCompletion;
      setClauses.push(`decision_to_start_days = ${decisionToStart}`);
      setClauses.push(`total_velocity_days = ${totalVelocity}`);

      // Velocity grade
      let velocityGrade = "F";
      if (totalVelocity < 7) velocityGrade = "A";
      else if (totalVelocity < 14) velocityGrade = "B";
      else if (totalVelocity < 30) velocityGrade = "C";
      else if (totalVelocity < 60) velocityGrade = "D";
      setClauses.push(`velocity_grade = '${velocityGrade}'`);
    }
  }

  if (setClauses.length === 0) {
    return { success: true, id, message: "No updates provided" };
  }

  await db.execute(sql.raw(`
    UPDATE ime_decision_tracking
    SET ${setClauses.join(", ")}
    WHERE id = ${id}
  `));

  return { success: true, id };
}

// ============================================================================
// Phase 20: Analyze Meeting Agenda Structure
// ============================================================================

/**
 * Analyze a meeting's agenda structure: extract items, map content blocks,
 * compute time efficiency, engagement, and productivity per agenda item.
 */
export async function analyzeMeetingAgendaStructure(meetingId: string) {
  const db = await requireDb();

  // Load meeting info + schedule agenda
  const meetingRes = await db.execute(sql`SELECT mr.id, mr.title, mr.objective, mr.summary, mr.meeting_date, ms.id as schedule_id, ms.agenda FROM meeting_records mr LEFT JOIN meeting_schedules ms ON (ms.title = mr.title AND DATE(ms.scheduled_date) = DATE(mr.meeting_date)) WHERE mr.id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // Load content blocks
  const blocksRes = await db.execute(sql`SELECT id, meeting_id, speaker, block_type, content, timestamp_start, timestamp_end, sort_order FROM meeting_content_blocks WHERE meeting_id = ${meetingId} ORDER BY sort_order ASC, timestamp_start ASC`);
  const blocks = blocksRes.rows as any[];

  const agendaText = meeting.agenda || "";
  const blocksSummary = blocks.map((b: any) => ({
    id: b.id,
    speaker: b.speaker,
    blockType: b.block_type,
    content: String(b.content || "").substring(0, 200),
    timestampStart: b.timestamp_start,
    timestampEnd: b.timestamp_end,
    sortOrder: b.sort_order,
  }));

  // Use LLM to analyze agenda structure
  const llmResult = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a meeting agenda structure analyst. Analyze the agenda text, extract agenda items with planned durations, map content blocks to agenda items by timestamps and content similarity, and compute actual duration, overrun, engagement, and productivity per item. Return JSON only.",
      },
      {
        role: "user",
        content: `Meeting: "${meeting.title}"\nObjective: ${meeting.objective || "N/A"}\nSummary: ${(meeting.summary || "").substring(0, 500)}\n\nAgenda text:\n${agendaText || "(No formal agenda found)"}\n\nContent blocks (${blocks.length} total):\n${JSON.stringify(blocksSummary, null, 2)}\n\nExtract agenda items with planned durations from the agenda text. Map each content block to the most appropriate agenda item. Compute actual duration per item, overrun, engagement score (0-100), productivity score (0-100). If no formal agenda, infer items from content blocks.`,
      },
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "agenda_structure_analysis",
        schema: {
          type: "object",
          properties: {
            agendaItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  title: { type: "string" },
                  category: { type: "string" },
                  plannedDurationMinutes: { type: "number" },
                  actualDurationMinutes: { type: "number" },
                  overrunMinutes: { type: "number" },
                  speakerCount: { type: "number" },
                  dominantSpeaker: { type: "string" },
                  dominantSpeakerPercent: { type: "number" },
                  contentBlockIds: { type: "array", items: { type: "number" } },
                  decisionsCount: { type: "number" },
                  actionItemsCount: { type: "number" },
                  engagementScore: { type: "number" },
                  productivityScore: { type: "number" },
                  aiSummary: { type: "string" },
                  aiRecommendation: { type: "string" },
                  wasSkipped: { type: "boolean" },
                },
                required: ["index", "title", "category", "plannedDurationMinutes", "actualDurationMinutes", "overrunMinutes", "speakerCount", "dominantSpeaker", "dominantSpeakerPercent", "contentBlockIds", "decisionsCount", "actionItemsCount", "engagementScore", "productivityScore", "aiSummary", "aiRecommendation", "wasSkipped"],
                additionalProperties: false,
              },
            },
            totalPlannedMinutes: { type: "number" },
            totalActualMinutes: { type: "number" },
            unplannedTimeMinutes: { type: "number" },
          },
          required: ["agendaItems", "totalPlannedMinutes", "totalActualMinutes", "unplannedTimeMinutes"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
  const agendaItems = parsed.agendaItems || [];
  const totalPlanned = parsed.totalPlannedMinutes || 0;
  const totalActual = parsed.totalActualMinutes || 0;

  // Compute meeting-level efficiency
  const meetingEfficiency = totalPlanned > 0
    ? Math.min(100, Math.max(0, Math.round((1 - Math.abs(totalActual - totalPlanned) / totalPlanned) * 100)))
    : 50;

  // Delete existing analysis rows for this meeting
  await db.execute(sql`DELETE FROM ime_meeting_structure_analysis WHERE meeting_id = ${meetingId}`);

  // Insert each agenda item
  for (const item of agendaItems) {
    const planned = Number(item.plannedDurationMinutes) || 0;
    const actual = Number(item.actualDurationMinutes) || 0;
    const overrun = Number(item.overrunMinutes) || 0;
    const overrunPercent = planned > 0 ? Math.round(((actual - planned) / planned) * 100) : 0;
    const absOverrunPercent = Math.abs(overrunPercent);

    let grade = "F";
    if (absOverrunPercent < 5) grade = "A";
    else if (absOverrunPercent < 15) grade = "B";
    else if (absOverrunPercent < 30) grade = "C";
    else if (absOverrunPercent < 50) grade = "D";

    await db.execute(sql`
      INSERT INTO ime_meeting_structure_analysis (
        meeting_id, agenda_item_index, agenda_item_title, agenda_item_category,
        planned_duration_minutes, actual_duration_minutes, overrun_minutes, overrun_percent,
        time_efficiency_grade, speaker_count, dominant_speaker, dominant_speaker_percent,
        content_block_ids, decisions_count, action_items_count,
        engagement_score, productivity_score, meeting_time_efficiency_score,
        ai_summary, ai_recommendation, was_skipped, created_at
      ) VALUES (
        ${meetingId}, ${Number(item.index) || 0}, ${String(item.title || "")}, ${String(item.category || "other")},
        ${planned}, ${actual}, ${overrun}, ${overrunPercent},
        ${grade}, ${Number(item.speakerCount) || 0}, ${String(item.dominantSpeaker || "")}, ${Number(item.dominantSpeakerPercent) || 0},
        ${JSON.stringify(item.contentBlockIds || [])}, ${Number(item.decisionsCount) || 0}, ${Number(item.actionItemsCount) || 0},
        ${Number(item.engagementScore) || 0}, ${Number(item.productivityScore) || 0}, ${meetingEfficiency},
        ${String(item.aiSummary || "")}, ${String(item.aiRecommendation || "")}, ${item.wasSkipped ? 1 : 0}, NOW()
      )
    `);
  }

  return {
    meetingId,
    agendaItemsFound: agendaItems.length,
    totalPlanned,
    totalActual,
    overallEfficiency: meetingEfficiency,
  };
}

// ============================================================================
// Phase 20: Batch Analyze Meeting Agenda
// ============================================================================

/**
 * Batch analyze agenda structure for multiple meetings.
 */
export async function batchAnalyzeMeetingAgenda(meetingIds: string[]) {
  const results: any[] = [];

  for (const meetingId of meetingIds) {
    try {
      const result = await analyzeMeetingAgendaStructure(meetingId);
      results.push({ meetingId, success: true, ...result });
    } catch (e: any) {
      results.push({ meetingId, success: false, error: e.message || String(e) });
    }
  }

  return { results };
}

// ============================================================================
// Phase 20: Get Time Allocation Breakdown
// ============================================================================

/**
 * Get agenda time allocation breakdown for a single meeting.
 */
export async function getTimeAllocationBreakdown(meetingId: string) {
  const db = await requireDb();
  const safeId = meetingId.replace(/'/g, "''");

  const res = await db.execute(sql.raw(
    `SELECT * FROM ime_meeting_structure_analysis WHERE meeting_id = '${safeId}' ORDER BY agenda_item_index ASC`
  ));
  const rows = res.rows as any[];

  const items = rows.map((r: any) => ({
    id: r.id,
    meetingId: r.meeting_id,
    agendaItemIndex: Number(r.agenda_item_index),
    agendaItemTitle: r.agenda_item_title,
    agendaItemCategory: r.agenda_item_category,
    plannedDurationMinutes: Number(r.planned_duration_minutes) || 0,
    actualDurationMinutes: Number(r.actual_duration_minutes) || 0,
    overrunMinutes: Number(r.overrun_minutes) || 0,
    overrunPercent: Number(r.overrun_percent) || 0,
    timeEfficiencyGrade: r.time_efficiency_grade,
    speakerCount: Number(r.speaker_count) || 0,
    dominantSpeaker: r.dominant_speaker,
    dominantSpeakerPercent: Number(r.dominant_speaker_percent) || 0,
    contentBlockIds: r.content_block_ids,
    decisionsCount: Number(r.decisions_count) || 0,
    actionItemsCount: Number(r.action_items_count) || 0,
    engagementScore: Number(r.engagement_score) || 0,
    productivityScore: Number(r.productivity_score) || 0,
    meetingTimeEfficiencyScore: Number(r.meeting_time_efficiency_score) || 0,
    aiSummary: r.ai_summary,
    aiRecommendation: r.ai_recommendation,
    wasSkipped: !!r.was_skipped,
  }));

  // Compute summary
  const totalPlanned = items.reduce((sum, i) => sum + i.plannedDurationMinutes, 0);
  const totalActual = items.reduce((sum, i) => sum + i.actualDurationMinutes, 0);
  const overrunMinutes = totalActual - totalPlanned;
  const efficiency = totalPlanned > 0
    ? Math.min(100, Math.max(0, Math.round((1 - Math.abs(totalActual - totalPlanned) / totalPlanned) * 100)))
    : 50;

  const absOverrunPercent = totalPlanned > 0 ? Math.abs(Math.round(((totalActual - totalPlanned) / totalPlanned) * 100)) : 0;
  let grade = "F";
  if (absOverrunPercent < 5) grade = "A";
  else if (absOverrunPercent < 15) grade = "B";
  else if (absOverrunPercent < 30) grade = "C";
  else if (absOverrunPercent < 50) grade = "D";

  return {
    items,
    summary: {
      totalPlanned,
      totalActual,
      overrunMinutes,
      efficiency,
      grade,
    },
  };
}

// ============================================================================
// Phase 20: Get Time Allocation Comparison
// ============================================================================

/**
 * Compare time allocation efficiency across meetings.
 */
export async function getTimeAllocationComparison(options?: { department?: string; dateFrom?: string; dateTo?: string; limit?: number }) {
  const db = await requireDb();

  const department = options?.department ? options.department.replace(/'/g, "''") : "";
  const dateFrom = options?.dateFrom || "";
  const dateTo = options?.dateTo || "";
  const limit = options?.limit || 50;

  const res = await db.execute(sql.raw(`
    SELECT msa.meeting_id, mr.title,
      AVG(msa.meeting_time_efficiency_score) as efficiency,
      AVG(msa.overrun_percent) as avg_overrun_percent,
      COUNT(DISTINCT msa.id) as item_count
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE 1=1
      ${department ? `AND mr.department = '${department}'` : ""}
      ${dateFrom ? `AND mr.meeting_date >= '${dateFrom}'` : ""}
      ${dateTo ? `AND mr.meeting_date <= '${dateTo}'` : ""}
    GROUP BY msa.meeting_id, mr.title
    ORDER BY efficiency DESC
    LIMIT ${limit}
  `));
  const rows = res.rows as any[];

  const meetings = rows.map((r: any) => ({
    meetingId: r.meeting_id,
    title: r.title,
    efficiency: Math.round(Number(r.efficiency) || 0),
    avgOverrunPercent: Math.round(Number(r.avg_overrun_percent) || 0),
    itemCount: Number(r.item_count) || 0,
  }));

  const avgEfficiency = meetings.length > 0
    ? Math.round(meetings.reduce((s, m) => s + m.efficiency, 0) / meetings.length)
    : 0;
  const bestMeeting = meetings.length > 0 ? meetings[0] : null;
  const worstMeeting = meetings.length > 0 ? meetings[meetings.length - 1] : null;

  return {
    meetings,
    avgEfficiency,
    bestMeeting,
    worstMeeting,
  };
}

// ============================================================================
// Phase 20: Detect Agenda Overrun Patterns
// ============================================================================

/**
 * Detect recurring agenda item overrun patterns using LLM fuzzy-grouping.
 */
export async function detectAgendaOverrunPatterns(options?: { department?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const department = options?.department ? options.department.replace(/'/g, "''") : "";
  const dateFrom = options?.dateFrom || "";
  const dateTo = options?.dateTo || "";

  const res = await db.execute(sql.raw(`
    SELECT agenda_item_title, agenda_item_category,
      planned_duration_minutes, actual_duration_minutes, overrun_minutes, overrun_percent
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE was_skipped = 0
      ${department ? `AND mr.department = '${department}'` : ""}
      ${dateFrom ? `AND mr.meeting_date >= '${dateFrom}'` : ""}
      ${dateTo ? `AND mr.meeting_date <= '${dateTo}'` : ""}
    ORDER BY overrun_percent DESC
  `));
  const rows = res.rows as any[];

  if (rows.length === 0) {
    return { patterns: [], topOverrunners: [], recommendations: [] };
  }

  const rowsSummary = rows.map((r: any) => ({
    title: r.agenda_item_title,
    category: r.agenda_item_category,
    planned: Number(r.planned_duration_minutes) || 0,
    actual: Number(r.actual_duration_minutes) || 0,
    overrunPercent: Number(r.overrun_percent) || 0,
  }));

  const llmResult = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a meeting time management analyst. Group similar agenda items by topic (fuzzy matching on titles), compute aggregate statistics, identify patterns, and provide recommendations. Return JSON only.",
      },
      {
        role: "user",
        content: `Agenda item overrun data (${rows.length} items):\n${JSON.stringify(rowsSummary, null, 2)}\n\nGroup similar agenda items by topic. For each group compute: occurrences, avgPlannedMinutes, avgActualMinutes, avgOverrunPercent, trend (improving/stable/worsening). Identify top overrunners and provide recommendations.`,
      },
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "overrun_patterns",
        schema: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  occurrences: { type: "number" },
                  avgPlannedMinutes: { type: "number" },
                  avgActualMinutes: { type: "number" },
                  avgOverrunPercent: { type: "number" },
                  trend: { type: "string" },
                },
                required: ["topic", "occurrences", "avgPlannedMinutes", "avgActualMinutes", "avgOverrunPercent", "trend"],
                additionalProperties: false,
              },
            },
            topOverrunners: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
          },
          required: ["patterns", "topOverrunners", "recommendations"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");

  return {
    patterns: parsed.patterns || [],
    topOverrunners: parsed.topOverrunners || [],
    recommendations: parsed.recommendations || [],
  };
}

// ============================================================================
// Phase 20: Detect Category Time Distribution
// ============================================================================

/**
 * Get time distribution breakdown by agenda item category.
 */
export async function detectCategoryTimeDistribution(options?: { department?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const department = options?.department ? options.department.replace(/'/g, "''") : "";
  const dateFrom = options?.dateFrom || "";
  const dateTo = options?.dateTo || "";

  const res = await db.execute(sql.raw(`
    SELECT agenda_item_category as category,
      COUNT(*) as count,
      AVG(actual_duration_minutes) as avg_duration,
      AVG(CASE WHEN overrun_minutes > 0 THEN 1 ELSE 0 END) * 100 as overrun_rate,
      AVG(productivity_score) as productivity_score
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE was_skipped = 0
      ${department ? `AND mr.department = '${department}'` : ""}
      ${dateFrom ? `AND mr.meeting_date >= '${dateFrom}'` : ""}
      ${dateTo ? `AND mr.meeting_date <= '${dateTo}'` : ""}
    GROUP BY agenda_item_category
    ORDER BY count DESC
  `));
  const rows = res.rows as any[];

  const categories = rows.map((r: any) => ({
    category: r.category,
    count: Number(r.count) || 0,
    avgDuration: Math.round(Number(r.avg_duration) || 0),
    overrunRate: Math.round(Number(r.overrun_rate) || 0),
    productivityScore: Math.round(Number(r.productivity_score) || 0),
  }));

  return { categories };
}

// ============================================================================
// Phase 20: Generate Agenda Optimization Recommendations
// ============================================================================

/**
 * Use LLM to generate agenda optimization recommendations for a specific meeting.
 */
export async function generateAgendaOptimization(meetingId: string) {
  const db = await requireDb();
  const safeId = meetingId.replace(/'/g, "''");

  // Get analysis rows
  const res = await db.execute(sql.raw(
    `SELECT * FROM ime_meeting_structure_analysis WHERE meeting_id = '${safeId}' ORDER BY agenda_item_index ASC`
  ));
  const rows = res.rows as any[];

  if (rows.length === 0) {
    return { recommendations: [], optimalOrder: [], asyncCandidates: [], aiNarrative: "No agenda analysis data found for this meeting." };
  }

  const itemsSummary = rows.map((r: any) => ({
    index: r.agenda_item_index,
    title: r.agenda_item_title,
    category: r.agenda_item_category,
    planned: Number(r.planned_duration_minutes) || 0,
    actual: Number(r.actual_duration_minutes) || 0,
    overrunPercent: Number(r.overrun_percent) || 0,
    engagement: Number(r.engagement_score) || 0,
    productivity: Number(r.productivity_score) || 0,
    decisions: Number(r.decisions_count) || 0,
    actionItems: Number(r.action_items_count) || 0,
    wasSkipped: !!r.was_skipped,
  }));

  const llmResult = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a meeting agenda optimization expert. Analyze agenda item performance data and recommend optimal ordering, time allocation adjustments, items to split or merge, and candidates for async handling. Return JSON only.",
      },
      {
        role: "user",
        content: `Meeting agenda items analysis:\n${JSON.stringify(itemsSummary, null, 2)}\n\nProvide:\n1. Recommendations for each item (suggested duration, rationale, priority high/medium/low)\n2. Optimal ordering of items\n3. Items that could be handled asynchronously\n4. A narrative summary of optimization advice`,
      },
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "agenda_optimization",
        schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  itemTitle: { type: "string" },
                  suggestedDuration: { type: "number" },
                  currentDuration: { type: "number" },
                  rationale: { type: "string" },
                  priority: { type: "string" },
                },
                required: ["itemTitle", "suggestedDuration", "currentDuration", "rationale", "priority"],
                additionalProperties: false,
              },
            },
            optimalOrder: { type: "array", items: { type: "string" } },
            asyncCandidates: { type: "array", items: { type: "string" } },
            aiNarrative: { type: "string" },
          },
          required: ["recommendations", "optimalOrder", "asyncCandidates", "aiNarrative"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");

  return {
    recommendations: parsed.recommendations || [],
    optimalOrder: parsed.optimalOrder || [],
    asyncCandidates: parsed.asyncCandidates || [],
    aiNarrative: parsed.aiNarrative || "",
  };
}

// ============================================================================
// Phase 20: Compute Agenda Intelligence Snapshot
// ============================================================================

/**
 * Aggregate agenda structure analysis into a snapshot for a given scope/period.
 */
export async function computeAgendaIntelligenceSnapshot(
  scope: string,
  scopeId?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const db = await requireDb();

  let where = "1=1";
  if (scope === "department" && scopeId) {
    where += ` AND mr.department = '${scopeId.replace(/'/g, "''")}'`;
  } else if ((scope === "team" || scope === "individual") && scopeId) {
    where += ` AND mr.organizer = '${scopeId.replace(/'/g, "''")}'`;
  }
  if (dateFrom) where += ` AND mr.meeting_date >= '${dateFrom}'`;
  if (dateTo) where += ` AND mr.meeting_date <= '${dateTo}'`;

  // Aggregate
  const aggRes = await db.execute(sql.raw(`
    SELECT COUNT(DISTINCT msa.meeting_id) as total_meetings,
      COUNT(*) as total_items,
      AVG(msa.planned_duration_minutes) as avg_planned,
      AVG(msa.actual_duration_minutes) as avg_actual,
      AVG(msa.overrun_minutes) as avg_overrun,
      AVG(msa.overrun_percent) as avg_overrun_pct,
      AVG(CASE WHEN msa.overrun_minutes > 0 THEN 1 ELSE 0 END) * 100 as overrun_rate,
      AVG(CASE WHEN msa.overrun_minutes < 0 THEN 1 ELSE 0 END) * 100 as underrun_rate,
      AVG(CASE WHEN msa.was_skipped = 1 THEN 1 ELSE 0 END) * 100 as skipped_rate,
      AVG(msa.engagement_score) as avg_engagement,
      AVG(msa.productivity_score) as avg_productivity,
      AVG(msa.meeting_time_efficiency_score) as avg_efficiency
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE ${where}
  `));
  const stats = (aggRes.rows as any[])[0] || {};

  const totalMeetings = Number(stats.total_meetings) || 0;
  const totalItems = Number(stats.total_items) || 0;
  const avgPlanned = Math.round(Number(stats.avg_planned) || 0);
  const avgActual = Math.round(Number(stats.avg_actual) || 0);
  const avgOverrun = Math.round(Number(stats.avg_overrun) || 0);
  const avgOverrunPct = Math.round(Number(stats.avg_overrun_pct) || 0);
  const overrunRate = Math.round(Number(stats.overrun_rate) || 0);
  const underrunRate = Math.round(Number(stats.underrun_rate) || 0);
  const skippedRate = Math.round(Number(stats.skipped_rate) || 0);
  const avgEngagement = Math.round(Number(stats.avg_engagement) || 0);
  const avgProductivity = Math.round(Number(stats.avg_productivity) || 0);
  const avgEfficiency = Math.round(Number(stats.avg_efficiency) || 0);

  // Overall grade
  const absOverrunPct = Math.abs(avgOverrunPct);
  let overallGrade = "F";
  if (absOverrunPct < 5) overallGrade = "A";
  else if (absOverrunPct < 15) overallGrade = "B";
  else if (absOverrunPct < 30) overallGrade = "C";
  else if (absOverrunPct < 50) overallGrade = "D";

  // Previous snapshot for trend comparison
  const safeScopeId = (scopeId || "").replace(/'/g, "''");
  const prevRes = await db.execute(sql.raw(`
    SELECT avg_efficiency, avg_overrun_pct, overall_grade
    FROM ime_agenda_intelligence_snapshots
    WHERE scope = '${scope.replace(/'/g, "''")}'
      AND (scope_id = '${safeScopeId}' OR (scope_id IS NULL AND '${safeScopeId}' = ''))
    ORDER BY computed_at DESC
    LIMIT 1
  `));
  const prevSnapshot = (prevRes.rows as any[])[0];
  let trendVsPrevious = "stable";
  let trendSlope = 0;
  if (prevSnapshot) {
    const prevEfficiency = Number(prevSnapshot.avg_efficiency) || 0;
    trendSlope = avgEfficiency - prevEfficiency;
    if (trendSlope > 5) trendVsPrevious = "improving";
    else if (trendSlope < -5) trendVsPrevious = "declining";
  }

  // LLM narrative + recommendations
  let aiNarrative = "";
  let recommendations = "[]";
  try {
    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an agenda intelligence analyst. Generate a concise narrative summarizing agenda time management performance and provide actionable recommendations for improvement.",
        },
        {
          role: "user",
          content: `Scope: ${scope}${scopeId ? ` (${scopeId})` : ""}\nTotal meetings: ${totalMeetings}\nTotal agenda items: ${totalItems}\nAvg planned: ${avgPlanned} min, Avg actual: ${avgActual} min\nAvg overrun: ${avgOverrun} min (${avgOverrunPct}%)\nOverrun rate: ${overrunRate}%, Underrun rate: ${underrunRate}%, Skipped rate: ${skippedRate}%\nAvg engagement: ${avgEngagement}, Avg productivity: ${avgProductivity}\nAvg efficiency: ${avgEfficiency}\nOverall grade: ${overallGrade}\nTrend: ${trendVsPrevious}`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "agenda_snapshot_narrative",
          schema: {
            type: "object",
            properties: {
              narrative: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } },
            },
            required: ["narrative", "recommendations"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });
    const parsed = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
    aiNarrative = parsed.narrative || "";
    recommendations = JSON.stringify(parsed.recommendations || []);
  } catch (e) {
    aiNarrative = "Narrative generation unavailable.";
    recommendations = "[]";
  }

  const periodStart = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const periodEnd = dateTo || new Date().toISOString().split("T")[0];

  // Delete existing snapshot for same scope/period
  await db.execute(sql.raw(`
    DELETE FROM ime_agenda_intelligence_snapshots
    WHERE scope = '${scope.replace(/'/g, "''")}'
      AND (scope_id = '${safeScopeId}' OR (scope_id IS NULL AND '${safeScopeId}' = ''))
      AND period_start = '${periodStart}'
      AND period_end = '${periodEnd}'
  `));

  // Insert new snapshot
  await db.execute(sql.raw(`
    INSERT INTO ime_agenda_intelligence_snapshots (
      scope, scope_id, period_start, period_end,
      total_meetings, total_items,
      avg_planned, avg_actual, avg_overrun, avg_overrun_pct,
      overrun_rate, underrun_rate, skipped_rate,
      avg_engagement, avg_productivity, avg_efficiency,
      overall_grade, ai_narrative, trend_vs_previous, trend_slope, recommendations,
      computed_at, created_at
    ) VALUES (
      '${scope.replace(/'/g, "''")}', ${safeScopeId ? `'${safeScopeId}'` : "NULL"}, '${periodStart}', '${periodEnd}',
      ${totalMeetings}, ${totalItems},
      ${avgPlanned}, ${avgActual}, ${avgOverrun}, ${avgOverrunPct},
      ${overrunRate}, ${underrunRate}, ${skippedRate},
      ${avgEngagement}, ${avgProductivity}, ${avgEfficiency},
      '${overallGrade}', '${aiNarrative.replace(/'/g, "''")}', '${trendVsPrevious}', ${trendSlope}, '${recommendations.replace(/'/g, "''")}',
      NOW(), NOW()
    )
  `));

  return {
    success: true,
    scope,
    scopeId: scopeId || null,
    snapshot: {
      periodStart,
      periodEnd,
      totalMeetings,
      totalItems,
      avgPlanned,
      avgActual,
      avgOverrun,
      avgOverrunPct,
      overrunRate,
      underrunRate,
      skippedRate,
      avgEngagement,
      avgProductivity,
      avgEfficiency,
      overallGrade,
      aiNarrative,
      trendVsPrevious,
      trendSlope,
      recommendations: JSON.parse(recommendations),
    },
  };
}

// ============================================================================
// Phase 20: Agenda Dashboard (Simple Aggregate)
// ============================================================================

/**
 * Get a simple aggregate dashboard for agenda time management.
 */
export async function getAgendaDashboard(filters?: { department?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const department = filters?.department ? filters.department.replace(/'/g, "''") : "";
  const dateFrom = filters?.dateFrom || "";
  const dateTo = filters?.dateTo || "";

  const res = await db.execute(sql.raw(`
    SELECT COUNT(DISTINCT msa.meeting_id) as total_meetings,
      AVG(msa.meeting_time_efficiency_score) as avg_efficiency,
      AVG(msa.overrun_percent) as avg_overrun,
      COUNT(*) / NULLIF(COUNT(DISTINCT msa.meeting_id), 0) as avg_items,
      AVG(CASE WHEN msa.was_skipped = 1 THEN 1 ELSE 0 END) * 100 as skipped_rate
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE 1=1
      ${department ? `AND mr.department = '${department}'` : ""}
      ${dateFrom ? `AND mr.meeting_date >= '${dateFrom}'` : ""}
      ${dateTo ? `AND mr.meeting_date <= '${dateTo}'` : ""}
  `));
  const stats = (res.rows as any[])[0] || {};

  // Top overrun category
  const catRes = await db.execute(sql.raw(`
    SELECT agenda_item_category, AVG(overrun_percent) as avg_overrun
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE msa.was_skipped = 0 AND msa.overrun_percent > 0
      ${department ? `AND mr.department = '${department}'` : ""}
      ${dateFrom ? `AND mr.meeting_date >= '${dateFrom}'` : ""}
      ${dateTo ? `AND mr.meeting_date <= '${dateTo}'` : ""}
    GROUP BY agenda_item_category
    ORDER BY avg_overrun DESC
    LIMIT 1
  `));
  const topCat = (catRes.rows as any[])[0];

  return {
    totalMeetingsAnalyzed: Number(stats.total_meetings) || 0,
    avgEfficiencyScore: Math.round(Number(stats.avg_efficiency) || 0),
    avgOverrunPercent: Math.round(Number(stats.avg_overrun) || 0),
    topOverrunCategory: topCat ? topCat.agenda_item_category : null,
    avgAgendaItems: Math.round(Number(stats.avg_items) || 0),
    skippedRate: Math.round(Number(stats.skipped_rate) || 0),
  };
}

// ============================================================================
// Phase 20: Agenda Analysis List (Paginated)
// ============================================================================

/**
 * Get a paginated list of meeting agenda analyses (grouped by meeting).
 */
export async function getAgendaAnalysisList(options?: {
  limit?: number;
  offset?: number;
  grade?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const db = await requireDb();

  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  const grade = options?.grade ? options.grade.replace(/'/g, "''") : "";
  const department = options?.department ? options.department.replace(/'/g, "''") : "";
  const dateFrom = options?.dateFrom || "";
  const dateTo = options?.dateTo || "";

  let where = "1=1";
  if (grade) where += ` AND MIN(msa.time_efficiency_grade) = '${grade}'`;
  if (department) where += ` AND mr.department = '${department}'`;
  if (dateFrom) where += ` AND mr.meeting_date >= '${dateFrom}'`;
  if (dateTo) where += ` AND mr.meeting_date <= '${dateTo}'`;

  // Build pre-group filters (WHERE) and post-group filters (HAVING)
  let preWhere = "1=1";
  let having = "";
  if (department) preWhere += ` AND mr.department = '${department}'`;
  if (dateFrom) preWhere += ` AND mr.meeting_date >= '${dateFrom}'`;
  if (dateTo) preWhere += ` AND mr.meeting_date <= '${dateTo}'`;
  if (grade) having = `HAVING MIN(msa.time_efficiency_grade) = '${grade}'`;

  const res = await db.execute(sql.raw(`
    SELECT msa.meeting_id, mr.title as meeting_title, mr.meeting_date,
      COUNT(*) as agenda_items_count,
      SUM(msa.planned_duration_minutes) as total_planned,
      SUM(msa.actual_duration_minutes) as total_actual,
      AVG(msa.overrun_percent) as avg_overrun_percent,
      AVG(msa.meeting_time_efficiency_score) as efficiency_score,
      MIN(msa.time_efficiency_grade) as grade
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE ${preWhere}
    GROUP BY msa.meeting_id, mr.title, mr.meeting_date
    ${having}
    ORDER BY msa.meeting_id DESC
    LIMIT ${limit} OFFSET ${offset}
  `));
  const rows = res.rows as any[];

  // Total count
  const countRes = await db.execute(sql.raw(`
    SELECT COUNT(*) as total FROM (
      SELECT msa.meeting_id
      FROM ime_meeting_structure_analysis msa
      JOIN meeting_records mr ON mr.id = msa.meeting_id
      WHERE ${preWhere}
      GROUP BY msa.meeting_id
      ${having}
    ) sub
  `));
  const total = Number((countRes.rows as any[])[0]?.total) || 0;

  const mappedRows = rows.map((r: any) => ({
    meetingId: r.meeting_id,
    meetingTitle: r.meeting_title,
    meetingDate: r.meeting_date,
    agendaItemsCount: Number(r.agenda_items_count) || 0,
    totalPlanned: Number(r.total_planned) || 0,
    totalActual: Number(r.total_actual) || 0,
    avgOverrunPercent: Math.round(Number(r.avg_overrun_percent) || 0),
    efficiencyScore: Math.round(Number(r.efficiency_score) || 0),
    grade: r.grade,
  }));

  return { rows: mappedRows, total, limit, offset };
}

// ============================================================================
// Phase 20: Agenda Trend Data
// ============================================================================

/**
 * Get trend data from agenda intelligence snapshots.
 */
export async function getAgendaTrendData(options?: { scope?: string; scopeId?: string; limit?: number }) {
  const db = await requireDb();

  const scope = options?.scope ? options.scope.replace(/'/g, "''") : "";
  const scopeId = options?.scopeId ? options.scopeId.replace(/'/g, "''") : "";
  const limit = options?.limit || 20;

  const res = await db.execute(sql.raw(`
    SELECT * FROM ime_agenda_intelligence_snapshots
    WHERE 1=1
      ${scope ? `AND scope = '${scope}'` : ""}
      ${scopeId ? `AND scope_id = '${scopeId}'` : ""}
    ORDER BY period_end DESC
    LIMIT ${limit}
  `));
  const rows = res.rows as any[];

  const mapped = rows.map((r: any) => ({
    id: r.id,
    scope: r.scope,
    scopeId: r.scope_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    totalMeetings: Number(r.total_meetings) || 0,
    totalItems: Number(r.total_items) || 0,
    avgPlanned: Number(r.avg_planned) || 0,
    avgActual: Number(r.avg_actual) || 0,
    avgOverrun: Number(r.avg_overrun) || 0,
    avgOverrunPct: Number(r.avg_overrun_pct) || 0,
    overrunRate: Number(r.overrun_rate) || 0,
    underrunRate: Number(r.underrun_rate) || 0,
    skippedRate: Number(r.skipped_rate) || 0,
    avgEngagement: Number(r.avg_engagement) || 0,
    avgProductivity: Number(r.avg_productivity) || 0,
    avgEfficiency: Number(r.avg_efficiency) || 0,
    overallGrade: r.overall_grade,
    aiNarrative: r.ai_narrative,
    trendVsPrevious: r.trend_vs_previous,
    trendSlope: Number(r.trend_slope) || 0,
    recommendations: r.recommendations,
    computedAt: r.computed_at,
  }));

  return mapped;
}

// ============================================================================
// Phase 20: Update Agenda Item Analysis
// ============================================================================

/**
 * Manually update fields on an agenda item analysis row. Recomputes overrun/grade if durations change.
 */
export async function updateAgendaItemAnalysis(
  id: number,
  updates: { plannedDurationMinutes?: number; actualDurationMinutes?: number; agendaItemCategory?: string; agendaItemTitle?: string },
) {
  const db = await requireDb();

  const setClauses: string[] = [];

  if (updates.agendaItemTitle !== undefined) {
    setClauses.push(`agenda_item_title = '${String(updates.agendaItemTitle).replace(/'/g, "''")}'`);
  }
  if (updates.agendaItemCategory !== undefined) {
    setClauses.push(`agenda_item_category = '${String(updates.agendaItemCategory).replace(/'/g, "''")}'`);
  }

  if (updates.plannedDurationMinutes !== undefined) {
    setClauses.push(`planned_duration_minutes = ${Number(updates.plannedDurationMinutes) || 0}`);
  }
  if (updates.actualDurationMinutes !== undefined) {
    setClauses.push(`actual_duration_minutes = ${Number(updates.actualDurationMinutes) || 0}`);
  }

  // Recompute overrun/grade if both durations are being set, or either is set
  if (updates.plannedDurationMinutes !== undefined || updates.actualDurationMinutes !== undefined) {
    // Need current values for the field not being updated
    const currentRes = await db.execute(sql.raw(
      `SELECT planned_duration_minutes, actual_duration_minutes FROM ime_meeting_structure_analysis WHERE id = ${id} LIMIT 1`
    ));
    const current = (currentRes.rows as any[])[0];
    if (!current) throw new Error(`Agenda item analysis ${id} not found`);

    const planned = updates.plannedDurationMinutes !== undefined ? Number(updates.plannedDurationMinutes) : Number(current.planned_duration_minutes) || 0;
    const actual = updates.actualDurationMinutes !== undefined ? Number(updates.actualDurationMinutes) : Number(current.actual_duration_minutes) || 0;
    const overrun = actual - planned;
    const overrunPercent = planned > 0 ? Math.round(((actual - planned) / planned) * 100) : 0;
    const absOverrunPercent = Math.abs(overrunPercent);

    let grade = "F";
    if (absOverrunPercent < 5) grade = "A";
    else if (absOverrunPercent < 15) grade = "B";
    else if (absOverrunPercent < 30) grade = "C";
    else if (absOverrunPercent < 50) grade = "D";

    setClauses.push(`overrun_minutes = ${overrun}`);
    setClauses.push(`overrun_percent = ${overrunPercent}`);
    setClauses.push(`time_efficiency_grade = '${grade}'`);
  }

  if (setClauses.length === 0) {
    return { success: true, id, message: "No updates provided" };
  }

  await db.execute(sql.raw(`
    UPDATE ime_meeting_structure_analysis
    SET ${setClauses.join(", ")}
    WHERE id = ${id}
  `));

  return { success: true, id };
}

// ============================================================================
// Phase 21: Facilitator Effectiveness Intelligence
// ============================================================================

/**
 * Analyze who facilitated a meeting and score their effectiveness.
 */
export async function analyzeMeetingFacilitator(meetingId: string) {
  const db = await requireDb();

  // 1. Get meeting info
  const meetingResult = await db.execute(sql.raw(
    `SELECT id, title, objective, summary FROM meeting_records WHERE id = '${meetingId.replace(/'/g, "''")}'`
  ));
  const meeting = (meetingResult.rows as any[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // 2. Get content blocks
  const blocksResult = await db.execute(sql.raw(
    `SELECT speaker, block_type, content, timestamp_start, timestamp_end FROM meeting_content_blocks WHERE meeting_id = '${meetingId.replace(/'/g, "''")}' ORDER BY timestamp_start ASC`
  ));
  const blocks = blocksResult.rows as any[];
  if (blocks.length === 0) throw new Error(`No content blocks for meeting ${meetingId}`);

  // 3. Compute speaker distribution
  const speakerMap: Record<string, number> = {};
  for (const b of blocks) {
    const speaker = b.speaker || "Unknown";
    speakerMap[speaker] = (speakerMap[speaker] || 0) + 1;
  }
  const totalBlocks = blocks.length;
  const totalSpeakers = Object.keys(speakerMap).length;
  const speakerDistribution = Object.entries(speakerMap).map(([name, count]) => ({
    name,
    count,
    percent: Math.round((count / totalBlocks) * 100),
  }));

  // Compute speaker balance index (100 = perfectly balanced, 0 = one person speaks all)
  const idealPercent = 100 / totalSpeakers;
  const deviations = speakerDistribution.map(s => Math.abs(s.percent - idealPercent));
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const speakerBalanceIndex = Math.max(0, Math.round(100 - avgDeviation * 2));

  const dominantSpeaker = speakerDistribution.sort((a, b) => b.percent - a.percent)[0];
  const dominantSpeakerPercent = dominantSpeaker?.percent || 0;

  // 4. LLM: identify facilitator, classify style, score 6 dimensions
  const contentSummary = blocks.slice(0, 80).map(b => `[${b.speaker}] (${b.block_type}): ${(b.content || "").substring(0, 200)}`).join("\n");

  const llmResult = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a meeting facilitation expert. Analyze the meeting content to identify who facilitated/led the meeting and evaluate their effectiveness. The facilitator is typically the person who opens/closes the meeting, moderates discussions, calls on speakers, summarizes points, and manages transitions.

Facilitation styles:
- directive: Controls flow tightly, makes decisions, tells people what to do
- collaborative: Encourages group input, builds consensus
- laissez_faire: Minimal intervention, lets discussion flow freely
- structured: Follows strict agenda, time-boxes topics
- coaching: Asks questions to draw out ideas, develops participants
- democratic: Puts decisions to vote, ensures equal voice

Score each dimension 0-100:
- engagementImpact: How well the facilitator kept participants engaged
- decisionFacilitation: How effectively the facilitator guided decision-making
- timeManagement: How well the facilitator managed time and transitions
- inclusivity: How well the facilitator ensured all voices were heard
- clarity: How clearly the facilitator communicated and summarized
- conflictResolution: How well the facilitator handled disagreements or tensions`
      },
      {
        role: "user",
        content: `Meeting: ${meeting.title || "Untitled"}
Objective: ${meeting.objective || "N/A"}
Summary: ${meeting.summary || "N/A"}
Total speakers: ${totalSpeakers}
Speaker distribution: ${JSON.stringify(speakerDistribution)}

Content blocks:
${contentSummary}

Identify the facilitator, classify their style, and score their effectiveness across 6 dimensions. Also provide strengths, weaknesses, and coaching points.`
      }
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "facilitator_analysis",
        schema: {
          type: "object",
          properties: {
            facilitatorName: { type: "string" },
            facilitatorId: { type: "string" },
            department: { type: "string" },
            facilitationStyle: { type: "string", enum: ["directive", "collaborative", "laissez_faire", "structured", "coaching", "democratic", "unknown"] },
            styleConfidence: { type: "number" },
            engagementImpactScore: { type: "number" },
            decisionFacilitationScore: { type: "number" },
            timeManagementScore: { type: "number" },
            inclusivityScore: { type: "number" },
            clarityScore: { type: "number" },
            conflictResolutionScore: { type: "number" },
            meetingEffectivenessScore: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            coachingPoints: { type: "array", items: { type: "string" } },
            narrative: { type: "string" },
          },
          required: ["facilitatorName", "facilitationStyle", "engagementImpactScore", "decisionFacilitationScore", "timeManagementScore", "inclusivityScore", "clarityScore", "conflictResolutionScore", "strengths", "weaknesses", "coachingPoints", "narrative"]
        }
      }
    }
  });

  const llm = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
  const facilitatorName = llm.facilitatorName || "Unknown";
  const facilitatorId = llm.facilitatorId || facilitatorName;
  const department = llm.department || "";
  const facilitationStyle = llm.facilitationStyle || "unknown";
  const styleConfidence = Math.min(100, Math.max(0, Number(llm.styleConfidence) || 50));

  const engagementImpactScore = Math.min(100, Math.max(0, Number(llm.engagementImpactScore) || 0));
  const decisionFacilitationScore = Math.min(100, Math.max(0, Number(llm.decisionFacilitationScore) || 0));
  const timeManagementScore = Math.min(100, Math.max(0, Number(llm.timeManagementScore) || 0));
  const inclusivityScore = Math.min(100, Math.max(0, Number(llm.inclusivityScore) || 0));
  const clarityScore = Math.min(100, Math.max(0, Number(llm.clarityScore) || 0));
  const conflictResolutionScore = Math.min(100, Math.max(0, Number(llm.conflictResolutionScore) || 0));
  const meetingEffectivenessScore = Math.min(100, Math.max(0, Number(llm.meetingEffectivenessScore) || 0));

  const overallEffectivenessScore = Math.round(
    (engagementImpactScore + decisionFacilitationScore + timeManagementScore + inclusivityScore + clarityScore + conflictResolutionScore) / 6
  );

  let effectivenessGrade = "F";
  if (overallEffectivenessScore >= 85) effectivenessGrade = "A";
  else if (overallEffectivenessScore >= 70) effectivenessGrade = "B";
  else if (overallEffectivenessScore >= 55) effectivenessGrade = "C";
  else if (overallEffectivenessScore >= 40) effectivenessGrade = "D";

  // Get decisions + action items count
  const decisionsRes = await db.execute(sql.raw(
    `SELECT COUNT(*) as cnt FROM meeting_content_blocks WHERE meeting_id = '${meetingId.replace(/'/g, "''")}' AND block_type = 'decision'`
  ));
  const decisionsCount = Number((decisionsRes.rows as any[])[0]?.cnt) || 0;

  const actionsRes = await db.execute(sql.raw(
    `SELECT COUNT(*) as cnt FROM meeting_content_blocks WHERE meeting_id = '${meetingId.replace(/'/g, "''")}' AND block_type = 'action_item'`
  ));
  const actionItemsCount = Number((actionsRes.rows as any[])[0]?.cnt) || 0;

  const facilitatorSpeakingPercent = speakerMap[facilitatorName] ? Math.round((speakerMap[facilitatorName] / totalBlocks) * 100) : 0;

  const strengths = JSON.stringify(llm.strengths || []);
  const weaknesses = JSON.stringify(llm.weaknesses || []);
  const coachingPoints = JSON.stringify(llm.coachingPoints || []);
  const narrative = llm.narrative || "";

  // Delete existing analysis for this meeting
  await db.execute(sql.raw(
    `DELETE FROM ime_facilitator_analysis WHERE meeting_id = '${meetingId.replace(/'/g, "''")}'`
  ));

  // Insert new analysis
  await db.execute(sql.raw(`
    INSERT INTO ime_facilitator_analysis (
      meeting_id, facilitator_name, facilitator_id, department,
      facilitation_style, style_confidence, overall_effectiveness_score,
      engagement_impact_score, decision_facilitation_score, time_management_score,
      inclusivity_score, clarity_score, conflict_resolution_score,
      meeting_effectiveness_score, speaker_balance_index,
      dominant_speaker_percent, total_speakers, facilitator_speaking_percent,
      decisions_count, action_items_count, effectiveness_grade,
      ai_strengths, ai_weaknesses, ai_coaching_points, ai_narrative,
      computed_at, created_at
    ) VALUES (
      '${meetingId.replace(/'/g, "''")}', '${facilitatorName.replace(/'/g, "''")}', '${facilitatorId.replace(/'/g, "''")}', '${department.replace(/'/g, "''")}',
      '${facilitationStyle}', ${styleConfidence}, ${overallEffectivenessScore},
      ${engagementImpactScore}, ${decisionFacilitationScore}, ${timeManagementScore},
      ${inclusivityScore}, ${clarityScore}, ${conflictResolutionScore},
      ${meetingEffectivenessScore}, ${speakerBalanceIndex},
      ${dominantSpeakerPercent}, ${totalSpeakers}, ${facilitatorSpeakingPercent},
      ${decisionsCount}, ${actionItemsCount}, '${effectivenessGrade}',
      '${strengths.replace(/'/g, "''")}', '${weaknesses.replace(/'/g, "''")}', '${coachingPoints.replace(/'/g, "''")}', '${narrative.replace(/'/g, "''")}',
      NOW(), NOW()
    )
  `));

  return {
    meetingId,
    facilitatorName,
    facilitationStyle,
    overallEffectivenessScore,
    grade: effectivenessGrade,
    totalSpeakers,
  };
}

/**
 * Batch analyze facilitators for multiple meetings.
 */
export async function batchAnalyzeFacilitators(meetingIds: string[]) {
  const results: any[] = [];
  for (const meetingId of meetingIds) {
    try {
      const result = await analyzeMeetingFacilitator(meetingId);
      results.push({ meetingId, success: true, ...result });
    } catch (err: any) {
      results.push({ meetingId, success: false, error: err.message });
    }
  }
  return { results };
}

// ============================================================================
// Phase 21: Facilitator Profile & Comparison
// ============================================================================

/**
 * Get aggregated facilitator profile with radar data and style distribution.
 */
export async function getFacilitatorProfile(facilitatorId: string) {
  const db = await requireDb();

  const res = await db.execute(sql.raw(
    `SELECT * FROM ime_facilitator_analysis WHERE facilitator_id = '${facilitatorId.replace(/'/g, "''")}' ORDER BY computed_at DESC`
  ));
  const rows = res.rows as any[];
  if (rows.length === 0) return { facilitatorId, facilitatorName: facilitatorId, meetingsFacilitated: 0, avgEffectiveness: 0, radarData: [], styleDistribution: [], trend: [] };

  const facilitatorName = rows[0].facilitator_name || facilitatorId;
  const meetingsFacilitated = rows.length;

  const avg = (field: string) => Math.round(rows.reduce((s, r) => s + (Number(r[field]) || 0), 0) / rows.length);

  const avgEffectiveness = avg("overall_effectiveness_score");
  const radarData = [
    { dimension: "参与引导", score: avg("engagement_impact_score") },
    { dimension: "决策推动", score: avg("decision_facilitation_score") },
    { dimension: "时间管理", score: avg("time_management_score") },
    { dimension: "包容性", score: avg("inclusivity_score") },
    { dimension: "清晰度", score: avg("clarity_score") },
    { dimension: "冲突化解", score: avg("conflict_resolution_score") },
  ];

  // Style distribution
  const styleCounts: Record<string, number> = {};
  for (const r of rows) {
    const s = r.facilitation_style || "unknown";
    styleCounts[s] = (styleCounts[s] || 0) + 1;
  }
  const styleDistribution = Object.entries(styleCounts).map(([style, count]) => ({ style, count, percent: Math.round((count / rows.length) * 100) }));

  // Trend (last 10 meetings chronologically)
  const trend = rows.slice(0, 10).reverse().map(r => ({
    meetingId: r.meeting_id,
    score: Number(r.overall_effectiveness_score) || 0,
    date: r.computed_at,
  }));

  return { facilitatorId, facilitatorName, meetingsFacilitated, avgEffectiveness, radarData, styleDistribution, trend };
}

/**
 * Compare facilitators by aggregated effectiveness.
 */
export async function getFacilitatorComparison(options?: { department?: string; limit?: number }) {
  const db = await requireDb();

  let where = "";
  if (options?.department) {
    where = ` WHERE department = '${options.department.replace(/'/g, "''")}'`;
  }

  const res = await db.execute(sql.raw(`
    SELECT facilitator_id, facilitator_name, department,
      COUNT(*) as meetings_count,
      ROUND(AVG(overall_effectiveness_score)) as avg_effectiveness,
      ROUND(AVG(engagement_impact_score)) as avg_engagement,
      ROUND(AVG(decision_facilitation_score)) as avg_decision,
      ROUND(AVG(time_management_score)) as avg_time,
      ROUND(AVG(inclusivity_score)) as avg_inclusivity,
      ROUND(AVG(clarity_score)) as avg_clarity,
      ROUND(AVG(conflict_resolution_score)) as avg_conflict
    FROM ime_facilitator_analysis${where}
    GROUP BY facilitator_id, facilitator_name, department
    ORDER BY avg_effectiveness DESC
    LIMIT ${options?.limit || 50}
  `));
  const facilitators = (res.rows as any[]).map(r => ({
    facilitatorId: r.facilitator_id,
    facilitatorName: r.facilitator_name,
    department: r.department,
    meetingsCount: Number(r.meetings_count) || 0,
    avgEffectiveness: Number(r.avg_effectiveness) || 0,
    avgEngagement: Number(r.avg_engagement) || 0,
    avgDecision: Number(r.avg_decision) || 0,
    avgTime: Number(r.avg_time) || 0,
    avgInclusivity: Number(r.avg_inclusivity) || 0,
    avgClarity: Number(r.avg_clarity) || 0,
    avgConflict: Number(r.avg_conflict) || 0,
  }));

  const overallAvg = facilitators.length > 0
    ? Math.round(facilitators.reduce((s, f) => s + f.avgEffectiveness, 0) / facilitators.length)
    : 0;

  return {
    facilitators,
    avgEffectiveness: overallAvg,
    bestFacilitator: facilitators[0] || null,
    worstFacilitator: facilitators[facilitators.length - 1] || null,
  };
}

// ============================================================================
// Phase 21: Facilitation Pattern Detection
// ============================================================================

/**
 * Detect recurring facilitation patterns and correlations.
 */
export async function detectFacilitationPatterns(options?: { department?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const conditions: string[] = [];
  if (options?.department) conditions.push(`department = '${options.department.replace(/'/g, "''")}'`);
  if (options?.dateFrom) conditions.push(`computed_at >= '${options.dateFrom}'`);
  if (options?.dateTo) conditions.push(`computed_at <= '${options.dateTo}'`);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  const res = await db.execute(sql.raw(
    `SELECT facilitation_style, overall_effectiveness_score, engagement_impact_score, decision_facilitation_score, time_management_score, inclusivity_score, clarity_score, conflict_resolution_score, meeting_effectiveness_score, speaker_balance_index, facilitator_speaking_percent, decisions_count, action_items_count, effectiveness_grade FROM ime_facilitator_analysis${where} ORDER BY computed_at DESC LIMIT 200`
  ));
  const rows = res.rows as any[];
  if (rows.length === 0) return { patterns: [], correlations: [], recommendations: [] };

  const dataSummary = JSON.stringify(rows.slice(0, 50).map(r => ({
    style: r.facilitation_style,
    effectiveness: r.overall_effectiveness_score,
    engagement: r.engagement_impact_score,
    decision: r.decision_facilitation_score,
    time: r.time_management_score,
    inclusivity: r.inclusivity_score,
    clarity: r.clarity_score,
    conflict: r.conflict_resolution_score,
    speakerBalance: r.speaker_balance_index,
    facilitatorSpeaking: r.facilitator_speaking_percent,
    grade: r.effectiveness_grade,
  })));

  const llmResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a meeting facilitation analytics expert. Analyze the facilitation data to detect recurring patterns, style-outcome correlations, and provide actionable recommendations. Respond in Chinese." },
      { role: "user", content: `Analyze ${rows.length} facilitator analysis records:\n${dataSummary}\n\nDetect patterns, correlations between facilitation style and outcomes, and provide recommendations.` }
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "facilitation_patterns",
        schema: {
          type: "object",
          properties: {
            patterns: { type: "array", items: { type: "object", properties: { pattern: { type: "string" }, frequency: { type: "string" }, impact: { type: "string" } }, required: ["pattern", "frequency", "impact"] } },
            correlations: { type: "array", items: { type: "object", properties: { factor1: { type: "string" }, factor2: { type: "string" }, relationship: { type: "string" }, strength: { type: "string" } }, required: ["factor1", "factor2", "relationship", "strength"] } },
            recommendations: { type: "array", items: { type: "string" } },
          },
          required: ["patterns", "correlations", "recommendations"]
        }
      }
    }
  });

  const llm = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
  return {
    patterns: llm.patterns || [],
    correlations: llm.correlations || [],
    recommendations: llm.recommendations || [],
  };
}

/**
 * Classify and aggregate facilitator styles with effectiveness.
 */
export async function classifyFacilitatorStyles(options?: { department?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const conditions: string[] = [];
  if (options?.department) conditions.push(`department = '${options.department.replace(/'/g, "''")}'`);
  if (options?.dateFrom) conditions.push(`computed_at >= '${options.dateFrom}'`);
  if (options?.dateTo) conditions.push(`computed_at <= '${options.dateTo}'`);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  const res = await db.execute(sql.raw(`
    SELECT facilitation_style,
      COUNT(*) as cnt,
      ROUND(AVG(overall_effectiveness_score)) as avg_effectiveness,
      ROUND(AVG(meeting_effectiveness_score)) as avg_meeting_outcome
    FROM ime_facilitator_analysis${where}
    GROUP BY facilitation_style
    ORDER BY avg_effectiveness DESC
  `));

  const styles = (res.rows as any[]).map(r => ({
    style: r.facilitation_style || "unknown",
    count: Number(r.cnt) || 0,
    avgEffectiveness: Number(r.avg_effectiveness) || 0,
    avgMeetingOutcome: Number(r.avg_meeting_outcome) || 0,
  }));

  return { styles };
}

// ============================================================================
// Phase 21: AI Facilitator Coaching
// ============================================================================

/**
 * Generate personalized coaching plan for a facilitator.
 */
export async function generateFacilitatorCoaching(facilitatorId: string) {
  const db = await requireDb();

  const res = await db.execute(sql.raw(
    `SELECT * FROM ime_facilitator_analysis WHERE facilitator_id = '${facilitatorId.replace(/'/g, "''")}' ORDER BY computed_at DESC LIMIT 20`
  ));
  const rows = res.rows as any[];
  if (rows.length === 0) throw new Error(`No facilitator analysis found for ${facilitatorId}`);

  const facilitatorName = rows[0].facilitator_name || facilitatorId;

  const avg = (field: string) => Math.round(rows.reduce((s, r) => s + (Number(r[field]) || 0), 0) / rows.length);
  const scores = {
    engagement: avg("engagement_impact_score"),
    decision: avg("decision_facilitation_score"),
    time: avg("time_management_score"),
    inclusivity: avg("inclusivity_score"),
    clarity: avg("clarity_score"),
    conflict: avg("conflict_resolution_score"),
    overall: avg("overall_effectiveness_score"),
  };

  const recentStrengths = rows.slice(0, 5).map(r => r.ai_strengths).filter(Boolean);
  const recentWeaknesses = rows.slice(0, 5).map(r => r.ai_weaknesses).filter(Boolean);

  const llmResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a professional meeting facilitation coach. Generate a personalized coaching plan based on the facilitator's historical performance data. Respond in Chinese." },
      { role: "user", content: `Facilitator: ${facilitatorName}
Meetings facilitated: ${rows.length}
Average scores: ${JSON.stringify(scores)}
Recent strengths: ${recentStrengths.join("; ")}
Recent weaknesses: ${recentWeaknesses.join("; ")}

Generate a personalized coaching plan with specific improvement areas, target scores, actions, timeline, quick wins, and a narrative summary.` }
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "facilitator_coaching",
        schema: {
          type: "object",
          properties: {
            personalizedPlan: { type: "array", items: { type: "object", properties: { area: { type: "string" }, currentScore: { type: "number" }, targetScore: { type: "number" }, actions: { type: "array", items: { type: "string" } }, timeline: { type: "string" } }, required: ["area", "currentScore", "targetScore", "actions", "timeline"] } },
            topStrength: { type: "string" },
            topWeakness: { type: "string" },
            quickWins: { type: "array", items: { type: "string" } },
            aiNarrative: { type: "string" },
          },
          required: ["personalizedPlan", "topStrength", "topWeakness", "quickWins", "aiNarrative"]
        }
      }
    }
  });

  const llm = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
  return {
    facilitatorId,
    facilitatorName,
    personalizedPlan: llm.personalizedPlan || [],
    topStrength: llm.topStrength || "",
    topWeakness: llm.topWeakness || "",
    quickWins: llm.quickWins || [],
    aiNarrative: llm.aiNarrative || "",
  };
}

// ============================================================================
// Phase 21: Facilitator Intelligence Snapshot
// ============================================================================

/**
 * Compute aggregated facilitator intelligence snapshot for a scope/period.
 */
export async function computeFacilitatorSnapshot(scope: string, scopeId?: string, dateFrom?: string, dateTo?: string) {
  const db = await requireDb();

  const safeScope = scope.replace(/'/g, "''");
  const safeScopeId = (scopeId || "").replace(/'/g, "''");
  const periodStart = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const periodEnd = dateTo || new Date().toISOString().split("T")[0];

  // Build WHERE
  const conditions: string[] = [`computed_at >= '${periodStart}'`, `computed_at <= '${periodEnd}'`];
  if (scope === "department" && safeScopeId) conditions.push(`department = '${safeScopeId}'`);
  if (scope === "individual" && safeScopeId) conditions.push(`facilitator_id = '${safeScopeId}'`);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  const res = await db.execute(sql.raw(
    `SELECT * FROM ime_facilitator_analysis${where} ORDER BY computed_at DESC`
  ));
  const rows = res.rows as any[];
  const totalMeetingsAnalyzed = rows.length;

  const facilitatorSet = new Set(rows.map(r => r.facilitator_id));
  const totalFacilitators = facilitatorSet.size;

  const avg = (field: string) => rows.length > 0 ? Math.round(rows.reduce((s, r) => s + (Number(r[field]) || 0), 0) / rows.length) : 0;

  const avgEffectivenessScore = avg("overall_effectiveness_score");
  const avgEngagementImpact = avg("engagement_impact_score");
  const avgDecisionFacilitation = avg("decision_facilitation_score");
  const avgTimeManagement = avg("time_management_score");
  const avgInclusivity = avg("inclusivity_score");
  const avgClarity = avg("clarity_score");
  const avgConflictResolution = avg("conflict_resolution_score");
  const avgSpeakerBalance = avg("speaker_balance_index");
  const avgFacilitatorSpeakingPercent = avg("facilitator_speaking_percent");

  // Style distribution
  const styleCounts: Record<string, number> = {};
  for (const r of rows) { const s = r.facilitation_style || "unknown"; styleCounts[s] = (styleCounts[s] || 0) + 1; }
  const styleDistribution = JSON.stringify(styleCounts);

  // Top/bottom facilitators
  const facMap: Record<string, { name: string; scores: number[] }> = {};
  for (const r of rows) {
    const fid = r.facilitator_id || r.facilitator_name;
    if (!facMap[fid]) facMap[fid] = { name: r.facilitator_name, scores: [] };
    facMap[fid].scores.push(Number(r.overall_effectiveness_score) || 0);
  }
  const facRanked = Object.entries(facMap).map(([id, d]) => ({
    facilitatorId: id,
    facilitatorName: d.name,
    avgScore: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
    meetings: d.scores.length,
  })).sort((a, b) => b.avgScore - a.avgScore);

  const topFacilitators = JSON.stringify(facRanked.slice(0, 5));
  const bottomFacilitators = JSON.stringify(facRanked.slice(-5).reverse());

  // Grade distribution
  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const r of rows) { const g = r.effectiveness_grade || "F"; gradeCounts[g] = (gradeCounts[g] || 0) + 1; }
  const gradeDistribution = JSON.stringify(gradeCounts);

  let overallGrade = "F";
  if (avgEffectivenessScore >= 85) overallGrade = "A";
  else if (avgEffectivenessScore >= 70) overallGrade = "B";
  else if (avgEffectivenessScore >= 55) overallGrade = "C";
  else if (avgEffectivenessScore >= 40) overallGrade = "D";

  // Compare with previous period
  const periodDuration = new Date(periodEnd).getTime() - new Date(periodStart).getTime();
  const prevStart = new Date(new Date(periodStart).getTime() - periodDuration).toISOString().split("T")[0];
  const prevEnd = periodStart;

  const prevConditions = [`computed_at >= '${prevStart}'`, `computed_at <= '${prevEnd}'`];
  if (scope === "department" && safeScopeId) prevConditions.push(`department = '${safeScopeId}'`);
  if (scope === "individual" && safeScopeId) prevConditions.push(`facilitator_id = '${safeScopeId}'`);
  const prevWhere = ` WHERE ${prevConditions.join(" AND ")}`;

  const prevRes = await db.execute(sql.raw(
    `SELECT ROUND(AVG(overall_effectiveness_score)) as prev_avg FROM ime_facilitator_analysis${prevWhere}`
  ));
  const prevAvg = Number((prevRes.rows as any[])[0]?.prev_avg) || 0;

  let trendVsPrevious = "stable";
  let trendSlope = 0;
  if (prevAvg > 0) {
    trendSlope = avgEffectivenessScore - prevAvg;
    if (trendSlope > 3) trendVsPrevious = "improving";
    else if (trendSlope < -3) trendVsPrevious = "declining";
  }

  // LLM narrative
  const llmResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a facilitator intelligence analyst. Generate a narrative summary, best practices, and recommendations based on aggregated facilitator data. Respond in Chinese." },
      { role: "user", content: `Scope: ${scope} (${scopeId || "all"})
Period: ${periodStart} to ${periodEnd}
Meetings: ${totalMeetingsAnalyzed}, Facilitators: ${totalFacilitators}
Avg effectiveness: ${avgEffectivenessScore}, Grade: ${overallGrade}
Style distribution: ${styleDistribution}
Top facilitators: ${topFacilitators}
Grade distribution: ${gradeDistribution}
Trend: ${trendVsPrevious} (slope: ${trendSlope})

Generate narrative, best practices, and recommendations.` }
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "facilitator_snapshot",
        schema: {
          type: "object",
          properties: {
            aiNarrative: { type: "string" },
            bestPractices: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
          },
          required: ["aiNarrative", "bestPractices", "recommendations"]
        }
      }
    }
  });

  const llm = JSON.parse(llmResult.choices[0]?.message?.content || "{}");
  const aiNarrative = llm.aiNarrative || "";
  const bestPractices = JSON.stringify(llm.bestPractices || []);
  const recommendations = JSON.stringify(llm.recommendations || []);

  // Delete existing snapshot
  await db.execute(sql.raw(`
    DELETE FROM ime_facilitator_intelligence_snapshots
    WHERE scope = '${safeScope}'
      AND (scope_id = '${safeScopeId}' OR (scope_id IS NULL AND '${safeScopeId}' = ''))
      AND period_start = '${periodStart}'
      AND period_end = '${periodEnd}'
  `));

  // Insert new snapshot
  await db.execute(sql.raw(`
    INSERT INTO ime_facilitator_intelligence_snapshots (
      scope, scope_id, period_start, period_end,
      total_meetings_analyzed, total_facilitators,
      avg_effectiveness_score, avg_engagement_impact, avg_decision_facilitation,
      avg_time_management, avg_inclusivity, avg_clarity, avg_conflict_resolution,
      avg_speaker_balance, avg_facilitator_speaking_percent,
      style_distribution, top_facilitators, bottom_facilitators,
      grade_distribution, overall_grade, ai_narrative,
      best_practices, trend_vs_previous, trend_slope, recommendations,
      computed_at, created_at
    ) VALUES (
      '${safeScope}', ${safeScopeId ? `'${safeScopeId}'` : "NULL"}, '${periodStart}', '${periodEnd}',
      ${totalMeetingsAnalyzed}, ${totalFacilitators},
      ${avgEffectivenessScore}, ${avgEngagementImpact}, ${avgDecisionFacilitation},
      ${avgTimeManagement}, ${avgInclusivity}, ${avgClarity}, ${avgConflictResolution},
      ${avgSpeakerBalance}, ${avgFacilitatorSpeakingPercent},
      '${styleDistribution.replace(/'/g, "''")}', '${topFacilitators.replace(/'/g, "''")}', '${bottomFacilitators.replace(/'/g, "''")}',
      '${gradeDistribution.replace(/'/g, "''")}', '${overallGrade}', '${aiNarrative.replace(/'/g, "''")}',
      '${bestPractices.replace(/'/g, "''")}', '${trendVsPrevious}', ${trendSlope}, '${recommendations.replace(/'/g, "''")}',
      NOW(), NOW()
    )
  `));

  return {
    success: true,
    scope,
    scopeId: scopeId || null,
    snapshot: {
      periodStart, periodEnd, totalMeetingsAnalyzed, totalFacilitators,
      avgEffectivenessScore, avgEngagementImpact, avgDecisionFacilitation,
      avgTimeManagement, avgInclusivity, avgClarity, avgConflictResolution,
      avgSpeakerBalance, avgFacilitatorSpeakingPercent,
      styleDistribution: JSON.parse(styleDistribution),
      topFacilitators: JSON.parse(topFacilitators),
      bottomFacilitators: JSON.parse(bottomFacilitators),
      gradeDistribution: JSON.parse(gradeDistribution),
      overallGrade, aiNarrative,
      bestPractices: JSON.parse(bestPractices),
      trendVsPrevious, trendSlope,
      recommendations: JSON.parse(recommendations),
    },
  };
}

// ============================================================================
// Phase 21: Facilitator Dashboard & Queries
// ============================================================================

/**
 * Get facilitator dashboard aggregate stats.
 */
export async function getFacilitatorDashboard(filters?: { department?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const conditions: string[] = [];
  if (filters?.department) conditions.push(`department = '${filters.department.replace(/'/g, "''")}'`);
  if (filters?.dateFrom) conditions.push(`computed_at >= '${filters.dateFrom}'`);
  if (filters?.dateTo) conditions.push(`computed_at <= '${filters.dateTo}'`);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  const res = await db.execute(sql.raw(`
    SELECT
      COUNT(*) as total_meetings,
      ROUND(AVG(overall_effectiveness_score)) as avg_effectiveness,
      COUNT(DISTINCT facilitator_id) as total_facilitators
    FROM ime_facilitator_analysis${where}
  `));
  const row = (res.rows as any[])[0] || {};

  // Dominant style
  const styleRes = await db.execute(sql.raw(`
    SELECT facilitation_style, COUNT(*) as cnt
    FROM ime_facilitator_analysis${where}
    GROUP BY facilitation_style
    ORDER BY cnt DESC
    LIMIT 1
  `));
  const dominantStyle = (styleRes.rows as any[])[0]?.facilitation_style || "unknown";

  const STYLE_LABELS: Record<string, string> = {
    directive: "指令型", collaborative: "协作型", laissez_faire: "放任型",
    structured: "结构型", coaching: "教练型", democratic: "民主型", unknown: "未知",
  };

  return {
    totalMeetingsAnalyzed: Number(row.total_meetings) || 0,
    avgEffectivenessScore: Number(row.avg_effectiveness) || 0,
    totalFacilitators: Number(row.total_facilitators) || 0,
    dominantStyle: STYLE_LABELS[dominantStyle] || dominantStyle,
  };
}

/**
 * Get paginated list of facilitator analyses.
 */
export async function getFacilitatorAnalysisList(options?: { limit?: number; offset?: number; grade?: string; department?: string; facilitatorId?: string; dateFrom?: string; dateTo?: string }) {
  const db = await requireDb();

  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  const conditions: string[] = [];
  if (options?.grade) conditions.push(`fa.effectiveness_grade = '${options.grade.replace(/'/g, "''")}'`);
  if (options?.department) conditions.push(`fa.department = '${options.department.replace(/'/g, "''")}'`);
  if (options?.facilitatorId) conditions.push(`fa.facilitator_id = '${options.facilitatorId.replace(/'/g, "''")}'`);
  if (options?.dateFrom) conditions.push(`fa.computed_at >= '${options.dateFrom}'`);
  if (options?.dateTo) conditions.push(`fa.computed_at <= '${options.dateTo}'`);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await db.execute(sql.raw(
    `SELECT COUNT(*) as cnt FROM ime_facilitator_analysis fa${where}`
  ));
  const total = Number((countRes.rows as any[])[0]?.cnt) || 0;

  const res = await db.execute(sql.raw(`
    SELECT fa.*, mr.title as meeting_title
    FROM ime_facilitator_analysis fa
    LEFT JOIN meeting_records mr ON fa.meeting_id = mr.id
    ${where}
    ORDER BY fa.computed_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `));

  const rows = (res.rows as any[]).map(r => ({
    id: r.id,
    meetingId: r.meeting_id,
    meetingTitle: r.meeting_title || "",
    facilitatorName: r.facilitator_name,
    facilitatorId: r.facilitator_id,
    department: r.department,
    facilitationStyle: r.facilitation_style,
    styleConfidence: Number(r.style_confidence) || 0,
    overallEffectivenessScore: Number(r.overall_effectiveness_score) || 0,
    engagementImpactScore: Number(r.engagement_impact_score) || 0,
    decisionFacilitationScore: Number(r.decision_facilitation_score) || 0,
    timeManagementScore: Number(r.time_management_score) || 0,
    inclusivityScore: Number(r.inclusivity_score) || 0,
    clarityScore: Number(r.clarity_score) || 0,
    conflictResolutionScore: Number(r.conflict_resolution_score) || 0,
    meetingEffectivenessScore: Number(r.meeting_effectiveness_score) || 0,
    speakerBalanceIndex: Number(r.speaker_balance_index) || 0,
    totalSpeakers: Number(r.total_speakers) || 0,
    facilitatorSpeakingPercent: Number(r.facilitator_speaking_percent) || 0,
    decisionsCount: Number(r.decisions_count) || 0,
    actionItemsCount: Number(r.action_items_count) || 0,
    effectivenessGrade: r.effectiveness_grade || "F",
    aiStrengths: r.ai_strengths,
    aiWeaknesses: r.ai_weaknesses,
    aiCoachingPoints: r.ai_coaching_points,
    aiNarrative: r.ai_narrative,
    computedAt: r.computed_at,
  }));

  return { rows, total, limit, offset };
}

/**
 * Get facilitator intelligence snapshot trend data.
 */
export async function getFacilitatorTrendData(options?: { scope?: string; scopeId?: string; limit?: number }) {
  const db = await requireDb();

  const conditions: string[] = [];
  if (options?.scope) conditions.push(`scope = '${options.scope.replace(/'/g, "''")}'`);
  if (options?.scopeId) conditions.push(`scope_id = '${options.scopeId.replace(/'/g, "''")}'`);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  const res = await db.execute(sql.raw(`
    SELECT * FROM ime_facilitator_intelligence_snapshots${where}
    ORDER BY period_end DESC
    LIMIT ${options?.limit || 20}
  `));

  const rows = (res.rows as any[]).map(r => ({
    id: r.id,
    scope: r.scope,
    scopeId: r.scope_id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    totalMeetingsAnalyzed: Number(r.total_meetings_analyzed) || 0,
    totalFacilitators: Number(r.total_facilitators) || 0,
    avgEffectivenessScore: Number(r.avg_effectiveness_score) || 0,
    avgEngagementImpact: Number(r.avg_engagement_impact) || 0,
    avgDecisionFacilitation: Number(r.avg_decision_facilitation) || 0,
    avgTimeManagement: Number(r.avg_time_management) || 0,
    avgInclusivity: Number(r.avg_inclusivity) || 0,
    avgClarity: Number(r.avg_clarity) || 0,
    avgConflictResolution: Number(r.avg_conflict_resolution) || 0,
    avgSpeakerBalance: Number(r.avg_speaker_balance) || 0,
    avgFacilitatorSpeakingPercent: Number(r.avg_facilitator_speaking_percent) || 0,
    overallGrade: r.overall_grade,
    trendVsPrevious: r.trend_vs_previous,
    trendSlope: Number(r.trend_slope) || 0,
    computedAt: r.computed_at,
  }));

  return rows;
}

/**
 * Manually update a facilitator analysis record.
 */
export async function updateFacilitatorAnalysis(id: number, updates: {
  facilitatorName?: string;
  facilitationStyle?: string;
  engagementImpactScore?: number;
  decisionFacilitationScore?: number;
  timeManagementScore?: number;
  inclusivityScore?: number;
  clarityScore?: number;
  conflictResolutionScore?: number;
}) {
  const db = await requireDb();

  const setClauses: string[] = [];

  if (updates.facilitatorName !== undefined) {
    setClauses.push(`facilitator_name = '${String(updates.facilitatorName).replace(/'/g, "''")}'`);
  }
  if (updates.facilitationStyle !== undefined) {
    setClauses.push(`facilitation_style = '${String(updates.facilitationStyle).replace(/'/g, "''")}'`);
  }
  if (updates.engagementImpactScore !== undefined) {
    setClauses.push(`engagement_impact_score = ${Number(updates.engagementImpactScore) || 0}`);
  }
  if (updates.decisionFacilitationScore !== undefined) {
    setClauses.push(`decision_facilitation_score = ${Number(updates.decisionFacilitationScore) || 0}`);
  }
  if (updates.timeManagementScore !== undefined) {
    setClauses.push(`time_management_score = ${Number(updates.timeManagementScore) || 0}`);
  }
  if (updates.inclusivityScore !== undefined) {
    setClauses.push(`inclusivity_score = ${Number(updates.inclusivityScore) || 0}`);
  }
  if (updates.clarityScore !== undefined) {
    setClauses.push(`clarity_score = ${Number(updates.clarityScore) || 0}`);
  }
  if (updates.conflictResolutionScore !== undefined) {
    setClauses.push(`conflict_resolution_score = ${Number(updates.conflictResolutionScore) || 0}`);
  }

  // Recompute overall + grade if any score changed
  const scoreFields = ["engagementImpactScore", "decisionFacilitationScore", "timeManagementScore", "inclusivityScore", "clarityScore", "conflictResolutionScore"];
  const anyScoreChanged = scoreFields.some(f => (updates as any)[f] !== undefined);

  if (anyScoreChanged) {
    const currentRes = await db.execute(sql.raw(
      `SELECT engagement_impact_score, decision_facilitation_score, time_management_score, inclusivity_score, clarity_score, conflict_resolution_score FROM ime_facilitator_analysis WHERE id = ${id} LIMIT 1`
    ));
    const current = (currentRes.rows as any[])[0];
    if (!current) throw new Error(`Facilitator analysis ${id} not found`);

    const eng = updates.engagementImpactScore !== undefined ? Number(updates.engagementImpactScore) : Number(current.engagement_impact_score) || 0;
    const dec = updates.decisionFacilitationScore !== undefined ? Number(updates.decisionFacilitationScore) : Number(current.decision_facilitation_score) || 0;
    const tim = updates.timeManagementScore !== undefined ? Number(updates.timeManagementScore) : Number(current.time_management_score) || 0;
    const inc = updates.inclusivityScore !== undefined ? Number(updates.inclusivityScore) : Number(current.inclusivity_score) || 0;
    const cla = updates.clarityScore !== undefined ? Number(updates.clarityScore) : Number(current.clarity_score) || 0;
    const con = updates.conflictResolutionScore !== undefined ? Number(updates.conflictResolutionScore) : Number(current.conflict_resolution_score) || 0;

    const overall = Math.round((eng + dec + tim + inc + cla + con) / 6);
    let grade = "F";
    if (overall >= 85) grade = "A";
    else if (overall >= 70) grade = "B";
    else if (overall >= 55) grade = "C";
    else if (overall >= 40) grade = "D";

    setClauses.push(`overall_effectiveness_score = ${overall}`);
    setClauses.push(`effectiveness_grade = '${grade}'`);
  }

  if (setClauses.length === 0) {
    return { success: true, id, message: "No updates provided" };
  }

  await db.execute(sql.raw(`
    UPDATE ime_facilitator_analysis
    SET ${setClauses.join(", ")}
    WHERE id = ${id}
  `));

  return { success: true, id };
}
