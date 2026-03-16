/**
 * G-IME: Contribution Analysis & Engagement
 * 参会者贡献分析与参与度评估服务
 */

import { requireDb } from "../db";
import { sql, type SQL } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { tracePerformance } from "../services/performance-trace.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ime:contribution");

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
