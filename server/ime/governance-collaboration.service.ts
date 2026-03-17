/**
 * G-IME: Governance, Collaboration & Advanced Analytics
 * 集成中心、系统设置、游戏化、反馈、合规、绩效联动、API管理、
 * 协作网络、会议必要性、参与者负荷、决策智能、议程分析、引导者分析服务
 */

import crypto from "crypto";
import { requireDb } from "../db";
import { sql, type SQL } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ime:governance");

/** Row returned by raw SQL via db.execute() — mirrors Drizzle's { [column: string]: any } constraint */
type DbRow = { [column: string]: any };

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
  const safeName = config.name;
  const safeConfig = JSON.stringify(config.config || {});
  const safeCreatedBy = (config.createdBy || "system");

  await db.execute(sql`
    INSERT INTO ime_integrations (name, integration_type, provider, config, sync_direction, sync_frequency, status, created_by, created_at, updated_at)
    VALUES (${safeName}, ${config.integrationType}, ${config.provider}, ${safeConfig}, ${config.syncDirection || "bidirectional"}, ${config.syncFrequency || "manual"}, 'active', ${safeCreatedBy}, NOW(), NOW())
  `);

  return { success: true, name: config.name };
}

// Phase 10 — Feature 2: Sync Integration
export async function syncIntegration(integrationId: number) {
  const db = await requireDb();
  const startTime = Date.now();

  // Get integration config
  const intRes = await db.execute(sql`SELECT * FROM ime_integrations WHERE id = ${integrationId} LIMIT 1000`);
  const integration = (intRes.rows as DbRow[])[0];
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
        const meetingsRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM meeting_records WHERE meeting_date >= NOW() - INTERVAL '30 days'`);
        recordsProcessed = Number((meetingsRes.rows as DbRow[])[0]?.cnt || 0);
        recordsSucceeded = recordsProcessed;
        details = { syncedMeetings: recordsProcessed, provider: integration.provider, direction: integration.sync_direction };
        break;
      }
      case "task_manager": {
        // Push action items to task management tool
        const actionsRes = await db.execute(sql`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending FROM ime_action_items WHERE created_at >= NOW() - INTERVAL '7 days'`);
        const actions = (actionsRes.rows as DbRow[])[0] || {};
        recordsProcessed = Number(actions.total || 0);
        recordsSucceeded = Number(actions.pending || 0);
        details = { totalItems: recordsProcessed, pendingPushed: recordsSucceeded, provider: integration.provider };
        break;
      }
      case "messaging": {
        // Push digest/alerts to messaging platform
        const alertsRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ime_digest_alerts WHERE created_at >= NOW() - INTERVAL '1 day'`);
        recordsProcessed = Number((alertsRes.rows as DbRow[])[0]?.cnt || 0);
        recordsSucceeded = recordsProcessed;
        details = { alertsSynced: recordsProcessed, provider: integration.provider, channel: config.channel || "default" };
        break;
      }
      case "webhook": {
        // Trigger webhook with latest meeting data
        const latestRes = await db.execute(sql`SELECT id, title FROM meeting_records ORDER BY meeting_date DESC LIMIT 5`);
        recordsProcessed = (latestRes.rows as DbRow[]).length;
        recordsSucceeded = recordsProcessed;
        details = { webhookUrl: config.url || "configured", meetingsIncluded: recordsProcessed };
        break;
      }
      case "email": {
        // Email digest sync
        const coachRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ime_coaching_plans WHERE generated_at >= NOW() - INTERVAL '7 days'`);
        recordsProcessed = Number((coachRes.rows as DbRow[])[0]?.cnt || 0);
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
  const safeName = (integration.name || "");
  const safeDetails = JSON.stringify(details);
  const safeError = errorMessage;

  // Log the sync operation
  await db.execute(sql`
    INSERT INTO ime_integration_logs (integration_id, integration_name, operation, direction, records_processed, records_succeeded, records_failed, details, status, error_message, duration_ms, executed_at)
    VALUES (${integrationId}, ${safeName}, 'sync', ${integration.sync_direction || "outbound"}, ${recordsProcessed}, ${recordsSucceeded}, ${recordsFailed}, ${safeDetails}, ${status}, ${safeError}, ${durationMs}, NOW())
  `);

  // Update integration last sync
  await db.execute(sql`
    UPDATE ime_integrations SET last_sync_at = NOW(), last_sync_status = ${status}, error_message = ${errorMessage ? `${safeError}` : "NULL"}, updated_at = NOW() WHERE id = ${integrationId}
  `);

  return { integrationId, status, recordsProcessed, recordsSucceeded, recordsFailed, durationMs, details };
}

// Phase 10 — Feature 3: Integration Dashboard
export async function getIntegrationDashboard() {
  const db = await requireDb();

  const integrationsRes = await db.execute(sql`SELECT * FROM ime_integrations ORDER BY created_at DESC LIMIT 1000`);

  const logsRes = await db.execute(sql`SELECT * FROM ime_integration_logs ORDER BY executed_at DESC LIMIT 50`);

  const statsRes = await db.execute(sql`
    SELECT COUNT(*) as total_syncs,
           SUM(records_processed) as total_records,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
           AVG(duration_ms) as avg_duration
    FROM ime_integration_logs
    WHERE executed_at >= NOW() - INTERVAL '30 days'
  `);

  const stats = (statsRes.rows as DbRow[])[0] || {};

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
  const safeKey = key;
  const safeValue = value;
  const safeType = (meta?.type || "string");
  const safeCat = (meta?.category || "general");
  const safeLabel = (meta?.label || key);
  const safeDesc = (meta?.description || "");
  const safeUser = (meta?.updatedBy || "system");

  // Upsert: check if exists
  const existing = await db.execute(sql`SELECT id FROM ime_system_settings WHERE setting_key = ${safeKey} LIMIT 1000`);

  if ((existing.rows as DbRow[]).length > 0) {
    await db.execute(sql`
      UPDATE ime_system_settings SET setting_value = ${safeValue}, setting_type = ${safeType}, category = ${safeCat}, label = ${safeLabel}, description = ${safeDesc}, updated_by = ${safeUser}, updated_at = NOW() WHERE setting_key = ${safeKey}
    `);
  } else {
    await db.execute(sql`
      INSERT INTO ime_system_settings (setting_key, setting_value, setting_type, category, label, description, updated_by, updated_at, created_at)
      VALUES (${safeKey}, ${safeValue}, ${safeType}, ${safeCat}, ${safeLabel}, ${safeDesc}, ${safeUser}, NOW(), NOW())
    `);
  }

  return { success: true, key, value };
}

// Phase 10 — Feature 5: Get System Settings
export async function getSystemSettings(category?: string) {
  const db = await requireDb();
  const where = category ? sql`WHERE category = ${category}` : sql``;
  const result = await db.execute(sql`SELECT * FROM ime_system_settings ${where} ORDER BY category, setting_key LIMIT 1000`);
  return result.rows;
}

// ============================================================================
// Phase 11: Meeting Gamification & Engagement
// ============================================================================

// Phase 11 — Feature 1: Evaluate Achievements for a User
export async function evaluateAchievements(userId: string) {
  const db = await requireDb();
  const safeUser = userId;

  // Ensure default achievement definitions exist
  const defsRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ime_achievements WHERE is_global = 1`);
  if (Number((defsRes.rows as DbRow[])[0]?.cnt || 0) === 0) {
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
      await db.execute(sql`
        INSERT INTO ime_achievements (achievement_key, name, description, icon, category, tier, criteria, points, is_global, created_at)
        VALUES (${d.key}, ${d.name}, ${d.desc}, ${d.icon}, ${d.cat}, ${d.tier}, ${JSON.stringify(d.criteria)}, ${d.points}, 1, NOW())
      `);
    }
  }

  // Get all definitions
  const allDefs = await db.execute(sql`SELECT * FROM ime_achievements WHERE is_global = 1 LIMIT 1000`);
  const definitions = allDefs.rows as DbRow[];

  // Get already awarded
  const awardedRes = await db.execute(sql`SELECT achievement_key FROM ime_achievements WHERE user_id = ${safeUser} AND is_global = 0 LIMIT 1000`);
  const awardedKeys = new Set((awardedRes.rows as DbRow[]).map((a: any) => a.achievement_key));

  // Compute user metrics
  const contribRes = await db.execute(sql`SELECT COUNT(*) as meetings_attended, SUM(CASE WHEN contribution_score >= 70 THEN 1 ELSE 0 END) as high_contribution_count FROM meeting_contributions WHERE speaker_name = ${safeUser} OR speaker_id = ${safeUser}`);
  const actionsRes = await db.execute(sql`SELECT COUNT(*) as completed FROM ime_action_items WHERE assigned_to = ${safeUser} AND status = 'completed'`);
  const effRes = await db.execute(sql`SELECT AVG(mes.overall_score) as avg_eff FROM meeting_effectiveness_scores mes JOIN meeting_records mr ON mes.meeting_id = mr.id`);
  const roiRes = await db.execute(sql`SELECT AVG(roi_score) as avg_roi FROM ime_meeting_roi`);

  const contribs = (contribRes.rows as DbRow[])[0] || {};
  const actions = (actionsRes.rows as DbRow[])[0] || {};
  const effData = (effRes.rows as DbRow[])[0] || {};
  const roiData = (roiRes.rows as DbRow[])[0] || {};

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
      await db.execute(sql`
        INSERT INTO ime_achievements (achievement_key, name, description, icon, category, tier, criteria, points, is_global, user_id, awarded_at, created_at)
        VALUES (${def.achievement_key}, ${(def.name || "")}, ${(def.description || "")}, ${def.icon || ""}, ${def.category}, ${def.tier}, '${(def.criteria || "{}")}', ${def.points}, 0, ${safeUser}, NOW(), NOW())
      `);
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

  const intervalDays = sql.raw(`'${periodDays} days'`);
  let result;
  switch (targetMetric) {
    case "contribution_score":
      result = await db.execute(sql`SELECT speaker_name as user_id, speaker_name as user_name, AVG(contribution_score) as score, COUNT(*) as meeting_count FROM meeting_contributions WHERE created_at >= NOW() - INTERVAL ${intervalDays} GROUP BY speaker_name ORDER BY score DESC LIMIT 20`);
      break;
    case "action_completion":
      result = await db.execute(sql`SELECT assigned_to as user_id, assigned_to as user_name, COUNT(*) as score FROM ime_action_items WHERE status = 'completed' AND created_at >= NOW() - INTERVAL ${intervalDays} GROUP BY assigned_to ORDER BY score DESC LIMIT 20`);
      break;
    case "effectiveness":
      result = await db.execute(sql`SELECT 'team' as user_id, 'Team Average' as user_name, AVG(overall_score) as score FROM meeting_effectiveness_scores WHERE created_at >= NOW() - INTERVAL ${intervalDays}`);
      break;
    default:
      result = await db.execute(sql`SELECT speaker_name as user_id, speaker_name as user_name, AVG(contribution_score) as score FROM meeting_contributions WHERE created_at >= NOW() - INTERVAL ${intervalDays} GROUP BY speaker_name ORDER BY score DESC LIMIT 20`);
  }
  const rows = result.rows as DbRow[];

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
  const safeTitle = challenge.title;
  const safeDesc = (challenge.description || "");
  const safeReward = (challenge.rewardDescription || "");
  const safeCreatedBy = (challenge.createdBy || "system");

  // Get baseline value
  let baseline = 0;
  switch (challenge.targetMetric) {
    case "avg_effectiveness": {
      const r = await db.execute(sql`SELECT AVG(overall_score) as v FROM meeting_effectiveness_scores WHERE created_at >= NOW() - INTERVAL '30 days'`);
      baseline = Number((r.rows as DbRow[])[0]?.v || 0);
      break;
    }
    case "avg_duration": {
      const r = await db.execute(sql`SELECT AVG(duration_minutes) as v FROM meeting_records WHERE meeting_date >= NOW() - INTERVAL '30 days'`);
      baseline = Number((r.rows as DbRow[])[0]?.v || 0);
      break;
    }
    case "action_completion_rate": {
      const r = await db.execute(sql`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done FROM ime_action_items WHERE created_at >= NOW() - INTERVAL '30 days'`);
      const row = (r.rows as DbRow[])[0] || {};
      baseline = row.total > 0 ? Math.round((Number(row.done) / Number(row.total)) * 100) : 0;
      break;
    }
    case "avg_cost": {
      const r = await db.execute(sql`SELECT AVG(total_cost) as v FROM ime_meeting_costs WHERE calculated_at >= NOW() - INTERVAL '30 days'`);
      baseline = Number((r.rows as DbRow[])[0]?.v || 0);
      break;
    }
  }

  await db.execute(sql`
    INSERT INTO ime_team_challenges (title, description, challenge_type, target_metric, target_value, current_value, baseline_value, scope, scope_id, start_date, end_date, status, reward_description, created_by, created_at, updated_at)
    VALUES (${safeTitle}, ${safeDesc}, ${challenge.challengeType}, ${challenge.targetMetric}, ${challenge.targetValue}, ${baseline}, ${baseline}, ${challenge.scope || "organization"}, ${challenge.scopeId ? `${challenge.scopeId}` : "NULL"}, ${challenge.startDate ? `${challenge.startDate}` : "NOW()"}, ${challenge.endDate ? `${challenge.endDate}` : "NOW() + INTERVAL '30 days'"}, 'active', ${safeReward}, ${safeCreatedBy}, NOW(), NOW())
  `);

  return { success: true, title: challenge.title, baseline };
}

// Phase 11 — Feature 4: Update Challenge Progress
export async function updateChallengeProgress(challengeId: number) {
  const db = await requireDb();
  const chalRes = await db.execute(sql`SELECT * FROM ime_team_challenges WHERE id = ${challengeId} LIMIT 1000`);
  const challenge = (chalRes.rows as DbRow[])[0];
  if (!challenge) throw new Error("Challenge not found");

  let currentValue = 0;
  switch (challenge.target_metric) {
    case "avg_effectiveness": {
      const r = await db.execute(sql`SELECT AVG(overall_score) as v FROM meeting_effectiveness_scores WHERE created_at >= ${challenge.start_date}`);
      currentValue = Number((r.rows as DbRow[])[0]?.v || 0);
      break;
    }
    case "avg_duration": {
      const r = await db.execute(sql`SELECT AVG(duration_minutes) as v FROM meeting_records WHERE meeting_date >= ${challenge.start_date}`);
      currentValue = Number((r.rows as DbRow[])[0]?.v || 0);
      break;
    }
    case "action_completion_rate": {
      const r = await db.execute(sql`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done FROM ime_action_items WHERE created_at >= ${challenge.start_date}`);
      const row = (r.rows as DbRow[])[0] || {};
      currentValue = row.total > 0 ? Math.round((Number(row.done) / Number(row.total)) * 100) : 0;
      break;
    }
    case "avg_cost": {
      const r = await db.execute(sql`SELECT AVG(total_cost) as v FROM ime_meeting_costs WHERE calculated_at >= ${challenge.start_date}`);
      currentValue = Number((r.rows as DbRow[])[0]?.v || 0);
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
  const defsRes = await db.execute(sql`SELECT * FROM ime_achievements WHERE is_global = 1 ORDER BY points ASC LIMIT 1000`);

  // User awards
  const awardsRes = userId
    ? await db.execute(sql`SELECT * FROM ime_achievements WHERE user_id = ${userId} AND is_global = 0 ORDER BY awarded_at DESC LIMIT 1000`)
    : await db.execute(sql`SELECT * FROM ime_achievements WHERE is_global = 0 ORDER BY awarded_at DESC LIMIT 1000`);

  // Total points
  const pointsRes = userId
    ? await db.execute(sql`SELECT user_id, SUM(points) as total_points, COUNT(*) as badge_count FROM ime_achievements WHERE is_global = 0 AND user_id = ${userId}`)
    : await db.execute(sql`SELECT SUM(points) as total_points, COUNT(*) as badge_count FROM ime_achievements WHERE is_global = 0 GROUP BY user_id ORDER BY total_points DESC LIMIT 10`);

  // Active challenges
  const challengesRes = await db.execute(sql`SELECT * FROM ime_team_challenges WHERE status = 'active' ORDER BY created_at DESC LIMIT 1000`);

  // Recent completions
  const recentRes = await db.execute(sql`SELECT * FROM ime_team_challenges WHERE status = 'completed' ORDER BY updated_at DESC LIMIT 5`);

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

  const avgRes = await db.execute(sql`
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
  `);

  const avg = (avgRes.rows as DbRow[])[0] || {};
  const total = Number(avg.total_responses || 0);
  const nps = total > 0
    ? Math.round(((Number(avg.promoters || 0) - Number(avg.detractors || 0)) / total) * 100)
    : 0;

  // Get previous period for trend
  const prevRes = await db.execute(sql`
    SELECT AVG(overall_rating) as prev_avg
    FROM ime_meeting_feedback
    WHERE submitted_at >= NOW() - INTERVAL '${periodDays * 2} days' AND submitted_at < NOW() - INTERVAL '${periodDays} days'
  `);
  const prevAvg = Number((prevRes.rows as DbRow[])[0]?.prev_avg || 0);
  const currentAvg = Number(avg.avg_overall || 0);
  const trend = currentAvg > prevAvg + 0.1 ? "up" : currentAvg < prevAvg - 0.1 ? "down" : "stable";

  // Common feedback themes (top highlights and improvements)
  const highlightsRes = await db.execute(sql`SELECT highlights FROM ime_meeting_feedback WHERE highlights != '' AND submitted_at >= NOW() - INTERVAL '${periodDays} days' ORDER BY submitted_at DESC LIMIT 20`);
  const improvementsRes = await db.execute(sql`SELECT improvements FROM ime_meeting_feedback WHERE improvements != '' AND submitted_at >= NOW() - INTERVAL '${periodDays} days' ORDER BY submitted_at DESC LIMIT 20`);

  // Save analytics snapshot
  await db.execute(sql`
    INSERT INTO ime_feedback_analytics (scope, scope_id, period, total_responses, avg_overall_rating, avg_content_relevance, avg_time_efficiency, avg_facilitation, avg_action_clarity, nps_score, top_highlights, top_improvements, trend_direction, analyzed_at)
    VALUES (${filters?.scope || "organization"}, ${filters?.scopeId ? `${filters.scopeId}` : "NULL"}, ${filters?.period || "monthly"}, ${total}, ${currentAvg.toFixed(2)}, ${Number(avg.avg_content || 0).toFixed(2)}, ${Number(avg.avg_time || 0).toFixed(2)}, ${Number(avg.avg_facilitation || 0).toFixed(2)}, ${Number(avg.avg_action || 0).toFixed(2)}, ${nps}, ${JSON.stringify((highlightsRes.rows as DbRow[]).map((r: any) => r.highlights).slice(0, 5))}, ${JSON.stringify((improvementsRes.rows as DbRow[]).map((r: any) => r.improvements).slice(0, 5))}, ${trend}, NOW())
  `);

  return {
    totalResponses: total,
    avgOverall: Number(currentAvg.toFixed(2)),
    avgContent: Number(Number(avg.avg_content || 0).toFixed(2)),
    avgTime: Number(Number(avg.avg_time || 0).toFixed(2)),
    avgFacilitation: Number(Number(avg.avg_facilitation || 0).toFixed(2)),
    avgAction: Number(Number(avg.avg_action || 0).toFixed(2)),
    npsScore: nps,
    trend,
    topHighlights: (highlightsRes.rows as DbRow[]).map((r: any) => r.highlights).slice(0, 5),
    topImprovements: (improvementsRes.rows as DbRow[]).map((r: any) => r.improvements).slice(0, 5),
  };
}

// Phase 12 — Feature 3: Generate Improvement Initiative (AI-powered)
export async function generateImprovementInitiative(scope: string, scopeId?: string) {
  const db = await requireDb();

  // Gather recent feedback data
  const fbRes = await db.execute(sql`SELECT AVG(overall_rating) as avg_rating, AVG(content_relevance) as avg_content, AVG(time_efficiency) as avg_time, AVG(facilitation) as avg_fac, AVG(action_clarity) as avg_action, COUNT(*) as cnt FROM ime_meeting_feedback WHERE submitted_at >= NOW() - INTERVAL '30 days'`);
  const improvRes = await db.execute(sql`SELECT improvements FROM ime_meeting_feedback WHERE improvements != '' AND submitted_at >= NOW() - INTERVAL '30 days' ORDER BY submitted_at DESC LIMIT 15`);
  const healthRes = await db.execute(sql`SELECT AVG(health_score) as avg_health FROM ime_meeting_health WHERE assessed_at >= NOW() - INTERVAL '30 days'`);

  const fb = (fbRes.rows as DbRow[])[0] || {};
  const health = (healthRes.rows as DbRow[])[0] || {};
  const improvementTexts = (improvRes.rows as DbRow[]).map((r: any) => r.improvements);

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
  const safeScopeId = (scopeId || "");

  for (const init of (parsed.initiatives || [])) {
    await db.execute(sql`
      INSERT INTO ime_improvement_initiatives (title, description, category, priority, source, scope, scope_id, target_metric, status, ai_narrative, created_by, created_at, updated_at)
      VALUES (${(init.title || "")}, ${(init.description || "")}, ${init.category || "general"}, ${init.priority || "P2"}, 'ai_analysis', ${scope}, ${scopeId ? `${safeScopeId}` : "NULL"}, ${init.target_metric ? `${init.target_metric}` : "NULL"}, 'proposed', ${(parsed.narrative || "")}, 'ai', NOW(), NOW())
    `);
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
  const commentsRes = await db.execute(sql`SELECT highlights, improvements, suggestions, overall_rating FROM ime_meeting_feedback WHERE meeting_id = ${meetingId} ORDER BY submitted_at DESC LIMIT 1000`);

  const stats = (fbRes.rows as DbRow[])[0] || {};
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

  const statsRes = await db.execute(sql`
    SELECT COUNT(*) as total, AVG(overall_rating) as avg_rating,
           SUM(CASE WHEN would_recommend = 1 THEN 1 ELSE 0 END) as promoters,
           SUM(CASE WHEN would_recommend = 0 THEN 1 ELSE 0 END) as detractors
    FROM ime_meeting_feedback WHERE submitted_at >= NOW() - INTERVAL '${periodDays} days'
  `);

  const analyticsRes = await db.execute(sql`SELECT * FROM ime_feedback_analytics ORDER BY analyzed_at DESC LIMIT 10`);

  const initiativesRes = await db.execute(sql`SELECT * FROM ime_improvement_initiatives ORDER BY created_at DESC LIMIT 20`);

  const recentFbRes = await db.execute(sql`SELECT mf.*, mr.title as meeting_title FROM ime_meeting_feedback mf LEFT JOIN meeting_records mr ON mf.meeting_id = mr.id ORDER BY mf.submitted_at DESC LIMIT 10`);

  const stats = (statsRes.rows as DbRow[])[0] || {};
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
  const safeName = policy.name;
  const safeDesc = (policy.description || "");
  const safeCreatedBy = (policy.createdBy || "system");

  await db.execute(sql`
    INSERT INTO ime_compliance_policies (name, description, policy_type, check_field, operator, threshold, severity, scope, scope_id, is_active, created_by, created_at, updated_at)
    VALUES (${safeName}, ${safeDesc}, ${policy.policyType}, ${policy.checkField ? `${policy.checkField}` : "NULL"}, ${policy.operator ? `${policy.operator}` : "NULL"}, ${policy.threshold ? `${policy.threshold}` : "NULL"}, ${policy.severity || "warning"}, ${policy.scope || "global"}, ${policy.scopeId ? `${policy.scopeId}` : "NULL"}, 1, ${safeCreatedBy}, NOW(), NOW())
  `);

  return { success: true, name: policy.name };
}

// Phase 13 — Feature 2: Audit Meeting Compliance
export async function auditMeetingCompliance(meetingId: string) {
  const db = await requireDb();

  // Get meeting data
  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as DbRow[])[0];
  if (!meeting) throw new Error("Meeting not found");

  // Get related data
  const effRes = await db.execute(sql`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId} LIMIT 1`);
  const actionRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ime_action_items WHERE meeting_id = ${meetingId}`);
  const contribRes = await db.execute(sql`SELECT COUNT(DISTINCT speaker_name) as participants FROM meeting_contributions WHERE meeting_id = ${meetingId}`);

  const eff = (effRes.rows as DbRow[])[0];
  const actionCount = Number((actionRes.rows as DbRow[])[0]?.cnt || 0);
  const participantCount = Number((contribRes.rows as DbRow[])[0]?.participants || 0);

  const meetingData: Record<string, any> = {
    duration_minutes: Number(meeting.duration_minutes || 0),
    participant_count: participantCount,
    has_agenda: meeting.agenda ? 1 : 0,
    has_summary: meeting.summary ? 1 : 0,
    action_item_count: actionCount,
    effectiveness_score: eff ? Number(eff.overall_score || 0) : null,
  };

  // Get active policies
  const policiesRes = await db.execute(sql`SELECT * FROM ime_compliance_policies WHERE is_active = 1 LIMIT 1000`);
  const policies = policiesRes.rows as DbRow[];

  const results: any[] = [];
  const safeTitle = (meeting.title || "");

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

  const policiesRes = await db.execute(sql`SELECT * FROM ime_compliance_policies WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1000`);

  const statsRes = await db.execute(sql`
    SELECT COUNT(*) as total, SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed,
           SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as failed,
           SUM(CASE WHEN result = 'fail' AND severity = 'critical' THEN 1 ELSE 0 END) as critical,
           SUM(CASE WHEN result = 'fail' AND severity = 'violation' THEN 1 ELSE 0 END) as violations,
           COUNT(DISTINCT meeting_id) as meetings_audited
    FROM ime_compliance_audits WHERE audited_at >= NOW() - INTERVAL '${periodDays} days'
  `);

  const topViolationsRes = await db.execute(sql`
    SELECT policy_name, policy_type, severity, COUNT(*) as cnt
    FROM ime_compliance_audits
    WHERE result = 'fail' AND audited_at >= NOW() - INTERVAL '${periodDays} days'
    GROUP BY policy_name, policy_type, severity ORDER BY cnt DESC LIMIT 10
  `);

  const recentAuditsRes = await db.execute(sql`SELECT * FROM ime_compliance_audits WHERE result = 'fail' ORDER BY audited_at DESC LIMIT 20`);

  const stats = (statsRes.rows as DbRow[])[0] || {};
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

  const statsRes = await db.execute(sql`
    SELECT COUNT(DISTINCT meeting_id) as meetings, COUNT(*) as checks,
           SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed,
           SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as failed
    FROM ime_compliance_audits WHERE audited_at >= NOW() - INTERVAL '${periodDays} days'
  `);
  const violationsRes = await db.execute(sql`
    SELECT policy_name, policy_type, severity, COUNT(*) as cnt
    FROM ime_compliance_audits WHERE result = 'fail' AND audited_at >= NOW() - INTERVAL '${periodDays} days'
    GROUP BY policy_name, policy_type, severity ORDER BY cnt DESC LIMIT 5
  `);

  const stats = (statsRes.rows as DbRow[])[0] || {};
  const violations = violationsRes.rows as DbRow[];
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

  await db.execute(sql`
    INSERT INTO ime_governance_reports (period, period_start, period_end, total_meetings_audited, compliance_rate, total_violations, total_warnings, top_violations, risk_areas, recommendations, ai_narrative, generated_at)
    VALUES (${period || "monthly"}, NOW() - INTERVAL '${periodDays} days', NOW(), ${stats.meetings || 0}, ${complianceRate}, ${failed}, 0, '${JSON.stringify(violations.map((v: any) => ({ policyName: v.policy_name, count: v.cnt, severity: v.severity })))}', ${JSON.stringify(parsed.risk_areas || [])}, ${JSON.stringify(parsed.recommendations || [])}, ${(parsed.narrative || "")}, NOW())
  `);

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
    const safeId = meetingId;
    const result = await db.execute(sql`SELECT * FROM ime_compliance_audits WHERE meeting_id = ${safeId} ORDER BY audited_at DESC LIMIT 1000`);
    return result.rows;
  }
  // Governance reports
  const reports = await db.execute(sql`SELECT * FROM ime_governance_reports ORDER BY generated_at DESC LIMIT 10`);
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
  const safeName = input.name;
  const safeDesc = (input.description || "");
  const safeField = (input.conditionField || "");
  const safeTarget = (input.actionTarget || "");
  const safeValue = (input.actionValue || "");
  const safeActDesc = (input.actionDescription || "");
  const safeScopeId = (input.scopeId || "");
  const safeDim = (input.impactDimension || "");
  const safeCreatedBy = (input.createdBy || "system");

  const result = await db.execute(sql`
    INSERT INTO ime_linkage_rules (name, description, condition_type, condition_field, condition_operator, condition_threshold, action_type, action_target, action_value, action_description, scope, scope_id, impact_dimension, priority, is_active, created_by, created_at, updated_at)
    VALUES (${safeName}, ${safeDesc}, ${input.conditionType}, ${safeField}, ${input.conditionOperator}, ${input.conditionThreshold}, ${input.actionType}, ${safeTarget}, ${safeValue}, ${safeActDesc}, ${input.scope || "individual"}, ${safeScopeId}, ${safeDim}, ${input.priority || 0}, 1, ${safeCreatedBy}, NOW(), NOW())
    RETURNING *
  `);
  return result.rows[0];
}

export async function listLinkageRules(activeOnly?: boolean) {
  const db = await requireDb();
  const where = activeOnly ? "WHERE is_active = 1" : "";
  const result = await db.execute(sql`SELECT * FROM ime_linkage_rules ${where} ORDER BY priority DESC, created_at DESC LIMIT 1000`);
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
    const contribs = await db.execute(sql`SELECT * FROM meeting_contributions WHERE meeting_id = ${meetingId} LIMIT 1000`);
    const contributions = contribs.rows as DbRow[];

    // 2. Get AI analysis
    const analysis = await db.execute(sql`SELECT * FROM ime_ai_analysis WHERE meeting_id = ${meetingId} LIMIT 1000`);
    const analyses = analysis.rows as DbRow[];

    // 3. Get HR signals for participants
    const signals = await db.execute(sql`SELECT * FROM ime_hr_signals WHERE meeting_id = ${meetingId} LIMIT 1000`);
    const hrSignals = signals.rows as DbRow[];

    // 4. Load active rules ordered by priority
    const rulesResult = await db.execute(sql`SELECT * FROM ime_linkage_rules WHERE is_active = 1 ORDER BY priority DESC LIMIT 1000`);
    const rules = rulesResult.rows as DbRow[];

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
    const meetingTitle = (meetingResult.rows[0] as DbRow | undefined)?.title || meetingId;

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
  const conditions: SQL[] = [];
  if (filters?.status) conditions.push(sql`status = ${filters.status}`);
  if (filters?.employeeId) conditions.push(sql`employee_id = ${filters.employeeId}`);
  if (filters?.actionType) conditions.push(sql`action_type = ${filters.actionType}`);
  if (filters?.department) conditions.push(sql`department LIKE ${'%' + filters.department + '%'}`);
  if (filters?.dateFrom) conditions.push(sql`created_at >= ${filters.dateFrom}`);
  if (filters?.dateTo) conditions.push(sql`created_at <= ${filters.dateTo}`);
  const where = conditions.length > 0 ? sql` WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
  const result = await db.execute(sql`SELECT * FROM ime_hr_actions ${where} ORDER BY created_at DESC LIMIT 200`);
  return result.rows;
}

export async function approveHrAction(id: number, reviewedBy: string, notes?: string) {
  const db = await requireDb();
  const safeReviewer = reviewedBy;
  const safeNotes = (notes || "");
  await db.execute(sql`
    UPDATE ime_hr_actions SET status = 'approved', reviewed_by = ${safeReviewer}, reviewed_at = NOW(), review_notes = ${safeNotes}, updated_at = NOW()
    WHERE id = ${id} AND status = 'pending'
  `);
  return { success: true };
}

export async function rejectHrAction(id: number, reviewedBy: string, notes?: string) {
  const db = await requireDb();
  const safeReviewer = reviewedBy;
  const safeNotes = (notes || "");
  await db.execute(sql`
    UPDATE ime_hr_actions SET status = 'rejected', reviewed_by = ${safeReviewer}, reviewed_at = NOW(), review_notes = ${safeNotes}, updated_at = NOW()
    WHERE id = ${id} AND status = 'pending'
  `);
  return { success: true };
}

// ============================================================================
// Phase 14: HR & Performance Linkage — Execution
// ============================================================================

export async function executeHrActions(actionIds: number[]) {
  const db = await requireDb();
  const results: any[] = [];

  for (const actionId of actionIds) {
    const actionResult = await db.execute(sql`SELECT * FROM ime_hr_actions WHERE id = ${actionId} AND status = 'approved' LIMIT 1000`);
    const action = actionResult.rows[0] as DbRow | undefined;
    if (!action) {
      results.push({ id: actionId, success: false, error: "Action not found or not approved" });
      continue;
    }

    let executionResult: any = { executed: true };
    try {
      switch (action.action_type) {
        case "update_kpi": {
          await db.execute(sql`
            INSERT INTO kpi_score_records (employee_id, dimension, score, source, notes, created_at)
            VALUES (${action.employee_id}, ${(action.impact_dimension || "meeting_contribution")}, ${Number(action.impact_value) || 0}, 'ime_linkage', ${(action.reason || "")}, NOW())
          `);
          executionResult = { type: "update_kpi", dimension: action.impact_dimension, value: action.impact_value };
          break;
        }
        case "flag_training": {
          await db.execute(sql`
            INSERT INTO hrm_training_plans (employee_id, training_type, title, reason, status, created_at)
            VALUES (${action.employee_id}, 'skills', ${(action.action_description || "Training Required")}, ${(action.reason || "")}, 'planned', NOW())
          `);
          executionResult = { type: "flag_training", description: action.action_description };
          break;
        }
        case "add_achievement": {
          await db.execute(sql`
            INSERT INTO performance_traces (employee_id, metric, value, source, notes, traced_at)
            VALUES (${action.employee_id}, 'achievement_tag', ${(action.action_value || "meeting_excellence")}, 'ime_linkage', ${(action.reason || "")}, NOW())
          `);
          executionResult = { type: "add_achievement", tag: action.action_value };
          break;
        }
        case "adjust_score": {
          await db.execute(sql`
            INSERT INTO kpi_score_records (employee_id, dimension, score, source, notes, created_at)
            VALUES (${action.employee_id}, ${(action.impact_dimension || "performance_adjustment")}, ${Number(action.impact_value) || 0}, 'ime_linkage_adjust', ${(action.reason || "")}, NOW())
          `);
          executionResult = { type: "adjust_score", dimension: action.impact_dimension, value: action.impact_value };
          break;
        }
        case "create_key_result": {
          await db.execute(sql`
            INSERT INTO performance_traces (employee_id, metric, value, source, notes, traced_at)
            VALUES (${action.employee_id}, 'key_result_in_progress', ${(action.action_value || "")}, 'ime_linkage', ${(action.reason || "")}, NOW())
          `);
          executionResult = { type: "create_key_result", value: action.action_value };
          break;
        }
        case "coaching_suggestion": {
          await db.execute(sql`
            INSERT INTO kpi_communication_suggestions (employee_id, suggestion_type, content, source, created_at)
            VALUES (${action.employee_id}, 'coaching', ${(action.action_description || "")}, 'ime_linkage', NOW())
          `);
          executionResult = { type: "coaching_suggestion", content: action.action_description };
          break;
        }
        default:
          executionResult = { type: action.action_type, note: "No specific handler, marked as executed" };
      }

      await db.execute(sql`
        UPDATE ime_hr_actions SET status = 'executed', executed_at = NOW(), execution_result = ${JSON.stringify(executionResult)}, updated_at = NOW()
        WHERE id = ${actionId}
      `);
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
  const deptFilter = department ? sql`AND department LIKE ${'%' + department + '%'}` : sql``;

  // Active rules count
  const rulesCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM ime_linkage_rules WHERE is_active = 1`);
  const activeRules = Number((rulesCount.rows[0] as DbRow | undefined)?.cnt || 0);

  // Actions by status
  const statusCounts = await db.execute(sql`SELECT status, COUNT(*) as cnt FROM ime_hr_actions WHERE 1=1 ${deptFilter} GROUP BY status`);
  const statusMap: Record<string, number> = {};
  for (const row of statusCounts.rows as DbRow[]) {
    statusMap[row.status] = Number(row.cnt);
  }

  const pendingActions = statusMap["pending"] || 0;
  const approvedActions = statusMap["approved"] || 0;
  const rejectedActions = statusMap["rejected"] || 0;
  const executedActions = statusMap["executed"] || 0;
  const totalReviewed = approvedActions + rejectedActions + executedActions;
  const approvalRate = totalReviewed > 0 ? Math.round(((approvedActions + executedActions) / totalReviewed) * 100) : 0;

  // By action type distribution
  const byType = await db.execute(sql`SELECT action_type, COUNT(*) as cnt FROM ime_hr_actions WHERE 1=1 ${deptFilter} GROUP BY action_type ORDER BY cnt DESC`);

  // Recent actions
  const recent = await db.execute(sql`SELECT * FROM ime_hr_actions WHERE 1=1 ${deptFilter} ORDER BY created_at DESC LIMIT 10`);

  // Top impacted employees
  const topImpacted = await db.execute(sql`SELECT employee_id, employee_name, department, COUNT(*) as action_count FROM ime_hr_actions WHERE 1=1 ${deptFilter} GROUP BY employee_id, employee_name, department ORDER BY action_count DESC LIMIT 10`);

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

  const id = (result.rows[0] as DbRow | undefined)?.id;
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

  const row = result.rows[0] as DbRow;
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

  const result = await db.execute(sql`SELECT COUNT(*) as cnt FROM ime_api_usage_logs
     WHERE api_key_id = ${apiKeyId}
     AND requested_at >= NOW() - INTERVAL ${sql.raw(`'${interval}'`)}`);

  const currentCount = Number((result.rows[0] as DbRow | undefined)?.cnt || 0);
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

  const totals = await db.execute(sql`SELECT
       COUNT(*) as total_requests,
       SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as success_count,
       AVG(response_time_ms) as avg_response_time
     FROM ime_api_usage_logs
     WHERE api_key_id = ${apiKeyId}
     LIMIT 1000
     AND requested_at >= NOW() - INTERVAL ${sql.raw(`'${days}'`)} DAY`);

  const stats = totals.rows[0] as DbRow | undefined;
  const totalRequests = Number(stats?.total_requests || 0);
  const successCount = Number(stats?.success_count || 0);
  const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 100;
  const avgResponseTime = Math.round(Number(stats?.avg_response_time || 0));

  const byDay = await db.execute(sql`SELECT DATE(requested_at) as day, COUNT(*) as cnt
     FROM ime_api_usage_logs
     WHERE api_key_id = ${apiKeyId}
     AND requested_at >= NOW() - INTERVAL ${sql.raw(`'${days}'`)} DAY
     GROUP BY DATE(requested_at)
     ORDER BY day`);

  const topEndpoints = await db.execute(sql`SELECT endpoint, method, COUNT(*) as cnt,
       AVG(response_time_ms) as avg_time
     FROM ime_api_usage_logs
     WHERE api_key_id = ${apiKeyId}
     AND requested_at >= NOW() - INTERVAL ${sql.raw(`'${days}'`)} DAY
     GROUP BY endpoint, method
     ORDER BY cnt DESC
     LIMIT 10`);

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

  const keyCounts = await db.execute(sql`SELECT
       COUNT(*) as total_keys,
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_keys
       LIMIT 1000
     FROM ime_api_keys`);

  const requestCounts = await db.execute(sql`SELECT COUNT(*) as total_requests FROM ime_api_usage_logs`);

  const todayCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM ime_api_usage_logs
     WHERE requested_at >= CURRENT_DATE`);

  const errorRate = await db.execute(sql`SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
       LIMIT 1000
     FROM ime_api_usage_logs`);

  const kc = keyCounts.rows[0] as DbRow | undefined;
  const rc = requestCounts.rows[0] as DbRow | undefined;
  const tc = todayCount.rows[0] as DbRow | undefined;
  const er = errorRate.rows[0] as DbRow | undefined;

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
  const result = await db.execute(sql`SELECT * FROM ime_api_usage_logs ORDER BY requested_at DESC LIMIT ${limit}`);
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
  await db.execute(sql`DELETE FROM ime_collaboration_edges`);

  // Build date filter
  const dateConditions: SQL[] = [sql`1=1`];
  if (options?.dateFrom) dateConditions.push(sql`mr.meeting_date >= ${options.dateFrom}`);
  if (options?.dateTo) dateConditions.push(sql`mr.meeting_date <= ${options.dateTo}`);
  const dateFilter = sql.join(dateConditions, sql` AND `);

  // Get all meetings with their participants
  const meetingsResult = await db.execute(sql`
    SELECT mc.meeting_id, mc.employee_name, mc.employee_id, mc.department,
           mr.duration_minutes, mr.meeting_date,
           (SELECT COUNT(DISTINCT mc2.employee_name) FROM meeting_contributions mc2 WHERE mc2.meeting_id = mc.meeting_id) as participant_count
    FROM meeting_contributions mc
    JOIN meeting_records mr ON mr.id = mc.meeting_id
    WHERE ${dateFilter}
    ORDER BY mc.meeting_id, mc.employee_name
  `);

  const rows = meetingsResult.rows as DbRow[];

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
    deptFilter = ` WHERE department_a = ${filters.department} OR department_b = ${filters.department}`;
  }

  const result = await db.execute(sql`
    SELECT
      COUNT(*) as total_edges,
      COALESCE(AVG(collaboration_score), 0) as avg_score,
      COALESCE(SUM(CASE WHEN relationship_type = 'cross_dept' THEN 1 ELSE 0 END), 0) as cross_dept_edges,
      COALESCE(SUM(CASE WHEN relationship_type = 'same_dept' THEN 1 ELSE 0 END), 0) as same_dept_edges
    FROM ime_collaboration_edges ${deptFilter}
  `);

  const row = result.rows[0] as DbRow | undefined;
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
    deptFilter = ` WHERE department_a = ${options.department} OR department_b = ${options.department}`;
  }

  const edgeStats = await db.execute(sql`
    SELECT
      COUNT(*) as total_edges,
      COALESCE(AVG(meeting_count), 0) as avg_meetings_per_edge,
      COALESCE(AVG(collaboration_score), 0) as avg_score,
      COALESCE(MAX(collaboration_score), 0) as max_score,
      COALESCE(SUM(CASE WHEN relationship_type = 'cross_dept' THEN 1 ELSE 0 END), 0) as cross_dept_edges,
      COALESCE(SUM(CASE WHEN relationship_type = 'same_dept' THEN 1 ELSE 0 END), 0) as same_dept_edges
    FROM ime_collaboration_edges ${deptFilter}
  `);

  const participantsResult = await db.execute(sql`
    SELECT COUNT(DISTINCT p) as cnt FROM (
      SELECT participant_a as p FROM ime_collaboration_edges ${deptFilter}
      UNION
      SELECT participant_b as p FROM ime_collaboration_edges ${deptFilter}
    ) sub
  `);

  const es = edgeStats.rows[0] as DbRow | undefined;
  const totalEdges = Number(es?.total_edges || 0);

  return {
    totalEdges,
    uniqueParticipants: Number((participantsResult.rows[0] as DbRow | undefined)?.cnt || 0),
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

  const result = await db.execute(sql`
    SELECT department_a, department_b,
           COUNT(*) as edge_count,
           SUM(collaboration_score) as total_score,
           SUM(meeting_count) as total_meetings
    FROM ime_collaboration_edges
    WHERE department_a IS NOT NULL AND department_b IS NOT NULL
      AND department_a != '' AND department_b != ''
    GROUP BY department_a, department_b
    ORDER BY total_score DESC
  `);

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
    whereClause += ` AND relationship_type = ${options.relationshipType}`;
  }
  if (options?.department) {
    whereClause += ` AND (department_a = ${options.department} OR department_b = ${options.department})`;
  }

  const result = await db.execute(sql`
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
  `);

  return result.rows;
}

/**
 * Cross-department metrics: per-department breakdown of internal vs external edges.
 */
export async function getCrossDepartmentMetrics(departments?: string[]) {
  const db = await requireDb();

  let deptFilter = "";
  if (departments && departments.length > 0) {
    const deptList = departments.map(d => `${d}`).join(",");
    deptFilter = ` AND dept IN (${deptList})`;
  }

  const result = await db.execute(sql`
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
  `);

  return result.rows;
}

/**
 * Detect collaboration silos: departments with <20% cross-dept collaboration.
 */
export async function detectCollaborationSilos(options?: { threshold?: number }) {
  const db = await requireDb();
  const threshold = options?.threshold || 20;

  const result = await db.execute(sql`
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
  `);

  return (result.rows as DbRow[]).map((row: any) => {
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
  const meeting = (meetingResult.rows as DbRow[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // Get participants
  const participantsResult = await db.execute(sql`
    SELECT DISTINCT employee_name, department
    FROM meeting_contributions WHERE meeting_id = ${meetingId}
  `);
  const participants = participantsResult.rows as DbRow[];

  // Get action items count
  const actionsResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM meeting_action_items WHERE meeting_id = ${meetingId}
  `);
  const actionCount = Number((actionsResult.rows[0] as DbRow | undefined)?.cnt || 0);

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

    scores = JSON.parse((result as { content: string }).content);
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
    whereClause = ` AND mns.necessity_grade = ${options.grade}`;
  }
  const limit = options?.limit || 50;

  const result = await db.execute(sql`
    SELECT mns.*, mr.title as meeting_title, mr.meeting_date, mr.duration_minutes
    FROM ime_meeting_necessity_scores mns
    LEFT JOIN meeting_records mr ON mr.id = mns.meeting_id
    WHERE 1=1 ${whereClause}
    ORDER BY mns.analyzed_at DESC
    LIMIT ${limit}
  `);

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
  const result = await db.execute(sql`
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
    WHERE mr.meeting_date >= ${dateFrom}
      AND mr.meeting_date <= ${dateTo}
    ORDER BY mc.employee_id, mr.meeting_date, mr.start_time
  `);

  const rows = result.rows as DbRow[];
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
  await db.execute(sql`
    DELETE FROM ime_participant_workload
    WHERE period_type = ${periodType}
      AND period_start = ${periodStart.toISOString()}
      AND period_end = ${periodEnd.toISOString()}
  `);

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
    await db.execute(sql`
      INSERT INTO ime_participant_workload
        (employee_id, employee_name, department, period_type, period_start, period_end,
         meeting_count, total_meeting_minutes, avg_meeting_duration, max_meeting_duration,
         back_to_back_count, back_to_back_ratio, focus_time_minutes, meeting_density,
         longest_focus_block, meetings_before_noon, meetings_after_noon, unique_collaborators,
         load_score, risk_level, computed_at)
      VALUES
        (${r.employeeId}, ${r.employeeName}, ${r.department ? `${r.department}` : "NULL"},
         ${r.periodType}, ${r.periodStart}, ${r.periodEnd},
         ${r.meetingCount}, ${r.totalMinutes}, ${r.avgDuration}, ${r.maxDuration},
         ${r.backToBackCount}, ${r.backToBackRatio}, ${r.focusTimeMinutes}, ${r.meetingDensity},
         ${r.longestFocusBlock}, ${r.meetingsBeforeNoon}, ${r.meetingsAfterNoon}, ${r.uniqueCollaborators},
         ${r.loadScore}, ${r.riskLevel}, NOW())
    `);
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
    deptFilter = ` AND department = ${filters.department}`;
  }

  const result = await db.execute(sql`
    SELECT
      ROUND(AVG(total_meeting_minutes) / 60.0, 1) as avg_weekly_hours,
      COUNT(CASE WHEN load_score > 60 THEN 1 END) as overloaded_count,
      ROUND(AVG(focus_time_minutes), 0) as avg_focus_time_minutes,
      ROUND(AVG(load_score), 0) as avg_load_score,
      COUNT(*) as total_employees
    FROM ime_participant_workload
    WHERE period_type = ${periodType} ${deptFilter}
  `);

  const stats = (result.rows as DbRow[])[0] || {};
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
    whereExtra += ` AND department = ${options.department}`;
  }
  if (options?.riskLevel) {
    whereExtra += ` AND risk_level = ${options.riskLevel}`;
  }

  const result = await db.execute(sql`
    SELECT *
    FROM ime_participant_workload
    WHERE period_type = ${periodType} ${whereExtra}
    ORDER BY load_score DESC
    LIMIT ${limit}
  `);

  return result.rows;
}

/**
 * Load trends — time-series avg load score grouped by period.
 */
export async function getLoadTrends(options?: { periodType?: string; limit?: number }) {
  const db = await requireDb();
  const periodType = options?.periodType || "weekly";
  const limit = options?.limit || 20;

  const result = await db.execute(sql`
    SELECT
      period_start,
      ROUND(AVG(load_score), 1) as avg_load_score,
      ROUND(AVG(total_meeting_minutes), 0) as avg_meeting_minutes,
      COUNT(*) as employee_count
    FROM ime_participant_workload
    WHERE period_type = ${periodType}
    GROUP BY period_start
    ORDER BY period_start DESC
    LIMIT ${limit}
  `);

  return (result.rows as DbRow[]).reverse();
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

  const result = await db.execute(sql`
    SELECT *
    FROM ime_participant_workload
    WHERE period_type = ${periodType}
      AND load_score >= ${threshold}
    ORDER BY load_score DESC
    LIMIT ${limit}
  `);

  const atRisk = result.rows as DbRow[];

  // Risk distribution
  const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
  // Also count all employees for low
  const allResult = await db.execute(sql`
    SELECT risk_level, COUNT(*) as cnt
    FROM ime_participant_workload
    WHERE period_type = ${periodType}
    GROUP BY risk_level
  `);
  for (const r of allResult.rows as DbRow[]) {
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
    deptFilter = ` AND department = ${options.department}`;
  }

  const result = await db.execute(sql`
    SELECT
      employee_id, employee_name, department,
      focus_time_minutes, longest_focus_block,
      meetings_before_noon, meetings_after_noon,
      back_to_back_ratio, meeting_density, load_score
    FROM ime_participant_workload
    WHERE period_type = ${periodType} ${deptFilter}
    ORDER BY focus_time_minutes ASC
    LIMIT ${limit}
  `);

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
  const loadResult = await db.execute(sql`
    SELECT *
    FROM ime_participant_workload
    WHERE employee_id = ${employeeId}
      AND period_type = ${periodType}
    ORDER BY computed_at DESC
    LIMIT 5
  `);

  const loadRecords = loadResult.rows as DbRow[];
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

    assessment = JSON.parse((result as { content: string }).content);
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
  await db.execute(sql`
    DELETE FROM ime_wellbeing_assessments WHERE employee_id = ${employeeId}
  `);

  // Insert new assessment
  await db.execute(sql`
    INSERT INTO ime_wellbeing_assessments
      (employee_id, employee_name, department,
       wellbeing_score, wellbeing_grade,
       meeting_load_dimension, schedule_balance_dimension,
       collaboration_diversity_dimension, focus_time_dimension,
       meeting_efficiency_dimension, workload_trend_dimension,
       risk_factors, recommendations, ai_narrative,
       assessed_period_start, assessed_period_end, assessed_at)
    VALUES
      (${employeeId}, ${employeeName}, ${department ? `${department}` : "NULL"},
       ${assessment.wellbeingScore}, ${assessment.wellbeingGrade},
       ${assessment.meetingLoadDimension}, ${assessment.scheduleBalanceDimension},
       ${assessment.collaborationDiversityDimension}, ${assessment.focusTimeDimension},
       ${assessment.meetingEfficiencyDimension}, ${assessment.workloadTrendDimension},
       ${JSON.stringify(assessment.riskFactors)}, ${JSON.stringify(assessment.recommendations)},
       ${(assessment.aiNarrative || "")},
       ${latest.period_start}, ${latest.period_end}, NOW())
  `);

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
    whereExtra += ` AND wellbeing_grade = ${options.grade}`;
  }
  if (options?.department) {
    whereExtra += ` AND department = ${options.department}`;
  }

  const result = await db.execute(sql`
    SELECT *
    FROM ime_wellbeing_assessments
    WHERE 1=1 ${whereExtra}
    ORDER BY assessed_at DESC
    LIMIT ${limit}
  `);

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

  const result = await db.execute(sql`
    SELECT
      department,
      COUNT(*) as headcount,
      ROUND(AVG(load_score), 1) as avg_load_score,
      COUNT(CASE WHEN load_score > 60 THEN 1 END) as overloaded_count,
      ROUND(AVG(focus_time_minutes), 0) as avg_focus_time,
      ROUND(AVG(total_meeting_minutes), 0) as avg_meeting_minutes,
      ROUND(AVG(back_to_back_ratio), 0) as avg_b2b_ratio
    FROM ime_participant_workload
    WHERE period_type = ${periodType}
      AND department IS NOT NULL
    GROUP BY department
    ORDER BY avg_load_score DESC
  `);

  return (result.rows as DbRow[]).map((r: any) => ({
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
  if (options?.dateFrom) dateFilter += ` AND mr.meeting_date >= ${options.dateFrom}`;
  if (options?.dateTo) dateFilter += ` AND mr.meeting_date <= ${options.dateTo}`;

  // 1. Get all meetings with their titles, dates, participants
  const meetingsResult = await db.execute(sql`
    SELECT mr.id, mr.title, mr.meeting_date, mr.duration_minutes, mr.channel_id,
           COALESCE(mes.overall_score, 0) as effectiveness_score
    FROM meeting_records mr
    LEFT JOIN meeting_effectiveness_scores mes ON mes.meeting_id = mr.id
    WHERE mr.title IS NOT NULL AND mr.title != '' ${dateFilter}
    ORDER BY mr.meeting_date ASC
  `);
  const meetings = meetingsResult.rows as DbRow[];

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
    const meetingIds = groupMeetings.map((m: any) => `${m.id}`).join(",");
    const participantsResult = await db.execute(sql`
      SELECT employee_id, COUNT(*) as attend_count
      FROM meeting_contributions
      WHERE meeting_id IN (${meetingIds})
      GROUP BY employee_id
    `);
    const participantRows = participantsResult.rows as DbRow[];
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
    const roiResult = await db.execute(sql`
      SELECT COALESCE(roi_grade, 'C') as roi_grade FROM ime_meeting_roi
      WHERE meeting_id IN (${meetingIds})
    `);
    const roiGrades = (roiResult.rows as DbRow[]).map((r: any) => r.roi_grade);
    const avgRoiGrade = roiGrades.length > 0 ? roiGrades[0] : "C";

    // Cumulative cost & minutes
    const totalMinutes = groupMeetings.reduce((s: number, m: any) => s + (Number(m.duration_minutes) || 0), 0);
    const costResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_cost), 0) as total_cost FROM ime_meeting_costs
      WHERE meeting_id IN (${meetingIds})
    `);
    const totalCost = Number((costResult.rows as DbRow[])[0]?.total_cost) || 0;

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
  if (filters?.frequency) where += ` AND frequency = ${filters.frequency}`;
  if (filters?.status) where += ` AND status = ${filters.status}`;

  const result = await db.execute(sql`
    SELECT
      COUNT(*) as total_series,
      ROUND(AVG(value_score), 0) as avg_value_score,
      COUNT(CASE WHEN effectiveness_trend = 'declining' THEN 1 END) as declining_count,
      COALESCE(SUM(total_cumulative_cost), 0) as total_cumulative_cost,
      COALESCE(SUM(total_cumulative_minutes), 0) as total_cumulative_minutes
    FROM ime_recurring_series
    WHERE ${where}
  `);
  const stats = (result.rows as DbRow[])[0] || {};

  // Potential savings from optimized/cancelled series
  const savingsResult = await db.execute(sql`
    SELECT COALESCE(SUM(minutes_saved_per_week), 0) as total_weekly_minutes_saved
    FROM ime_series_optimization_outcomes
    WHERE action_taken != 'no_change'
  `);
  const savings = (savingsResult.rows as DbRow[])[0] || {};

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
  if (options?.frequency) where += ` AND frequency = ${options.frequency}`;
  if (options?.valueGrade) where += ` AND value_grade = ${options.valueGrade}`;
  if (options?.status) where += ` AND status = ${options.status}`;
  if (options?.effectivenessTrend) where += ` AND effectiveness_trend = ${options.effectivenessTrend}`;

  const result = await db.execute(sql`
    SELECT *
    FROM ime_recurring_series
    WHERE ${where}
    ORDER BY value_score ASC
    LIMIT ${limit}
  `);

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
  const series = (seriesResult.rows as DbRow[])[0];
  if (!series) throw new Error(`Series ${seriesId} not found`);

  let meetingIds: string[] = [];
  try {
    meetingIds = JSON.parse(series.meeting_ids || "[]");
  } catch { meetingIds = []; }

  if (meetingIds.length === 0) return { seriesTitle: series.series_title, meetings: [] };

  const idList = meetingIds.map((id: string) => `${id}`).join(",");

  const result = await db.execute(sql`
    SELECT mr.id, mr.title, mr.meeting_date, mr.duration_minutes,
           COALESCE(mes.overall_score, 0) as effectiveness_score,
           COALESCE(mes.participant_count, 0) as participant_count,
           iroi.roi_grade
    FROM meeting_records mr
    LEFT JOIN meeting_effectiveness_scores mes ON mes.meeting_id = mr.id
    LEFT JOIN ime_meeting_roi iroi ON iroi.meeting_id = mr.id
    WHERE mr.id IN (${idList})
    ORDER BY mr.meeting_date ASC
  `);

  return { seriesTitle: series.series_title, meetings: result.rows };
}

/**
 * Compare multiple series side-by-side — value score, frequency, avg effectiveness, cost.
 */
export async function getSeriesComparison(options?: { limit?: number }) {
  const db = await requireDb();
  const limit = options?.limit ?? 20;

  const result = await db.execute(sql`
    SELECT id, series_title, frequency, value_score, value_grade,
           avg_effectiveness_score, total_cumulative_cost,
           occurrence_count, avg_participant_count
    FROM ime_recurring_series
    ORDER BY value_score ASC
    LIMIT ${limit}
  `);

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
  const series = (seriesResult.rows as DbRow[])[0];
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

    const parsed = JSON.parse((result as { content: string }).content);

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
  const series = (seriesResult.rows as DbRow[])[0];
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
  if (options?.actionTaken) where += ` AND action_taken = ${options.actionTaken}`;
  if (options?.productivityImpact) where += ` AND productivity_impact = ${options.productivityImpact}`;

  const result = await db.execute(sql`
    SELECT *
    FROM ime_series_optimization_outcomes
    WHERE ${where}
    ORDER BY assessed_at DESC
    LIMIT ${limit}
  `);

  return result.rows;
}

/**
 * Org-wide summary of recurring meeting series.
 */
export async function getRecurringMeetingSummary(options?: { status?: string }) {
  const db = await requireDb();

  let where = "1=1";
  if (options?.status) where += ` AND status = ${options.status}`;

  // Series by frequency distribution
  const freqResult = await db.execute(sql`
    SELECT frequency, COUNT(*) as count
    FROM ime_recurring_series
    WHERE ${where}
    GROUP BY frequency
    ORDER BY count DESC
  `);

  // Series by value grade distribution
  const gradeResult = await db.execute(sql`
    SELECT value_grade, COUNT(*) as count
    FROM ime_recurring_series
    WHERE ${where}
    GROUP BY value_grade
    ORDER BY value_grade ASC
  `);

  // Top 10 worst-value series
  const worstResult = await db.execute(sql`
    SELECT id, series_title, frequency, value_score, value_grade,
           avg_effectiveness_score, total_cumulative_minutes, recommendation
    FROM ime_recurring_series
    WHERE ${where}
    ORDER BY value_score ASC
    LIMIT 10
  `);

  // Potential savings if all D/F series optimized
  const savingsResult = await db.execute(sql`
    SELECT
      COUNT(*) as df_count,
      COALESCE(SUM(total_cumulative_minutes), 0) as total_minutes,
      COALESCE(SUM(total_cumulative_cost), 0) as total_cost
    FROM ime_recurring_series
    WHERE value_grade IN ('D', 'F') AND status = 'active'
  `);
  const savingsStats = (savingsResult.rows as DbRow[])[0] || {};

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
  const meeting = (meetingRes.rows as DbRow[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // 2. Extract decisions from content blocks
  const blocksRes = await db.execute(sql`SELECT content, speaker FROM meeting_content_blocks WHERE meeting_id = ${meetingId} AND block_type = 'decision' LIMIT 1000`);
  const decisionBlocks = blocksRes.rows as DbRow[];

  // 3. Extract decisions from knowledge entities
  const entitiesRes = await db.execute(sql`SELECT id, entity_name, context_text FROM ime_knowledge_entities WHERE meeting_id = ${meetingId} AND entity_type = 'decision' LIMIT 1000`);
  const decisionEntities = entitiesRes.rows as DbRow[];

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
  const outcomesRes = await db.execute(sql`SELECT id, decision_text, outcome_status, outcome_notes, resolved_date, created_at FROM ime_decision_outcomes WHERE meeting_id = ${meetingId} LIMIT 1000`);
  const outcomes = outcomesRes.rows as DbRow[];

  // 5. Cross-reference with action items
  const actionsRes = await db.execute(sql`SELECT id, action_text, assignee, status, due_date, resolved_date FROM ime_action_items WHERE meeting_id = ${meetingId} LIMIT 1000`);
  const actionItems = actionsRes.rows as DbRow[];

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
  if (options?.dateFrom) dateFilter += ` AND decision_date >= ${options.dateFrom}`;
  if (options?.dateTo) dateFilter += ` AND decision_date <= ${options.dateTo}`;

  // Load all tracked decisions chronologically
  const decisionsRes = await db.execute(sql`
    SELECT id, decision_id, meeting_id, decision_text, decision_maker, department, decision_date
    FROM ime_decision_tracking
    WHERE 1=1 ${dateFilter}
    ORDER BY decision_date ASC, id ASC
  `);
  const decisions = decisionsRes.rows as DbRow[];

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
      const safeReason = String(rev.reason);
      await db.execute(sql`
        UPDATE ime_decision_tracking
        SET is_reversed = 1,
            reversal_meeting_id = ${reversalDec.meeting_id},
            reversal_date = ${reversalDec.decision_date},
            reversal_reason = ${safeReason}
        WHERE id = ${originalDec.id}
      `);
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
  if (options?.department) where += ` AND department = ${options.department}`;
  if (options?.dateFrom) where += ` AND decision_date >= ${options.dateFrom}`;
  if (options?.dateTo) where += ` AND decision_date <= ${options.dateTo}`;

  // Overall velocity stats
  const overallRes = await db.execute(sql`
    SELECT
      COUNT(*) as total_count,
      COALESCE(AVG(total_velocity_days), 0) as avg_velocity,
      COALESCE(MIN(total_velocity_days), 0) as fastest,
      COALESCE(MAX(total_velocity_days), 0) as slowest
    FROM ime_decision_tracking
    WHERE ${where}
  `);
  const overall = (overallRes.rows as DbRow[])[0] || {};

  // Get all velocity values for median and p90 calculation
  const allVelocityRes = await db.execute(sql`
    SELECT total_velocity_days
    FROM ime_decision_tracking
    WHERE ${where}
    ORDER BY total_velocity_days ASC
  `);
  const velocityValues = (allVelocityRes.rows as DbRow[]).map((r: any) => Number(r.total_velocity_days));

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
  const deptRes = await db.execute(sql`
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
  `);
  const byDepartment = (deptRes.rows as DbRow[]).map((r: any) => {
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
  const decRes = await db.execute(sql`SELECT * FROM ime_decision_tracking WHERE id = ${decisionId} LIMIT 1`);
  const decision = (decRes.rows as DbRow[])[0];
  if (!decision) throw new Error(`Decision ${decisionId} not found`);

  // Load meeting context
  const meetingRes = await db.execute(sql`SELECT title, objective, summary FROM meeting_records WHERE id = ${String(decision.meeting_id)} LIMIT 1`);
  const meeting = (meetingRes.rows as DbRow[])[0] || {};

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
  const safeNarrative = String(parsed.narrative || "");
  const safeRecs = JSON.stringify(parsed.recommendations || []);

  await db.execute(sql`
    UPDATE ime_decision_tracking
    SET ai_quality_score = ${parsed.quality_score || 0},
        ai_clarity_score = ${parsed.clarity_score || 0},
        ai_alignment_score = ${parsed.alignment_score || 0},
        ai_narrative = ${safeNarrative},
        ai_recommendations = ${safeRecs},
        computed_at = NOW()
    WHERE id = ${decisionId}
  `);

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
    where += ` AND department = ${scopeId}`;
  } else if ((scope === "team" || scope === "individual") && scopeId) {
    where += ` AND decision_maker = ${scopeId}`;
  }
  if (dateFrom) where += ` AND decision_date >= ${dateFrom}`;
  if (dateTo) where += ` AND decision_date <= ${dateTo}`;

  // Aggregate counts
  const countsRes = await db.execute(sql`
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
  `);
  const stats = (countsRes.rows as DbRow[])[0] || {};

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
  const velRes = await db.execute(sql`
    SELECT total_velocity_days
    FROM ime_decision_tracking
    WHERE ${where} AND total_velocity_days IS NOT NULL
    ORDER BY total_velocity_days ASC
  `);
  const velValues = (velRes.rows as DbRow[]).map((r: any) => Number(r.total_velocity_days));
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
  const bottleneckRes = await db.execute(sql`
    SELECT department, COUNT(*) as cnt
    FROM ime_decision_tracking
    WHERE ${where} AND total_velocity_days > ${avgVelocityDays * 2}
    GROUP BY department
    ORDER BY cnt DESC
    LIMIT 5
  `);
  const topBottlenecks = JSON.stringify((bottleneckRes.rows as DbRow[]).map((r: any) => ({
    department: r.department,
    count: Number(r.cnt),
  })));

  // Top reversal reasons
  const reversalReasonRes = await db.execute(sql`
    SELECT reversal_reason, COUNT(*) as cnt
    FROM ime_decision_tracking
    WHERE ${where} AND is_reversed = 1 AND reversal_reason IS NOT NULL AND reversal_reason != ''
    GROUP BY reversal_reason
    ORDER BY cnt DESC
    LIMIT 5
  `);
  const topReversalReasons = JSON.stringify((reversalReasonRes.rows as DbRow[]).map((r: any) => ({
    reason: r.reversal_reason,
    count: Number(r.cnt),
  })));

  // Previous snapshot for trend comparison
  const prevSnapshotRes = await db.execute(sql`
    SELECT overall_decision_grade, follow_through_rate, avg_velocity_days, avg_quality_score
    FROM ime_decision_intelligence_snapshots
    WHERE scope = ${scope}
      AND (scope_id = ${(scopeId || "")} OR (scope_id IS NULL AND ${scopeId || ""} = ''))
    ORDER BY computed_at DESC
    LIMIT 1
  `);
  const prevSnapshot = (prevSnapshotRes.rows as DbRow[])[0];
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

  const safeScopeId = (scopeId || "");
  const periodStart = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const periodEnd = dateTo || new Date().toISOString().split("T")[0];

  // Delete existing snapshot for same scope/period
  await db.execute(sql`
    DELETE FROM ime_decision_intelligence_snapshots
    WHERE scope = ${scope}
      AND (scope_id = ${safeScopeId} OR (scope_id IS NULL AND ${safeScopeId} = ''))
      AND period_start = ${periodStart}
      AND period_end = ${periodEnd}
  `);

  // Insert new snapshot
  await db.execute(sql`
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
      ${scope}, ${safeScopeId ? `${safeScopeId}` : "NULL"}, ${periodStart}, ${periodEnd},
      ${totalDecisions}, ${implementedCount}, ${abandonedCount}, ${reversedCount}, ${pendingCount},
      ${followThroughRate}, ${reversalRate},
      ${avgVelocityDays}, ${medianVelocityDays}, ${fastestVelocityDays}, ${slowestVelocityDays}, ${velocityGrade},
      ${avgImpactScore}, ${positiveImpactCount}, ${negativeImpactCount},
      ${avgQualityScore}, ${avgClarityScore}, ${avgAlignmentScore},
      ${overallDecisionGrade}, ${topBottlenecks}, ${topReversalReasons},
      ${aiNarrative}, ${trendVsPrevious}, ${trendSlope}, ${recommendations},
      NOW(), NOW()
    )
  `);

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
  if (filters?.department) where += ` AND department = ${filters.department}`;
  if (filters?.dateFrom) where += ` AND decision_date >= ${filters.dateFrom}`;
  if (filters?.dateTo) where += ` AND decision_date <= ${filters.dateTo}`;

  const res = await db.execute(sql`
    SELECT
      COUNT(*) as total_decisions,
      SUM(CASE WHEN follow_through_status = 'implemented' THEN 1 ELSE 0 END) as implemented_count,
      SUM(CASE WHEN is_reversed = 1 THEN 1 ELSE 0 END) as reversed_count,
      COALESCE(AVG(CASE WHEN total_velocity_days IS NOT NULL THEN total_velocity_days END), 0) as avg_velocity_days,
      COALESCE(AVG(ai_quality_score), 0) as avg_quality_score
    FROM ime_decision_tracking
    WHERE ${where}
  `);
  const stats = (res.rows as DbRow[])[0] || {};

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
  if (options?.status) where += ` AND dt.follow_through_status = ${options.status}`;
  if (options?.department) where += ` AND dt.department = ${options.department}`;
  if (options?.impactCategory) where += ` AND dt.impact_category = ${options.impactCategory}`;
  if (options?.meetingId) where += ` AND dt.meeting_id = ${options.meetingId}`;

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const res = await db.execute(sql`
    SELECT
      dt.*,
      mr.title as meeting_title
    FROM ime_decision_tracking dt
    LEFT JOIN meeting_records mr ON mr.id = dt.meeting_id
    WHERE ${where}
    ORDER BY dt.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const countRes = await db.execute(sql`
    SELECT COUNT(*) as total
    FROM ime_decision_tracking dt
    WHERE ${where}
  `);
  const total = Number((countRes.rows as DbRow[])[0]?.total) || 0;

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
  if (options?.scope) where += ` AND scope = ${options.scope}`;
  if (options?.scopeId) where += ` AND scope_id = ${options.scopeId}`;

  const limit = options?.limit || 20;

  const res = await db.execute(sql`
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
  `);

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
  if (options?.department) where += ` AND department = ${options.department}`;
  if (options?.dateFrom) where += ` AND decision_date >= ${options.dateFrom}`;
  if (options?.dateTo) where += ` AND decision_date <= ${options.dateTo}`;

  // Get reversed decisions
  const reversedRes = await db.execute(sql`
    SELECT
      id, decision_id, meeting_id, decision_text, decision_maker, department,
      decision_date, reversal_meeting_id, reversal_date, reversal_reason,
      impact_score, impact_category
    FROM ime_decision_tracking
    WHERE ${where}
    ORDER BY reversal_date DESC
  `);
  const reversedDecisions = reversedRes.rows as DbRow[];

  // Group by department
  const byDeptRes = await db.execute(sql`
    SELECT department, COUNT(*) as cnt
    FROM ime_decision_tracking
    WHERE ${where}
    GROUP BY department
    ORDER BY cnt DESC
  `);
  const byDepartment = (byDeptRes.rows as DbRow[]).map((r: any) => ({
    department: r.department || "unknown",
    count: Number(r.cnt),
  }));

  // Top reversal reasons
  const reasonsRes = await db.execute(sql`
    SELECT reversal_reason, COUNT(*) as cnt
    FROM ime_decision_tracking
    WHERE ${where} AND reversal_reason IS NOT NULL AND reversal_reason != ''
    GROUP BY reversal_reason
    ORDER BY cnt DESC
    LIMIT 10
  `);
  const topReasons = (reasonsRes.rows as DbRow[]).map((r: any) => ({
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
    setClauses.push(`follow_through_status = ${updates.status}`);
  }
  if (updates.implementationStartDate) {
    setClauses.push(`implementation_start_date = ${updates.implementationStartDate}`);
  }
  if (updates.implementationEndDate) {
    setClauses.push(`implementation_end_date = ${updates.implementationEndDate}`);
  }
  if (updates.businessOutcome !== undefined) {
    setClauses.push(`business_outcome = ${String(updates.businessOutcome)}`);
  }
  if (updates.impactScore !== undefined) {
    setClauses.push(`impact_score = ${updates.impactScore}`);
    // Compute impact category
    let impactCategory = "neutral";
    if (updates.impactScore > 0) impactCategory = "positive";
    else if (updates.impactScore < 0) impactCategory = "negative";
    setClauses.push(`impact_category = ${impactCategory}`);
  }

  // Compute velocity if both dates provided
  if (updates.implementationStartDate && updates.implementationEndDate) {
    const startDate = new Date(updates.implementationStartDate);
    const endDate = new Date(updates.implementationEndDate);
    const startToCompletion = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
    setClauses.push(`start_to_completion_days = ${startToCompletion}`);

    // Also try to compute decision_to_start and total velocity
    const decRes = await db.execute(sql`SELECT decision_date FROM ime_decision_tracking WHERE id = ${id} LIMIT 1`);
    const dec = (decRes.rows as DbRow[])[0];
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
      setClauses.push(`velocity_grade = ${velocityGrade}`);
    }
  }

  if (setClauses.length === 0) {
    return { success: true, id, message: "No updates provided" };
  }

  await db.execute(sql`
    UPDATE ime_decision_tracking
    SET ${setClauses.join(", ")}
    WHERE id = ${id}
  `);

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
  const meeting = (meetingRes.rows as DbRow[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // Load content blocks
  const blocksRes = await db.execute(sql`SELECT id, meeting_id, speaker, block_type, content, timestamp_start, timestamp_end, sort_order FROM meeting_content_blocks WHERE meeting_id = ${meetingId} ORDER BY sort_order ASC, timestamp_start ASC LIMIT 1000`);
  const blocks = blocksRes.rows as DbRow[];

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
// @ts-ignore duplicate property
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
  const safeId = meetingId;

  const res = await db.execute(sql`SELECT * FROM ime_meeting_structure_analysis WHERE meeting_id = ${safeId} ORDER BY agenda_item_index ASC LIMIT 1000`);
  const rows = res.rows as DbRow[];

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

  const department = options?.department ? options.department : "";
  const dateFrom = options?.dateFrom || "";
  const dateTo = options?.dateTo || "";
  const limit = options?.limit || 50;

  const res = await db.execute(sql`
    SELECT msa.meeting_id, mr.title,
      AVG(msa.meeting_time_efficiency_score) as efficiency,
      AVG(msa.overrun_percent) as avg_overrun_percent,
      COUNT(DISTINCT msa.id) as item_count
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE 1=1
      ${department ? `AND mr.department = ${department}` : ""}
      ${dateFrom ? `AND mr.meeting_date >= ${dateFrom}` : ""}
      ${dateTo ? `AND mr.meeting_date <= ${dateTo}` : ""}
    GROUP BY msa.meeting_id, mr.title
    ORDER BY efficiency DESC
    LIMIT ${limit}
  `);
  const rows = res.rows as DbRow[];

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

  const department = options?.department ? options.department : "";
  const dateFrom = options?.dateFrom || "";
  const dateTo = options?.dateTo || "";

  const res = await db.execute(sql`
    SELECT agenda_item_title, agenda_item_category,
      planned_duration_minutes, actual_duration_minutes, overrun_minutes, overrun_percent
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE was_skipped = 0
      ${department ? `AND mr.department = ${department}` : ""}
      ${dateFrom ? `AND mr.meeting_date >= ${dateFrom}` : ""}
      ${dateTo ? `AND mr.meeting_date <= ${dateTo}` : ""}
    ORDER BY overrun_percent DESC
  `);
  const rows = res.rows as DbRow[];

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

  const department = options?.department ? options.department : "";
  const dateFrom = options?.dateFrom || "";
  const dateTo = options?.dateTo || "";

  const res = await db.execute(sql`
    SELECT agenda_item_category as category,
      COUNT(*) as count,
      AVG(actual_duration_minutes) as avg_duration,
      AVG(CASE WHEN overrun_minutes > 0 THEN 1 ELSE 0 END) * 100 as overrun_rate,
      AVG(productivity_score) as productivity_score
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE was_skipped = 0
      ${department ? `AND mr.department = ${department}` : ""}
      ${dateFrom ? `AND mr.meeting_date >= ${dateFrom}` : ""}
      ${dateTo ? `AND mr.meeting_date <= ${dateTo}` : ""}
    GROUP BY agenda_item_category
    ORDER BY count DESC
  `);
  const rows = res.rows as DbRow[];

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
  const safeId = meetingId;

  // Get analysis rows
  const res = await db.execute(sql`SELECT * FROM ime_meeting_structure_analysis WHERE meeting_id = ${safeId} ORDER BY agenda_item_index ASC LIMIT 1000`);
  const rows = res.rows as DbRow[];

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
    where += ` AND mr.department = ${scopeId}`;
  } else if ((scope === "team" || scope === "individual") && scopeId) {
    where += ` AND mr.organizer = ${scopeId}`;
  }
  if (dateFrom) where += ` AND mr.meeting_date >= ${dateFrom}`;
  if (dateTo) where += ` AND mr.meeting_date <= ${dateTo}`;

  // Aggregate
  const aggRes = await db.execute(sql`
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
  `);
  const stats = (aggRes.rows as DbRow[])[0] || {};

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
  const safeScopeId = (scopeId || "");
  const prevRes = await db.execute(sql`
    SELECT avg_efficiency, avg_overrun_pct, overall_grade
    FROM ime_agenda_intelligence_snapshots
    WHERE scope = ${scope}
      AND (scope_id = ${safeScopeId} OR (scope_id IS NULL AND ${safeScopeId} = ''))
    ORDER BY computed_at DESC
    LIMIT 1
  `);
  const prevSnapshot = (prevRes.rows as DbRow[])[0];
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
  await db.execute(sql`
    DELETE FROM ime_agenda_intelligence_snapshots
    WHERE scope = ${scope}
      AND (scope_id = ${safeScopeId} OR (scope_id IS NULL AND ${safeScopeId} = ''))
      AND period_start = ${periodStart}
      AND period_end = ${periodEnd}
  `);

  // Insert new snapshot
  await db.execute(sql`
    INSERT INTO ime_agenda_intelligence_snapshots (
      scope, scope_id, period_start, period_end,
      total_meetings, total_items,
      avg_planned, avg_actual, avg_overrun, avg_overrun_pct,
      overrun_rate, underrun_rate, skipped_rate,
      avg_engagement, avg_productivity, avg_efficiency,
      overall_grade, ai_narrative, trend_vs_previous, trend_slope, recommendations,
      computed_at, created_at
    ) VALUES (
      ${scope}, ${safeScopeId ? `${safeScopeId}` : "NULL"}, ${periodStart}, ${periodEnd},
      ${totalMeetings}, ${totalItems},
      ${avgPlanned}, ${avgActual}, ${avgOverrun}, ${avgOverrunPct},
      ${overrunRate}, ${underrunRate}, ${skippedRate},
      ${avgEngagement}, ${avgProductivity}, ${avgEfficiency},
      ${overallGrade}, ${aiNarrative}, ${trendVsPrevious}, ${trendSlope}, ${recommendations},
      NOW(), NOW()
    )
  `);

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

  const department = filters?.department ? filters.department : "";
  const dateFrom = filters?.dateFrom || "";
  const dateTo = filters?.dateTo || "";

  const res = await db.execute(sql`
    SELECT COUNT(DISTINCT msa.meeting_id) as total_meetings,
      AVG(msa.meeting_time_efficiency_score) as avg_efficiency,
      AVG(msa.overrun_percent) as avg_overrun,
      COUNT(*) / NULLIF(COUNT(DISTINCT msa.meeting_id), 0) as avg_items,
      AVG(CASE WHEN msa.was_skipped = 1 THEN 1 ELSE 0 END) * 100 as skipped_rate
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE 1=1
      ${department ? `AND mr.department = ${department}` : ""}
      ${dateFrom ? `AND mr.meeting_date >= ${dateFrom}` : ""}
      ${dateTo ? `AND mr.meeting_date <= ${dateTo}` : ""}
  `);
  const stats = (res.rows as DbRow[])[0] || {};

  // Top overrun category
  const catRes = await db.execute(sql`
    SELECT agenda_item_category, AVG(overrun_percent) as avg_overrun
    FROM ime_meeting_structure_analysis msa
    JOIN meeting_records mr ON mr.id = msa.meeting_id
    WHERE msa.was_skipped = 0 AND msa.overrun_percent > 0
      ${department ? `AND mr.department = ${department}` : ""}
      ${dateFrom ? `AND mr.meeting_date >= ${dateFrom}` : ""}
      ${dateTo ? `AND mr.meeting_date <= ${dateTo}` : ""}
    GROUP BY agenda_item_category
    ORDER BY avg_overrun DESC
    LIMIT 1
  `);
  const topCat = (catRes.rows as DbRow[])[0];

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
  const grade = options?.grade ? options.grade : "";
  const department = options?.department ? options.department : "";
  const dateFrom = options?.dateFrom || "";
  const dateTo = options?.dateTo || "";

  let where = "1=1";
  if (grade) where += ` AND MIN(msa.time_efficiency_grade) = ${grade}`;
  if (department) where += ` AND mr.department = ${department}`;
  if (dateFrom) where += ` AND mr.meeting_date >= ${dateFrom}`;
  if (dateTo) where += ` AND mr.meeting_date <= ${dateTo}`;

  // Build pre-group filters (WHERE) and post-group filters (HAVING)
  let preWhere = "1=1";
  let having = "";
  if (department) preWhere += ` AND mr.department = ${department}`;
  if (dateFrom) preWhere += ` AND mr.meeting_date >= ${dateFrom}`;
  if (dateTo) preWhere += ` AND mr.meeting_date <= ${dateTo}`;
  if (grade) having = `HAVING MIN(msa.time_efficiency_grade) = ${grade}`;

  const res = await db.execute(sql`
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
  `);
  const rows = res.rows as DbRow[];

  // Total count
  const countRes = await db.execute(sql`
    SELECT COUNT(*) as total FROM (
      SELECT msa.meeting_id
      FROM ime_meeting_structure_analysis msa
      JOIN meeting_records mr ON mr.id = msa.meeting_id
      WHERE ${preWhere}
      GROUP BY msa.meeting_id
      ${having}
    ) sub
  `);
  const total = Number((countRes.rows as DbRow[])[0]?.total) || 0;

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

  const scope = options?.scope ? options.scope : "";
  const scopeId = options?.scopeId ? options.scopeId : "";
  const limit = options?.limit || 20;

  const res = await db.execute(sql`
    SELECT * FROM ime_agenda_intelligence_snapshots
    WHERE 1=1
      ${scope ? `AND scope = ${scope}` : ""}
      ${scopeId ? `AND scope_id = ${scopeId}` : ""}
    ORDER BY period_end DESC
    LIMIT ${limit}
  `);
  const rows = res.rows as DbRow[];

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
    setClauses.push(`agenda_item_title = ${String(updates.agendaItemTitle)}`);
  }
  if (updates.agendaItemCategory !== undefined) {
    setClauses.push(`agenda_item_category = ${String(updates.agendaItemCategory)}`);
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
    const currentRes = await db.execute(sql`SELECT planned_duration_minutes, actual_duration_minutes FROM ime_meeting_structure_analysis WHERE id = ${id} LIMIT 1`);
    const current = (currentRes.rows as DbRow[])[0];
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
    setClauses.push(`time_efficiency_grade = ${grade}`);
  }

  if (setClauses.length === 0) {
    return { success: true, id, message: "No updates provided" };
  }

  await db.execute(sql`
    UPDATE ime_meeting_structure_analysis
    SET ${setClauses.join(", ")}
    WHERE id = ${id}
  `);

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
  const meetingResult = await db.execute(sql`SELECT id, title, objective, summary FROM meeting_records WHERE id = ${meetingId} LIMIT 1000`);
  const meeting = (meetingResult.rows as DbRow[])[0];
  if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

  // 2. Get content blocks
  const blocksResult = await db.execute(sql`SELECT speaker, block_type, content, timestamp_start, timestamp_end FROM meeting_content_blocks WHERE meeting_id = ${meetingId} ORDER BY timestamp_start ASC LIMIT 1000`);
  const blocks = blocksResult.rows as DbRow[];
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
  const decisionsRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM meeting_content_blocks WHERE meeting_id = ${meetingId} AND block_type = 'decision'`);
  const decisionsCount = Number((decisionsRes.rows as DbRow[])[0]?.cnt) || 0;

  const actionsRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM meeting_content_blocks WHERE meeting_id = ${meetingId} AND block_type = 'action_item'`);
  const actionItemsCount = Number((actionsRes.rows as DbRow[])[0]?.cnt) || 0;

  const facilitatorSpeakingPercent = speakerMap[facilitatorName] ? Math.round((speakerMap[facilitatorName] / totalBlocks) * 100) : 0;

  const strengths = JSON.stringify(llm.strengths || []);
  const weaknesses = JSON.stringify(llm.weaknesses || []);
  const coachingPoints = JSON.stringify(llm.coachingPoints || []);
  const narrative = llm.narrative || "";

  // Delete existing analysis for this meeting
  await db.execute(sql`DELETE FROM ime_facilitator_analysis WHERE meeting_id = ${meetingId}`);

  // Insert new analysis
  await db.execute(sql`
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
      ${meetingId}, ${facilitatorName}, ${facilitatorId}, ${department},
      ${facilitationStyle}, ${styleConfidence}, ${overallEffectivenessScore},
      ${engagementImpactScore}, ${decisionFacilitationScore}, ${timeManagementScore},
      ${inclusivityScore}, ${clarityScore}, ${conflictResolutionScore},
      ${meetingEffectivenessScore}, ${speakerBalanceIndex},
      ${dominantSpeakerPercent}, ${totalSpeakers}, ${facilitatorSpeakingPercent},
      ${decisionsCount}, ${actionItemsCount}, ${effectivenessGrade},
      ${strengths}, ${weaknesses}, ${coachingPoints}, ${narrative},
      NOW(), NOW()
    )
  `);

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
// @ts-ignore duplicate property
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

  const res = await db.execute(sql`SELECT * FROM ime_facilitator_analysis WHERE facilitator_id = ${facilitatorId} ORDER BY computed_at DESC LIMIT 1000`);
  const rows = res.rows as DbRow[];
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
    where = ` WHERE department = ${options.department}`;
  }

  const res = await db.execute(sql`
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
  `);
  const facilitators = (res.rows as DbRow[]).map(r => ({
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

  const conditions: SQL[] = [];
  if (options?.department) conditions.push(sql`department = ${options.department}`);
  if (options?.dateFrom) conditions.push(sql`computed_at >= ${options.dateFrom}`);
  if (options?.dateTo) conditions.push(sql`computed_at <= ${options.dateTo}`);
  const where = conditions.length > 0 ? sql` WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const res = await db.execute(sql`SELECT facilitation_style, overall_effectiveness_score, engagement_impact_score, decision_facilitation_score, time_management_score, inclusivity_score, clarity_score, conflict_resolution_score, meeting_effectiveness_score, speaker_balance_index, facilitator_speaking_percent, decisions_count, action_items_count, effectiveness_grade FROM ime_facilitator_analysis${where} ORDER BY computed_at DESC LIMIT 200`);
  const rows = res.rows as DbRow[];
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

  const conditions: SQL[] = [];
  if (options?.department) conditions.push(sql`department = ${options.department}`);
  if (options?.dateFrom) conditions.push(sql`computed_at >= ${options.dateFrom}`);
  if (options?.dateTo) conditions.push(sql`computed_at <= ${options.dateTo}`);
  const where = conditions.length > 0 ? sql` WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const res = await db.execute(sql`
    SELECT facilitation_style,
      COUNT(*) as cnt,
      ROUND(AVG(overall_effectiveness_score)) as avg_effectiveness,
      ROUND(AVG(meeting_effectiveness_score)) as avg_meeting_outcome
    FROM ime_facilitator_analysis${where}
    GROUP BY facilitation_style
    ORDER BY avg_effectiveness DESC
  `);

  const styles = (res.rows as DbRow[]).map(r => ({
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

  const res = await db.execute(sql`SELECT * FROM ime_facilitator_analysis WHERE facilitator_id = ${facilitatorId} ORDER BY computed_at DESC LIMIT 20`);
  const rows = res.rows as DbRow[];
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

  const safeScope = scope;
  const safeScopeId = (scopeId || "");
  const periodStart = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const periodEnd = dateTo || new Date().toISOString().split("T")[0];

  // Build WHERE
  const conditions: SQL[] = [sql`computed_at >= ${periodStart}`, sql`computed_at <= ${periodEnd}`];
  if (scope === "department" && safeScopeId) conditions.push(sql`department = ${safeScopeId}`);
  if (scope === "individual" && safeScopeId) conditions.push(sql`facilitator_id = ${safeScopeId}`);
  const where = conditions.length > 0 ? sql` WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const res = await db.execute(sql`SELECT * FROM ime_facilitator_analysis${where} ORDER BY computed_at DESC LIMIT 1000`);
  const rows = res.rows as DbRow[];
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

  const prevConditions = [`computed_at >= ${prevStart}`, `computed_at <= ${prevEnd}`];
  if (scope === "department" && safeScopeId) prevConditions.push(`department = ${safeScopeId}`);
  if (scope === "individual" && safeScopeId) prevConditions.push(`facilitator_id = ${safeScopeId}`);
  const prevWhere = ` WHERE ${prevConditions.join(" AND ")}`;

  const prevRes = await db.execute(sql`SELECT ROUND(AVG(overall_effectiveness_score)) as prev_avg FROM ime_facilitator_analysis${prevWhere}`);
  const prevAvg = Number((prevRes.rows as DbRow[])[0]?.prev_avg) || 0;

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
  await db.execute(sql`
    DELETE FROM ime_facilitator_intelligence_snapshots
    WHERE scope = ${safeScope}
      AND (scope_id = ${safeScopeId} OR (scope_id IS NULL AND ${safeScopeId} = ''))
      AND period_start = ${periodStart}
      AND period_end = ${periodEnd}
  `);

  // Insert new snapshot
  await db.execute(sql`
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
      ${safeScope}, ${safeScopeId ? `${safeScopeId}` : "NULL"}, ${periodStart}, ${periodEnd},
      ${totalMeetingsAnalyzed}, ${totalFacilitators},
      ${avgEffectivenessScore}, ${avgEngagementImpact}, ${avgDecisionFacilitation},
      ${avgTimeManagement}, ${avgInclusivity}, ${avgClarity}, ${avgConflictResolution},
      ${avgSpeakerBalance}, ${avgFacilitatorSpeakingPercent},
      ${styleDistribution}, ${topFacilitators}, ${bottomFacilitators},
      ${gradeDistribution}, ${overallGrade}, ${aiNarrative},
      ${bestPractices}, ${trendVsPrevious}, ${trendSlope}, ${recommendations},
      NOW(), NOW()
    )
  `);

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

  const conditions: SQL[] = [];
  if (filters?.department) conditions.push(sql`department = ${filters.department}`);
  if (filters?.dateFrom) conditions.push(sql`computed_at >= ${filters.dateFrom}`);
  if (filters?.dateTo) conditions.push(sql`computed_at <= ${filters.dateTo}`);
  const where = conditions.length > 0 ? sql` WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const res = await db.execute(sql`
    SELECT
      COUNT(*) as total_meetings,
      ROUND(AVG(overall_effectiveness_score)) as avg_effectiveness,
      COUNT(DISTINCT facilitator_id) as total_facilitators
    FROM ime_facilitator_analysis${where}
  `);
  const row = (res.rows as DbRow[])[0] || {};

  // Dominant style
  const styleRes = await db.execute(sql`
    SELECT facilitation_style, COUNT(*) as cnt
    FROM ime_facilitator_analysis${where}
    GROUP BY facilitation_style
    ORDER BY cnt DESC
    LIMIT 1
  `);
  const dominantStyle = (styleRes.rows as DbRow[])[0]?.facilitation_style || "unknown";

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

  const conditions: SQL[] = [];
  if (options?.grade) conditions.push(sql`fa.effectiveness_grade = ${options.grade}`);
  if (options?.department) conditions.push(sql`fa.department = ${options.department}`);
  if (options?.facilitatorId) conditions.push(sql`fa.facilitator_id = ${options.facilitatorId}`);
  if (options?.dateFrom) conditions.push(sql`fa.computed_at >= ${options.dateFrom}`);
  if (options?.dateTo) conditions.push(sql`fa.computed_at <= ${options.dateTo}`);
  const where = conditions.length > 0 ? sql` WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const countRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ime_facilitator_analysis fa${where}`);
  const total = Number((countRes.rows as DbRow[])[0]?.cnt) || 0;

  const res = await db.execute(sql`
    SELECT fa.*, mr.title as meeting_title
    FROM ime_facilitator_analysis fa
    LEFT JOIN meeting_records mr ON fa.meeting_id = mr.id
    ${where}
    ORDER BY fa.computed_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const rows = (res.rows as DbRow[]).map(r => ({
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

  const conditions: SQL[] = [];
  if (options?.scope) conditions.push(sql`scope = ${options.scope}`);
  if (options?.scopeId) conditions.push(sql`scope_id = ${options.scopeId}`);
  const where = conditions.length > 0 ? sql` WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const res = await db.execute(sql`
    SELECT * FROM ime_facilitator_intelligence_snapshots${where}
    ORDER BY period_end DESC
    LIMIT ${options?.limit || 20}
  `);

  const rows = (res.rows as DbRow[]).map(r => ({
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
    setClauses.push(`facilitator_name = ${String(updates.facilitatorName)}`);
  }
  if (updates.facilitationStyle !== undefined) {
    setClauses.push(`facilitation_style = ${String(updates.facilitationStyle)}`);
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
  const anyScoreChanged = scoreFields.some(f => (updates as Record<string, unknown>)[f] !== undefined);

  if (anyScoreChanged) {
    const currentRes = await db.execute(sql`SELECT engagement_impact_score, decision_facilitation_score, time_management_score, inclusivity_score, clarity_score, conflict_resolution_score FROM ime_facilitator_analysis WHERE id = ${id} LIMIT 1`);
    const current = (currentRes.rows as DbRow[])[0];
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
    setClauses.push(`effectiveness_grade = ${grade}`);
  }

  if (setClauses.length === 0) {
    return { success: true, id, message: "No updates provided" };
  }

  await db.execute(sql`
    UPDATE ime_facilitator_analysis
    SET ${setClauses.join(", ")}
    WHERE id = ${id}
  `);

  return { success: true, id };
}
