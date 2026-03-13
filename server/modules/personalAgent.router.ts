/**
 * 个人智能体与YDW数据映射模块 - tRPC路由
 * 模块功能：行为探针日志、过程笔记、技能推断
 */

import { z } from "zod";
import {router, protectedProcedure, adminProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { jsonValue } from "@shared/validators";
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("personal-agent-mod");

// ==================== 个人智能体路由 ====================
export const personalAgentRouter = router({
  // ==================== 行为探针日志管理 ====================
  
  // 获取行为日志列表
  getBehaviorLogs: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      userDid: z.string().optional(),
      context: z.string().optional(),
      impliedSkill: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { userId, userDid, context, impliedSkill, startDate, endDate, page = 1, pageSize = 50 } = input || {};
      
      let query = `SELECT bl.*, u.name as user_name
                   FROM behavior_logs bl
                   LEFT JOIN user u ON bl.user_id = u.id
                   WHERE 1=1`;
      const params: unknown[] = [];
      
      // 非管理员只能查看自己的日志
      if (ctx.user?.role !== 'admin') {
        query += ` AND bl.user_id = ?`;
        params.push(ctx.user?.id);
      } else if (userId) {
        query += ` AND bl.user_id = ?`;
        params.push(userId);
      }
      
      if (userDid) {
        query += ` AND bl.user_did = ?`;
        params.push(userDid);
      }
      if (context) {
        query += ` AND bl.context LIKE ?`;
        params.push(`%${context}%`);
      }
      if (impliedSkill) {
        query += ` AND bl.implied_skill LIKE ?`;
        params.push(`%${impliedSkill}%`);
      }
      if (startDate) {
        query += ` AND bl.created_at >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND bl.created_at <= ?`;
        params.push(endDate);
      }
      
      query += ` ORDER BY bl.created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const rows = await (db as any).execute(query, params);

      return {
        items: rows as any[],
        page,
        pageSize,
      };
    }),

  // 记录行为日志
  logBehavior: requirePermission('ai:assistant:chat')
    .input(z.object({
      context: z.string(),
      actionType: z.string().optional(),
      actionData: z.record(z.string(), jsonValue),
      source: z.string().optional(),
      deviceInfo: z.string().optional(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { context, actionType, actionData, source, deviceInfo, sessionId } = input;
      
      // 获取用户DID
      let userDid = '';
      if (ctx.user?.id) {
        const users = await (db as any).execute(
          `SELECT did FROM user WHERE id = ?`,
          [ctx.user.id]
        );
        userDid = (users as any[])[0]?.did || `DID-${ctx.user.id}`;
      }

      // AI推断技能标签
      const impliedSkill = await inferSkillFromBehavior(context, actionData);

      const result = await (db as any).execute(
        `INSERT INTO behavior_logs
         (user_did, user_id, context, action_type, action_data, implied_skill,
          skill_confidence, source, device_info, session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userDid, ctx.user?.id || null, context, actionType || null,
         JSON.stringify(actionData), impliedSkill.skill, impliedSkill.confidence,
         source || null, deviceInfo || null, sessionId || null]
      );

      return {
        id: (result as any).insertId,
        impliedSkill: impliedSkill.skill,
        confidence: impliedSkill.confidence,
        success: true
      };
    }),

  // 批量记录行为日志
  logBehaviorBatch: protectedProcedure
    .input(z.object({
      logs: z.array(z.object({
        context: z.string(),
        actionType: z.string().optional(),
        actionData: z.record(z.string(), jsonValue),
        timestamp: z.string().optional(),
      })),
      source: z.string().optional(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { logs, source, sessionId } = input;
      
      // 获取用户DID
      let userDid = '';
      if (ctx.user?.id) {
        const users = await (db as any).execute(
          `SELECT did FROM user WHERE id = ?`,
          [ctx.user.id]
        );
        userDid = (users as any[])[0]?.did || `DID-${ctx.user.id}`;
      }

      let insertCount = 0;
      for (const log of logs) {
        const impliedSkill = await inferSkillFromBehavior(log.context, log.actionData);

        await (db as any).execute(
          `INSERT INTO behavior_logs
           (user_did, user_id, context, action_type, action_data, implied_skill,
            skill_confidence, source, session_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userDid, ctx.user?.id || null, log.context, log.actionType || null,
           JSON.stringify(log.actionData), impliedSkill.skill, impliedSkill.confidence,
           source || null, sessionId || null]
        );
        insertCount++;
      }
      
      return { insertedCount: insertCount, success: true };
    }),

  // 获取用户技能画像
  getUserSkillProfile: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      userDid: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const { userId, userDid } = input || {};
      
      const targetUserId = userId || ctx.user?.id;
      
      // 统计技能出现频次
      const skillStats = await (db as any).execute(
        `SELECT implied_skill, COUNT(*) as count, AVG(skill_confidence) as avg_confidence
         FROM behavior_logs
         WHERE user_id = ? AND implied_skill IS NOT NULL
         GROUP BY implied_skill
         ORDER BY count DESC
         LIMIT 20`,
        [targetUserId]
      );

      // 获取最近活跃的上下文
      const recentContexts = await (db as any).execute(
        `SELECT context, COUNT(*) as count
         FROM behavior_logs
         WHERE user_id = ? AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY context
         ORDER BY count DESC
         LIMIT 10`,
        [targetUserId]
      );

      // 获取技能成长趋势（按周统计）
      const growthTrend = await (db as any).execute(
        `SELECT
           to_char(created_at, 'IYYY-IW') as week,
           COUNT(DISTINCT implied_skill) as unique_skills,
           COUNT(*) as total_actions
         FROM behavior_logs
         WHERE user_id = ? AND created_at >= NOW() - INTERVAL '12 weeks'
         GROUP BY to_char(created_at, 'IYYY-IW')
         ORDER BY week`,
        [targetUserId]
      );
      
      return {
        skills: skillStats,
        recentContexts: recentContexts,
        growthTrend: growthTrend,
      };
    }),

  // ==================== 过程笔记管理 ====================
  
  // 获取过程笔记列表
  getProcessNotes: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      projectPhase: z.string().optional(),
      authorId: z.number().optional(),
      category: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId, projectPhase, authorId, category, search, page = 1, pageSize = 20 } = input || {};
      
      let query = `SELECT pn.*, u.name as author_name, p.name as project_name
                   FROM process_notes pn
                   LEFT JOIN user u ON pn.author_id = u.id
                   LEFT JOIN projects p ON pn.project_id = p.id
                   WHERE 1=1`;
      const params: unknown[] = [];
      
      if (projectId) {
        query += ` AND pn.project_id = ?`;
        params.push(projectId);
      }
      if (projectPhase) {
        query += ` AND pn.project_phase = ?`;
        params.push(projectPhase);
      }
      if (authorId) {
        query += ` AND pn.author_id = ?`;
        params.push(authorId);
      }
      if (category) {
        query += ` AND pn.category = ?`;
        params.push(category);
      }
      if (search) {
        query += ` AND (pn.problem_desc LIKE ? OR pn.solution_desc LIKE ? OR pn.title LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      query += ` ORDER BY pn.created_at DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, (page - 1) * pageSize);
      
      const rows = await (db as any).execute(query, params);

      return {
        items: rows as any[],
        page,
        pageSize,
      };
    }),

  // 获取单个过程笔记详情
  getProcessNote: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      noteId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { id, noteId } = input;
      
      let query = `SELECT pn.*, u.name as author_name
                   FROM process_notes pn
                   LEFT JOIN user u ON pn.author_id = u.id
                   WHERE `;
      const params: unknown[] = [];
      
      if (id) {
        query += `pn.id = ?`;
        params.push(id);
      } else if (noteId) {
        query += `pn.note_id = ?`;
        params.push(noteId);
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '需要提供id或noteId' });
      }
      
      const rows = await (db as any).execute(query, params);

      if ((rows as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '过程笔记不存在' });
      }

      // 增加浏览次数
      await (db as any).execute(
        `UPDATE process_notes SET view_count = view_count + 1 WHERE id = ?`,
        [(rows as any[])[0].id]
      );
      
      return (rows as any[])[0];
    }),

  // 创建过程笔记
  createProcessNote: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      projectId: z.number().optional(),
      projectPhase: z.string().optional(),
      category: z.string().optional(),
      problemDesc: z.string(),
      solutionDesc: z.string(),
      tags: z.array(z.string()).optional(),
      relatedNoteIds: z.array(z.number()).optional(),
      attachments: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { title, projectId, projectPhase, category, problemDesc, solutionDesc,
              tags, relatedNoteIds, attachments } = input;
      
      const noteId = `NOTE-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
      
      // AI提取结构化知识
      const extractedKnowledge = await extractKnowledgeFromNote(problemDesc, solutionDesc);
      
      const result = await (db as any).execute(
        `INSERT INTO process_notes
         (note_id, title, project_id, project_phase, category, problem_desc, solution_desc,
          ai_extracted_knowledge, tags, related_note_ids, attachments, author_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [noteId, title || `笔记-${new Date().toLocaleDateString()}`,
         projectId || null, projectPhase || null, category || null,
         problemDesc, solutionDesc, JSON.stringify(extractedKnowledge),
         tags ? JSON.stringify(tags) : null,
         relatedNoteIds ? JSON.stringify(relatedNoteIds) : null,
         attachments ? JSON.stringify(attachments) : null,
         ctx.user?.id || null]
      );
      
      return { 
        id: (result as any).insertId, 
        noteId,
        extractedKnowledge,
        success: true 
      };
    }),

  // 更新过程笔记
  updateProcessNote: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      projectPhase: z.string().optional(),
      category: z.string().optional(),
      problemDesc: z.string().optional(),
      solutionDesc: z.string().optional(),
      tags: z.array(z.string()).optional(),
      relatedNoteIds: z.array(z.number()).optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...updates } = input;
      
      const setClauses: string[] = [];
      const params: unknown[] = [];
      
      if (updates.title !== undefined) {
        setClauses.push('title = ?');
        params.push(updates.title);
      }
      if (updates.projectPhase !== undefined) {
        setClauses.push('project_phase = ?');
        params.push(updates.projectPhase);
      }
      if (updates.category !== undefined) {
        setClauses.push('category = ?');
        params.push(updates.category);
      }
      if (updates.problemDesc !== undefined) {
        setClauses.push('problem_desc = ?');
        params.push(updates.problemDesc);
      }
      if (updates.solutionDesc !== undefined) {
        setClauses.push('solution_desc = ?');
        params.push(updates.solutionDesc);
      }
      if (updates.tags !== undefined) {
        setClauses.push('tags = ?');
        params.push(JSON.stringify(updates.tags));
      }
      if (updates.relatedNoteIds !== undefined) {
        setClauses.push('related_note_ids = ?');
        params.push(JSON.stringify(updates.relatedNoteIds));
      }
      if (updates.isPublic !== undefined) {
        setClauses.push('is_public = ?');
        params.push(updates.isPublic);
      }
      
      // 如果问题或解决方案更新，重新提取知识
      if (updates.problemDesc !== undefined || updates.solutionDesc !== undefined) {
        const notes = await (db as any).execute(`SELECT problem_desc, solution_desc FROM process_notes WHERE id = ?`, [id]);
        const note = (notes as any[])[0];
        const newProblem = updates.problemDesc || note.problem_desc;
        const newSolution = updates.solutionDesc || note.solution_desc;
        const extractedKnowledge = await extractKnowledgeFromNote(newProblem, newSolution);
        setClauses.push('ai_extracted_knowledge = ?');
        params.push(JSON.stringify(extractedKnowledge));
      }
      
      if (setClauses.length === 0) {
        return { success: true };
      }
      
      params.push(id);
      await (db as any).execute(
        `UPDATE process_notes SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      );
      
      return { success: true };
    }),

  // 搜索相似问题
  searchSimilarProblems: protectedProcedure
    .input(z.object({
      problemDesc: z.string(),
      limit: z.number().default(5),
    }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const { problemDesc, limit } = input;
      
      // 简单的关键词匹配搜索
      // 实际应该使用向量搜索或全文搜索
      const keywords = problemDesc.split(/\s+/).filter(k => k.length > 2).slice(0, 5);
      
      if (keywords.length === 0) {
        return { items: [] };
      }
      
      const conditions = keywords.map(() => `problem_desc LIKE ?`).join(' OR ');
      const params = keywords.map(k => `%${k}%`);
      
      const rows = await (db as any).execute(
        `SELECT id, note_id, title, problem_desc, solution_desc, category, view_count
         FROM process_notes
         WHERE ${conditions}
         ORDER BY view_count DESC
         LIMIT ?`,
        [...params, limit]
      );
      
      return { items: rows as any[] };
    }),

  // 获取知识图谱统计
  getKnowledgeStats: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const { projectId } = input || {};
      
      let whereClause = projectId ? `WHERE project_id = ${projectId}` : '';
      
      // 按类别统计
      const categoryStats = await (db as any).execute(
        `SELECT category, COUNT(*) as count
         FROM process_notes ${whereClause}
         GROUP BY category
         ORDER BY count DESC`
      );

      // 按阶段统计
      const phaseStats = await (db as any).execute(
        `SELECT project_phase, COUNT(*) as count
         FROM process_notes ${whereClause}
         GROUP BY project_phase
         ORDER BY count DESC`
      );

      // 热门标签
      const tagStats = await (db as any).execute(
        `SELECT tags FROM process_notes ${whereClause} WHERE tags IS NOT NULL`
      );
      
      // 统计标签频次
      const tagCounts: Record<string, number> = {};
      for (const row of tagStats as any[]) {
        const tags = JSON.parse(row.tags);
        for (const tag of tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
      
      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
      
      return {
        categories: categoryStats,
        phases: phaseStats,
        topTags,
      };
    }),

  // ==================== 统计分析 ====================
  
  // 获取个人智能体统计
  getStats: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const targetUserId = input?.userId || ctx.user?.id;
      
      // 行为日志统计
      const behaviorStats = await (db as any).execute(
        `SELECT
           COUNT(*) as total_logs,
           COUNT(DISTINCT context) as unique_contexts,
           COUNT(DISTINCT implied_skill) as unique_skills,
           COUNT(DISTINCT DATE(created_at)) as active_days
         FROM behavior_logs
         WHERE user_id = ?`,
        [targetUserId]
      );

      // 过程笔记统计
      const noteStats = await (db as any).execute(
        `SELECT
           COUNT(*) as total_notes,
           SUM(view_count) as total_views,
           COUNT(DISTINCT category) as unique_categories
         FROM process_notes
         WHERE author_id = ?`,
        [targetUserId]
      );
      
      return {
        behavior: (behaviorStats as any[])[0],
        notes: (noteStats as any[])[0],
      };
    }),
});

// ==================== 辅助函数 ====================

// AI推断技能
async function inferSkillFromBehavior(context: string, actionData: any): Promise<{ skill: string; confidence: number }> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是GRT智能系统的技能推断引擎，负责从用户行为中推断技能标签。
根据行为上下文和操作数据，推断用户正在使用的技能。
输出JSON格式：{"skill": "技能标签", "confidence": 0-100的置信度}`
        },
        {
          role: 'user',
          content: `行为上下文：${context}
操作数据摘要：${JSON.stringify(actionData).slice(0, 500)}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'skill_inference',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              skill: { type: 'string' },
              confidence: { type: 'number' }
            },
            required: ['skill', 'confidence'],
            additionalProperties: false
          }
        }
      }
    });
    
    return JSON.parse(response.choices[0]?.message?.content || '{"skill": "通用操作", "confidence": 50}');
  } catch (error) {
    log.error({ err: error }, "Skill inference failed");
    
    // 基于上下文的简单规则推断
    const contextLower = context.toLowerCase();
    if (contextLower.includes('code') || contextLower.includes('ide')) {
      return { skill: '软件开发', confidence: 70 };
    } else if (contextLower.includes('cad') || contextLower.includes('design')) {
      return { skill: '工程设计', confidence: 70 };
    } else if (contextLower.includes('excel') || contextLower.includes('data')) {
      return { skill: '数据分析', confidence: 70 };
    }
    
    return { skill: '通用操作', confidence: 50 };
  }
}

// AI提取知识
async function extractKnowledgeFromNote(problemDesc: string, solutionDesc: string): Promise<any> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是GRT智能系统的知识提取引擎，负责从过程笔记中提取结构化知识。
分析问题描述和解决方案，提取关键知识点。
输出JSON格式：{
  "problem_type": "问题类型",
  "root_cause": "根本原因",
  "solution_steps": ["步骤1", "步骤2"],
  "key_insights": ["洞察1", "洞察2"],
  "applicable_scenarios": ["场景1", "场景2"],
  "difficulty_level": "easy/medium/hard"
}`
        },
        {
          role: 'user',
          content: `问题描述：${problemDesc}

解决方案：${solutionDesc}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'knowledge_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              problem_type: { type: 'string' },
              root_cause: { type: 'string' },
              solution_steps: { type: 'array', items: { type: 'string' } },
              key_insights: { type: 'array', items: { type: 'string' } },
              applicable_scenarios: { type: 'array', items: { type: 'string' } },
              difficulty_level: { type: 'string' }
            },
            required: ['problem_type', 'root_cause', 'solution_steps', 'key_insights', 'applicable_scenarios', 'difficulty_level'],
            additionalProperties: false
          }
        }
      }
    });
    
    return JSON.parse(response.choices[0]?.message?.content || '{}');
  } catch (error) {
    log.error({ err: error }, "Knowledge extraction failed");
    return {
      problem_type: '未分类',
      root_cause: '待分析',
      solution_steps: [],
      key_insights: [],
      applicable_scenarios: [],
      difficulty_level: 'medium'
    };
  }
}

export default personalAgentRouter;
