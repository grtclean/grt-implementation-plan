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
    console.error("[IME] ROI LLM analysis failed, using heuristic:", e);
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
    console.error("[IME] Attendee optimization LLM failed, using heuristic:", e);
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
    console.error("[IME] Prediction LLM failed, using heuristic:", e);
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
    console.error("[IME] Fatigue detection LLM failed, using heuristic:", e);
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

  const safeId = meetingId.replace(/'/g, "''");

  // Fetch data from 8 tables
  const meetingRes = await db.execute(sql.raw(`SELECT * FROM meeting_records WHERE id = '${safeId}' LIMIT 1`));
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const contribRes = await db.execute(sql.raw(`SELECT * FROM meeting_contributions WHERE meeting_id = '${safeId}' ORDER BY contribution_score DESC`));
  const effRes = await db.execute(sql.raw(`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = '${safeId}' LIMIT 1`));
  const sentimentRes = await db.execute(sql.raw(`SELECT * FROM ime_meeting_sentiment WHERE meeting_id = '${safeId}' LIMIT 1`));
  const roiRes = await db.execute(sql.raw(`SELECT * FROM ime_meeting_roi WHERE meeting_id = '${safeId}' LIMIT 1`));
  const actionRes = await db.execute(sql.raw(`SELECT * FROM ime_action_items WHERE meeting_id = '${safeId}' ORDER BY priority DESC`));
  const topicRes = await db.execute(sql.raw(`SELECT * FROM ime_topic_continuity WHERE meeting_id = '${safeId}'`));
  const optRes = await db.execute(sql.raw(`SELECT * FROM ime_attendee_optimization WHERE meeting_id = '${safeId}' LIMIT 1`));

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
  await db.execute(sql.raw(`
    INSERT INTO ime_report_exports (report_type, scope, scope_id, format, filename, file_size, generated_by, generated_at, created_at)
    VALUES ('meeting', 'meeting', '${safeId}', 'pdf', '${filename.replace(/'/g, "''")}', ${pdfBuffer.length}, 'system', NOW(), NOW())
  `));

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
  const safeId = meetingId.replace(/'/g, "''");

  // Fetch meeting + content blocks
  const meetingRes = await db.execute(sql.raw(`SELECT * FROM meeting_records WHERE id = '${safeId}' LIMIT 1`));
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const blocksRes = await db.execute(sql.raw(
    `SELECT speaker, content, block_type FROM meeting_content_blocks WHERE meeting_id = '${safeId}' ORDER BY timestamp_start`
  ));
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
  await db.execute(sql.raw(`DELETE FROM ime_knowledge_entities WHERE meeting_id = '${safeId}'`));

  // Insert new entities
  const insertedIds: number[] = [];
  for (const e of entities) {
    const res = await db.execute(sql.raw(`
      INSERT INTO ime_knowledge_entities (meeting_id, entity_type, entity_value, confidence, related_speaker, context, ai_narrative, extracted_at, created_at)
      VALUES ('${safeId}', '${(e.entity_type || "insight").replace(/'/g, "''")}', '${String(e.entity_value || "").replace(/'/g, "''")}', ${Number(e.confidence) || 0.8}, '${String(e.related_speaker || "").replace(/'/g, "''")}', '${String(e.context || "").replace(/'/g, "''")}', '${String(parsed.narrative || "").replace(/'/g, "''")}', NOW(), NOW())
      RETURNING id
    `));
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
  const safeId = meetingId.replace(/'/g, "''");

  // Get entities from this meeting
  const currentRes = await db.execute(sql.raw(
    `SELECT id, entity_type, entity_value, meeting_id FROM ime_knowledge_entities WHERE meeting_id = '${safeId}'`
  ));
  const currentEntities = currentRes.rows as any[];
  if (currentEntities.length === 0) return { relationships: 0 };

  // Get entities from other meetings for linking
  const otherRes = await db.execute(sql.raw(
    `SELECT id, entity_type, entity_value, meeting_id FROM ime_knowledge_entities WHERE meeting_id != '${safeId}' ORDER BY extracted_at DESC LIMIT 200`
  ));
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
    await db.execute(sql.raw(`
      INSERT INTO ime_entity_relationships (entity_from_id, entity_to_id, relationship_type, strength, context, created_at)
      VALUES (${rel.entity_from_id}, ${rel.entity_to_id}, '${String(rel.relationship_type).replace(/'/g, "''")}', ${Number(rel.strength) || 0.7}, '${String(rel.context || "").replace(/'/g, "''")}', NOW())
    `));
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
  const entityRes = await db.execute(sql.raw(
    `SELECT id, meeting_id, entity_value FROM ime_knowledge_entities WHERE id = ${entityId} AND entity_type = 'decision'`
  ));
  const entity = (entityRes.rows as any[])[0];
  if (!entity) throw new Error("Decision entity not found");

  // Upsert decision outcome
  await db.execute(sql.raw(`DELETE FROM ime_decision_outcomes WHERE entity_id = ${entityId}`));
  await db.execute(sql.raw(`
    INSERT INTO ime_decision_outcomes (entity_id, meeting_id, decision_text, decision_date, outcome_status, outcome_notes, impact_score, lessons_learned, outcome_date, created_at)
    VALUES (${entityId}, '${entity.meeting_id}', '${String(entity.entity_value).replace(/'/g, "''")}', NOW(), '${outcomeStatus.replace(/'/g, "''")}', '${String(outcomeNotes || "").replace(/'/g, "''")}', ${impactScore ?? 0}, '${String(lessonsLearned || "").replace(/'/g, "''")}', NOW(), NOW())
  `));

  return { entityId, outcomeStatus, tracked: true };
}

// ============================================================================
// Phase 7: Generate Meeting Retrospective
// ============================================================================

export async function generateRetrospective(meetingId: string) {
  const db = await requireDb();
  const safeId = meetingId.replace(/'/g, "''");

  // Gather data from multiple tables
  const meetingRes = await db.execute(sql.raw(`SELECT * FROM meeting_records WHERE id = '${safeId}' LIMIT 1`));
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const effRes = await db.execute(sql.raw(`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = '${safeId}' LIMIT 1`));
  const sentRes = await db.execute(sql.raw(`SELECT * FROM ime_meeting_sentiment WHERE meeting_id = '${safeId}' LIMIT 1`));
  const actionRes = await db.execute(sql.raw(`SELECT content, status, assigned_to FROM ime_action_items WHERE meeting_id = '${safeId}'`));
  const entityRes = await db.execute(sql.raw(`SELECT entity_type, entity_value FROM ime_knowledge_entities WHERE meeting_id = '${safeId}'`));

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
  await db.execute(sql.raw(`DELETE FROM ime_meeting_retrospectives WHERE meeting_id = '${safeId}'`));
  await db.execute(sql.raw(`
    INSERT INTO ime_meeting_retrospectives (meeting_id, ai_summary, key_learnings, improvement_areas, what_went_well, actionable_insights, overall_grade, ai_narrative, generated_at, created_at)
    VALUES ('${safeId}', '${String(parsed.summary || "").replace(/'/g, "''")}', '${JSON.stringify(parsed.key_learnings || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.improvement_areas || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.what_went_well || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.actionable_insights || []).replace(/'/g, "''")}', '${String(parsed.overall_grade || "B").replace(/'/g, "''")}', '${String(parsed.narrative || "").replace(/'/g, "''")}', NOW(), NOW())
  `));

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
    const safeEmpId = String(c.employee_id || "").replace(/'/g, "''");
    const safeEmpName = String(c.employee_name || "").replace(/'/g, "''");

    // Count decisions they're associated with
    const decisionRes = await db.execute(sql.raw(`
      SELECT COUNT(*) as cnt FROM ime_knowledge_entities
      WHERE entity_type = 'decision' AND related_speaker = '${safeEmpName}'
    `));
    const decisionCount = Number((decisionRes.rows as any[])[0]?.cnt) || 0;

    // Get top topics from their meetings
    const topicRes = await db.execute(sql.raw(`
      SELECT tc.topic_name, COUNT(*) as cnt
      FROM ime_topic_continuity tc
      WHERE tc.meeting_id IN (SELECT meeting_id FROM meeting_contributions WHERE employee_id = '${safeEmpId}')
      GROUP BY tc.topic_name ORDER BY cnt DESC LIMIT 5
    `));
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
    await db.execute(sql.raw(`DELETE FROM ime_expert_profiles WHERE employee_id = '${safeEmpId}'`));
    await db.execute(sql.raw(`
      INSERT INTO ime_expert_profiles (employee_id, employee_name, department, expertise_areas, credibility_score, meeting_count, avg_contribution_score, decision_influence_rate, top_topics, computed_at, created_at)
      VALUES ('${safeEmpId}', '${safeEmpName}', '${(department || "").replace(/'/g, "''")}', '${JSON.stringify(expertiseAreas).replace(/'/g, "''")}', ${Math.round(credibility)}, ${meetingCount}, ${Math.round(avgScore)}, ${Number(decisionCount / Math.max(meetingCount, 1)).toFixed(2)}, '${JSON.stringify(topTopics).replace(/'/g, "''")}', NOW(), NOW())
    `));

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
  const safeId = meetingId.replace(/'/g, "''");

  const meetingRes = await db.execute(sql.raw(`SELECT * FROM meeting_records WHERE id = '${safeId}' LIMIT 1`));
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  // Gather participant history
  const contribRes = await db.execute(sql.raw(
    `SELECT employee_name, employee_id, AVG(contribution_score) as avg_score, COUNT(*) as meetings
     FROM meeting_contributions WHERE meeting_id = '${safeId}' OR employee_id IN
       (SELECT DISTINCT employee_id FROM meeting_contributions WHERE meeting_id = '${safeId}')
     GROUP BY employee_name, employee_id ORDER BY avg_score DESC LIMIT 15`
  ));

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

  await db.execute(sql.raw(`DELETE FROM ime_meeting_briefs WHERE meeting_id = '${safeId}'`));
  await db.execute(sql.raw(`
    INSERT INTO ime_meeting_briefs (meeting_id, participant_summary, pending_action_items, relevant_decisions, topic_history, suggested_questions, risk_alerts, ai_narrative, generated_at, created_at)
    VALUES ('${safeId}', '${JSON.stringify(parsed.participant_summary || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.pending_items || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.relevant_decisions || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.topic_context || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.suggested_questions || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.risk_alerts || []).replace(/'/g, "''")}', '${String(parsed.narrative || "").replace(/'/g, "''")}', NOW(), NOW())
  `));

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
  const safeId = meetingId.replace(/'/g, "''");

  const meetingRes = await db.execute(sql.raw(`SELECT * FROM meeting_records WHERE id = '${safeId}' LIMIT 1`));
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const blocksRes = await db.execute(sql.raw(
    `SELECT speaker, content, block_type FROM meeting_content_blocks WHERE meeting_id = '${safeId}' ORDER BY timestamp_start`
  ));
  const contribRes = await db.execute(sql.raw(
    `SELECT employee_name FROM meeting_contributions WHERE meeting_id = '${safeId}'`
  ));
  const actionRes = await db.execute(sql.raw(
    `SELECT content, assigned_to, status, priority, due_date FROM ime_action_items WHERE meeting_id = '${safeId}'`
  ));
  const entityRes = await db.execute(sql.raw(
    `SELECT entity_type, entity_value FROM ime_knowledge_entities WHERE meeting_id = '${safeId}' AND entity_type = 'decision'`
  ));

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

  await db.execute(sql.raw(`DELETE FROM ime_meeting_minutes WHERE meeting_id = '${safeId}'`));
  await db.execute(sql.raw(`
    INSERT INTO ime_meeting_minutes (meeting_id, attendees, agenda_items, decisions_recorded, action_items_summary, key_discussion_points, next_steps, ai_narrative, generated_at, created_at)
    VALUES ('${safeId}', '${JSON.stringify(attendees).replace(/'/g, "''")}', '${JSON.stringify(parsed.agenda_items || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.decisions || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.action_items || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.key_points || []).replace(/'/g, "''")}', '${JSON.stringify(parsed.next_steps || []).replace(/'/g, "''")}', '${String(parsed.narrative || "").replace(/'/g, "''")}', NOW(), NOW())
  `));

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
  const safeId = meetingId.replace(/'/g, "''");

  const meetingRes = await db.execute(sql.raw(`SELECT * FROM meeting_records WHERE id = '${safeId}' LIMIT 1`));
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const actionRes = await db.execute(sql.raw(`SELECT * FROM ime_action_items WHERE meeting_id = '${safeId}'`));
  const entityRes = await db.execute(sql.raw(`SELECT * FROM ime_knowledge_entities WHERE meeting_id = '${safeId}'`));
  const effRes = await db.execute(sql.raw(`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = '${safeId}' LIMIT 1`));
  const retroRes = await db.execute(sql.raw(`SELECT * FROM ime_meeting_retrospectives WHERE meeting_id = '${safeId}' LIMIT 1`));

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
  const safeId = meetingId.replace(/'/g, "''");
  const safeEvent = event.replace(/'/g, "''");

  // Get active rules matching this event
  const rulesRes = await db.execute(sql.raw(
    `SELECT * FROM ime_workflow_rules WHERE trigger_event = '${safeEvent}' AND is_active = 1`
  ));
  const rules = rulesRes.rows as any[];
  if (rules.length === 0) return { executed: 0, results: [] };

  // Gather meeting metrics for condition evaluation
  const healthRes = await db.execute(sql.raw(`SELECT * FROM ime_meeting_health WHERE meeting_id = '${safeId}' ORDER BY assessed_at DESC LIMIT 1`));
  const roiRes = await db.execute(sql.raw(`SELECT * FROM ime_meeting_roi WHERE meeting_id = '${safeId}' ORDER BY calculated_at DESC LIMIT 1`));
  const sentimentRes = await db.execute(sql.raw(`SELECT * FROM ime_meeting_sentiment WHERE meeting_id = '${safeId}' ORDER BY analyzed_at DESC LIMIT 1`));
  const effRes = await db.execute(sql.raw(`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = '${safeId}' LIMIT 1`));

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

    await db.execute(sql.raw(`
      INSERT INTO ime_workflow_executions (rule_id, rule_name, trigger_event, trigger_meeting_id, condition_snapshot, action_type, action_result, status, executed_at)
      VALUES (${rule.id}, '${(rule.name || "").replace(/'/g, "''")}', '${safeEvent}', '${safeId}', '${JSON.stringify(metrics).replace(/'/g, "''")}', '${rule.action_type}', '${JSON.stringify(actionResult).replace(/'/g, "''")}', '${status}', NOW())
    `));

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
  const chalRes = await db.execute(sql.raw(`SELECT * FROM ime_team_challenges WHERE id = ${challengeId}`));
  const challenge = (chalRes.rows as any[])[0];
  if (!challenge) throw new Error("Challenge not found");

  let currentValue = 0;
  switch (challenge.target_metric) {
    case "avg_effectiveness": {
      const r = await db.execute(sql.raw(`SELECT AVG(overall_score) as v FROM meeting_effectiveness_scores WHERE created_at >= '${challenge.start_date}'`));
      currentValue = Number((r.rows as any[])[0]?.v || 0);
      break;
    }
    case "avg_duration": {
      const r = await db.execute(sql.raw(`SELECT AVG(duration_minutes) as v FROM meeting_records WHERE meeting_date >= '${challenge.start_date}'`));
      currentValue = Number((r.rows as any[])[0]?.v || 0);
      break;
    }
    case "action_completion_rate": {
      const r = await db.execute(sql.raw(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done FROM ime_action_items WHERE created_at >= '${challenge.start_date}'`));
      const row = (r.rows as any[])[0] || {};
      currentValue = row.total > 0 ? Math.round((Number(row.done) / Number(row.total)) * 100) : 0;
      break;
    }
    case "avg_cost": {
      const r = await db.execute(sql.raw(`SELECT AVG(total_cost) as v FROM ime_meeting_costs WHERE calculated_at >= '${challenge.start_date}'`));
      currentValue = Number((r.rows as any[])[0]?.v || 0);
      break;
    }
  }

  // Determine if challenge is met
  const isImprove = challenge.challenge_type === "improve_effectiveness" || challenge.challenge_type === "action_completion" || challenge.challenge_type === "boost_engagement";
  const met = isImprove ? currentValue >= challenge.target_value : currentValue <= challenge.target_value;
  const newStatus = met ? "completed" : (challenge.end_date && new Date(challenge.end_date) < new Date() ? "failed" : "active");

  await db.execute(sql.raw(`
    UPDATE ime_team_challenges SET current_value = ${currentValue}, status = '${newStatus}', updated_at = NOW() WHERE id = ${challengeId}
  `));

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
  const safeUser = (userId || "").replace(/'/g, "''");

  // Achievement definitions
  const defsRes = await db.execute(sql.raw(`SELECT * FROM ime_achievements WHERE is_global = 1 ORDER BY points ASC`));

  // User awards
  const awardsWhere = safeUser ? `WHERE user_id = '${safeUser}' AND is_global = 0` : "WHERE is_global = 0";
  const awardsRes = await db.execute(sql.raw(`SELECT * FROM ime_achievements ${awardsWhere} ORDER BY awarded_at DESC`));

  // Total points
  const pointsRes = await db.execute(sql.raw(
    `SELECT ${safeUser ? `user_id,` : ""} SUM(points) as total_points, COUNT(*) as badge_count FROM ime_achievements WHERE is_global = 0 ${safeUser ? `AND user_id = '${safeUser}'` : ""} ${safeUser ? "" : "GROUP BY user_id ORDER BY total_points DESC LIMIT 10"}`
  ));

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
  const safeId = meetingId.replace(/'/g, "''");
  const safeUser = userId.replace(/'/g, "''");
  const safeHighlights = (feedback.highlights || "").replace(/'/g, "''");
  const safeImprovements = (feedback.improvements || "").replace(/'/g, "''");
  const safeSuggestions = (feedback.suggestions || "").replace(/'/g, "''");

  await db.execute(sql.raw(`
    INSERT INTO ime_meeting_feedback (meeting_id, user_id, overall_rating, content_relevance, time_efficiency, facilitation, action_clarity, would_recommend, highlights, improvements, suggestions, anonymous, submitted_at)
    VALUES ('${safeId}', '${safeUser}', ${feedback.overallRating}, ${feedback.contentRelevance ?? "NULL"}, ${feedback.timeEfficiency ?? "NULL"}, ${feedback.facilitation ?? "NULL"}, ${feedback.actionClarity ?? "NULL"}, ${feedback.wouldRecommend ?? "NULL"}, '${safeHighlights}', '${safeImprovements}', '${safeSuggestions}', ${feedback.anonymous ? 1 : 0}, NOW())
  `));

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
  const safeId = meetingId.replace(/'/g, "''");

  const fbRes = await db.execute(sql.raw(`
    SELECT COUNT(*) as total, AVG(overall_rating) as avg_overall, AVG(content_relevance) as avg_content,
           AVG(time_efficiency) as avg_time, AVG(facilitation) as avg_fac, AVG(action_clarity) as avg_action,
           SUM(CASE WHEN would_recommend = 1 THEN 1 ELSE 0 END) as promoters,
           SUM(CASE WHEN would_recommend = 0 THEN 1 ELSE 0 END) as detractors
    FROM ime_meeting_feedback WHERE meeting_id = '${safeId}'
  `));
  const commentsRes = await db.execute(sql.raw(
    `SELECT highlights, improvements, suggestions, overall_rating FROM ime_meeting_feedback WHERE meeting_id = '${safeId}' ORDER BY submitted_at DESC`
  ));

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
  const safeId = meetingId.replace(/'/g, "''");

  // Get meeting data
  const meetingRes = await db.execute(sql.raw(`SELECT * FROM meeting_records WHERE id = '${safeId}' LIMIT 1`));
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  // Get related data
  const effRes = await db.execute(sql.raw(`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = '${safeId}' LIMIT 1`));
  const actionRes = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM ime_action_items WHERE meeting_id = '${safeId}'`));
  const contribRes = await db.execute(sql.raw(`SELECT COUNT(DISTINCT speaker_name) as participants FROM meeting_contributions WHERE meeting_id = '${safeId}'`));

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

    await db.execute(sql.raw(`
      INSERT INTO ime_compliance_audits (meeting_id, meeting_title, policy_id, policy_name, policy_type, result, severity, actual_value, expected_value, details, audited_at)
      VALUES ('${safeId}', '${safeTitle}', ${policy.id}, '${(policy.name || "").replace(/'/g, "''")}', '${policy.policy_type}', '${result}', '${severity}', '${actualStr}', '${policy.operator || ""} ${policy.threshold || ""}', '${result === "fail" ? "不合规" : result === "pass" ? "合规" : "不适用"}', NOW())
    `));

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
  const sets: string[] = [];
  if (updates.name !== undefined) sets.push(`name = '${String(updates.name).replace(/'/g, "''")}'`);
  if (updates.description !== undefined) sets.push(`description = '${String(updates.description).replace(/'/g, "''")}'`);
  if (updates.conditionType !== undefined) sets.push(`condition_type = '${updates.conditionType}'`);
  if (updates.conditionField !== undefined) sets.push(`condition_field = '${String(updates.conditionField).replace(/'/g, "''")}'`);
  if (updates.conditionOperator !== undefined) sets.push(`condition_operator = '${updates.conditionOperator}'`);
  if (updates.conditionThreshold !== undefined) sets.push(`condition_threshold = '${String(updates.conditionThreshold).replace(/'/g, "''")}'`);
  if (updates.actionType !== undefined) sets.push(`action_type = '${updates.actionType}'`);
  if (updates.actionTarget !== undefined) sets.push(`action_target = '${String(updates.actionTarget).replace(/'/g, "''")}'`);
  if (updates.actionValue !== undefined) sets.push(`action_value = '${String(updates.actionValue).replace(/'/g, "''")}'`);
  if (updates.actionDescription !== undefined) sets.push(`action_description = '${String(updates.actionDescription).replace(/'/g, "''")}'`);
  if (updates.scope !== undefined) sets.push(`scope = '${updates.scope}'`);
  if (updates.impactDimension !== undefined) sets.push(`impact_dimension = '${String(updates.impactDimension).replace(/'/g, "''")}'`);
  if (updates.priority !== undefined) sets.push(`priority = ${Number(updates.priority)}`);
  if (updates.isActive !== undefined) sets.push(`is_active = ${updates.isActive ? 1 : 0}`);
  if (sets.length === 0) return { success: true };
  sets.push("updated_at = NOW()");
  await db.execute(sql.raw(`UPDATE ime_linkage_rules SET ${sets.join(", ")} WHERE id = ${id}`));
  return { success: true };
}

export async function deleteLinkageRule(id: number) {
  const db = await requireDb();
  await db.execute(sql.raw(`DELETE FROM ime_linkage_rules WHERE id = ${id}`));
  return { success: true };
}

// ============================================================================
// Phase 14: HR & Performance Linkage — Core Engine
// ============================================================================

export async function evaluateLinkage(meetingId: string) {
    const db = await requireDb();
    const safeId = meetingId.replace(/'/g, "''");

    // 1. Get meeting contributions
    const contribs = await db.execute(sql.raw(
      `SELECT * FROM meeting_contributions WHERE meeting_id = '${safeId}'`
    ));
    const contributions = contribs.rows as any[];

    // 2. Get AI analysis
    const analysis = await db.execute(sql.raw(
      `SELECT * FROM ime_ai_analysis WHERE meeting_id = '${safeId}'`
    ));
    const analyses = analysis.rows as any[];

    // 3. Get HR signals for participants
    const signals = await db.execute(sql.raw(
      `SELECT * FROM ime_hr_signals WHERE meeting_id = '${safeId}'`
    ));
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
    const meetingResult = await db.execute(sql.raw(
      `SELECT title FROM meeting_records WHERE id = '${safeId}' LIMIT 1`
    ));
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

      const safeEmpId = participant.employeeId.replace(/'/g, "''");
      const safeEmpName = participant.employeeName.replace(/'/g, "''");
      const safeDept = participant.department.replace(/'/g, "''");
      const safeRuleName = (rule.name || "").replace(/'/g, "''");
      const safeReason = reason.replace(/'/g, "''");
      const safeActDesc = actionDesc.replace(/'/g, "''");
      const sourceData = JSON.stringify({
        contributionScore: participant.contributionScore,
        engagementScore: participant.engagementScore,
        behaviorTags: participant.behaviorTags,
        questionCount: participant.questionCount,
        signalTypes: participant.signalTypes,
      }).replace(/'/g, "''");

      await db.execute(sql.raw(`
        INSERT INTO ime_hr_actions (employee_id, employee_name, department, rule_id, rule_name, meeting_id, meeting_title, action_type, action_description, reason, impact_dimension, impact_value, source_data, status, created_at, updated_at)
        VALUES ('${safeEmpId}', '${safeEmpName}', '${safeDept}', ${rule.id}, '${safeRuleName}', '${safeId}', '${meetingTitle.replace(/'/g, "''")}', '${rule.action_type}', '${safeActDesc}', '${safeReason}', '${(rule.impact_dimension || "").replace(/'/g, "''")}', '${(rule.action_value || "").replace(/'/g, "''")}', '${sourceData}', 'pending', NOW(), NOW())
      `));

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
