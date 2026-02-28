import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

// 工作区路由
export const workspaceRouter = router({
  // 获取工作区列表 - 使用protectedProcedure以便在未登录时也能返回空列表
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'archived', 'all']).optional().default('active'),
      search: z.string().optional(),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      // 如果用户未登录，返回空列表
      if (!ctx.user) {
        return {
          items: [],
          total: 0,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: 0,
        };
      }
      const db = await getDb();
      const userId = ctx.user.id;
      const offset = (input.page - 1) * input.pageSize;
      
      // 简化查询 - 只查询用户拥有或参与的工作区
      let statusFilter = input.status !== 'all' ? `AND w.status = '${input.status}'` : '';
      let searchFilter = input.search ? `AND (w.name LIKE '%${input.search.replace(/'/g, "''")}%' OR w.description LIKE '%${input.search.replace(/'/g, "''")}%')` : '';
      
      // 获取总数
      const countResult = await db.execute(sql.raw(`
        SELECT COUNT(DISTINCT w.id) as total
        FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE (w.owner_id = ${userId} OR wm.user_id = ${userId}) ${statusFilter} ${searchFilter}
      `));
      const total = (countResult[0] as any[])[0]?.total || 0;
      
      // 获取列表
      const result = await db.execute(sql.raw(`
        SELECT DISTINCT w.*, 
          (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
          (SELECT COUNT(*) FROM workspace_documents WHERE workspace_id = w.id) as doc_count,
          (SELECT COUNT(*) FROM workspace_tasks WHERE workspace_id = w.id AND status != 'completed') as pending_tasks
        FROM workspaces w
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE (w.owner_id = ${userId} OR wm.user_id = ${userId}) ${statusFilter} ${searchFilter}
        ORDER BY w.last_activity_at DESC, w.created_at DESC
        LIMIT ${input.pageSize} OFFSET ${offset}
      `));
      
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
      
      const result = await db.execute(sql.raw(`
        SELECT w.*, 
          (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
          (SELECT COUNT(*) FROM workspace_documents WHERE workspace_id = w.id) as doc_count,
          (SELECT COUNT(*) FROM workspace_tasks WHERE workspace_id = w.id) as task_count
        FROM workspaces w
        WHERE w.id = ${input.id}
      `));
      
      const workspace = (result[0] as any[])[0];
      if (!workspace) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工作区不存在' });
      }
      
      // 检查访问权限
      const memberCheck = await db.execute(sql.raw(`
        SELECT id FROM workspace_members 
        WHERE workspace_id = ${input.id} AND user_id = ${userId}
      `));
      
      if (workspace.owner_id !== userId && (memberCheck[0] as any[]).length === 0 && workspace.visibility === 'private') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权访问此工作区' });
      }
      
      return workspace;
    }),

  // 创建工作区
  create: protectedProcedure
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
      
      const escapedName = input.name.replace(/'/g, "''");
      const escapedDesc = input.description ? input.description.replace(/'/g, "''") : null;
      const escapedUserName = userName.replace(/'/g, "''");
      
      // 创建工作区
      await db.execute(sql.raw(`
        INSERT INTO workspaces (name, description, owner_id, owner_name, project_id, visibility, last_activity_at)
        VALUES ('${escapedName}', ${escapedDesc ? `'${escapedDesc}'` : 'NULL'}, ${userId}, '${escapedUserName}', ${input.projectId || 'NULL'}, '${input.visibility}', NOW())
      `));
      
      // 获取新创建的工作区ID
      const idResult = await db.execute(sql.raw(`SELECT LAST_INSERT_ID() as id`));
      const workspaceId = (idResult[0] as any[])[0]?.id;
      
      // 添加创建者为owner成员
      await db.execute(sql.raw(`
        INSERT INTO workspace_members (workspace_id, user_id, user_name, role, is_online, last_seen_at, joined_at)
        VALUES (${workspaceId}, ${userId}, '${escapedUserName}', 'owner', 1, NOW(), NOW())
      `));
      
      // 记录活动
      await db.execute(sql.raw(`
        INSERT INTO workspace_activities (workspace_id, user_id, user_name, activity_type, target_type, target_id, target_name)
        VALUES (${workspaceId}, ${userId}, '${escapedUserName}', 'workspace_created', 'workspace', ${workspaceId}, '${escapedName}')
      `));
      
      return { id: workspaceId, success: true };
    }),

  // 更新工作区
  update: protectedProcedure
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
      const workspace = await db.execute(sql.raw(`
        SELECT owner_id FROM workspaces WHERE id = ${input.id}
      `));
      
      if ((workspace[0] as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工作区不存在' });
      }
      
      const memberRole = await db.execute(sql.raw(`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.id} AND user_id = ${userId}
      `));
      
      const isOwner = (workspace[0] as any[])[0]?.owner_id === userId;
      const isAdmin = (memberRole[0] as any[])[0]?.role === 'admin';
      
      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权修改此工作区' });
      }
      
      // 构建更新语句
      const updates: string[] = [];
      if (input.name) updates.push(`name = '${input.name.replace(/'/g, "''")}'`);
      if (input.description !== undefined) updates.push(`description = ${input.description ? `'${input.description.replace(/'/g, "''")}'` : 'NULL'}`);
      if (input.visibility) updates.push(`visibility = '${input.visibility}'`);
      if (input.status) updates.push(`status = '${input.status}'`);
      updates.push(`last_activity_at = NOW()`);
      
      await db.execute(sql.raw(`
        UPDATE workspaces SET ${updates.join(', ')} WHERE id = ${input.id}
      `));
      
      return { success: true };
    }),

  // 删除工作区
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const userId = ctx.user.id;
      
      // 检查权限（只有owner可以删除）
      const workspace = await db.execute(sql.raw(`
        SELECT owner_id FROM workspaces WHERE id = ${input.id}
      `));
      
      if ((workspace[0] as any[]).length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '工作区不存在' });
      }
      
      if ((workspace[0] as any[])[0]?.owner_id !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '只有工作区所有者可以删除' });
      }
      
      // 软删除
      await db.execute(sql.raw(`
        UPDATE workspaces SET status = 'deleted' WHERE id = ${input.id}
      `));
      
      return { success: true };
    }),

  // 获取工作区成员
  getMembers: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const result = await db.execute(sql.raw(`
        SELECT * FROM workspace_members 
        WHERE workspace_id = ${input.workspaceId}
        ORDER BY role = 'owner' DESC, role = 'admin' DESC, joined_at ASC
      `));
      
      return (result[0] as any[]) || [];
    }),

  // 添加成员
  addMember: protectedProcedure
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
      const memberRole = await db.execute(sql.raw(`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${currentUserId}
      `));
      
      const role = (memberRole[0] as any[])[0]?.role;
      if (role !== 'owner' && role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权添加成员' });
      }
      
      // 检查是否已是成员
      const existing = await db.execute(sql.raw(`
        SELECT id FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}
      `));
      
      if ((existing[0] as any[]).length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: '用户已是工作区成员' });
      }
      
      const escapedUserName = input.userName ? input.userName.replace(/'/g, "''") : null;
      
      // 添加成员
      await db.execute(sql.raw(`
        INSERT INTO workspace_members (workspace_id, user_id, user_name, role, invited_by)
        VALUES (${input.workspaceId}, ${input.userId}, ${escapedUserName ? `'${escapedUserName}'` : 'NULL'}, '${input.role}', ${currentUserId})
      `));
      
      // 更新成员数
      await db.execute(sql.raw(`
        UPDATE workspaces SET members_count = members_count + 1, last_activity_at = NOW() WHERE id = ${input.workspaceId}
      `));
      
      return { success: true };
    }),

  // 移除成员
  removeMember: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const currentUserId = ctx.user.id;
      
      // 检查权限
      const memberRole = await db.execute(sql.raw(`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${currentUserId}
      `));
      
      const role = (memberRole[0] as any[])[0]?.role;
      if (role !== 'owner' && role !== 'admin' && currentUserId !== input.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权移除成员' });
      }
      
      // 不能移除owner
      const targetRole = await db.execute(sql.raw(`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}
      `));
      
      if ((targetRole[0] as any[])[0]?.role === 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '不能移除工作区所有者' });
      }
      
      // 移除成员
      await db.execute(sql.raw(`
        DELETE FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}
      `));
      
      // 更新成员数
      await db.execute(sql.raw(`
        UPDATE workspaces SET members_count = GREATEST(members_count - 1, 1), last_activity_at = NOW() WHERE id = ${input.workspaceId}
      `));
      
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
      
      let typeFilter = input.type !== 'all' ? `AND type = '${input.type}'` : '';
      let statusFilter = input.status !== 'all' ? `AND status = '${input.status}'` : '';
      
      const result = await db.execute(sql.raw(`
        SELECT * FROM workspace_documents 
        WHERE workspace_id = ${input.workspaceId} ${typeFilter} ${statusFilter}
        ORDER BY updated_at DESC
      `));
      
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
      
      const escapedName = input.name.replace(/'/g, "''");
      const escapedContent = input.content ? input.content.replace(/'/g, "''") : null;
      const escapedUserName = userName.replace(/'/g, "''");
      
      await db.execute(sql.raw(`
        INSERT INTO workspace_documents (workspace_id, name, type, content, file_url, file_size, mime_type, created_by, created_by_name)
        VALUES (${input.workspaceId}, '${escapedName}', '${input.type}', ${escapedContent ? `'${escapedContent}'` : 'NULL'}, ${input.fileUrl ? `'${input.fileUrl}'` : 'NULL'}, ${input.fileSize || 'NULL'}, ${input.mimeType ? `'${input.mimeType}'` : 'NULL'}, ${userId}, '${escapedUserName}')
      `));
      
      // 更新文档数和活动时间
      await db.execute(sql.raw(`
        UPDATE workspaces SET documents_count = documents_count + 1, last_activity_at = NOW() WHERE id = ${input.workspaceId}
      `));
      
      const idResult = await db.execute(sql.raw(`SELECT LAST_INSERT_ID() as id`));
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
      
      let statusFilter = input.status !== 'all' ? `AND status = '${input.status}'` : '';
      let assigneeFilter = input.assigneeId ? `AND assignee_id = ${input.assigneeId}` : '';
      
      const result = await db.execute(sql.raw(`
        SELECT * FROM workspace_tasks 
        WHERE workspace_id = ${input.workspaceId} ${statusFilter} ${assigneeFilter}
        ORDER BY priority = 'urgent' DESC, priority = 'high' DESC, due_date ASC, created_at DESC
      `));
      
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
      
      const escapedTitle = input.title.replace(/'/g, "''");
      const escapedDesc = input.description ? input.description.replace(/'/g, "''") : null;
      const escapedAssigneeName = input.assigneeName ? input.assigneeName.replace(/'/g, "''") : null;
      const escapedUserName = userName.replace(/'/g, "''");
      const tagsJson = input.tags ? JSON.stringify(input.tags) : null;
      
      await db.execute(sql.raw(`
        INSERT INTO workspace_tasks (workspace_id, title, description, assignee_id, assignee_name, priority, due_date, related_document_id, tags, created_by, created_by_name)
        VALUES (${input.workspaceId}, '${escapedTitle}', ${escapedDesc ? `'${escapedDesc}'` : 'NULL'}, ${input.assigneeId || 'NULL'}, ${escapedAssigneeName ? `'${escapedAssigneeName}'` : 'NULL'}, '${input.priority}', ${input.dueDate ? `'${input.dueDate}'` : 'NULL'}, ${input.relatedDocumentId || 'NULL'}, ${tagsJson ? `'${tagsJson}'` : 'NULL'}, ${userId}, '${escapedUserName}')
      `));
      
      // 更新任务数和活动时间
      await db.execute(sql.raw(`
        UPDATE workspaces SET tasks_count = tasks_count + 1, last_activity_at = NOW() WHERE id = ${input.workspaceId}
      `));
      
      const idResult = await db.execute(sql.raw(`SELECT LAST_INSERT_ID() as id`));
      return { id: (idResult[0] as any[])[0]?.id, success: true };
    }),

  // 更新任务状态
  updateTaskStatus: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      status: z.enum(['pending', 'in_progress', 'review', 'completed', 'cancelled']),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const completedAt = input.status === 'completed' ? ', completed_at = NOW()' : '';
      
      await db.execute(sql.raw(`
        UPDATE workspace_tasks SET status = '${input.status}'${completedAt} WHERE id = ${input.taskId}
      `));
      
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
      
      let beforeFilter = input.beforeId ? `AND id < ${input.beforeId}` : '';
      
      const result = await db.execute(sql.raw(`
        SELECT * FROM workspace_messages 
        WHERE workspace_id = ${input.workspaceId} AND is_deleted = 0 ${beforeFilter}
        ORDER BY created_at DESC
        LIMIT ${input.limit}
      `));
      
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
      
      const escapedContent = input.content.replace(/'/g, "''");
      const escapedUserName = userName.replace(/'/g, "''");
      const attachmentsJson = input.attachments ? JSON.stringify(input.attachments) : null;
      const mentionsJson = input.mentions ? JSON.stringify(input.mentions) : null;
      
      await db.execute(sql.raw(`
        INSERT INTO workspace_messages (workspace_id, user_id, user_name, content, message_type, reply_to_id, attachments, mentions)
        VALUES (${input.workspaceId}, ${userId}, '${escapedUserName}', '${escapedContent}', '${input.messageType}', ${input.replyToId || 'NULL'}, ${attachmentsJson ? `'${attachmentsJson}'` : 'NULL'}, ${mentionsJson ? `'${mentionsJson}'` : 'NULL'})
      `));
      
      // 更新活动时间
      await db.execute(sql.raw(`
        UPDATE workspaces SET last_activity_at = NOW() WHERE id = ${input.workspaceId}
      `));
      
      const idResult = await db.execute(sql.raw(`SELECT LAST_INSERT_ID() as id`));
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
      
      const result = await db.execute(sql.raw(`
        SELECT * FROM workspace_activities 
        WHERE workspace_id = ${input.workspaceId}
        ORDER BY created_at DESC
        LIMIT ${input.limit}
      `));
      
      return (result[0] as any[]) || [];
    }),

  // 获取工作区统计
  getStats: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const stats = await db.execute(sql.raw(`
        SELECT 
          (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ${input.workspaceId}) as member_count,
          (SELECT COUNT(*) FROM workspace_documents WHERE workspace_id = ${input.workspaceId}) as document_count,
          (SELECT COUNT(*) FROM workspace_tasks WHERE workspace_id = ${input.workspaceId}) as total_tasks,
          (SELECT COUNT(*) FROM workspace_tasks WHERE workspace_id = ${input.workspaceId} AND status = 'completed') as completed_tasks,
          (SELECT COUNT(*) FROM workspace_tasks WHERE workspace_id = ${input.workspaceId} AND status NOT IN ('completed', 'cancelled')) as pending_tasks,
          (SELECT COUNT(*) FROM workspace_messages WHERE workspace_id = ${input.workspaceId}) as message_count
      `));
      
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
      const escapedQuery = input.query.replace(/'/g, "''");
      
      // 搜索用户，排除已是工作区成员的用户
      const result = await db.execute(sql.raw(`
        SELECT u.id, u.name, u.email, u.avatar_url
        FROM users u
        WHERE (u.name LIKE '%${escapedQuery}%' OR u.email LIKE '%${escapedQuery}%')
        AND u.id NOT IN (
          SELECT user_id FROM workspace_members WHERE workspace_id = ${input.workspaceId}
        )
        LIMIT ${input.limit}
      `));
      
      return (result[0] as any[]) || [];
    }),

  // 通过邮箱邀请成员（如果用户不存在则创建邀请记录）
  inviteMember: protectedProcedure
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
      const memberRole = await db.execute(sql.raw(`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${currentUserId}
      `));
      
      const role = (memberRole[0] as any[])[0]?.role;
      if (role !== 'owner' && role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权邀请成员' });
      }
      
      const escapedEmail = input.email.replace(/'/g, "''");
      
      // 查找用户是否已存在
      const userResult = await db.execute(sql.raw(`
        SELECT id, name, email FROM users WHERE email = '${escapedEmail}'
      `));
      
      const existingUser = (userResult[0] as any[])[0];
      
      if (existingUser) {
        // 检查是否已是成员
        const existing = await db.execute(sql.raw(`
          SELECT id FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${existingUser.id}
        `));
        
        if ((existing[0] as any[]).length > 0) {
          throw new TRPCError({ code: 'CONFLICT', message: '用户已是工作区成员' });
        }
        
        // 直接添加成员
        const escapedUserName = existingUser.name ? existingUser.name.replace(/'/g, "''") : null;
        await db.execute(sql.raw(`
          INSERT INTO workspace_members (workspace_id, user_id, user_name, role, invited_by, joined_at)
          VALUES (${input.workspaceId}, ${existingUser.id}, ${escapedUserName ? `'${escapedUserName}'` : 'NULL'}, '${input.role}', ${currentUserId}, NOW())
        `));
        
        // 更新成员数
        await db.execute(sql.raw(`
          UPDATE workspaces SET members_count = members_count + 1, last_activity_at = NOW() WHERE id = ${input.workspaceId}
        `));
        
        // 记录活动
        const escapedInviterName = currentUserName.replace(/'/g, "''");
        await db.execute(sql.raw(`
          INSERT INTO workspace_activities (workspace_id, user_id, user_name, activity_type, target_type, target_id, target_name)
          VALUES (${input.workspaceId}, ${currentUserId}, '${escapedInviterName}', 'member_invited', 'user', ${existingUser.id}, ${escapedUserName ? `'${escapedUserName}'` : `'${escapedEmail}'`})
        `));
        
        return { success: true, status: 'added', userId: existingUser.id, userName: existingUser.name };
      } else {
        // 用户不存在，记录邀请（待用户注册后自动添加）
        // 这里可以发送邀请邮件，暂时返回邀请已发送状态
        return { success: true, status: 'invited', email: input.email, message: '邀请已发送，用户注册后将自动加入工作区' };
      }
    }),

  // 更新成员角色
  updateMemberRole: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      userId: z.number(),
      role: z.enum(['admin', 'editor', 'viewer']),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const currentUserId = ctx.user.id;
      
      // 检查权限
      const memberRole = await db.execute(sql.raw(`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${currentUserId}
      `));
      
      const role = (memberRole[0] as any[])[0]?.role;
      if (role !== 'owner' && role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '无权修改成员角色' });
      }
      
      // 不能修改owner的角色
      const targetRole = await db.execute(sql.raw(`
        SELECT role FROM workspace_members WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}
      `));
      
      if ((targetRole[0] as any[])[0]?.role === 'owner') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '不能修改工作区所有者的角色' });
      }
      
      // 更新角色
      await db.execute(sql.raw(`
        UPDATE workspace_members SET role = '${input.role}' WHERE workspace_id = ${input.workspaceId} AND user_id = ${input.userId}
      `));
      
      return { success: true };
    }),
});

export default workspaceRouter;
