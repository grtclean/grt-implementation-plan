/**
 * 每日工作计划服务
 * 整合工程任务、会议行动项和历史计划，生成AI驱动的每日工作计划
 * v2: 8-source aggregation for 千人千面 daily plan
 */

import { sql } from "drizzle-orm";
import { requireDb } from "../db";
import { generateWorkPlan, type PlanInput } from "./ai-planning.service";

// --- Types ---

export interface DailyItem {
  id: string;
  title: string;
  description?: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  sourceType: string;
  sourceRoute?: string;
  dueDate?: string;
  estimatedHours?: number;
  status: 'pending' | 'in_progress' | 'completed';
  isCarryover?: boolean;
}

export interface DailyCategory {
  key: string;
  labelZh: string;
  labelEn: string;
  icon: string;
  items: DailyItem[];
}

export interface DailyPlanAggregate {
  planDate: string;
  categories: DailyCategory[];
  totalItems: number;
  completedItems: number;
  aiNotes: string[];
}

// --- Helpers ---

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

function mapDbPriority(p: string | null | undefined): 'P0' | 'P1' | 'P2' | 'P3' {
  if (!p) return 'P2';
  const s = p.toLowerCase();
  if (s === 'critical' || s === 'p0') return 'P0';
  if (s === 'high' || s === 'p1') return 'P1';
  if (s === 'medium' || s === 'p2') return 'P2';
  if (s === 'low' || s === 'p3') return 'P3';
  return 'P2';
}

function mapLLMPriority(p: string): 'P0' | 'P1' | 'P2' | 'P3' {
  switch (p) {
    case 'critical': return 'P0';
    case 'high': return 'P1';
    case 'medium': return 'P2';
    case 'low': return 'P3';
    default: return 'P2';
  }
}

function inferSourceType(source: string): string {
  const s = (source || '').toLowerCase();
  if (s.includes('工程') || s.includes('opl') || s.includes('project')) return 'opl';
  if (s.includes('会议') || s.includes('meeting') || s.includes('行动')) return 'meeting';
  if (s.includes('主管') || s.includes('supervisor')) return 'supervisor';
  if (s.includes('年度') || s.includes('annual')) return 'annual_plan';
  if (s.includes('客户') || s.includes('customer')) return 'customer_feedback';
  return 'manual';
}

// --- 1. generateDailyPlan ---

export async function generateDailyPlan(userId: number) {
  // Idempotent: return existing plan if already generated today
  const existing = await getTodayPlan(userId);
  if (existing) return existing;

  const db = await requireDb();
  const todayStr = today();

  // Get user name
  const userResult = await db.execute(sql`SELECT name FROM users WHERE id = ${userId} LIMIT 1000`);
  const userName = (userResult.rows as { name: string }[])[0]?.name || 'Unknown';

  // Query data sources in parallel (each wrapped for resilience)
  const empty = { rows: [] };
  const [engTasks, actionItems, yesterdayTasks] = await Promise.all([
    safeQuery(() => db.execute(sql`
      SELECT "taskId", "taskName", "taskDescription", priority, "plannedEndDate"
      FROM engineering_tasks
      WHERE "primaryAssigneeId" = ${userId}
        AND status IN ('pending', 'in_progress')
      ORDER BY priority ASC
      LIMIT 20
    `), empty as any),
    safeQuery(() => db.execute(sql`
      SELECT id, content, status, ai_summary
      FROM ime_action_items
      WHERE owner = ${userName} AND status = 'open'
      ORDER BY last_seen_date DESC
      LIMIT 10
    `), empty as any),
    safeQuery(() => db.execute(sql`
      SELECT pt."taskId", pt.title, pt.description, pt.priority, pt."sourceType"
      FROM planning_tasks pt
      JOIN planning_plans pp ON pt."planId" = pp."planId"
      WHERE pt."ownerId" = ${userId}
        AND pp."planType" = 'daily'
        AND pp."planPeriod" = ${yesterday()}
        AND pt.status NOT IN ('completed', 'cancelled')
    `), empty as any),
  ]);

  const engRows = engTasks.rows as { taskId: string; taskName: string; taskDescription: string | null; priority: string | null; plannedEndDate: string | null }[];
  const actionRows = actionItems.rows as { id: number; content: string; status: string; ai_summary: string | null }[];
  const yesterdayRows = yesterdayTasks.rows as { taskId: string; title: string; description: string | null; priority: string | null; sourceType: string | null }[];

  // Map to PlanInput format
  const planInput: PlanInput = {
    projectOPLs: engRows.length > 0 ? [{
      id: 'eng-tasks',
      projectId: 'current',
      projectName: '当前工程任务',
      stage: 'active',
      items: engRows.map((t) => `${t.taskName} (${t.priority})`),
      deadline: engRows[0]?.plannedEndDate || todayStr,
    }] : undefined,
    meetingMinutes: actionRows.length > 0 ? [{
      id: 'action-items',
      meetingType: '会议行动项',
      date: todayStr,
      actionItems: actionRows.map((a) => ({
        description: a.content,
        assignee: userName,
        deadline: todayStr,
        status: 'pending' as const,
      })),
    }] : undefined,
    unfinishedPlans: yesterdayRows.length > 0 ? yesterdayRows.map((t) => ({
      id: t.taskId,
      title: t.title,
      originalDeadline: yesterday(),
      reason: '昨日未完成',
    })) : undefined,
  };

  // Generate plan via AI
  const workPlan = await generateWorkPlan(planInput, 'daily');
  const planId = workPlan.id;
  const nowISO = new Date().toISOString();
  const title = `每日工作计划 - ${todayStr}`;
  const aiSummary = workPlan.aiNotes.join('\n');

  // Insert the plan record
  await db.execute(sql`
    INSERT INTO planning_plans
      ("planId", "planType", "planPeriod", "ownerId", title, "aiSummary", status, "completionRate", "startDate", "endDate", "createdAt", "updatedAt")
    VALUES
      (${planId}, 'daily', ${todayStr}, ${userId}, ${title}, ${aiSummary}, 'approved', '0', ${todayStr}, ${todayStr}, ${nowISO}, ${nowISO})
  `);

  // Insert tasks
  const tasks: Array<{
    taskId: string; title: string; description: string; priority: string;
    taskType: string; sourceType: string; estimatedHours: number;
    status: string; completedAt: null; actualHours: null;
  }> = [];
  for (let i = 0; i < workPlan.tasks.length; i++) {
    const t = workPlan.tasks[i];
    const taskId = t.id;
    const priority = mapLLMPriority(t.priority);
    const sourceType = inferSourceType(t.source);

    await db.execute(sql`
      INSERT INTO planning_tasks
        ("taskId", "planId", title, description, priority, "taskType", "sourceType", "ownerId", "estimatedHours", status, "createdAt", "updatedAt")
      VALUES
        (${taskId}, ${planId}, ${t.title}, ${t.description}, ${priority}, 'work', ${sourceType}, ${userId}, ${String(t.estimatedHours)}, 'pending', ${nowISO}, ${nowISO})
    `);

    tasks.push({
      taskId,
      title: t.title,
      description: t.description,
      priority,
      taskType: 'work',
      sourceType,
      estimatedHours: t.estimatedHours,
      status: 'pending',
      completedAt: null,
      actualHours: null,
    });
  }

  return {
    planId,
    planType: 'daily' as const,
    planPeriod: todayStr,
    title,
    status: 'approved',
    completionRate: 0,
    aiSummary,
    tasks,
    completedCount: 0,
    totalCount: tasks.length,
  };
}

// --- 2. getTodayPlan ---

export async function getTodayPlan(userId: number) {
  const db = await requireDb();
  const todayStr = today();

  const planResult = await db.execute(sql`
    SELECT "planId", title, status, "completionRate", "aiSummary", "createdAt"
    FROM planning_plans
    WHERE "ownerId" = ${userId} AND "planType" = 'daily' AND "planPeriod" = ${todayStr} AND status != 'cancelled'
    ORDER BY "createdAt" DESC
    LIMIT 1
  `);

  const plan = (planResult.rows as { planId: string; title: string; status: string; completionRate: string; aiSummary: string | null; createdAt: string }[])[0];
  if (!plan) return null;

  const tasksResult = await db.execute(sql`
    SELECT "taskId", title, description, priority, "taskType", "sourceType", "estimatedHours", "actualHours", status, "completedAt"
    FROM planning_tasks
    WHERE "planId" = ${plan.planId} AND "ownerId" = ${userId}
    ORDER BY priority ASC, "createdAt" ASC
  `);

  const tasks = tasksResult.rows as { taskId: string; title: string; description: string | null; priority: string; taskType: string; sourceType: string; estimatedHours: string | null; actualHours: string | null; status: string; completedAt: string | null }[];
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return {
    planId: plan.planId as string,
    planType: 'daily' as const,
    planPeriod: todayStr,
    title: plan.title as string,
    status: plan.status as string,
    completionRate: parseFloat(plan.completionRate) || 0,
    aiSummary: plan.aiSummary as string | null,
    tasks,
    completedCount,
    totalCount: tasks.length,
  };
}

// --- 3. getPlanHistory ---

export async function getPlanHistory(userId: number, options?: { limit?: number; offset?: number }) {
  const db = await requireDb();
  const limit = options?.limit || 10;
  const offset = options?.offset || 0;

  const result = await db.execute(sql`
    SELECT pp."planId", pp.title, pp."planPeriod", pp.status, pp."completionRate", pp."createdAt",
           COUNT(pt.id) as "totalTasks",
           COUNT(CASE WHEN pt.status = 'completed' THEN 1 END) as "completedTasks"
    FROM planning_plans pp
    LEFT JOIN planning_tasks pt ON pt."planId" = pp."planId"
    WHERE pp."ownerId" = ${userId} AND pp."planType" = 'daily'
    GROUP BY pp.id, pp."planId", pp.title, pp."planPeriod", pp.status, pp."completionRate", pp."createdAt"
    ORDER BY pp."planPeriod" DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return result.rows as { planId: string; title: string; planPeriod: string; status: string; completionRate: string; createdAt: string; totalTasks: string; completedTasks: string }[];
}

// --- 4. updateTaskStatus ---

export async function updateTaskStatus(taskId: string, status: string, actualHours?: number) {
  const db = await requireDb();
  const nowISO = new Date().toISOString();

  if (status === 'completed') {
    await db.execute(sql`
      UPDATE planning_tasks
      SET status = ${status},
          "completedAt" = ${nowISO},
          "actualHours" = COALESCE(${actualHours != null ? String(actualHours) : null}, "actualHours"),
          "updatedAt" = ${nowISO}
      WHERE "taskId" = ${taskId}
    `);
  } else {
    await db.execute(sql`
      UPDATE planning_tasks
      SET status = ${status}, "completedAt" = NULL, "updatedAt" = ${nowISO}
      WHERE "taskId" = ${taskId}
    `);
  }

  // Recompute parent plan completion rate + status (best-effort)
  try {
    const planIdResult = await db.execute(sql`
      SELECT "planId" FROM planning_tasks WHERE "taskId" = ${taskId} LIMIT 1
    `);
    const planIdVal = (planIdResult.rows as { planId: string }[])[0]?.planId;
    if (planIdVal) {
      const statsResult = await db.execute(sql`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
               COUNT(CASE WHEN status NOT IN ('completed', 'cancelled') THEN 1 END) as remaining
        FROM planning_tasks WHERE "planId" = ${planIdVal}
      `);
      const stats = (statsResult.rows as { total: string; completed: string; remaining: string }[])[0];
      const total = parseInt(stats?.total) || 1;
      const completed = parseInt(stats?.completed) || 0;
      const remaining = parseInt(stats?.remaining) || 0;
      const rate = Math.round((completed / total) * 10000) / 100;
      const newStatus = remaining === 0 ? 'completed' : 'in_progress';

      await db.execute(sql`
        UPDATE planning_plans
        SET "completionRate" = ${String(rate)},
            status = ${newStatus},
            "updatedAt" = ${nowISO}
        WHERE "planId" = ${planIdVal}
      `);
    }
  } catch {
    // Completion rate update is best-effort
  }

  return { success: true };
}

// --- 5. addAdHocTask ---

export async function addAdHocTask(userId: number, task: { title: string; description?: string; priority?: string; estimatedHours?: number }) {
  const db = await requireDb();

  // Ensure today's plan exists
  let plan = await getTodayPlan(userId);
  if (!plan) {
    plan = await generateDailyPlan(userId) as any;
  }

  const taskId = `TASK-${Date.now()}-adhoc`;
  const priority = task.priority || 'P2';
  const nowISO = new Date().toISOString();

  await db.execute(sql`
    INSERT INTO planning_tasks
      ("taskId", "planId", title, description, priority, "taskType", "sourceType", "ownerId", "estimatedHours", status, "createdAt", "updatedAt")
    VALUES
      (${taskId}, ${plan!.planId}, ${task.title}, ${task.description || ''}, ${priority}, 'work', 'manual', ${userId}, ${task.estimatedHours ? String(task.estimatedHours) : '1'}, 'pending', ${nowISO}, ${nowISO})
  `);

  // Recompute completion rate (best-effort)
  try {
    const statsResult = await db.execute(sql`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM planning_tasks WHERE "planId" = ${plan!.planId}
    `);
    const stats = (statsResult.rows as { total: string; completed: string }[])[0];
    const total = parseInt(stats?.total) || 1;
    const completed = parseInt(stats?.completed) || 0;
    const rate = Math.round((completed / total) * 10000) / 100;
    await db.execute(sql`
      UPDATE planning_plans SET "completionRate" = ${String(rate)}, "updatedAt" = ${nowISO}
      WHERE "planId" = ${plan!.planId}
    `);
  } catch { /* best-effort */ }

  return { taskId, title: task.title, priority, status: 'pending' };
}

// --- 6. getYesterdayIncomplete ---

export async function getYesterdayIncomplete(userId: number) {
  const db = await requireDb();

  const result = await db.execute(sql`
    SELECT pt."taskId", pt.title, pt.description, pt.priority, pt."sourceType", pt."estimatedHours"
    FROM planning_tasks pt
    JOIN planning_plans pp ON pt."planId" = pp."planId"
    WHERE pt."ownerId" = ${userId}
      AND pp."planType" = 'daily'
      AND pp."planPeriod" = ${yesterday()}
      AND pt.status NOT IN ('completed', 'cancelled')
    ORDER BY pt.priority ASC
  `);

  return result.rows as { taskId: string; title: string; description: string | null; priority: string; sourceType: string; estimatedHours: string | null }[];
}

// --- 7. getPlanStats ---

export async function getPlanStats(userId: number) {
  const db = await requireDb();
  const todayStr = today();

  // 30-day average completion rate
  const avgResult = await db.execute(sql`
    SELECT AVG(CAST("completionRate" AS numeric)) as "avgRate", COUNT(*) as "planCount"
    FROM planning_plans
    WHERE "ownerId" = ${userId} AND "planType" = 'daily' AND status != 'cancelled'
      AND "planPeriod" >= (CURRENT_DATE - INTERVAL '30 days')::text
  `);

  // Streak: consecutive days with >=80% completion
  const streakResult = await db.execute(sql`
    SELECT "planPeriod", "completionRate"
    FROM planning_plans
    WHERE "ownerId" = ${userId} AND "planType" = 'daily' AND status != 'cancelled'
    ORDER BY "planPeriod" DESC
    LIMIT 30
  `);

  let streak = 0;
  const streakRows = streakResult.rows as { planPeriod: string; completionRate: string }[];
  const checkDate = new Date();
  for (const row of streakRows) {
    const expected = checkDate.toISOString().split('T')[0];
    if (row.planPeriod === expected && parseFloat(row.completionRate) >= 80) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Overdue tasks
  const overdueResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM planning_tasks pt
    JOIN planning_plans pp ON pt."planId" = pp."planId"
    WHERE pt."ownerId" = ${userId} AND pt.status NOT IN ('completed', 'cancelled')
      AND pp."planPeriod" < ${todayStr}
  `);

  // This week total tasks
  const weekResult = await db.execute(sql`
    SELECT COUNT(*) as total, COUNT(CASE WHEN pt.status = 'completed' THEN 1 END) as completed
    FROM planning_tasks pt
    JOIN planning_plans pp ON pt."planId" = pp."planId"
    WHERE pt."ownerId" = ${userId} AND pp."planType" = 'daily'
      AND pp."planPeriod" >= (CURRENT_DATE - INTERVAL '7 days')::text
  `);

  const avg = avgResult.rows as { avgRate: string | null; planCount: string }[];
  const overdue = overdueResult.rows as { count: string }[];
  const week = weekResult.rows as { total: string; completed: string }[];

  return {
    avgCompletionRate: Math.round(parseFloat(avg![0]?.avgRate!) || 0),
    planCount: parseInt(avg[0]?.planCount) || 0,
    streak,
    overdueTasks: parseInt(overdue[0]?.count) || 0,
    weekTotal: parseInt(week[0]?.total) || 0,
    weekCompleted: parseInt(week[0]?.completed) || 0,
  };
}

// --- 8. refreshDailyPlan ---

export async function refreshDailyPlan(userId: number) {
  const db = await requireDb();
  const todayStr = today();
  const nowISO = new Date().toISOString();

  // Cancel today's existing plan
  await db.execute(sql`
    UPDATE planning_plans SET status = 'cancelled', "updatedAt" = ${nowISO}
    WHERE "ownerId" = ${userId} AND "planType" = 'daily' AND "planPeriod" = ${todayStr} AND status != 'cancelled'
  `);

  // Generate fresh plan
  return generateDailyPlan(userId);
}

// ═════════════════════════════════════════════════════════════
//  v2: 8-SOURCE AGGREGATION
// ═════════════════════════════════════════════════════════════

/** Query 8 data sources in parallel and return categorised daily items */
export async function aggregateDailyItems(
  userId: number,
  _userName: string,
  _role: string,
): Promise<DailyPlanAggregate> {
  const db = await requireDb();
  const todayStr = today();
  const threeDaysLater = todayPlus(3);
  const weekLater = todayPlus(7);

  const [
    customerItems,
    projectItems,
    annualItems,
    meetingItems,
    carryoverItems,
    customerAssignItems,
    supervisorItems,
    personalItems,
  ] = await Promise.all([
    // 1. 客户清单要求 — CRM leads needing follow-up
    safeQuery(async () => {
      const r = await db.execute(sql`
        SELECT id, company_name, contact_name, status, priority
        FROM crm_leads
        WHERE assigned_to = ${userId}
          AND status IN ('new', 'contacted', 'qualified')
        ORDER BY priority ASC
        LIMIT 8
      `);
      return (r.rows as { id: number; company_name: string; contact_name: string | null; status: string; priority: string | null }[]).map((row) => ({
        id: `crm-${row.id}`,
        title: `跟进客户: ${row.company_name} (${row.contact_name || '未知联系人'})`,
        description: `状态: ${row.status}`,
        priority: mapDbPriority(row.priority),
        sourceType: 'customer_feedback',
        sourceRoute: '/sales-crm',
        status: 'pending' as const,
      }));
    }, []),

    // 2. 项目计划要求 — engineering tasks due within 3 days
    safeQuery(async () => {
      const r = await db.execute(sql`
        SELECT "taskId", "taskName", "taskDescription", priority, "plannedEndDate"
        FROM engineering_tasks
        WHERE "primaryAssigneeId" = ${userId}
          AND status IN ('pending', 'in_progress')
          AND ("plannedEndDate" IS NULL OR "plannedEndDate" <= ${threeDaysLater}::date)
        ORDER BY priority ASC
        LIMIT 10
      `);
      return (r.rows as { taskId: string; taskName: string; taskDescription: string | null; priority: string | null; plannedEndDate: string | null }[]).map((row) => ({
        id: `eng-${row.taskId}`,
        title: row.taskName,
        description: row.taskDescription || undefined,
        priority: mapDbPriority(row.priority),
        sourceType: 'opl',
        sourceRoute: '/project-management',
        dueDate: row.plannedEndDate ? String(row.plannedEndDate).split('T')[0] : undefined,
        status: 'pending' as const,
      }));
    }, []),

    // 3. 年度公司/部门安排 — milestones within 7 days
    safeQuery(async () => {
      const r = await db.execute(sql`
        SELECT id, title, description, scheduled_date, status
        FROM annual_milestones
        WHERE scheduled_date BETWEEN ${todayStr}::date AND ${weekLater}::date
          AND status = 'pending'
        ORDER BY scheduled_date ASC
        LIMIT 5
      `);
      return (r.rows as { id: number; title: string; description: string | null; scheduled_date: string | null; status: string }[]).map((row) => ({
        id: `annual-${row.id}`,
        title: row.title,
        description: row.description || undefined,
        priority: 'P1' as const,
        sourceType: 'annual_plan',
        sourceRoute: '/annual-agenda',
        dueDate: row.scheduled_date ? String(row.scheduled_date).split('T')[0] : undefined,
        status: 'pending' as const,
      }));
    }, []),

    // 4. 会议培训要求 — today's upcoming meetings + pending action items
    safeQuery(async () => {
      const items: DailyItem[] = [];
      // Today's meetings
      const meetings = await db.execute(sql`
        SELECT id, title, scheduled_start
        FROM sys_meetings
        WHERE status = 'UPCOMING'
          AND scheduled_start >= ${todayStr}::timestamp
          AND scheduled_start < (${todayStr}::date + INTERVAL '1 day')
        ORDER BY scheduled_start ASC
        LIMIT 5
      `);
      for (const m of meetings.rows as { id: number; title: string; scheduled_start: string | null }[]) {
        const time = m.scheduled_start ? new Date(m.scheduled_start).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
        items.push({
          id: `meet-${m.id}`,
          title: `${time} 会议: ${m.title}`,
          priority: 'P1',
          sourceType: 'meeting',
          sourceRoute: '/meeting-hub',
          status: 'pending',
        });
      }
      // Pending action items from past meetings
      const actions = await db.execute(sql`
        SELECT id, task_desc, due_date
        FROM meeting_action_items
        WHERE assigned_to = ${userId}
          AND status = 'PENDING'
        ORDER BY due_date ASC
        LIMIT 3
      `);
      for (const a of actions.rows as { id: number; task_desc: string; due_date: string | null }[]) {
        items.push({
          id: `action-${a.id}`,
          title: `会议行动项: ${a.task_desc}`,
          priority: 'P2',
          sourceType: 'meeting',
          sourceRoute: '/meeting-hub',
          dueDate: a.due_date ? String(a.due_date).split('T')[0] : undefined,
          status: 'pending',
        });
      }
      return items;
    }, []),

    // 5. 前面工作遗留 — yesterday's incomplete planning tasks
    safeQuery(async () => {
      const r = await db.execute(sql`
        SELECT pt."taskId", pt.title, pt.description, pt.priority, pt."sourceType"
        FROM planning_tasks pt
        JOIN planning_plans pp ON pt."planId" = pp."planId"
        WHERE pt."ownerId" = ${userId}
          AND pp."planType" = 'daily'
          AND pp."planPeriod" < ${todayStr}
          AND pt.status NOT IN ('completed', 'cancelled')
        ORDER BY pp."planPeriod" DESC, pt.priority ASC
        LIMIT 10
      `);
      return (r.rows as { taskId: string; title: string; description: string | null; priority: string | null; sourceType: string | null }[]).map((row) => ({
        id: `carry-${row.taskId}`,
        title: row.title,
        description: row.description || undefined,
        priority: mapDbPriority(row.priority),
        sourceType: row.sourceType || 'manual',
        status: 'pending' as const,
        isCarryover: true,
      }));
    }, []),

    // 6. 客户点将要求 — customer assignments from inbox
    safeQuery(async () => {
      const r = await db.execute(sql`
        SELECT id, title, description, priority, assigned_by_name, source_reference, due_date
        FROM daily_plan_inbox
        WHERE target_user_id = ${userId}
          AND category = 'customer_assignment'
          AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 5
      `);
      return (r.rows as { id: number; title: string; description: string | null; priority: string | null; assigned_by_name: string | null; source_reference: string | null; due_date: string | null }[]).map((row) => ({
        id: `custassign-${row.id}`,
        title: row.title,
        description: row.description ? `${row.assigned_by_name ? `来自: ${row.assigned_by_name} — ` : ''}${row.description}` : undefined,
        priority: mapDbPriority(row.priority),
        sourceType: 'customer_feedback',
        sourceRoute: row.source_reference || '/sales-crm',
        dueDate: row.due_date || undefined,
        status: 'pending' as const,
      }));
    }, []),

    // 7. 主管安排 — supervisor tasks from inbox
    safeQuery(async () => {
      const r = await db.execute(sql`
        SELECT id, title, description, priority, assigned_by_name, source_reference, due_date
        FROM daily_plan_inbox
        WHERE target_user_id = ${userId}
          AND category = 'supervisor'
          AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 8
      `);
      return (r.rows as { id: number; title: string; description: string | null; priority: string | null; assigned_by_name: string | null; source_reference: string | null; due_date: string | null }[]).map((row) => ({
        id: `super-${row.id}`,
        title: row.title,
        description: row.description ? `${row.assigned_by_name ? `分配人: ${row.assigned_by_name} — ` : ''}${row.description}` : undefined,
        priority: mapDbPriority(row.priority),
        sourceType: 'supervisor',
        dueDate: row.due_date || undefined,
        status: 'pending' as const,
      }));
    }, []),

    // 8. 个人考虑增加 — today's manual tasks
    safeQuery(async () => {
      const r = await db.execute(sql`
        SELECT pt."taskId", pt.title, pt.description, pt.priority, pt."estimatedHours", pt.status
        FROM planning_tasks pt
        JOIN planning_plans pp ON pt."planId" = pp."planId"
        WHERE pt."ownerId" = ${userId}
          AND pp."planType" = 'daily'
          AND pp."planPeriod" = ${todayStr}
          AND pt."sourceType" = 'manual'
        ORDER BY pt."createdAt" ASC
        LIMIT 10
      `);
      return (r.rows as { taskId: string; title: string; description: string | null; priority: string | null; estimatedHours: string | null; status: string }[]).map((row) => ({
        id: `personal-${row.taskId}`,
        title: row.title,
        description: row.description || undefined,
        priority: mapDbPriority(row.priority),
        sourceType: 'manual',
        estimatedHours: row.estimatedHours ? parseFloat(row.estimatedHours) : undefined,
        status: (row.status === 'completed' ? 'completed' : 'pending') as 'pending' | 'completed',
      }));
    }, []),
  ]);

  const categories: DailyCategory[] = [
    { key: 'customer',        labelZh: '客户清单要求',      labelEn: 'Customer Follow-up',   icon: 'Phone',        items: customerItems },
    { key: 'project',         labelZh: '项目计划要求',      labelEn: 'Project Tasks',        icon: 'FolderKanban', items: projectItems },
    { key: 'annual',          labelZh: '年度公司/部门安排', labelEn: 'Annual Agenda',        icon: 'CalendarRange', items: annualItems },
    { key: 'meeting',         labelZh: '会议培训要求',      labelEn: 'Meetings & Training', icon: 'Users',         items: meetingItems },
    { key: 'carryover',       labelZh: '前面工作遗留',      labelEn: 'Carryover',           icon: 'History',       items: carryoverItems },
    { key: 'customer_assign', labelZh: '客户点将要求',      labelEn: 'Customer Assignment', icon: 'UserCheck',     items: customerAssignItems },
    { key: 'supervisor',      labelZh: '主管安排',          labelEn: 'Supervisor Tasks',    icon: 'ShieldCheck',   items: supervisorItems },
    { key: 'personal',        labelZh: '个人考虑增加',      labelEn: 'Personal Items',      icon: 'PlusCircle',    items: personalItems },
  ];

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const completedItems = categories.reduce((s, c) => s + c.items.filter(i => i.status === 'completed').length, 0);

  // If all sources empty, return demo data so UI is never blank
  if (totalItems === 0) {
    return getMockAggregate(todayStr);
  }

  const aiNotes: string[] = [];
  if (carryoverItems.length > 0) aiNotes.push(`⚠️ 有 ${carryoverItems.length} 项历史遗留任务需要优先处理`);
  if (customerItems.length > 0) aiNotes.push(`📞 今日有 ${customerItems.length} 个客户待跟进`);
  if (meetingItems.length > 0) aiNotes.push(`📅 今日有 ${meetingItems.filter(i => i.id.startsWith('meet-')).length} 场会议`);

  return { planDate: todayStr, categories, totalItems, completedItems, aiNotes };
}

function getMockAggregate(planDate: string): DailyPlanAggregate {
  return {
    planDate,
    categories: [
      {
        key: 'customer', labelZh: '客户清单要求', labelEn: 'Customer Follow-up', icon: 'Phone',
        items: [
          { id: 'demo-1', title: '跟进客户: 示例科技有限公司 (张经理)', priority: 'P1', sourceType: 'customer_feedback', sourceRoute: '/sales-crm', status: 'pending' },
          { id: 'demo-2', title: '回复询价: 新能源设备采购', priority: 'P2', sourceType: 'customer_feedback', sourceRoute: '/sales-crm', status: 'pending' },
        ],
      },
      {
        key: 'project', labelZh: '项目计划要求', labelEn: 'Project Tasks', icon: 'FolderKanban',
        items: [
          { id: 'demo-3', title: '完成 BOM 清单审核', priority: 'P1', sourceType: 'opl', sourceRoute: '/project-management', dueDate: planDate, status: 'pending' },
        ],
      },
      { key: 'annual', labelZh: '年度公司/部门安排', labelEn: 'Annual Agenda', icon: 'CalendarRange', items: [] },
      {
        key: 'meeting', labelZh: '会议培训要求', labelEn: 'Meetings & Training', icon: 'Users',
        items: [
          { id: 'demo-4', title: '10:00 部门周会', priority: 'P1', sourceType: 'meeting', sourceRoute: '/meeting-hub', status: 'pending' },
        ],
      },
      { key: 'carryover', labelZh: '前面工作遗留', labelEn: 'Carryover', icon: 'History', items: [] },
      { key: 'customer_assign', labelZh: '客户点将要求', labelEn: 'Customer Assignment', icon: 'UserCheck', items: [] },
      { key: 'supervisor', labelZh: '主管安排', labelEn: 'Supervisor Tasks', icon: 'ShieldCheck', items: [] },
      {
        key: 'personal', labelZh: '个人考虑增加', labelEn: 'Personal Items', icon: 'PlusCircle',
        items: [
          { id: 'demo-5', title: '整理本周工作总结', priority: 'P3', sourceType: 'manual', status: 'pending' },
        ],
      },
    ],
    totalItems: 5,
    completedItems: 0,
    aiNotes: ['💡 这是示例数据 — 点击"生成计划"聚合您的真实工作数据'],
  };
}

// --- 9. assignInboxItem ---

export async function assignInboxItem(input: {
  targetUserId: number;
  assignedByName: string;
  title: string;
  description?: string;
  priority?: string;
  category: 'supervisor' | 'customer_assignment';
  sourceReference?: string;
  dueDate?: string;
}) {
  const db = await requireDb();
  const nowISO = new Date().toISOString();

  const result = await db.execute(sql`
    INSERT INTO daily_plan_inbox
      (target_user_id, assigned_by_name, category, title, description, priority, source_reference, due_date, status, created_at, updated_at)
    VALUES
      (${input.targetUserId}, ${input.assignedByName}, ${input.category}, ${input.title}, ${input.description || ''}, ${input.priority || 'P2'}, ${input.sourceReference || ''}, ${input.dueDate || ''}, 'pending', ${nowISO}::timestamp, ${nowISO}::timestamp)
    RETURNING *
  `);

  return (result.rows as Record<string, unknown>[])[0] ?? { id: -1, title: input.title, status: 'pending' };
}
