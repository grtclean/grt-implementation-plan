/**
 * 会议任务闭环管理服务
 * Meeting Task Loop Management Service
 *
 * 实现完整的会议→纪要→任务→执行→上报→归档闭环
 */

import { v4 as uuidv4 } from 'uuid';
import { invokeLLM } from '../_core/llm';
import { requireDb } from '../db';
import { MEETING_TEMPLATES, MeetingTemplate } from '../../client/src/config/meeting-templates';
import { createChildLogger } from "../lib/logger";
import { isGraphConfigured } from "../services/microsoft-graph/config";
import { plannerService } from "../services/microsoft-graph/planner.service";
import { departmentMappingService } from "../services/microsoft-graph/onedrive-sync.service";
const log = createChildLogger("meeting-task-loop");

// ============================================================================
// 类型定义
// ============================================================================

/** Generic row returned from raw SQL execute */
type DbRow = Record<string, unknown>;

/** SQL parameter value */
type SqlParam = string | number | boolean | null | undefined;

/** Raw-SQL executor interface (mysql2-compatible .execute) exposed by the underlying connection */
interface RawExecutor {
  execute(sql: string, params?: SqlParam[]): Promise<[DbRow[], unknown]>;
}

/** Agenda item in meeting data */
interface AgendaItem {
  title: string;
  [key: string]: unknown;
}

/** AI prompt configuration */
interface AiPromptConfig {
  summary?: string;
  [key: string]: unknown;
}

/** Template output definition */
interface TemplateOutput {
  type: string;
  label?: string;
  [key: string]: unknown;
}

/** Custom template shape returned by getCustomTemplates */
interface CustomTemplateResult {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  category: string;
  subcategory: string | null;
  createdBy: string;
  createdByName: string | null;
  visibility: string;
  icon: string;
  color: string;
  defaultDuration: number;
  agenda: unknown[];
  participants: Record<string, unknown>;
  outputs: unknown[];
  bestPractices: string[];
  followUpActions: string[];
  aiPrompts: Record<string, unknown>;
  usageCount: number;
  basedOnTemplateId: string | null;
  createdAt: string;
}

/** Helper: get the DB connection cast to raw executor interface */
async function rawDb(): Promise<RawExecutor> {
  return (await requireDb()) as unknown as RawExecutor;
}

export interface MeetingMinutes {
  id: string;
  meetingId: string;
  title: string;
  summary: string;
  keyDecisions: KeyDecision[];
  discussionPoints: DiscussionPoint[];
  aiGenerated: boolean;
  status: 'draft' | 'pending_review' | 'approved' | 'archived';
}

export interface KeyDecision {
  id: string;
  content: string;
  madeBy: string;
  timestamp?: string;
}

export interface DiscussionPoint {
  id: string;
  topic: string;
  summary: string;
  agendaItemId?: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  minutesId?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  ownerId: string;
  ownerName: string;
  supporterIds: string[];
  supporterNames: string[];
  dueDate: string;
  status: 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  progressPercent: number;
}

export interface TaskAssignment {
  id: string;
  actionItemId: string;
  assigneeId: string;
  assigneeName: string;
  assigneeRole: 'owner' | 'supporter' | 'observer';
  assignmentStatus: 'pending' | 'sent' | 'viewed' | 'accepted' | 'rejected';
}

export interface PersonalTask {
  id: string;
  userId: string;
  sourceType: 'meeting' | 'project' | 'manual' | 'system';
  sourceMeetingId?: string;
  sourceActionItemId?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  reportStatus: 'not_required' | 'pending' | 'reported' | 'confirmed';
}

export interface CompletionReport {
  id: string;
  personalTaskId: string;
  actionItemId?: string;
  sourceMeetingId?: string;
  targetMeetingId?: string;
  reporterId: string;
  reporterName: string;
  reportTitle: string;
  reportSummary?: string;
  completionDetails?: string;
  evidenceUrls: string[];
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';
  autoUploadEnabled: boolean;
}

export interface MeetingOwner {
  id: string;
  userId: string;
  userName: string;
  meetingTypeId: string;
  meetingTypeName: string;
  scope: 'company' | 'department' | 'project' | 'team';
  scopeId?: string;
  scopeName?: string;
  responsibilities: string[];
  status: 'active' | 'inactive' | 'delegated';
}

export interface MeetingEffectiveness {
  id: string;
  meetingId: string;
  evaluatorId: string;
  evaluatorName: string;
  punctualityScore: number;
  agendaCompletionScore: number;
  decisionQualityScore: number;
  participationScore: number;
  timeEfficiencyScore: number;
  overallRating: 'poor' | 'fair' | 'good' | 'excellent';
}

// ============================================================================
// 1. 会议纪要AI自动生成
// ============================================================================

export async function generateMeetingMinutes(
  meetingId: string,
  meetingData: {
    title: string;
    templateId?: string;
    agenda?: AgendaItem[];
    participants?: string[];
    notes?: string;
    transcription?: string;
  }
): Promise<MeetingMinutes> {
  // 获取会议模板
  let template: MeetingTemplate | undefined;
  if (meetingData.templateId) {
    template = MEETING_TEMPLATES.find(t => t.id === meetingData.templateId);
  }

  // 构建AI提示词
  const systemPrompt = template?.aiPrompts?.summary || `你是一个专业的会议纪要生成助手。请根据提供的会议信息生成结构化的会议纪要。`;

  const userPrompt = `
请为以下会议生成专业的会议纪要：

会议标题：${meetingData.title}
${template ? `会议类型：${template.name}` : ''}
${meetingData.participants?.length ? `参会人员：${meetingData.participants.join(', ')}` : ''}
${meetingData.agenda?.length ? `议程安排：\n${meetingData.agenda.map((a, i) => `${i + 1}. ${a.title}`).join('\n')}` : ''}
${meetingData.notes ? `会议记录：\n${meetingData.notes}` : ''}
${meetingData.transcription ? `会议转写：\n${meetingData.transcription}` : ''}

请生成以下内容（JSON格式）：
1. summary: 会议摘要（100-200字）
2. keyDecisions: 关键决议数组，每项包含 {id, content, madeBy}
3. discussionPoints: 讨论要点数组，每项包含 {id, topic, summary}
4. actionItems: 行动项数组，每项包含 {title, description, ownerName, dueDate, priority}

请确保输出为有效的JSON格式。
`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'meeting_minutes',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: '会议摘要' },
              keyDecisions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    content: { type: 'string' },
                    madeBy: { type: 'string' }
                  },
                  required: ['id', 'content', 'madeBy'],
                  additionalProperties: false
                }
              },
              discussionPoints: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    topic: { type: 'string' },
                    summary: { type: 'string' }
                  },
                  required: ['id', 'topic', 'summary'],
                  additionalProperties: false
                }
              },
              actionItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    ownerName: { type: 'string' },
                    dueDate: { type: 'string' },
                    priority: { type: 'string' }
                  },
                  required: ['title', 'ownerName', 'dueDate', 'priority'],
                  additionalProperties: false
                }
              }
            },
            required: ['summary', 'keyDecisions', 'discussionPoints', 'actionItems'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(content || '{}');

    const minutesId = uuidv4();
    const minutes: MeetingMinutes = {
      id: minutesId,
      meetingId,
      title: `${meetingData.title} - 会议纪要`,
      summary: parsed.summary || '',
      keyDecisions: parsed.keyDecisions || [],
      discussionPoints: parsed.discussionPoints || [],
      aiGenerated: true,
      status: 'draft'
    };

    // 保存到数据库
    await (await rawDb()).execute(
      `INSERT INTO meeting_minutes_v2 (id, meeting_id, title, summary, key_decisions, discussion_points, ai_generated, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        minutes.id,
        minutes.meetingId,
        minutes.title,
        minutes.summary,
        JSON.stringify(minutes.keyDecisions),
        JSON.stringify(minutes.discussionPoints),
        minutes.aiGenerated,
        minutes.status
      ]
    );

    // 如果有行动项，自动创建
    if (parsed.actionItems?.length) {
      for (const item of parsed.actionItems) {
        await createActionItem({
          meetingId,
          minutesId,
          title: item.title,
          description: item.description,
          ownerName: item.ownerName,
          dueDate: item.dueDate,
          priority: item.priority as ActionItem['priority']
        });
      }
    }

    return minutes;
  } catch (error) {
    log.error({ err: error }, "AI meeting minutes generation failed");
    throw new Error('会议纪要生成失败');
  }
}

// ============================================================================
// 2. 任务创建与分发
// ============================================================================

export async function createActionItem(data: {
  meetingId: string;
  minutesId?: string;
  title: string;
  description?: string;
  ownerId?: string;
  ownerName: string;
  supporterIds?: string[];
  supporterNames?: string[];
  dueDate: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}): Promise<ActionItem> {
  const id = uuidv4();
  const actionItem: ActionItem = {
    id,
    meetingId: data.meetingId,
    minutesId: data.minutesId,
    title: data.title,
    description: data.description,
    priority: data.priority || 'medium',
    ownerId: data.ownerId || '',
    ownerName: data.ownerName,
    supporterIds: data.supporterIds || [],
    supporterNames: data.supporterNames || [],
    dueDate: data.dueDate,
    status: 'pending',
    progressPercent: 0
  };

  await (await rawDb()).execute(
    `INSERT INTO meeting_action_items
     (id, meeting_id, minutes_id, title, description, priority, owner_id, owner_name, supporter_ids, supporter_names, due_date, status, progress_percent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actionItem.id,
      actionItem.meetingId,
      actionItem.minutesId,
      actionItem.title,
      actionItem.description,
      actionItem.priority,
      actionItem.ownerId,
      actionItem.ownerName,
      JSON.stringify(actionItem.supporterIds),
      JSON.stringify(actionItem.supporterNames),
      actionItem.dueDate,
      actionItem.status,
      actionItem.progressPercent
    ]
  );

  return actionItem;
}

export async function distributeActionItems(
  minutesId: string,
  actionItemIds: string[]
): Promise<TaskAssignment[]> {
  const assignments: TaskAssignment[] = [];

  for (const actionItemId of actionItemIds) {
    // 获取任务详情
    const [rows] = await (await rawDb()).execute(
      `SELECT * FROM meeting_action_items WHERE id = ?`,
      [actionItemId]
    );

    if (!rows.length) continue;
    const actionItem = rows[0];

    // 为责任人创建分发记录
    const ownerAssignment: TaskAssignment = {
      id: uuidv4(),
      actionItemId,
      assigneeId: actionItem.owner_id as string,
      assigneeName: actionItem.owner_name as string,
      assigneeRole: 'owner',
      assignmentStatus: 'pending'
    };

    await (await rawDb()).execute(
      `INSERT INTO task_assignments (id, action_item_id, assignee_id, assignee_name, assignee_role, assignment_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ownerAssignment.id, ownerAssignment.actionItemId, ownerAssignment.assigneeId, ownerAssignment.assigneeName, ownerAssignment.assigneeRole, ownerAssignment.assignmentStatus]
    );
    assignments.push(ownerAssignment);

    // 为支持人创建分发记录
    const supporterIds = JSON.parse((actionItem.supporter_ids as string) || '[]') as string[];
    const supporterNames = JSON.parse((actionItem.supporter_names as string) || '[]') as string[];

    for (let i = 0; i < supporterIds.length; i++) {
      const supporterAssignment: TaskAssignment = {
        id: uuidv4(),
        actionItemId,
        assigneeId: supporterIds[i],
        assigneeName: supporterNames[i] || '',
        assigneeRole: 'supporter',
        assignmentStatus: 'pending'
      };

      await (await rawDb()).execute(
        `INSERT INTO task_assignments (id, action_item_id, assignee_id, assignee_name, assignee_role, assignment_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [supporterAssignment.id, supporterAssignment.actionItemId, supporterAssignment.assigneeId, supporterAssignment.assigneeName, supporterAssignment.assigneeRole, supporterAssignment.assignmentStatus]
      );
      assignments.push(supporterAssignment);
    }

    // 更新任务状态为已分发
    await (await rawDb()).execute(
      `UPDATE meeting_action_items SET status = 'assigned' WHERE id = ?`,
      [actionItemId]
    );

    // ═══════ Planner 任务同步 ═══════
    if (isGraphConfigured()) {
      try {
        const plans = await plannerService.getPlans();
        const targetPlan = plans[0];
        if (targetPlan) {
          const buckets = await plannerService.getBuckets(targetPlan.id);
          const todoBucket = buckets.find((b) => b.name === "待办") ?? buckets[0];
          if (todoBucket) {
            const plannerTask = await plannerService.createTask({
              planId: targetPlan.id,
              bucketId: todoBucket.id,
              title: `[会议] ${String(actionItem.title ?? "").substring(0, 200) || "Action Item"}`,
              dueDateTime: (actionItem.due_date as string | undefined) ?? undefined,
              priority: 5,
            });
            if (plannerTask) {
              await (await rawDb()).execute(
                `UPDATE meeting_action_items SET planner_task_id = ? WHERE id = ?`,
                [plannerTask.id, actionItemId]
              );
              await departmentMappingService.logSync({
                deptCode: "OPS",
                action: "planner_sync",
                sourceType: "grt",
                sourcePath: `meeting_action_items/${actionItemId}`,
                targetPath: `planner/${plannerTask.id}`,
                status: "success",
                fileCount: 0,
                bytesTransferred: 0,
                triggeredBy: "system",
              });
              log.info({ actionItemId, plannerTaskId: plannerTask.id }, "Synced action item to Planner");
            }
          }
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Planner sync failed";
        log.warn({ err: e, actionItemId }, "Planner sync failed for action item");
        await departmentMappingService.logSync({
          deptCode: "OPS",
          action: "planner_sync",
          sourceType: "grt",
          sourcePath: `meeting_action_items/${actionItemId}`,
          targetPath: null,
          status: "error",
          errorMessage,
          fileCount: 0,
          bytesTransferred: 0,
          triggeredBy: "system",
        }).catch(() => {});
      }
    }
  }

  return assignments;
}

// ============================================================================
// 3. 任务确认流程
// ============================================================================

export async function acceptTaskAssignment(
  assignmentId: string,
  userId: string,
  notes?: string
): Promise<{ assignment: TaskAssignment; personalTask: PersonalTask }> {
  // 更新分发记录状态
  await (await rawDb()).execute(
    `UPDATE task_assignments
     SET assignment_status = 'accepted', responded_at = NOW(), acceptance_notes = ?
     WHERE id = ? AND assignee_id = ?`,
    [notes, assignmentId, userId]
  );

  // 获取分发记录和任务详情
  const [assignmentRows] = await (await rawDb()).execute(
    `SELECT ta.*, mai.*
     FROM task_assignments ta
     JOIN meeting_action_items mai ON ta.action_item_id = mai.id
     WHERE ta.id = ?`,
    [assignmentId]
  );

  if (!assignmentRows.length) {
    throw new Error('任务分发记录不存在');
  }

  const row = assignmentRows[0];

  // 创建个人任务
  const personalTaskId = uuidv4();
  const personalTask: PersonalTask = {
    id: personalTaskId,
    userId,
    sourceType: 'meeting',
    sourceMeetingId: row.meeting_id as string,
    sourceActionItemId: row.action_item_id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    priority: row.priority as PersonalTask['priority'],
    dueDate: row.due_date as string | undefined,
    status: 'todo',
    reportStatus: 'pending' // 来自会议的任务需要上报
  };

  await (await rawDb()).execute(
    `INSERT INTO personal_tasks
     (id, user_id, source_type, source_meeting_id, source_action_item_id, title, description, priority, due_date, status, report_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      personalTask.id,
      personalTask.userId,
      personalTask.sourceType,
      personalTask.sourceMeetingId,
      personalTask.sourceActionItemId,
      personalTask.title,
      personalTask.description,
      personalTask.priority,
      personalTask.dueDate,
      personalTask.status,
      personalTask.reportStatus
    ]
  );

  // 更新原任务状态
  await (await rawDb()).execute(
    `UPDATE meeting_action_items SET status = 'accepted' WHERE id = ?`,
    [row.action_item_id as string]
  );

  return {
    assignment: {
      id: assignmentId,
      actionItemId: row.action_item_id as string,
      assigneeId: userId,
      assigneeName: row.assignee_name as string,
      assigneeRole: row.assignee_role as TaskAssignment['assigneeRole'],
      assignmentStatus: 'accepted'
    },
    personalTask
  };
}

export async function rejectTaskAssignment(
  assignmentId: string,
  userId: string,
  reason: string
): Promise<void> {
  await (await rawDb()).execute(
    `UPDATE task_assignments
     SET assignment_status = 'rejected', responded_at = NOW(), rejection_reason = ?
     WHERE id = ? AND assignee_id = ?`,
    [reason, assignmentId, userId]
  );
}

// ============================================================================
// 4. 个人任务管理
// ============================================================================

export async function getPersonalTasks(
  userId: string,
  filters?: {
    status?: string;
    sourceType?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  }
): Promise<PersonalTask[]> {
  let query = `SELECT * FROM personal_tasks WHERE user_id = ?`;
  const params: SqlParam[] = [userId];

  if (filters?.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  }
  if (filters?.sourceType) {
    query += ` AND source_type = ?`;
    params.push(filters.sourceType);
  }
  if (filters?.dueDateFrom) {
    query += ` AND due_date >= ?`;
    params.push(filters.dueDateFrom);
  }
  if (filters?.dueDateTo) {
    query += ` AND due_date <= ?`;
    params.push(filters.dueDateTo);
  }

  query += ` ORDER BY due_date ASC, priority DESC`;

  const [rows] = await (await rawDb()).execute(query, params);
  return rows.map((row: DbRow) => ({
    id: row.id as string,
    userId: row.user_id as string,
    sourceType: row.source_type as PersonalTask['sourceType'],
    sourceMeetingId: row.source_meeting_id as string | undefined,
    sourceActionItemId: row.source_action_item_id as string | undefined,
    title: row.title as string,
    description: row.description as string | undefined,
    priority: row.priority as PersonalTask['priority'],
    dueDate: row.due_date as string | undefined,
    status: row.status as PersonalTask['status'],
    reportStatus: row.report_status as PersonalTask['reportStatus']
  }));
}

export async function updatePersonalTaskStatus(
  taskId: string,
  userId: string,
  status: 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled',
  completionNotes?: string,
  evidenceUrls?: string[]
): Promise<void> {
  const updates: string[] = ['status = ?'];
  const params: SqlParam[] = [status];

  if (status === 'completed') {
    updates.push('completed_at = NOW()');
    if (completionNotes) {
      updates.push('completion_notes = ?');
      params.push(completionNotes);
    }
    if (evidenceUrls?.length) {
      updates.push('evidence_urls = ?');
      params.push(JSON.stringify(evidenceUrls));
    }
  }

  params.push(taskId, userId);

  await (await rawDb()).execute(
    `UPDATE personal_tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );

  // 如果任务完成且需要上报，更新关联的会议任务状态
  if (status === 'completed') {
    const [rows] = await (await rawDb()).execute(
      `SELECT source_action_item_id FROM personal_tasks WHERE id = ?`,
      [taskId]
    );

    if (rows.length && rows[0].source_action_item_id) {
      await (await rawDb()).execute(
        `UPDATE meeting_action_items SET status = 'completed', completed_at = NOW(), completion_notes = ?, evidence_urls = ?
         WHERE id = ?`,
        [completionNotes, JSON.stringify(evidenceUrls || []), rows[0].source_action_item_id as string]
      );
    }
  }
}

// ============================================================================
// 5. 任务完成上报
// ============================================================================

export async function createCompletionReport(data: {
  personalTaskId: string;
  reporterId: string;
  reporterName: string;
  reportTitle: string;
  reportSummary?: string;
  completionDetails?: string;
  evidenceUrls?: string[];
  targetMeetingId?: string;
  autoUploadEnabled?: boolean;
}): Promise<CompletionReport> {
  // 获取任务信息
  const [taskRows] = await (await rawDb()).execute(
    `SELECT * FROM personal_tasks WHERE id = ?`,
    [data.personalTaskId]
  );

  if (!taskRows.length) {
    throw new Error('任务不存在');
  }

  const task = taskRows[0];
  const id = uuidv4();

  const report: CompletionReport = {
    id,
    personalTaskId: data.personalTaskId,
    actionItemId: task.source_action_item_id as string | undefined,
    sourceMeetingId: task.source_meeting_id as string | undefined,
    targetMeetingId: data.targetMeetingId,
    reporterId: data.reporterId,
    reporterName: data.reporterName,
    reportTitle: data.reportTitle,
    reportSummary: data.reportSummary,
    completionDetails: data.completionDetails,
    evidenceUrls: data.evidenceUrls || [],
    status: 'draft',
    autoUploadEnabled: data.autoUploadEnabled || false
  };

  await (await rawDb()).execute(
    `INSERT INTO task_completion_reports
     (id, personal_task_id, action_item_id, source_meeting_id, target_meeting_id, reporter_id, reporter_name, report_title, report_summary, completion_details, evidence_urls, status, auto_upload_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.id,
      report.personalTaskId,
      report.actionItemId,
      report.sourceMeetingId,
      report.targetMeetingId,
      report.reporterId,
      report.reporterName,
      report.reportTitle,
      report.reportSummary,
      report.completionDetails,
      JSON.stringify(report.evidenceUrls),
      report.status,
      report.autoUploadEnabled
    ]
  );

  return report;
}

export async function submitCompletionReport(
  reportId: string,
  userId: string
): Promise<void> {
  await (await rawDb()).execute(
    `UPDATE task_completion_reports
     SET status = 'submitted', submitted_at = NOW()
     WHERE id = ? AND reporter_id = ?`,
    [reportId, userId]
  );

  // 更新个人任务的上报状态
  const [rows] = await (await rawDb()).execute(
    `SELECT personal_task_id FROM task_completion_reports WHERE id = ?`,
    [reportId]
  );

  if (rows.length) {
    await (await rawDb()).execute(
      `UPDATE personal_tasks SET report_status = 'reported', reported_at = NOW() WHERE id = ?`,
      [rows[0].personal_task_id as string]
    );
  }

  // 通知MO审核
  await notifyMeetingOwnerForReview(reportId);
}

// ============================================================================
// 6. Meeting Owner管理
// ============================================================================

export async function assignMeetingOwner(data: {
  userId: string;
  userName: string;
  meetingTypeId: string;
  meetingTypeName: string;
  scope: 'company' | 'department' | 'project' | 'team';
  scopeId?: string;
  scopeName?: string;
  responsibilities?: string[];
}): Promise<MeetingOwner> {
  const id = uuidv4();
  const owner: MeetingOwner = {
    id,
    userId: data.userId,
    userName: data.userName,
    meetingTypeId: data.meetingTypeId,
    meetingTypeName: data.meetingTypeName,
    scope: data.scope,
    scopeId: data.scopeId,
    scopeName: data.scopeName,
    responsibilities: data.responsibilities || [],
    status: 'active'
  };

  await (await rawDb()).execute(
    `INSERT INTO meeting_owners
     (id, user_id, user_name, meeting_type_id, meeting_type_name, scope, scope_id, scope_name, responsibilities, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_name = VALUES(user_name), responsibilities = VALUES(responsibilities), status = 'active'`,
    [
      owner.id,
      owner.userId,
      owner.userName,
      owner.meetingTypeId,
      owner.meetingTypeName,
      owner.scope,
      owner.scopeId,
      owner.scopeName,
      JSON.stringify(owner.responsibilities),
      owner.status
    ]
  );

  return owner;
}

export async function getMeetingOwner(
  meetingTypeId: string,
  scope: string,
  scopeId?: string
): Promise<MeetingOwner | null> {
  let query = `SELECT * FROM meeting_owners WHERE meeting_type_id = ? AND scope = ? AND status = 'active'`;
  const params: SqlParam[] = [meetingTypeId, scope];

  if (scopeId) {
    query += ` AND scope_id = ?`;
    params.push(scopeId);
  }

  const [rows] = await (await rawDb()).execute(query, params);

  if (!rows.length) return null;

  const row = rows[0];
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: row.user_name as string,
    meetingTypeId: row.meeting_type_id as string,
    meetingTypeName: row.meeting_type_name as string,
    scope: row.scope as MeetingOwner['scope'],
    scopeId: row.scope_id as string | undefined,
    scopeName: row.scope_name as string | undefined,
    responsibilities: JSON.parse((row.responsibilities as string) || '[]') as string[],
    status: row.status as MeetingOwner['status']
  };
}

async function notifyMeetingOwnerForReview(reportId: string): Promise<void> {
  // 获取报告详情
  const [reportRows] = await (await rawDb()).execute(
    `SELECT tcr.*, mr.metadata
     FROM task_completion_reports tcr
     LEFT JOIN meeting_records mr ON tcr.source_meeting_id = mr.id
     WHERE tcr.id = ?`,
    [reportId]
  );

  if (!reportRows.length) return;

  const report = reportRows[0];
  const metadata = JSON.parse((report.metadata as string) || '{}') as Record<string, unknown>;
  const meetingTypeId = metadata.templateId as string | undefined;

  if (!meetingTypeId) return;

  // 获取MO
  const owner = await getMeetingOwner(meetingTypeId, 'department');
  if (!owner) return;

  // TODO: 发送通知给MO
  log.info({ ownerName: owner.userName, reportId }, "Notifying meeting owner for report review");
}

// ============================================================================
// 7. 会议效果评估
// ============================================================================

export async function submitMeetingEffectiveness(data: {
  meetingId: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole?: 'organizer' | 'participant' | 'observer';
  punctualityScore: number;
  agendaCompletionScore: number;
  decisionQualityScore: number;
  participationScore: number;
  timeEfficiencyScore: number;
  overallRating: 'poor' | 'fair' | 'good' | 'excellent';
  strengths?: string;
  improvements?: string;
  suggestions?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  agendaItemsCompleted?: number;
  agendaItemsTotal?: number;
  decisionsMade?: number;
  actionItemsCreated?: number;
}): Promise<MeetingEffectiveness> {
  const id = uuidv4();

  await (await rawDb()).execute(
    `INSERT INTO meeting_effectiveness
     (id, meeting_id, evaluator_id, evaluator_name, evaluator_role, punctuality_score, agenda_completion_score, decision_quality_score, participation_score, time_efficiency_score, overall_rating, strengths, improvements, suggestions, actual_start_time, actual_end_time, agenda_items_completed, agenda_items_total, decisions_made, action_items_created)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
     punctuality_score = VALUES(punctuality_score),
     agenda_completion_score = VALUES(agenda_completion_score),
     decision_quality_score = VALUES(decision_quality_score),
     participation_score = VALUES(participation_score),
     time_efficiency_score = VALUES(time_efficiency_score),
     overall_rating = VALUES(overall_rating)`,
    [
      id,
      data.meetingId,
      data.evaluatorId,
      data.evaluatorName,
      data.evaluatorRole || 'participant',
      data.punctualityScore,
      data.agendaCompletionScore,
      data.decisionQualityScore,
      data.participationScore,
      data.timeEfficiencyScore,
      data.overallRating,
      data.strengths,
      data.improvements,
      data.suggestions,
      data.actualStartTime,
      data.actualEndTime,
      data.agendaItemsCompleted,
      data.agendaItemsTotal,
      data.decisionsMade,
      data.actionItemsCreated
    ]
  );

  return {
    id,
    meetingId: data.meetingId,
    evaluatorId: data.evaluatorId,
    evaluatorName: data.evaluatorName,
    punctualityScore: data.punctualityScore,
    agendaCompletionScore: data.agendaCompletionScore,
    decisionQualityScore: data.decisionQualityScore,
    participationScore: data.participationScore,
    timeEfficiencyScore: data.timeEfficiencyScore,
    overallRating: data.overallRating
  };
}

export async function getMeetingEffectivenessStats(meetingId: string): Promise<{
  averageScores: {
    punctuality: number;
    agendaCompletion: number;
    decisionQuality: number;
    participation: number;
    timeEfficiency: number;
    overall: number;
  };
  ratingDistribution: Record<string, number>;
  evaluatorCount: number;
}> {
  const [rows] = await (await rawDb()).execute(
    `SELECT
       AVG(punctuality_score) as avg_punctuality,
       AVG(agenda_completion_score) as avg_agenda,
       AVG(decision_quality_score) as avg_decision,
       AVG(participation_score) as avg_participation,
       AVG(time_efficiency_score) as avg_efficiency,
       COUNT(*) as evaluator_count
     FROM meeting_effectiveness WHERE meeting_id = ?`,
    [meetingId]
  );

  const [ratingRows] = await (await rawDb()).execute(
    `SELECT overall_rating, COUNT(*) as count
     FROM meeting_effectiveness WHERE meeting_id = ?
     GROUP BY overall_rating`,
    [meetingId]
  );

  const ratingDistribution: Record<string, number> = {};
  for (const row of ratingRows) {
    ratingDistribution[row.overall_rating as string] = row.count as number;
  }

  const stats = rows[0];
  return {
    averageScores: {
      punctuality: parseFloat(String(stats.avg_punctuality)) || 0,
      agendaCompletion: parseFloat(String(stats.avg_agenda)) || 0,
      decisionQuality: parseFloat(String(stats.avg_decision)) || 0,
      participation: parseFloat(String(stats.avg_participation)) || 0,
      timeEfficiency: parseFloat(String(stats.avg_efficiency)) || 0,
      overall: (
        (parseFloat(String(stats.avg_punctuality)) || 0) +
        (parseFloat(String(stats.avg_agenda)) || 0) +
        (parseFloat(String(stats.avg_decision)) || 0) +
        (parseFloat(String(stats.avg_participation)) || 0) +
        (parseFloat(String(stats.avg_efficiency)) || 0)
      ) / 5
    },
    ratingDistribution,
    evaluatorCount: stats.evaluator_count as number
  };
}

// ============================================================================
// 8. 自定义模板管理
// ============================================================================

export async function createCustomTemplate(data: {
  name: string;
  nameEn?: string;
  description?: string;
  category?: 'internal' | 'customer' | 'custom';
  subcategory?: string;
  createdBy: string;
  createdByName?: string;
  visibility?: 'private' | 'team' | 'department' | 'company';
  icon?: string;
  color?: string;
  defaultDuration?: number;
  agenda?: AgendaItem[];
  participants?: { required: string[]; optional: string[] };
  outputs?: TemplateOutput[];
  bestPractices?: string[];
  followUpActions?: string[];
  aiPrompts?: AiPromptConfig;
  basedOnTemplateId?: string;
}): Promise<string> {
  const id = uuidv4();

  await (await rawDb()).execute(
    `INSERT INTO custom_meeting_templates
     (id, name, name_en, description, category, subcategory, created_by, created_by_name, visibility, icon, color, default_duration, agenda, participants, outputs, best_practices, follow_up_actions, ai_prompts, based_on_template_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      id,
      data.name,
      data.nameEn,
      data.description,
      data.category || 'custom',
      data.subcategory,
      data.createdBy,
      data.createdByName,
      data.visibility || 'private',
      data.icon || 'FileText',
      data.color || '#3B82F6',
      data.defaultDuration || 60,
      JSON.stringify(data.agenda || []),
      JSON.stringify(data.participants || { required: [], optional: [] }),
      JSON.stringify(data.outputs || []),
      JSON.stringify(data.bestPractices || []),
      JSON.stringify(data.followUpActions || []),
      JSON.stringify(data.aiPrompts || {}),
      data.basedOnTemplateId
    ]
  );

  return id;
}

export async function getCustomTemplates(
  userId: string,
  filters?: {
    category?: string;
    visibility?: string;
  }
): Promise<CustomTemplateResult[]> {
  let query = `
    SELECT * FROM custom_meeting_templates
    WHERE status = 'active'
    AND (created_by = ? OR visibility IN ('team', 'department', 'company'))
  `;
  const params: SqlParam[] = [userId];

  if (filters?.category) {
    query += ` AND category = ?`;
    params.push(filters.category);
  }
  if (filters?.visibility) {
    query += ` AND visibility = ?`;
    params.push(filters.visibility);
  }

  query += ` ORDER BY usage_count DESC, created_at DESC`;

  const [rows] = await (await rawDb()).execute(query, params);
  return rows.map((row: DbRow) => ({
    id: row.id as string,
    name: row.name as string,
    nameEn: row.name_en as string | null,
    description: row.description as string | null,
    category: row.category as string,
    subcategory: row.subcategory as string | null,
    createdBy: row.created_by as string,
    createdByName: row.created_by_name as string | null,
    visibility: row.visibility as string,
    icon: row.icon as string,
    color: row.color as string,
    defaultDuration: row.default_duration as number,
    agenda: JSON.parse((row.agenda as string) || '[]') as unknown[],
    participants: JSON.parse((row.participants as string) || '{}') as Record<string, unknown>,
    outputs: JSON.parse((row.outputs as string) || '[]') as unknown[],
    bestPractices: JSON.parse((row.best_practices as string) || '[]') as string[],
    followUpActions: JSON.parse((row.follow_up_actions as string) || '[]') as string[],
    aiPrompts: JSON.parse((row.ai_prompts as string) || '{}') as Record<string, unknown>,
    usageCount: row.usage_count as number,
    basedOnTemplateId: row.based_on_template_id as string | null,
    createdAt: row.created_at as string
  }));
}

export async function incrementTemplateUsage(templateId: string): Promise<void> {
  await (await rawDb()).execute(
    `UPDATE custom_meeting_templates SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = ?`,
    [templateId]
  );
}
