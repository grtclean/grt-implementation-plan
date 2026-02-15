/**
 * G-IME: Intelligent Meeting Executive - tRPC Router
 * 参会者贡献分析与会议效能评估 API
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requireDb } from "../db";
import { sql } from "drizzle-orm";
import * as imeService from "./ime.service";

export const imeRouter = router({
  // Dashboard overview — aggregated stats + top contributors + effectiveness trend
  dashboard: protectedProcedure
    .input(
      z.object({
        channelId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return imeService.getContributionDashboard(input ?? {});
    }),

  // Single meeting's contribution breakdown
  meetingContributions: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT * FROM meeting_contributions
        WHERE meeting_id = ${input.meetingId}
        ORDER BY contribution_score DESC
      `);
      return result.rows;
    }),

  // Trigger AI analysis for a meeting (includes engagement)
  analyzeMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      const contributions = await imeService.analyzeContributions(input.meetingId);
      const effectiveness = await imeService.scoreMeetingEffectiveness(input.meetingId);
      const traces = await imeService.linkToPerformanceTrace(input.meetingId);
      const engagement = await imeService.analyzeParticipantEngagement(input.meetingId);
      return { contributions, effectiveness, tracesCreated: traces.length, engagement };
    }),

  // Employee trend over time
  employeeTrend: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return imeService.getEmployeeTrend(input.employeeId, input.dateFrom, input.dateTo);
    }),

  // Meeting effectiveness scores list
  effectivenessList: protectedProcedure
    .input(
      z.object({
        channelId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit ?? 20;

      const conditions: string[] = ["1=1"];
      if (input?.channelId) conditions.push(`mr.channel_id = '${input.channelId}'`);
      if (input?.dateFrom) conditions.push(`mr.meeting_date >= '${input.dateFrom}'`);
      if (input?.dateTo) conditions.push(`mr.meeting_date <= '${input.dateTo}'`);
      const where = conditions.join(" AND ");

      const result = await db.execute(sql.raw(`
        SELECT
          mes.*,
          mr.title as meeting_title,
          mr.meeting_date,
          mr.objective,
          (SELECT COUNT(*) FROM meeting_contributions WHERE meeting_id = mes.meeting_id) as participant_count
        FROM meeting_effectiveness_scores mes
        JOIN meeting_records mr ON mes.meeting_id = mr.id
        WHERE ${where}
        ORDER BY mr.meeting_date DESC
        LIMIT ${limit}
      `));
      return result.rows;
    }),

  // Batch analyze multiple meetings
  batchAnalyze: protectedProcedure
    .input(z.object({ meetingIds: z.array(z.string()).min(1).max(20) }))
    .mutation(async ({ input }) => {
      const results: { meetingId: string; success: boolean; error?: string }[] = [];
      for (const meetingId of input.meetingIds) {
        try {
          await imeService.analyzeContributions(meetingId);
          await imeService.scoreMeetingEffectiveness(meetingId);
          await imeService.linkToPerformanceTrace(meetingId);
          results.push({ meetingId, success: true });
        } catch (e: any) {
          results.push({ meetingId, success: false, error: e.message });
        }
      }
      return results;
    }),

  // ========================================================================
  // Participant Engagement Analysis
  // ========================================================================

  analyzeEngagement: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      excludeSpeakers: z.array(z.string()).optional(),
      includeExternal: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.analyzeParticipantEngagement(input.meetingId, {
        excludeSpeakers: input.excludeSpeakers,
        includeExternal: input.includeExternal,
      });
    }),

  meetingEngagement: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT employee_name, ai_analysis FROM meeting_contributions
        WHERE meeting_id = ${input.meetingId}
        ORDER BY contribution_score DESC
      `);
      const participants: any[] = [];
      for (const row of result.rows as any[]) {
        try {
          const analysis = JSON.parse(row.ai_analysis || "{}");
          if (analysis.engagement) {
            participants.push({
              speaker: row.employee_name,
              ...analysis.engagement,
            });
          }
        } catch { /* skip */ }
      }
      return { meetingId: input.meetingId, participants };
    }),

  // ========================================================================
  // Phase 2: Department Rollup
  // ========================================================================

  departmentRollup: protectedProcedure
    .input(z.object({ department: z.string(), period: z.string() }))
    .query(async ({ input }) => {
      return imeService.computeDepartmentRollup(input.department, input.period);
    }),

  departmentComparison: protectedProcedure
    .input(z.object({ departments: z.array(z.string()).min(1).max(20), period: z.string() }))
    .query(async ({ input }) => {
      return imeService.getDepartmentComparison(input.departments, input.period);
    }),

  managementDashboard: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return imeService.getManagementDashboard(input.scope, input.scopeId, input.period);
    }),

  refreshDepartmentRollup: protectedProcedure
    .input(z.object({ department: z.string(), period: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.computeDepartmentRollup(input.department, input.period);
    }),

  // ========================================================================
  // Phase 2: Meeting Patterns
  // ========================================================================

  detectPatterns: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.detectMeetingPatterns(input.scope, input.scopeId, input.dateFrom, input.dateTo);
    }),

  patternInsights: protectedProcedure
    .input(z.object({
      scope: z.string().optional(),
      scopeId: z.string().optional(),
      patternType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getPatternInsights(input?.scope, input?.scopeId, input?.patternType);
    }),

  meetingCultureReport: protectedProcedure
    .input(z.object({ department: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getMeetingCultureReport(input?.department);
    }),

  // ========================================================================
  // Phase 2: HR Signals
  // ========================================================================

  generateHrSignals: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateHrSignals(input.employeeId);
    }),

  hrSignalsList: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      signalType: z.string().optional(),
      minConfidence: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: string[] = ["1=1"];
      if (input?.signalType) conditions.push(`hs.signal_type = '${input.signalType}'`);
      if (input?.minConfidence) conditions.push(`hs.confidence >= ${input.minConfidence}`);
      const deptJoin = input?.department
        ? `JOIN hrm_employees he ON hs.employee_id = he."employeeCode" AND he.department = '${input.department}'`
        : `LEFT JOIN hrm_employees he ON hs.employee_id = he."employeeCode"`;
      const where = conditions.join(" AND ");

      const result = await db.execute(sql.raw(`
        SELECT hs.*, he.department, he.position
        FROM ime_hr_signals hs
        ${deptJoin}
        WHERE ${where}
        ORDER BY hs.created_at DESC
        LIMIT 100
      `));
      return result.rows;
    }),

  promotionCandidates: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      minConfidence: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getPromotionCandidates(input?.department, input?.minConfidence);
    }),

  trainingRecommendation: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ input }) => {
      return imeService.recommendTraining(input.employeeId);
    }),

  updateSignalStatus: protectedProcedure
    .input(z.object({
      signalId: z.number(),
      status: z.enum(["pending", "acknowledged", "acted_on", "dismissed"]),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql`
        UPDATE ime_hr_signals
        SET status = ${input.status}, updated_at = NOW()
        WHERE id = ${input.signalId}
      `);
      return { success: true };
    }),

  // ========================================================================
  // Phase 2: Real-time Assistant
  // ========================================================================

  startLiveSession: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.openId || "unknown";
      return imeService.startLiveSession(input.meetingId, userId);
    }),

  endLiveSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      return imeService.endLiveSession(input.sessionId);
    }),

  getLiveSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const result = await db.execute(sql`
        SELECT * FROM ime_live_sessions WHERE id = ${input.sessionId}
      `);
      const session = (result.rows as any[])[0];
      if (!session) return null;
      return {
        ...session,
        liveSuggestions: JSON.parse(session.live_suggestions || "[]"),
        liveContributionSnapshot: JSON.parse(session.live_contribution_snapshot || "{}"),
      };
    }),

  // ========================================================================
  // Phase 3: Meeting Cost Calculator
  // ========================================================================

  computeMeetingCost: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.computeMeetingCost(input.meetingId);
    }),

  costDashboard: protectedProcedure
    .input(z.object({
      channelId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getCostDashboard(input ?? {});
    }),

  batchComputeCosts: protectedProcedure
    .input(z.object({ meetingIds: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ input }) => {
      return imeService.batchComputeCosts(input.meetingIds);
    }),

  // ========================================================================
  // Phase 3: Action Item Tracker
  // ========================================================================

  extractActionItems: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.extractAndTrackActionItems(input.meetingId);
    }),

  actionItemDashboard: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      owner: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getActionItemDashboard(input ?? {});
    }),

  updateActionItemStatus: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      status: z.enum(["open", "in_progress", "completed", "stale", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      return imeService.updateActionItemStatus(input.itemId, input.status);
    }),

  // ========================================================================
  // Phase 3: Topic Continuity
  // ========================================================================

  extractTopics: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.extractAndTrackTopics(input.meetingId);
    }),

  topicContinuityDashboard: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getTopicContinuityDashboard(input ?? {});
    }),

  updateTopicStatus: protectedProcedure
    .input(z.object({
      topicId: z.number(),
      status: z.enum(["introduced", "debated", "decided", "closed", "stalled"]),
    }))
    .mutation(async ({ input }) => {
      return imeService.updateTopicStatus(input.topicId, input.status);
    }),

  // ========================================================================
  // Phase 4: Sentiment Analysis
  // ========================================================================

  analyzeSentiment: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.analyzeMeetingSentiment(input.meetingId);
    }),

  sentimentDashboard: protectedProcedure
    .input(z.object({
      channelId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getSentimentDashboard(input ?? {});
    }),

  batchAnalyzeSentiment: protectedProcedure
    .input(z.object({ meetingIds: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ input }) => {
      return imeService.batchAnalyzeSentiment(input.meetingIds);
    }),

  // ========================================================================
  // Phase 4: Meeting Health & Optimization
  // ========================================================================

  computeHealth: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.computeMeetingHealth(input.scope, input.scopeId, input.period);
    }),

  healthDashboard: protectedProcedure
    .input(z.object({
      scope: z.string().optional(),
      period: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getHealthDashboard(input ?? {});
    }),

  optimizationRecommendations: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return imeService.getOptimizationRecommendations(input.scope, input.scopeId);
    }),

  // ========================================================================
  // Phase 4: Digest & Alerts
  // ========================================================================

  generateDigest: protectedProcedure
    .input(z.object({
      digestType: z.string(),
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.generateDigest(input.digestType, input.scope, input.scopeId, input.period);
    }),

  digestHistory: protectedProcedure
    .input(z.object({
      digestType: z.string().optional(),
      scope: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getDigestHistory(input ?? {});
    }),

  activeAlerts: protectedProcedure
    .input(z.object({
      scope: z.string().optional(),
      scopeId: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getActiveAlerts(input?.scope, input?.scopeId);
    }),

  // ========================================================================
  // Phase 5: Meeting ROI
  // ========================================================================

  computeRoi: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.computeMeetingRoi(input.meetingId);
    }),

  roiDashboard: protectedProcedure
    .input(z.object({
      channelId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getRoiDashboard(input ?? {});
    }),

  batchComputeRoi: protectedProcedure
    .input(z.object({ meetingIds: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ input }) => {
      return imeService.batchComputeRoi(input.meetingIds);
    }),

  // ========================================================================
  // Phase 5: Attendee Optimization
  // ========================================================================

  optimizeAttendees: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.optimizeAttendees(input.meetingId);
    }),

  optimizationDashboard: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getOptimizationDashboard(input ?? {});
    }),

  suggestParticipants: protectedProcedure
    .input(z.object({
      topic: z.string(),
      excludeIds: z.array(z.string()).optional(),
    }))
    .query(async ({ input }) => {
      return imeService.suggestParticipantsForTopic(input.topic, input.excludeIds);
    }),

  // ========================================================================
  // Phase 5: Predictive Analytics
  // ========================================================================

  predictEffectiveness: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.predictMeetingEffectiveness(input.meetingId);
    }),

  detectFatigue: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.detectMeetingFatigue(input.scope, input.scopeId, input.period);
    }),

  predictionDashboard: protectedProcedure
    .input(z.object({
      scope: z.string().optional(),
      period: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getPredictionDashboard(input ?? {});
    }),

  // ========================================================================
  // Phase 6: Report Exports
  // ========================================================================

  generateMeetingReport: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateMeetingReport(input.meetingId);
    }),

  generateDashboardExcel: protectedProcedure
    .input(z.object({
      channelId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      return imeService.generateExecutiveDashboardExcel(input ?? {});
    }),

  generateBenchmarkReport: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.generateBenchmarkReport(input.scope, input.scopeId, input.period);
    }),

  reportExportHistory: protectedProcedure
    .input(z.object({
      reportType: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const filters = input ?? {};
      const whereParts: string[] = [];
      if (filters.reportType) whereParts.push(`report_type = '${filters.reportType.replace(/'/g, "''")}'`);
      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
      const limitVal = filters.limit || 50;
      const result = await db.execute(sql.raw(`
        SELECT * FROM ime_report_exports ${whereClause} ORDER BY generated_at DESC LIMIT ${limitVal}
      `));
      return result.rows;
    }),

  // ========================================================================
  // Phase 7: Knowledge Graph & Organizational Learning
  // ========================================================================

  extractEntities: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.extractKnowledgeEntities(input.meetingId);
    }),

  buildRelationships: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.buildEntityRelationships(input.meetingId);
    }),

  knowledgeGraph: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeId = input.meetingId.replace(/'/g, "''");
      const entities = await db.execute(sql.raw(
        `SELECT * FROM ime_knowledge_entities WHERE meeting_id = '${safeId}' ORDER BY confidence DESC`
      ));
      const entityIds = (entities.rows as any[]).map((e: any) => e.id);
      let relationships: any[] = [];
      if (entityIds.length > 0) {
        const relRes = await db.execute(sql.raw(
          `SELECT * FROM ime_entity_relationships WHERE entity_from_id IN (${entityIds.join(",")}) OR entity_to_id IN (${entityIds.join(",")})`
        ));
        relationships = relRes.rows as any[];
      }
      return { entities: entities.rows, relationships };
    }),

  searchKnowledge: protectedProcedure
    .input(z.object({
      query: z.string(),
      entityType: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeQuery = input.query.replace(/'/g, "''");
      const typeFilter = input.entityType ? `AND ke.entity_type = '${input.entityType.replace(/'/g, "''")}'` : "";
      const limitVal = input.limit || 20;
      const result = await db.execute(sql.raw(`
        SELECT ke.*, mr.title as meeting_title
        FROM ime_knowledge_entities ke
        JOIN meeting_records mr ON ke.meeting_id = mr.id
        WHERE (ke.entity_value LIKE '%${safeQuery}%' OR ke.context LIKE '%${safeQuery}%') ${typeFilter}
        ORDER BY ke.confidence DESC LIMIT ${limitVal}
      `));
      return result.rows;
    }),

  trackDecision: protectedProcedure
    .input(z.object({
      entityId: z.number(),
      outcomeStatus: z.enum(["pending", "implemented", "reversed", "modified", "abandoned"]),
      outcomeNotes: z.string().optional(),
      impactScore: z.number().optional(),
      lessonsLearned: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.trackDecisionOutcome(input.entityId, input.outcomeStatus, input.outcomeNotes, input.impactScore, input.lessonsLearned);
    }),

  decisionHistory: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const filters = input ?? {};
      const whereParts: string[] = [];
      if (filters.status) whereParts.push(`d.outcome_status = '${filters.status.replace(/'/g, "''")}'`);
      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
      const limitVal = filters.limit || 50;
      const result = await db.execute(sql.raw(`
        SELECT d.*, mr.title as meeting_title
        FROM ime_decision_outcomes d
        JOIN meeting_records mr ON d.meeting_id = mr.id
        ${whereClause} ORDER BY d.created_at DESC LIMIT ${limitVal}
      `));
      return result.rows;
    }),

  generateRetrospective: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateRetrospective(input.meetingId);
    }),

  retrospectiveHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limitVal = input?.limit || 20;
      const result = await db.execute(sql.raw(`
        SELECT r.*, mr.title as meeting_title
        FROM ime_meeting_retrospectives r
        JOIN meeting_records mr ON r.meeting_id = mr.id
        ORDER BY r.generated_at DESC LIMIT ${limitVal}
      `));
      return result.rows;
    }),

  computeExpertProfiles: protectedProcedure
    .input(z.object({ department: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      return imeService.computeExpertProfiles(input?.department);
    }),

  expertProfiles: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const filters = input ?? {};
      const whereParts: string[] = [];
      if (filters.department) whereParts.push(`department = '${filters.department.replace(/'/g, "''")}'`);
      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
      const limitVal = filters.limit || 30;
      const result = await db.execute(sql.raw(`
        SELECT * FROM ime_expert_profiles ${whereClause} ORDER BY credibility_score DESC LIMIT ${limitVal}
      `));
      return result.rows;
    }),

  knowledgeDashboard: protectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getKnowledgeDashboard(input ?? {});
    }),

  // ========================================================================
  // Phase 8: Meeting AI Assistant
  // ========================================================================

  generateBrief: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateMeetingBrief(input.meetingId);
    }),

  getMeetingBrief: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeId = input.meetingId.replace(/'/g, "''");
      const result = await db.execute(sql.raw(
        `SELECT * FROM ime_meeting_briefs WHERE meeting_id = '${safeId}' ORDER BY generated_at DESC LIMIT 1`
      ));
      return (result.rows as any[])[0] || null;
    }),

  generateAgenda: protectedProcedure
    .input(z.object({
      topic: z.string(),
      participants: z.array(z.string()).optional(),
      durationMinutes: z.number().min(10).max(480).optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.generateAgendaSuggestion(input.topic, input.participants, input.durationMinutes);
    }),

  generateMinutes: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateMeetingMinutes(input.meetingId);
    }),

  getMeetingMinutes: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeId = input.meetingId.replace(/'/g, "''");
      const result = await db.execute(sql.raw(
        `SELECT * FROM ime_meeting_minutes WHERE meeting_id = '${safeId}' ORDER BY generated_at DESC LIMIT 1`
      ));
      return (result.rows as any[])[0] || null;
    }),

  generateFollowUp: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.generateFollowUpPlan(input.meetingId);
    }),

  askAssistant: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      question: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.openId || "unknown";
      return imeService.askMeetingAssistant(input.sessionId, input.question, userId);
    }),

  chatHistory: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeSession = input.sessionId.replace(/'/g, "''");
      const result = await db.execute(sql.raw(
        `SELECT role, content, created_at FROM ime_ai_conversations WHERE session_id = '${safeSession}' ORDER BY created_at ASC LIMIT 100`
      ));
      return result.rows;
    }),

  // Phase 9: Workflow Automation & Coaching

  createRule: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      triggerEvent: z.string(),
      conditionField: z.string().optional(),
      conditionOperator: z.string().optional(),
      conditionValue: z.string().optional(),
      actionType: z.string(),
      actionConfig: z.any().optional(),
      scope: z.string().optional(),
      scopeId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return imeService.createWorkflowRule({ ...input, createdBy: (ctx as any).user?.openId || "unknown" });
    }),

  listRules: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const where = input?.activeOnly !== false ? "WHERE is_active = 1" : "";
      const result = await db.execute(sql.raw(`SELECT * FROM ime_workflow_rules ${where} ORDER BY created_at DESC`));
      return result.rows;
    }),

  updateRule: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      triggerEvent: z.string().optional(),
      conditionField: z.string().optional(),
      conditionOperator: z.string().optional(),
      conditionValue: z.string().optional(),
      actionType: z.string().optional(),
      actionConfig: z.any().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const sets: string[] = [];
      if (input.name) sets.push(`name = '${input.name.replace(/'/g, "''")}'`);
      if (input.description !== undefined) sets.push(`description = '${(input.description || "").replace(/'/g, "''")}'`);
      if (input.triggerEvent) sets.push(`trigger_event = '${input.triggerEvent}'`);
      if (input.conditionField !== undefined) sets.push(`condition_field = ${input.conditionField ? `'${input.conditionField}'` : "NULL"}`);
      if (input.conditionOperator !== undefined) sets.push(`condition_operator = ${input.conditionOperator ? `'${input.conditionOperator}'` : "NULL"}`);
      if (input.conditionValue !== undefined) sets.push(`condition_value = ${input.conditionValue ? `'${input.conditionValue}'` : "NULL"}`);
      if (input.actionType) sets.push(`action_type = '${input.actionType}'`);
      if (input.actionConfig !== undefined) sets.push(`action_config = '${JSON.stringify(input.actionConfig).replace(/'/g, "''")}'`);
      if (input.isActive !== undefined) sets.push(`is_active = ${input.isActive}`);
      sets.push("updated_at = NOW()");
      await db.execute(sql.raw(`UPDATE ime_workflow_rules SET ${sets.join(", ")} WHERE id = ${input.id}`));
      return { success: true };
    }),

  deleteRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql.raw(`DELETE FROM ime_workflow_rules WHERE id = ${input.id}`));
      return { success: true };
    }),

  evaluateRules: protectedProcedure
    .input(z.object({ meetingId: z.string(), event: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.evaluateWorkflowRules(input.meetingId, input.event);
    }),

  workflowExecutions: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const limit = input?.limit || 50;
      const result = await db.execute(sql.raw(
        `SELECT * FROM ime_workflow_executions ORDER BY executed_at DESC LIMIT ${limit}`
      ));
      return result.rows;
    }),

  generateCoaching: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      period: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.generateCoachingPlan(input.scope, input.scopeId, input.period);
    }),

  meetingCultureScore: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      period: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getMeetingCultureScore(input?.department, input?.period);
    }),

  // Phase 10: Integration Hub & System Settings

  createIntegration: protectedProcedure
    .input(z.object({
      name: z.string(),
      integrationType: z.string(),
      provider: z.string(),
      config: z.any().optional(),
      syncDirection: z.string().optional(),
      syncFrequency: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return imeService.createIntegration({ ...input, createdBy: (ctx as any).user?.openId || "unknown" });
    }),

  listIntegrations: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`SELECT * FROM ime_integrations ORDER BY created_at DESC`));
      return result.rows;
    }),

  updateIntegration: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      config: z.any().optional(),
      syncDirection: z.string().optional(),
      syncFrequency: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const sets: string[] = [];
      if (input.name) sets.push(`name = '${input.name.replace(/'/g, "''")}'`);
      if (input.config !== undefined) sets.push(`config = '${JSON.stringify(input.config).replace(/'/g, "''")}'`);
      if (input.syncDirection) sets.push(`sync_direction = '${input.syncDirection}'`);
      if (input.syncFrequency) sets.push(`sync_frequency = '${input.syncFrequency}'`);
      if (input.status) sets.push(`status = '${input.status}'`);
      sets.push("updated_at = NOW()");
      await db.execute(sql.raw(`UPDATE ime_integrations SET ${sets.join(", ")} WHERE id = ${input.id}`));
      return { success: true };
    }),

  deleteIntegration: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql.raw(`DELETE FROM ime_integrations WHERE id = ${input.id}`));
      return { success: true };
    }),

  syncIntegration: protectedProcedure
    .input(z.object({ integrationId: z.number() }))
    .mutation(async ({ input }) => {
      return imeService.syncIntegration(input.integrationId);
    }),

  integrationLogs: protectedProcedure
    .input(z.object({ integrationId: z.number().optional(), limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const where = input?.integrationId ? `WHERE integration_id = ${input.integrationId}` : "";
      const limit = input?.limit || 50;
      const result = await db.execute(sql.raw(
        `SELECT * FROM ime_integration_logs ${where} ORDER BY executed_at DESC LIMIT ${limit}`
      ));
      return result.rows;
    }),

  updateSetting: protectedProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
      type: z.string().optional(),
      category: z.string().optional(),
      label: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return imeService.updateSystemSetting(input.key, input.value, {
        type: input.type,
        category: input.category,
        label: input.label,
        description: input.description,
        updatedBy: (ctx as any).user?.openId || "unknown",
      });
    }),

  systemSettings: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getSystemSettings(input?.category);
    }),

  // Phase 11: Gamification & Engagement

  evaluateAchievements: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.evaluateAchievements(input.userId);
    }),

  userAchievements: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const safeUser = input.userId.replace(/'/g, "''");
      const result = await db.execute(sql.raw(
        `SELECT * FROM ime_achievements WHERE user_id = '${safeUser}' AND is_global = 0 ORDER BY awarded_at DESC`
      ));
      return result.rows;
    }),

  achievementDefinitions: protectedProcedure
    .query(async () => {
      const db = await requireDb();
      const result = await db.execute(sql.raw(`SELECT * FROM ime_achievements WHERE is_global = 1 ORDER BY points ASC`));
      return result.rows;
    }),

  leaderboard: protectedProcedure
    .input(z.object({ period: z.string().optional(), metric: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getLeaderboard(input?.period, input?.metric);
    }),

  createChallenge: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      challengeType: z.string(),
      targetMetric: z.string(),
      targetValue: z.number(),
      scope: z.string().optional(),
      scopeId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      rewardDescription: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return imeService.createTeamChallenge({ ...input, createdBy: (ctx as any).user?.openId || "unknown" });
    }),

  listChallenges: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const where = input?.status ? `WHERE status = '${input.status}'` : "";
      const result = await db.execute(sql.raw(`SELECT * FROM ime_team_challenges ${where} ORDER BY created_at DESC`));
      return result.rows;
    }),

  updateChallengeProgress: protectedProcedure
    .input(z.object({ challengeId: z.number() }))
    .mutation(async ({ input }) => {
      return imeService.updateChallengeProgress(input.challengeId);
    }),

  gamificationDashboard: protectedProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getGamificationDashboard(input?.userId);
    }),

  // Phase 12: Feedback & Continuous Improvement

  submitFeedback: protectedProcedure
    .input(z.object({
      meetingId: z.string(),
      overallRating: z.number().min(1).max(5),
      contentRelevance: z.number().min(1).max(5).optional(),
      timeEfficiency: z.number().min(1).max(5).optional(),
      facilitation: z.number().min(1).max(5).optional(),
      actionClarity: z.number().min(1).max(5).optional(),
      wouldRecommend: z.number().optional(),
      highlights: z.string().optional(),
      improvements: z.string().optional(),
      suggestions: z.string().optional(),
      anonymous: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.openId || "unknown";
      return imeService.submitMeetingFeedback(input.meetingId, userId, input);
    }),

  meetingFeedback: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .query(async ({ input }) => {
      return imeService.getMeetingFeedbackSummary(input.meetingId);
    }),

  feedbackTrends: protectedProcedure
    .input(z.object({ period: z.string().optional(), scope: z.string().optional(), scopeId: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      return imeService.analyzeFeedbackTrends(input || undefined);
    }),

  generateImprovement: protectedProcedure
    .input(z.object({ scope: z.string(), scopeId: z.string().optional() }))
    .mutation(async ({ input }) => {
      return imeService.generateImprovementInitiative(input.scope, input.scopeId);
    }),

  listImprovements: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const where = input?.status ? `WHERE status = '${input.status}'` : "";
      const result = await db.execute(sql.raw(`SELECT * FROM ime_improvement_initiatives ${where} ORDER BY created_at DESC`));
      return result.rows;
    }),

  updateImprovement: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string().optional(),
      owner: z.string().optional(),
      currentValue: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const sets: string[] = [];
      if (input.status) sets.push(`status = '${input.status}'`);
      if (input.owner) sets.push(`owner = '${input.owner.replace(/'/g, "''")}'`);
      if (input.currentValue !== undefined) sets.push(`current_value = ${input.currentValue}`);
      sets.push("updated_at = NOW()");
      await db.execute(sql.raw(`UPDATE ime_improvement_initiatives SET ${sets.join(", ")} WHERE id = ${input.id}`));
      return { success: true };
    }),

  feedbackDashboard: protectedProcedure
    .input(z.object({ period: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getFeedbackDashboard(input || undefined);
    }),

  feedbackStats: protectedProcedure
    .input(z.object({ meetingId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      if (input?.meetingId) {
        return imeService.getMeetingFeedbackSummary(input.meetingId);
      }
      const result = await db.execute(sql.raw(
        `SELECT meeting_id, COUNT(*) as responses, AVG(overall_rating) as avg_rating FROM ime_meeting_feedback GROUP BY meeting_id ORDER BY MAX(submitted_at) DESC LIMIT 20`
      ));
      return result.rows;
    }),

  // Phase 13: Compliance & Governance

  createPolicy: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      policyType: z.string(),
      checkField: z.string().optional(),
      operator: z.string().optional(),
      threshold: z.string().optional(),
      severity: z.string().optional(),
      scope: z.string().optional(),
      scopeId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return imeService.createCompliancePolicy({ ...input, createdBy: (ctx as any).user?.openId || "unknown" });
    }),

  listPolicies: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const where = input?.activeOnly !== false ? "WHERE is_active = 1" : "";
      const result = await db.execute(sql.raw(`SELECT * FROM ime_compliance_policies ${where} ORDER BY created_at DESC`));
      return result.rows;
    }),

  updatePolicy: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      threshold: z.string().optional(),
      severity: z.string().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const sets: string[] = [];
      if (input.name) sets.push(`name = '${input.name.replace(/'/g, "''")}'`);
      if (input.description !== undefined) sets.push(`description = '${(input.description || "").replace(/'/g, "''")}'`);
      if (input.threshold) sets.push(`threshold = '${input.threshold}'`);
      if (input.severity) sets.push(`severity = '${input.severity}'`);
      if (input.isActive !== undefined) sets.push(`is_active = ${input.isActive}`);
      sets.push("updated_at = NOW()");
      await db.execute(sql.raw(`UPDATE ime_compliance_policies SET ${sets.join(", ")} WHERE id = ${input.id}`));
      return { success: true };
    }),

  deletePolicy: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.execute(sql.raw(`DELETE FROM ime_compliance_policies WHERE id = ${input.id}`));
      return { success: true };
    }),

  auditMeeting: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.auditMeetingCompliance(input.meetingId);
    }),

  complianceOverview: protectedProcedure
    .input(z.object({ period: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getComplianceOverview(input || undefined);
    }),

  generateGovernanceReport: protectedProcedure
    .input(z.object({ period: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      return imeService.generateGovernanceReport(input?.period);
    }),

  complianceHistory: protectedProcedure
    .input(z.object({ meetingId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getComplianceHistory(input?.meetingId);
    }),

  // ========================================================================
  // Phase 14: HR & Performance Linkage
  // ========================================================================

  createLinkageRule: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      conditionType: z.string(),
      conditionField: z.string().optional(),
      conditionOperator: z.string(),
      conditionThreshold: z.string(),
      actionType: z.string(),
      actionTarget: z.string().optional(),
      actionValue: z.string().optional(),
      actionDescription: z.string().optional(),
      scope: z.string().optional(),
      scopeId: z.string().optional(),
      impactDimension: z.string().optional(),
      priority: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.createLinkageRule(input);
    }),

  listLinkageRules: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.listLinkageRules(input?.activeOnly);
    }),

  updateLinkageRule: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      conditionType: z.string().optional(),
      conditionField: z.string().optional(),
      conditionOperator: z.string().optional(),
      conditionThreshold: z.string().optional(),
      actionType: z.string().optional(),
      actionTarget: z.string().optional(),
      actionValue: z.string().optional(),
      actionDescription: z.string().optional(),
      scope: z.string().optional(),
      impactDimension: z.string().optional(),
      priority: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return imeService.updateLinkageRule(id, updates);
    }),

  deleteLinkageRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return imeService.deleteLinkageRule(input.id);
    }),

  evaluateLinkage: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.evaluateLinkage(input.meetingId);
    }),

  hrActionLog: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      employeeId: z.string().optional(),
      actionType: z.string().optional(),
      department: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getHrActionLog(input || undefined);
    }),

  approveHrAction: protectedProcedure
    .input(z.object({ id: z.number(), reviewedBy: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      return imeService.approveHrAction(input.id, input.reviewedBy, input.notes);
    }),

  rejectHrAction: protectedProcedure
    .input(z.object({ id: z.number(), reviewedBy: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      return imeService.rejectHrAction(input.id, input.reviewedBy, input.notes);
    }),

  executeHrActions: protectedProcedure
    .input(z.object({ actionIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      return imeService.executeHrActions(input.actionIds);
    }),

  linkageDashboard: protectedProcedure
    .input(z.object({ period: z.string().optional(), department: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getLinkageDashboard(input?.period, input?.department);
    }),

  // ==========================================================================
  // Phase 15: Meeting Intelligence API — Key Management
  // ==========================================================================

  createApiKey: protectedProcedure
    .input(z.object({
      keyName: z.string().min(1),
      scopes: z.array(z.string()),
      rateLimit: z.number().optional(),
      rateLimitWindow: z.string().optional(),
      description: z.string().optional(),
      createdBy: z.string().optional(),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.createApiKey(input);
    }),

  listApiKeys: protectedProcedure
    .query(async () => {
      return imeService.listApiKeys();
    }),

  revokeApiKey: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return imeService.revokeApiKey(input.id);
    }),

  regenerateApiKey: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return imeService.regenerateApiKey(input.id);
    }),

  apiKeyUsageStats: protectedProcedure
    .input(z.object({ apiKeyId: z.number(), days: z.number().optional() }))
    .query(async ({ input }) => {
      return imeService.getApiKeyUsageStats(input.apiKeyId, input.days);
    }),

  apiDashboard: protectedProcedure
    .query(async () => {
      return imeService.getApiDashboard();
    }),

  apiUsageLogs: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getApiUsageLogs(input?.limit);
    }),

  // ==========================================================================
  // Phase 16: Collaboration Network Intelligence
  // ==========================================================================

  buildCollaborationNetwork: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      return imeService.buildCollaborationNetwork(input ?? {});
    }),

  collaborationDashboard: protectedProcedure
    .input(z.object({ department: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getCollaborationDashboard(input ?? {});
    }),

  collaborationNetworkStats: protectedProcedure
    .input(z.object({ department: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getCollaborationNetworkStats(input ?? {});
    }),

  collaborationMatrix: protectedProcedure
    .input(z.object({ level: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getCollaborationMatrix(input ?? {});
    }),

  topCollaboratorPairs: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
      relationshipType: z.string().optional(),
      department: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getTopCollaboratorPairs(input ?? {});
    }),

  crossDepartmentMetrics: protectedProcedure
    .input(z.object({ departments: z.array(z.string()).optional() }).optional())
    .query(async ({ input }) => {
      return imeService.getCrossDepartmentMetrics(input?.departments);
    }),

  detectSilos: protectedProcedure
    .input(z.object({ threshold: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return imeService.detectCollaborationSilos(input ?? {});
    }),

  analyzeMeetingNecessity: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.analyzeMeetingNecessity(input.meetingId);
    }),

  meetingNecessityScores: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
      grade: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getMeetingNecessityScores(input ?? {});
    }),

  batchAnalyzeNecessity: protectedProcedure
    .input(z.object({ meetingIds: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      return imeService.batchAnalyzeMeetingNecessity(input.meetingIds);
    }),

  // ==========================================================================
  // Phase 17: Meeting Load & Participant Well-being Intelligence
  // ==========================================================================

  computeParticipantLoad: protectedProcedure
    .input(z.object({
      periodType: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      return imeService.computeParticipantLoad(input ?? {});
    }),

  loadDashboard: protectedProcedure
    .input(z.object({
      periodType: z.string().optional(),
      department: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getLoadDashboard(input ?? {});
    }),

  participantLoadDetails: protectedProcedure
    .input(z.object({
      periodType: z.string().optional(),
      department: z.string().optional(),
      riskLevel: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getParticipantLoadDetails(input ?? {});
    }),

  loadTrends: protectedProcedure
    .input(z.object({
      periodType: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getLoadTrends(input ?? {});
    }),

  detectBurnoutRisk: protectedProcedure
    .input(z.object({
      threshold: z.number().optional(),
      periodType: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.detectBurnoutRisk(input ?? {});
    }),

  meetingFreeTime: protectedProcedure
    .input(z.object({
      periodType: z.string().optional(),
      department: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getMeetingFreeTimeAnalysis(input ?? {});
    }),

  assessWellbeing: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      periodType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.assessWellbeing(input.employeeId, { periodType: input.periodType });
    }),

  wellbeingScores: protectedProcedure
    .input(z.object({
      grade: z.string().optional(),
      department: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getWellbeingScores(input ?? {});
    }),

  batchAssessWellbeing: protectedProcedure
    .input(z.object({ employeeIds: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      return imeService.batchAssessWellbeing(input.employeeIds);
    }),

  teamLoadSummary: protectedProcedure
    .input(z.object({
      periodType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getTeamLoadSummary(input ?? {});
    }),

  // ====== Phase 18: Recurring Meeting Value Assessment & Optimization ======

  detectRecurringSeries: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      return imeService.detectRecurringSeries(input ?? {});
    }),

  recurringSeriesDashboard: protectedProcedure
    .input(z.object({
      frequency: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getRecurringSeriesDashboard(input ?? {});
    }),

  recurringSeriesList: protectedProcedure
    .input(z.object({
      frequency: z.string().optional(),
      valueGrade: z.string().optional(),
      status: z.string().optional(),
      effectivenessTrend: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getRecurringSeriesList(input ?? {});
    }),

  seriesValueTrend: protectedProcedure
    .input(z.object({ seriesId: z.number() }))
    .query(async ({ input }) => {
      return imeService.getSeriesValueTrend(input.seriesId);
    }),

  seriesComparison: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getSeriesComparison(input ?? {});
    }),

  generateSeriesOptimization: protectedProcedure
    .input(z.object({ seriesId: z.number() }))
    .mutation(async ({ input }) => {
      return imeService.generateSeriesOptimization(input.seriesId);
    }),

  batchGenerateOptimizations: protectedProcedure
    .input(z.object({ seriesIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      return imeService.batchGenerateOptimizations(input.seriesIds);
    }),

  recordOptimizationAction: protectedProcedure
    .input(z.object({
      seriesId: z.number(),
      actionTaken: z.string(),
    }))
    .mutation(async ({ input }) => {
      return imeService.recordOptimizationAction(input.seriesId, input.actionTaken);
    }),

  optimizationOutcomes: protectedProcedure
    .input(z.object({
      actionTaken: z.string().optional(),
      productivityImpact: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getOptimizationOutcomes(input ?? {});
    }),

  recurringMeetingSummary: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getRecurringMeetingSummary(input ?? {});
    }),

  // ========================================================================
  // Phase 19: Decision Effectiveness & Outcome Intelligence
  // ========================================================================

  analyzeDecisionEffectiveness: protectedProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      return imeService.analyzeDecisionEffectiveness(input.meetingId);
    }),

  batchAnalyzeDecisionEffectiveness: protectedProcedure
    .input(z.object({ meetingIds: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      return imeService.batchAnalyzeDecisionEffectiveness(input.meetingIds);
    }),

  detectDecisionReversals: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      return imeService.detectDecisionReversals(input ?? {});
    }),

  assessDecisionQuality: protectedProcedure
    .input(z.object({ decisionId: z.number() }))
    .mutation(async ({ input }) => {
      return imeService.assessDecisionQuality(input.decisionId);
    }),

  computeDecisionSnapshot: protectedProcedure
    .input(z.object({
      scope: z.string(),
      scopeId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.computeDecisionIntelligenceSnapshot(input.scope, input.scopeId, input.dateFrom, input.dateTo);
    }),

  decisionDashboard: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getDecisionDashboard(input ?? {});
    }),

  decisionTrackingList: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      department: z.string().optional(),
      impactCategory: z.string().optional(),
      meetingId: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getDecisionTrackingList(input ?? {});
    }),

  decisionVelocityTrend: protectedProcedure
    .input(z.object({
      scope: z.string().optional(),
      scopeId: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getDecisionVelocityTrend(input ?? {});
    }),

  decisionReversalAnalysis: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.getDecisionReversalAnalysis(input ?? {});
    }),

  computeDecisionVelocity: protectedProcedure
    .input(z.object({
      department: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return imeService.computeDecisionVelocity(input ?? {});
    }),

  updateDecisionFollowThrough: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string().optional(),
      implementationStartDate: z.string().optional(),
      implementationEndDate: z.string().optional(),
      businessOutcome: z.string().optional(),
      impactScore: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return imeService.updateDecisionFollowThrough(input.id, input);
    }),
});
