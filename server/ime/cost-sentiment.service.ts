/**
 * G-IME: Cost, Live Sessions, Action Items, Topics & Sentiment
 * 实时助手、成本计算、行动项追踪、议题连续性、情感分析服务
 */

import { requireDb } from "../db";
import { sql, type SQL } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";
import { analyzeContributions, scoreMeetingEffectiveness } from "./contribution-analysis.service";

const log = createChildLogger("ime:cost-sentiment");

// ============================================================================
// Phase 2 — Sprint 4: Real-time Assistant
// ============================================================================

export async function startLiveSession(meetingId: string, userId: string) {
  const db = await requireDb();

  // Check for existing active session
  const existing = await db.execute(sql`
    SELECT id FROM ime_live_sessions
    WHERE meeting_id = ${meetingId} AND session_status = 'active'
    LIMIT 1
  `);
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
  const sessionResult = await db.execute(sql`
    SELECT * FROM ime_live_sessions WHERE id = ${sessionId} AND session_status = 'active'
  `);
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

  await db.execute(sql`
    UPDATE ime_live_sessions
    SET live_contribution_snapshot = ${JSON.stringify(snapshot)},
        total_segments_processed = ${totalSegments},
        live_suggestions = ${JSON.stringify(suggestions)}
    WHERE id = ${sessionId}
  `);

  return { updatedSnapshot: snapshot, suggestion, totalSegments };
}

export async function endLiveSession(sessionId: number) {
  const db = await requireDb();

  const sessionResult = await db.execute(sql`
    SELECT * FROM ime_live_sessions WHERE id = ${sessionId}
  `);
  const session = (sessionResult.rows as any[])[0];
  if (!session) throw new Error(`Live session ${sessionId} not found`);

  // End the session
  await db.execute(sql`
    UPDATE ime_live_sessions
    SET session_status = 'ended', ended_at = NOW()
    WHERE id = ${sessionId}
  `);

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
      const salaryResult = await db.execute(sql`
        SELECT "annualTotal" FROM salary_calculations
        WHERE "employeeCode" = ${p.employee_id || ''}
        ORDER BY "calculatedAt" DESC LIMIT 1
      `);
      const salRow = (salaryResult.rows as any[])[0];
      if (salRow?.annualTotal) {
        hourlyRate = Number(salRow.annualTotal) / 2080;
      } else {
        // Try hrm_salary_structures midpoint
        const structResult = await db.execute(sql`
          SELECT "midPoint" FROM hrm_salary_structures LIMIT 1
        `);
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
  await db.execute(sql`
    INSERT INTO ime_meeting_costs
      (meeting_id, duration_minutes, participant_count, total_cost, cost_per_decision, cost_per_action_item, roi_score, participant_breakdown, computed_at)
    VALUES (
      ${meetingId},
      ${durationMinutes},
      ${participantCount},
      ${Math.round(totalCost * 100) / 100},
      ${costPerDecision !== null ? Math.round(costPerDecision * 100) / 100 : null},
      ${costPerActionItem !== null ? Math.round(costPerActionItem * 100) / 100 : null},
      ${roiScore ?? null},
      ${JSON.stringify(breakdown)},
      NOW()
    )
  `);

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

  const conditions: SQL[] = [sql`1=1`];
  if (filters.channelId) conditions.push(sql`mr.channel_id = ${filters.channelId}`);
  if (filters.dateFrom) conditions.push(sql`mr.meeting_date >= ${filters.dateFrom}`);
  if (filters.dateTo) conditions.push(sql`mr.meeting_date <= ${filters.dateTo}`);
  const where = sql.join(conditions, sql` AND `);

  // Aggregate stats
  const statsResult = await db.execute(sql`
    SELECT
      COUNT(*) as meeting_count,
      COALESCE(SUM(mc.total_cost::numeric), 0) as total_spend,
      COALESCE(AVG(mc.total_cost::numeric), 0) as avg_cost,
      COALESCE(AVG(mc.duration_minutes), 0) as avg_duration
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE ${where}
  `);
  const stats = (statsResult.rows as any[])[0] || {};

  // Top 5 most expensive
  const topResult = await db.execute(sql`
    SELECT mc.*, mr.title as meeting_title, mr.meeting_date
    FROM ime_meeting_costs mc
    JOIN meeting_records mr ON mc.meeting_id = mr.id
    WHERE ${where}
    ORDER BY mc.total_cost::numeric DESC
    LIMIT 5
  `);

  // Monthly cost trend (last 12 months)
  const trendResult = await db.execute(sql`
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
  `);

  // Cost vs effectiveness scatter data
  const scatterResult = await db.execute(sql`
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
  `);

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

    await db.execute(sql`
      UPDATE ime_action_items
      SET meeting_appearances = ${JSON.stringify(appearances)},
          appearance_count = ${newCount},
          last_seen_date = NOW(),
          status = ${newStatus},
          ai_match_confidence = ${match.confidence},
          updated_at = NOW()
      WHERE id = ${existing.id}
    `);
    matchedCount++;
  }

  // 5. Insert new items
  let createdCount = 0;
  for (const item of newItems) {
    const block = newBlocks[item.index];
    await db.execute(sql`
      INSERT INTO ime_action_items
        (content, owner, origin_meeting_id, origin_block_id, status, meeting_appearances, appearance_count, first_seen_date, last_seen_date)
      VALUES (
        ${item.content || block?.content || ""},
        ${item.owner || block?.speaker || ""},
        ${meetingId},
        ${block?.id ?? null},
        'open',
        ${JSON.stringify([meetingId])},
        1,
        NOW(),
        NOW()
      )
    `);
    createdCount++;
  }

  return { meetingId, matched: matchedCount, created: createdCount };
}

export async function getActionItemDashboard(filters: { status?: string; owner?: string }) {
  const db = await requireDb();

  const conditions: SQL[] = [sql`1=1`];
  if (filters.status) conditions.push(sql`status = ${filters.status}`);
  if (filters.owner) conditions.push(sql`owner ILIKE ${'%' + filters.owner + '%'}`);
  const where = sql.join(conditions, sql` AND `);

  // Status counts
  const statusResult = await db.execute(sql`
    SELECT status, COUNT(*) as cnt FROM ime_action_items GROUP BY status
  `);
  const statusCounts: Record<string, number> = {};
  for (const row of statusResult.rows as any[]) {
    statusCounts[row.status] = Number(row.cnt);
  }

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const completed = statusCounts["completed"] || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Avg resolution days
  const avgResult = await db.execute(sql`
    SELECT AVG(EXTRACT(EPOCH FROM (resolved_date - first_seen_date)) / 86400) as avg_days
    FROM ime_action_items
    WHERE status = 'completed' AND resolved_date IS NOT NULL
  `);
  const avgResolutionDays = Math.round(Number((avgResult.rows as any[])[0]?.avg_days) || 0);

  // Stale items (top 20)
  const staleResult = await db.execute(sql`
    SELECT * FROM ime_action_items
    WHERE status = 'stale'
    ORDER BY appearance_count DESC, last_seen_date DESC
    LIMIT 20
  `);

  // Owner rankings
  const ownerResult = await db.execute(sql`
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
  `);

  // All items with filter
  const itemsResult = await db.execute(sql`
    SELECT * FROM ime_action_items
    WHERE ${where}
    ORDER BY updated_at DESC
    LIMIT 100
  `);

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
  const resolvedClause = status === "completed" ? sql`, resolved_date = NOW()` : sql``;
  await db.execute(sql`
    UPDATE ime_action_items
    SET status = ${status}${resolvedClause}, updated_at = NOW()
    WHERE id = ${itemId}
  `);
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
      ? sql`, resolved_meeting_id = ${meetingId}, resolved_date = NOW()`
      : sql``;

    await db.execute(sql`
      UPDATE ime_topic_continuity
      SET meeting_appearances = ${JSON.stringify(appearances)},
          appearance_count = ${newCount},
          last_seen_date = NOW(),
          status = ${newStatus},
          ai_match_confidence = ${match.confidence}${resolvedClause},
          updated_at = NOW()
      WHERE id = ${existing.id}
    `);
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

    const resolvedMeetingId = (topic.status === "decided" || topic.status === "closed")
      ? meetingId
      : null;

    await db.execute(sql`
      INSERT INTO ime_topic_continuity
        (topic_name, topic_description, status, meeting_appearances, appearance_count, first_seen_meeting_id, first_seen_date, last_seen_date, resolved_meeting_id, resolved_date)
      VALUES (
        ${topic.topicName || ""},
        ${topic.description || ""},
        ${topic.status},
        ${JSON.stringify(appearance)},
        1,
        ${meetingId},
        NOW(),
        NOW(),
        ${resolvedMeetingId},
        ${resolvedMeetingId ? sql`NOW()` : sql`NULL`}
      )
    `);
    createdCount++;
  }

  return { meetingId, matched: matchedCount, created: createdCount };
}

export async function getTopicContinuityDashboard(filters: { status?: string }) {
  const db = await requireDb();

  const conditions: SQL[] = [sql`1=1`];
  if (filters.status) conditions.push(sql`status = ${filters.status}`);
  const where = sql.join(conditions, sql` AND `);

  // Status distribution
  const statusResult = await db.execute(sql`
    SELECT status, COUNT(*) as cnt FROM ime_topic_continuity GROUP BY status
  `);
  const statusCounts: Record<string, number> = {};
  for (const row of statusResult.rows as any[]) {
    statusCounts[row.status] = Number(row.cnt);
  }

  // Stalled topics (top 20)
  const stalledResult = await db.execute(sql`
    SELECT * FROM ime_topic_continuity
    WHERE status = 'stalled'
    ORDER BY appearance_count DESC, last_seen_date DESC
    LIMIT 20
  `);

  // Resolution stats
  const resResult = await db.execute(sql`
    SELECT
      COUNT(*) as resolved_count,
      AVG(EXTRACT(EPOCH FROM (resolved_date - first_seen_date)) / 86400) as avg_days
    FROM ime_topic_continuity
    WHERE status IN ('decided', 'closed') AND resolved_date IS NOT NULL
  `);
  const resStats = (resResult.rows as any[])[0] || {};

  // Topic timeline (last 50)
  const timelineResult = await db.execute(sql`
    SELECT * FROM ime_topic_continuity
    WHERE ${where}
    ORDER BY last_seen_date DESC
    LIMIT 50
  `);

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
  const resolvedClause = (status === "decided" || status === "closed") ? sql`, resolved_date = NOW()` : sql``;
  await db.execute(sql`
    UPDATE ime_topic_continuity
    SET status = ${status}${resolvedClause}, updated_at = NOW()
    WHERE id = ${topicId}
  `);
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

  const conditions: SQL[] = [sql`1=1`];
  if (filters.channelId) conditions.push(sql`mr.channel_id = ${filters.channelId}`);
  if (filters.dateFrom) conditions.push(sql`ms.analyzed_at >= ${filters.dateFrom}`);
  if (filters.dateTo) conditions.push(sql`ms.analyzed_at <= ${filters.dateTo}`);
  const where = sql.join(conditions, sql` AND `);

  // Aggregates
  const aggResult = await db.execute(sql`
    SELECT
      COUNT(*) as total_analyzed,
      AVG(ms.sentiment_score) as avg_sentiment,
      AVG(ms.tension_level) as avg_tension,
      AVG(ms.collaboration_tone) as avg_collaboration
    FROM ime_meeting_sentiment ms
    LEFT JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE ${where}
  `);
  const agg = (aggResult.rows as any[])[0] || {};

  // Sentiment distribution
  const distResult = await db.execute(sql`
    SELECT ms.overall_sentiment, COUNT(*) as cnt
    FROM ime_meeting_sentiment ms
    LEFT JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE ${where}
    GROUP BY ms.overall_sentiment
  `);
  const distribution: Record<string, number> = {};
  for (const row of distResult.rows as any[]) {
    distribution[row.overall_sentiment] = Number(row.cnt);
  }

  // Tension trend (last 30 meetings)
  const trendResult = await db.execute(sql`
    SELECT ms.meeting_id, mr.title, ms.tension_level, ms.sentiment_score, ms.analyzed_at
    FROM ime_meeting_sentiment ms
    LEFT JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE ${where}
    ORDER BY ms.analyzed_at DESC
    LIMIT 30
  `);

  // Highest tension meetings
  const highTensionResult = await db.execute(sql`
    SELECT ms.meeting_id, mr.title, mr.meeting_date, ms.tension_level,
           ms.overall_sentiment, ms.conflict_topics
    FROM ime_meeting_sentiment ms
    LEFT JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE ${where}
    ORDER BY ms.tension_level DESC
    LIMIT 5
  `);

  // Speaker sentiment rankings
  const speakerResult = await db.execute(sql`
    SELECT ms.speaker_sentiments
    FROM ime_meeting_sentiment ms
    LEFT JOIN meeting_records mr ON ms.meeting_id = mr.id
    WHERE ${where} AND ms.speaker_sentiments IS NOT NULL
    ORDER BY ms.analyzed_at DESC
    LIMIT 50
  `);
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

