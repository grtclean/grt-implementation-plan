/**
 * 每日工作计划服务
 * 整合工程任务、会议行动项和历史计划，生成AI驱动的每日工作计划
 */

import { sql } from "drizzle-orm";
import { requireDb } from "../db";
import { generateWorkPlan, type PlanInput } from "./ai-planning.service";

// --- Helpers ---

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
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
  const userResult = await db.execute(sql`SELECT name FROM users WHERE id = ${userId}`);
  const userName = (userResult.rows as any[])[0]?.name || 'Unknown';

  // Query data sources in parallel
  const [engTasks, actionItems, yesterdayTasks] = await Promise.all([
    db.execute(sql`
      SELECT "taskId", "taskName", "taskDescription", priority, "plannedEndDate"
      FROM engineering_tasks
      WHERE "primaryAssigneeId" = ${userId}
        AND status IN ('pending', 'in_progress')
      ORDER BY priority ASC
      LIMIT 20
    `),
    db.execute(sql`
      SELECT id, content, status, ai_summary
      FROM ime_action_items
      WHERE owner = ${userName} AND status = 'open'
      ORDER BY last_seen_date DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT pt."taskId", pt.title, pt.description, pt.priority, pt."sourceType"
      FROM planning_tasks pt
      JOIN planning_plans pp ON pt."planId" = pp."planId"
      WHERE pt."ownerId" = ${userId}
        AND pp."planType" = 'daily'
        AND pp."planPeriod" = ${yesterday()}
        AND pt.status NOT IN ('completed', 'cancelled')
    `),
  ]);

  const engRows = engTasks.rows as any[];
  const actionRows = actionItems.rows as any[];
  const yesterdayRows = yesterdayTasks.rows as any[];

  // Map to PlanInput format
  const planInput: PlanInput = {
    projectOPLs: engRows.length > 0 ? [{
      id: 'eng-tasks',
      projectId: 'current',
      projectName: '当前工程任务',
      stage: 'active',
      items: engRows.map((t: any) => `${t.taskName} (${t.priority})`),
      deadline: engRows[0]?.plannedEndDate || todayStr,
    }] : undefined,
    meetingMinutes: actionRows.length > 0 ? [{
      id: 'action-items',
      meetingType: '会议行动项',
      date: todayStr,
      actionItems: actionRows.map((a: any) => ({
        description: a.content,
        assignee: userName,
        deadline: todayStr,
        status: 'pending' as const,
      })),
    }] : undefined,
    unfinishedPlans: yesterdayRows.length > 0 ? yesterdayRows.map((t: any) => ({
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
  const tasks: any[] = [];
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

  const plan = (planResult.rows as any[])[0];
  if (!plan) return null;

  const tasksResult = await db.execute(sql`
    SELECT "taskId", title, description, priority, "taskType", "sourceType", "estimatedHours", "actualHours", status, "completedAt"
    FROM planning_tasks
    WHERE "planId" = ${plan.planId} AND "ownerId" = ${userId}
    ORDER BY priority ASC, "createdAt" ASC
  `);

  const tasks = tasksResult.rows as any[];
  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;

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

  return result.rows as any[];
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

  // Recompute parent plan completion rate + status
  await db.execute(sql`
    UPDATE planning_plans SET
      "completionRate" = (
        SELECT ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2)
        FROM planning_tasks WHERE "planId" = (SELECT "planId" FROM planning_tasks WHERE "taskId" = ${taskId} LIMIT 1)
      ),
      status = CASE
        WHEN (SELECT COUNT(*) FROM planning_tasks
              WHERE "planId" = (SELECT "planId" FROM planning_tasks WHERE "taskId" = ${taskId} LIMIT 1)
                AND status NOT IN ('completed', 'cancelled')) = 0
        THEN 'completed'
        ELSE 'in_progress'
      END,
      "updatedAt" = ${nowISO}
    WHERE "planId" = (SELECT "planId" FROM planning_tasks WHERE "taskId" = ${taskId} LIMIT 1)
  `);

  return { success: true };
}

// --- 5. addAdHocTask ---

export async function addAdHocTask(userId: number, task: { title: string; description?: string; priority?: string; estimatedHours?: number }) {
  const db = await requireDb();

  // Ensure today's plan exists
  let plan = await getTodayPlan(userId);
  if (!plan) {
    plan = await generateDailyPlan(userId);
  }

  const taskId = `TASK-${Date.now()}-adhoc`;
  const priority = task.priority || 'P2';
  const nowISO = new Date().toISOString();

  await db.execute(sql`
    INSERT INTO planning_tasks
      ("taskId", "planId", title, description, priority, "taskType", "sourceType", "ownerId", "estimatedHours", status, "createdAt", "updatedAt")
    VALUES
      (${taskId}, ${plan.planId}, ${task.title}, ${task.description || ''}, ${priority}, 'work', 'manual', ${userId}, ${task.estimatedHours ? String(task.estimatedHours) : '1'}, 'pending', ${nowISO}, ${nowISO})
  `);

  // Recompute completion rate
  await db.execute(sql`
    UPDATE planning_plans SET
      "completionRate" = (
        SELECT ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2)
        FROM planning_tasks WHERE "planId" = ${plan.planId}
      ),
      "updatedAt" = ${nowISO}
    WHERE "planId" = ${plan.planId}
  `);

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

  return result.rows as any[];
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
  const streakRows = streakResult.rows as any[];
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

  const avg = avgResult.rows as any[];
  const overdue = overdueResult.rows as any[];
  const week = weekResult.rows as any[];

  return {
    avgCompletionRate: Math.round(parseFloat(avg[0]?.avgRate) || 0),
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
