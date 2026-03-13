import { z } from "zod";
import {protectedProcedure, router, requirePermission} from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

// 工作区路由 — All queries use parameterized sql`` (not sql.raw) to prevent SQL injection
export const workspaceRouter = router({
  // 获取工作区列表
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'archived', 'all']).optional().default('active'),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        return { items: [], total: 0, page: input.page, pageSize: input.pageSize, totalPages: 0 };
      }
      const db = await getDb();
      const userId = ctx.user.id;
      const offset = (input.page - 1) * input.pageSize;

      // Build dynamic WHERE conditions with parameterized values
      const conditions: ReturnType<typeof sql>[] = [
        sql`(w.owner_id = ${userId} OR wm.user_id = ${userId})`,
      ];
      if (input.status !== 'all') {
        conditions.push(sql`w.status = ${input.status}`);
      }
      if (input.search) {
        const searchPattern = `%${input.search}%`;
        conditions.push(sql`(w.name LIKE ${searchPattern} OR w.description LIKE ${searchPattern})`);
      }
      const whereClause = sql.join(conditions, sql` AND `);

      // 获取总数
      const countResult = await db.execute(sql`
        SELECT COUNT(DISTINCT w.id) as total
        FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE ${whereClause}
      `);
      const total = (countResult[0] as any[])[0]?.total || 0;

      // 获取列表
      const result = await db.execute(sql`
        SELECT DISTINCT w.*,
          (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
          (SELECT COUNT(*) FROM workspace_documents WHERE workspace_id = w.id) as doc_count,
          (SELECT COUNT(*) FROM workspace_tasks WHERE workspace_id = w.id AND status != 'completed') as pending_tasks
        FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE ${whereClause}
        ORDER BY w.last_activity_at DESC, w.created_at DESC
        LIMIT ${input.pageSize} OFFSET ${offset}
      `);

      return {
        items: (result[0] as any[]) || [],
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  // 获取单个工作区详情
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user.id;

      const result = await db.execute(sql`
        SELECT w.*,
          (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
          (SELECT COUNT(*) FROM workspace_documents WHERE workspace_id = w.id) as doc_count,
          (SELECT COUNT(*) FROM workspace_tasks WHERE workspace_id = w.id) as task_count
        FROM workspaces w
        WHERE w.id = ${input.id}
      `);

      const workspace = (result[0] as any[])[0];
      if (!workspace) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工作区不存在' });
      }

      // 检查访问权限
      const memberCheck = await db.execute(sql`
        SELECT id FROM workspace_members
        WHERE workspace_id = ${input.id} AND user_id = ${userId}
      `);

      if (workspace.owner_id !== userId && (memberCheck[0] as any[]).length === 0 && workspace.visibility === 'private') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权访问此工作区' });
      }

      return workspace;
    }),

  // 创建工作区
  create: requirePermission('workspace:preferences:manage')
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      projectId: z.number().optional(),
      visibility: z.enum(['private', 'team', 'public']).optional().default('team'),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user.id;
      const userName = ctx.user.name || ctx.user.email || 'Unknown';

      // 创建工作区
      await db.execute(sql`
        INSERT INTO workspaces (name, description, owner_id, owner_name, project_id, visibility, last_activity_at)
        VALUES (${input.name}, ${input.description ?? null}, ${userId}, ${userName}, ${input.projectId ?? null}, ${input.visibility}, NOW())
      `);

      // 获取新创建的工作区ID
      const idResult = await db.execute(sql`SELECT LAST_INSERT_ID() as id LIMIT 1000`);
      const workspaceId = (idResult[0] as any[])[0]?.id;

      // 添加创建者为owner成员
      await db.execute(sql`
        INSERT INTO workspace_members (workspace_id, user_id, user_name, role, is_online, last_seen_at, joined_at)
        VALUES (${workspaceId}, ${userId}, ${userName}, 'owner', 1, NOW(), NOW())
      `);

      // 记录活动
      await db.execute(sql`
        INSERT INTO workspace_activities (workspace_id, user_id, user_name, activity_type, target_type, target_id, target_name)
        VALUES (${workspaceId}, ${userId}, ${userName}, 'workspace_created', 'workspace', ${workspaceId}, ${input.name})
      `);

      return { id: workspaceId, success: true };
    }),

  // 更新工作区
  update: requirePermission('workspace:preferences:manage')
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      visibility: z.enum(['private', 'team', 'public']).optional(),
      status: z.enum(['active', 'archived']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user.id;

      // 检查权限
      const workspace = await db.execute(sql`
        SELECT owner_id FROM workspaces WHERE id = ${input.id}
      `);

      if ((workspace[0] as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工作区不存在' });
      }

      const memberRole = await db.execute(sql`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.id} AND user_id = ${userId}
      `);

      const isOwner = (workspace[0] as any[])[0]?.owner_id === userId;
      const isAdmin = (memberRole[0] as any[])[0]?.role === 'admin';

      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权修改此工作区' });
      }

      // Build parameterized SET clauses
      const setClauses: ReturnType<typeof sql>[] = [];
      if (input.name) setClauses.push(sql`name = ${input.name}`);
      if (input.description !== undefined) setClauses.push(sql`description = ${input.description ?? null}`);
      if (input.visibility) setClauses.push(sql`visibility = ${input.visibility}`);
      if (input.status) setClauses.push(sql`status = ${input.status}`);
      setClauses.push(sql`last_activity_at = NOW()`);

      await db.execute(sql`
        UPDATE workspaces SET ${sql.join(setClauses, sql`, `)} WHERE id = ${input.id}
      `);

      return { success: true };
    }),

  // 删除工作区
  delete: requirePermission('workspace:preferences:manage')
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user.id;

      // 检查权限（只有owner可以删除）
      const workspace = await db.execute(sql`
        SELECT owner_id FROM workspaces WHERE id = ${input.id}
      `);

      if ((workspace[0] as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工作区不存在' });
      }

      if ((workspace[0] as any[])[0]?.owner_id !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '只有工作区所有者可以删除' });
      }

      // 软删除
      await db.execute(sql`
        UPDATE workspaces SET status = 'deleted' WHERE id = ${input.id}
      `);

      return { success: true };
    }),

  // 获取工作区成员
  getMembers: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();

      const result = await db.execute(sql`
        SELECT * FROM workspace_members
        WHERE workspace_id = ${input.workspaceId}
        ORDER BY role = 'owner' DESC, role = 'admin' DESC, joined_at ASC
      `);

      return (result[0] as any[]) || [];
    }),

  // 添加成员
  addMember: requirePermission('workspace:preferences:manage')
    .input(z.object({
      workspaceId: z.number(),
      userId: z.number(),
      userName: z.string().optional(),
      role: z.enum(['admin', 'editor', 'viewer']).optional().default('viewer'),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const currentUserId = ctx.user.id;

      // 检查权限
      const memberRole = await db.execute(sql`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${currentUserId}
      `);

      const role = (memberRole[0] as any[])[0]?.role;
      if (role !== 'owner' && role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权添加成员' });
      }

      // 检查是否已是成员
      const existing = await db.execute(sql`
        SELECT id FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}
      `);

      if ((existing[0] as any[]).length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: '用户已是工作区成员' });
      }

      // 添加成员
      await db.execute(sql`
        INSERT INTO workspace_members (workspace_id, user_id, user_name, role, invited_by)
        VALUES (${input.workspaceId}, ${input.userId}, ${input.userName ?? null}, ${input.role}, ${currentUserId})
      `);

      // 更新成员数
      await db.execute(sql`
        UPDATE workspaces SET members_count = members_count + 1, last_activity_at = NOW() WHERE id = ${input.workspaceId}
      `);

      return { success: true };
    }),

  // 移除成员
  removeMember: requirePermission('workspace:preferences:manage')
    .input(z.object({
      workspaceId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const currentUserId = ctx.user.id;

      // 检查权限
      const memberRole = await db.execute(sql`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${currentUserId}
      `);

      const role = (memberRole[0] as any[])[0]?.role;
      if (role !== 'owner' && role !== 'admin' && currentUserId !== input.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权移除成员' });
      }

      // 不能移除owner
      const targetRole = await db.execute(sql`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}
      `);

      if ((targetRole[0] as any[])[0]?.role === 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '不能移除工作区所有者' });
      }

      // 移除成员
      await db.execute(sql`
        DELETE FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}
      `);

      // 更新成员数
      await db.execute(sql`
        UPDATE workspaces SET members_count = GREATEST(members_count - 1, 1), last_activity_at = NOW() WHERE id = ${input.workspaceId}
      `);

      return { success: true };
    }),

  // 获取工作区文档
  getDocuments: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      type: z.enum(['spec', 'review', 'bom', 'plan', 'design', 'report', 'other', 'all']).optional().default('all'),
      status: z.enum(['draft', 'published', 'archived', 'all']).optional().default('all'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();

      const conditions: ReturnType<typeof sql>[] = [sql`workspace_id = ${input.workspaceId}`];
      if (input.type !== 'all') conditions.push(sql`type = ${input.type}`);
      if (input.status !== 'all') conditions.push(sql`status = ${input.status}`);

      const result = await db.execute(sql`
        SELECT * FROM workspace_documents
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY updated_at DESC
      `);

      return (result[0] as any[]) || [];
    }),

  // 创建文档
  createDocument: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      name: z.string().min(1).max(300),
      type: z.enum(['spec', 'review', 'bom', 'plan', 'design', 'report', 'other']).optional().default('other'),
      content: z.string().optional(),
      fileUrl: z.string().optional(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user.id;
      const userName = ctx.user.name || ctx.user.email || 'Unknown';

      await db.execute(sql`
        INSERT INTO workspace_documents (workspace_id, name, type, content, file_url, file_size, mime_type, created_by, created_by_name)
        VALUES (${input.workspaceId}, ${input.name}, ${input.type}, ${input.content ?? null}, ${input.fileUrl ?? null}, ${input.fileSize ?? null}, ${input.mimeType ?? null}, ${userId}, ${userName})
      `);

      // 更新文档数和活动时间
      await db.execute(sql`
        UPDATE workspaces SET documents_count = documents_count + 1, last_activity_at = NOW() WHERE id = ${input.workspaceId}
      `);

      const idResult = await db.execute(sql`SELECT LAST_INSERT_ID() as id LIMIT 1000`);
      return { id: (idResult[0] as any[])[0]?.id, success: true };
    }),

  // 获取工作区任务
  getTasks: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      status: z.enum(['pending', 'in_progress', 'review', 'completed', 'cancelled', 'all']).optional().default('all'),
      assigneeId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();

      const conditions: ReturnType<typeof sql>[] = [sql`workspace_id = ${input.workspaceId}`];
      if (input.status !== 'all') conditions.push(sql`status = ${input.status}`);
      if (input.assigneeId) conditions.push(sql`assignee_id = ${input.assigneeId}`);

      const result = await db.execute(sql`
        SELECT * FROM workspace_tasks
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY priority = 'urgent' DESC, priority = 'high' DESC, due_date ASC, created_at DESC
      `);

      return (result[0] as any[]) || [];
    }),

  // 创建任务
  createTask: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      title: z.string().min(1).max(300),
      description: z.string().optional(),
      assigneeId: z.number().optional(),
      assigneeName: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
      dueDate: z.string().optional(),
      relatedDocumentId: z.number().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user.id;
      const userName = ctx.user.name || ctx.user.email || 'Unknown';
      const tagsJson = input.tags ? JSON.stringify(input.tags) : null;

      await db.execute(sql`
        INSERT INTO workspace_tasks (workspace_id, title, description, assignee_id, assignee_name, priority, due_date, related_document_id, tags, created_by, created_by_name)
        VALUES (${input.workspaceId}, ${input.title}, ${input.description ?? null}, ${input.assigneeId ?? null}, ${input.assigneeName ?? null}, ${input.priority}, ${input.dueDate ?? null}, ${input.relatedDocumentId ?? null}, ${tagsJson}, ${userId}, ${userName})
      `);

      // 更新任务数和活动时间
      await db.execute(sql`
        UPDATE workspaces SET tasks_count = tasks_count + 1, last_activity_at = NOW() WHERE id = ${input.workspaceId}
      `);

      const idResult = await db.execute(sql`SELECT LAST_INSERT_ID() as id LIMIT 1000`);
      return { id: (idResult[0] as any[])[0]?.id, success: true };
    }),

  // 更新任务状态
  updateTaskStatus: requirePermission('workspace:preferences:manage')
    .input(z.object({
      taskId: z.number(),
      status: z.enum(['pending', 'in_progress', 'review', 'completed', 'cancelled']),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      if (input.status === 'completed') {
        await db.execute(sql`
          UPDATE workspace_tasks SET status = ${input.status}, completed_at = NOW() WHERE id = ${input.taskId}
        `);
      } else {
        await db.execute(sql`
          UPDATE workspace_tasks SET status = ${input.status} WHERE id = ${input.taskId}
        `);
      }

      return { success: true };
    }),

  // 获取工作区消息
  getMessages: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      limit: z.number().optional().default(50),
      beforeId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();

      const conditions: ReturnType<typeof sql>[] = [
        sql`workspace_id = ${input.workspaceId}`,
        sql`is_deleted = 0`,
      ];
      if (input.beforeId) conditions.push(sql`id < ${input.beforeId}`);

      const result = await db.execute(sql`
        SELECT * FROM workspace_messages
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY created_at DESC
        LIMIT ${input.limit}
      `);

      return ((result[0] as any[]) || []).reverse();
    }),

  // 发送消息
  sendMessage: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      content: z.string().min(1),
      messageType: z.enum(['text', 'file', 'image', 'mention']).optional().default('text'),
      replyToId: z.number().optional(),
      attachments: z.array(z.object({
        name: z.string(),
        url: z.string(),
        size: z.number().optional(),
        type: z.string().optional(),
      })).optional(),
      mentions: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user.id;
      const userName = ctx.user.name || ctx.user.email || 'Unknown';
      const attachmentsJson = input.attachments ? JSON.stringify(input.attachments) : null;
      const mentionsJson = input.mentions ? JSON.stringify(input.mentions) : null;

      await db.execute(sql`
        INSERT INTO workspace_messages (workspace_id, user_id, user_name, content, message_type, reply_to_id, attachments, mentions)
        VALUES (${input.workspaceId}, ${userId}, ${userName}, ${input.content}, ${input.messageType}, ${input.replyToId ?? null}, ${attachmentsJson}, ${mentionsJson})
      `);

      // 更新活动时间
      await db.execute(sql`
        UPDATE workspaces SET last_activity_at = NOW() WHERE id = ${input.workspaceId}
      `);

      const idResult = await db.execute(sql`SELECT LAST_INSERT_ID() as id LIMIT 1000`);
      return { id: (idResult[0] as any[])[0]?.id, success: true };
    }),

  // 获取工作区活动日志
  getActivities: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();

      const result = await db.execute(sql`
        SELECT * FROM workspace_activities
        WHERE workspace_id = ${input.workspaceId}
        ORDER BY created_at DESC
        LIMIT ${input.limit}
      `);

      return (result[0] as any[]) || [];
    }),

  // 获取工作区统计
  getStats: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();

      const stats = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ${input.workspaceId}) as member_count,
          (SELECT COUNT(*) FROM workspace_documents WHERE workspace_id = ${input.workspaceId}) as document_count,
          (SELECT COUNT(*) FROM workspace_tasks WHERE workspace_id = ${input.workspaceId}) as total_tasks,
          (SELECT COUNT(*) FROM workspace_tasks WHERE workspace_id = ${input.workspaceId} AND status = 'completed') as completed_tasks,
          (SELECT COUNT(*) FROM workspace_tasks WHERE workspace_id = ${input.workspaceId} AND status NOT IN ('completed', 'cancelled')) as pending_tasks,
          (SELECT COUNT(*) FROM workspace_messages WHERE workspace_id = ${input.workspaceId}) as message_count
      `);

      return (stats[0] as any[])[0] || {};
    }),

  // 搜索用户（用于邀请成员）
  searchUsers: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      workspaceId: z.number(),
      limit: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const searchPattern = `%${input.query}%`;

      // 搜索用户，排除已是工作区成员的用户
      const result = await db.execute(sql`
        SELECT u.id, u.name, u.email, u.avatar_url
        FROM users u
        WHERE (u.name LIKE ${searchPattern} OR u.email LIKE ${searchPattern})
        AND u.id NOT IN (
          SELECT user_id FROM workspace_members WHERE workspace_id = ${input.workspaceId}
        )
        LIMIT ${input.limit}
      `);

      return (result[0] as any[]) || [];
    }),

  // 通过邮箱邀请成员
  inviteMember: requirePermission('workspace:preferences:manage')
    .input(z.object({
      workspaceId: z.number(),
      email: z.string().email(),
      role: z.enum(['admin', 'editor', 'viewer']).optional().default('viewer'),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const currentUserId = ctx.user.id;
      const currentUserName = ctx.user.name || ctx.user.email || 'Unknown';

      // 检查权限
      const memberRole = await db.execute(sql`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${currentUserId}
      `);

      const role = (memberRole[0] as any[])[0]?.role;
      if (role !== 'owner' && role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权邀请成员' });
      }

      // 查找用户是否已存在
      const userResult = await db.execute(sql`
        SELECT id, name, email FROM users WHERE email = ${input.email}
      `);

      const existingUser = (userResult[0] as any[])[0];

      if (existingUser) {
        // 检查是否已是成员
        const existing = await db.execute(sql`
          SELECT id FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${existingUser.id}
        `);

        if ((existing[0] as any[]).length > 0) {
          throw new TRPCError({ code: 'CONFLICT', message: '用户已是工作区成员' });
        }

        // 直接添加成员
        await db.execute(sql`
          INSERT INTO workspace_members (workspace_id, user_id, user_name, role, invited_by, joined_at)
          VALUES (${input.workspaceId}, ${existingUser.id}, ${existingUser.name ?? null}, ${input.role}, ${currentUserId}, NOW())
        `);

        // 更新成员数
        await db.execute(sql`
          UPDATE workspaces SET members_count = members_count + 1, last_activity_at = NOW() WHERE id = ${input.workspaceId}
        `);

        // 记录活动
        await db.execute(sql`
          INSERT INTO workspace_activities (workspace_id, user_id, user_name, activity_type, target_type, target_id, target_name)
          VALUES (${input.workspaceId}, ${currentUserId}, ${currentUserName}, 'member_invited', 'user', ${existingUser.id}, ${existingUser.name ?? input.email})
        `);

        return { success: true, status: 'added', userId: existingUser.id, userName: existingUser.name };
      } else {
        return { success: true, status: 'invited', email: input.email, message: '邀请已发送，用户注册后将自动加入工作区' };
      }
    }),

  // 更新成员角色
  updateMemberRole: requirePermission('workspace:preferences:manage')
    .input(z.object({
      workspaceId: z.number(),
      userId: z.number(),
      role: z.enum(['admin', 'editor', 'viewer']),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const currentUserId = ctx.user.id;

      // 检查权限
      const memberRole = await db.execute(sql`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${currentUserId}
      `);

      const role = (memberRole[0] as any[])[0]?.role;
      if (role !== 'owner' && role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权修改成员角色' });
      }

      // 不能修改owner的角色
      const targetRole = await db.execute(sql`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}
      `);

      if ((targetRole[0] as any[])[0]?.role === 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '不能修改工作区所有者的角色' });
      }

      // 更新角色
      await db.execute(sql`
        UPDATE workspace_members SET role = ${input.role} WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}
      `);

      return { success: true };
    }),
});

export default workspaceRouter;
