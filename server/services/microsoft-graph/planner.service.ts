/**
 * Microsoft Graph — Planner Service
 *
 * Provides access to Microsoft Planner for project task management.
 * Data is stored in both Planner and the GRT system for dual-storage.
 */
import { graphRequest, isGraphConfigured } from "./config";
import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("ms-graph-planner");

// ── Types ────────────────────────────────────────────────

export interface PlannerPlan {
  id: string;
  title: string;
  owner: string;
  createdDateTime: string;
}

export interface PlannerBucket {
  id: string;
  name: string;
  planId: string;
  orderHint: string;
}

export interface PlannerTask {
  id: string;
  planId: string;
  bucketId: string;
  title: string;
  percentComplete: number; // 0, 25, 50, 75, 100
  startDateTime: string | null;
  dueDateTime: string | null;
  priority: number; // 0=urgent, 1=important, 5=medium, 9=low
  assignedTo: string[];
  createdDateTime: string;
  completedDateTime: string | null;
  orderHint: string;
}

// ── Mock Data ────────────────────────────────────────────

const mockPlans: PlannerPlan[] = [
  { id: "plan-1", title: "GRT-CL2000 清洗机研发", owner: "研发中心", createdDateTime: "2026-01-10T09:00:00Z" },
  { id: "plan-2", title: "Q2 量产导入计划", owner: "生产部", createdDateTime: "2026-02-01T09:00:00Z" },
  { id: "plan-3", title: "客户交付 — ABC公司", owner: "项目管理", createdDateTime: "2026-02-15T09:00:00Z" },
];

const mockBuckets: PlannerBucket[] = [
  { id: "bkt-1", name: "待办", planId: "plan-1", orderHint: "1" },
  { id: "bkt-2", name: "进行中", planId: "plan-1", orderHint: "2" },
  { id: "bkt-3", name: "已完成", planId: "plan-1", orderHint: "3" },
  { id: "bkt-4", name: "设计", planId: "plan-2", orderHint: "1" },
  { id: "bkt-5", name: "生产", planId: "plan-2", orderHint: "2" },
];

const mockTasks: PlannerTask[] = [
  {
    id: "task-1", planId: "plan-1", bucketId: "bkt-2", title: "完成机械结构 3D 建模",
    percentComplete: 75, startDateTime: "2026-02-01T09:00:00Z", dueDateTime: "2026-03-10T17:00:00Z",
    priority: 1, assignedTo: ["孙国祥", "李大鹏"], createdDateTime: "2026-02-01T09:00:00Z",
    completedDateTime: null, orderHint: "1",
  },
  {
    id: "task-2", planId: "plan-1", bucketId: "bkt-2", title: "PLC 程序编写 — 清洗循环",
    percentComplete: 50, startDateTime: "2026-02-10T09:00:00Z", dueDateTime: "2026-03-15T17:00:00Z",
    priority: 1, assignedTo: ["洪香龙"], createdDateTime: "2026-02-10T09:00:00Z",
    completedDateTime: null, orderHint: "2",
  },
  {
    id: "task-3", planId: "plan-1", bucketId: "bkt-1", title: "BOM 清单审核",
    percentComplete: 0, startDateTime: null, dueDateTime: "2026-03-20T17:00:00Z",
    priority: 5, assignedTo: ["洪小东"], createdDateTime: "2026-02-15T09:00:00Z",
    completedDateTime: null, orderHint: "3",
  },
  {
    id: "task-4", planId: "plan-1", bucketId: "bkt-3", title: "需求规格书编写",
    percentComplete: 100, startDateTime: "2026-01-15T09:00:00Z", dueDateTime: "2026-02-01T17:00:00Z",
    priority: 1, assignedTo: ["孙国祥"], createdDateTime: "2026-01-15T09:00:00Z",
    completedDateTime: "2026-01-28T16:30:00Z", orderHint: "1",
  },
  {
    id: "task-5", planId: "plan-2", bucketId: "bkt-4", title: "工装夹具设计",
    percentComplete: 25, startDateTime: "2026-02-20T09:00:00Z", dueDateTime: "2026-03-25T17:00:00Z",
    priority: 5, assignedTo: ["孙坚", "钱佳奇"], createdDateTime: "2026-02-20T09:00:00Z",
    completedDateTime: null, orderHint: "1",
  },
];

// ── Service ──────────────────────────────────────────────

export const plannerService = {
  /**
   * Get all Planner plans for a group/user.
   */
  async getPlans(groupId?: string): Promise<PlannerPlan[]> {
    if (!isGraphConfigured()) return mockPlans;

    const endpoint = groupId
      ? `https://graph.microsoft.com/v1.0/groups/${groupId}/planner/plans`
      : "https://graph.microsoft.com/v1.0/me/planner/plans";

    const result = await graphRequest<{ value: any[] }>(endpoint);
    if (!result?.value) return mockPlans;

    return result.value.map((p: any) => ({
      id: p.id,
      title: p.title,
      owner: p.owner ?? "",
      createdDateTime: p.createdDateTime ?? "",
    }));
  },

  /**
   * Get buckets for a plan.
   */
  async getBuckets(planId: string): Promise<PlannerBucket[]> {
    if (!isGraphConfigured()) return mockBuckets.filter(b => b.planId === planId);

    const endpoint = `https://graph.microsoft.com/v1.0/planner/plans/${planId}/buckets`;
    const result = await graphRequest<{ value: any[] }>(endpoint);
    if (!result?.value) return mockBuckets.filter(b => b.planId === planId);

    return result.value.map((b: any) => ({
      id: b.id,
      name: b.name,
      planId: b.planId,
      orderHint: b.orderHint ?? "",
    }));
  },

  /**
   * Get tasks for a plan.
   */
  async getTasks(planId: string): Promise<PlannerTask[]> {
    if (!isGraphConfigured()) return mockTasks.filter(t => t.planId === planId);

    const endpoint = `https://graph.microsoft.com/v1.0/planner/plans/${planId}/tasks`;
    const result = await graphRequest<{ value: any[] }>(endpoint);
    if (!result?.value) return mockTasks.filter(t => t.planId === planId);

    return result.value.map((t: any) => ({
      id: t.id,
      planId: t.planId,
      bucketId: t.bucketId ?? "",
      title: t.title,
      percentComplete: t.percentComplete ?? 0,
      startDateTime: t.startDateTime ?? null,
      dueDateTime: t.dueDateTime ?? null,
      priority: t.priority ?? 5,
      assignedTo: t.assignments ? Object.keys(t.assignments) : [],
      createdDateTime: t.createdDateTime ?? "",
      completedDateTime: t.completedDateTime ?? null,
      orderHint: t.orderHint ?? "",
    }));
  },

  /**
   * Create a new task in a plan.
   */
  async createTask(input: {
    planId: string;
    bucketId: string;
    title: string;
    dueDateTime?: string;
    priority?: number;
    assignedTo?: string[];
  }): Promise<PlannerTask | null> {
    log.info({ planId: input.planId, title: input.title }, "Creating planner task");

    if (!isGraphConfigured()) {
      // Return mock created task
      const newTask: PlannerTask = {
        id: `task-${Date.now()}`,
        planId: input.planId,
        bucketId: input.bucketId,
        title: input.title,
        percentComplete: 0,
        startDateTime: new Date().toISOString(),
        dueDateTime: input.dueDateTime ?? null,
        priority: input.priority ?? 5,
        assignedTo: input.assignedTo ?? [],
        createdDateTime: new Date().toISOString(),
        completedDateTime: null,
        orderHint: "",
      };
      mockTasks.push(newTask);
      return newTask;
    }

    const assignments: Record<string, any> = {};
    for (const userId of input.assignedTo ?? []) {
      assignments[userId] = { "@odata.type": "#microsoft.graph.plannerAssignment", orderHint: " !" };
    }

    const body = {
      planId: input.planId,
      bucketId: input.bucketId,
      title: input.title,
      dueDateTime: input.dueDateTime,
      priority: input.priority ?? 5,
      assignments,
    };

    return graphRequest<PlannerTask>("https://graph.microsoft.com/v1.0/planner/tasks", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Update task progress.
   */
  async updateTaskProgress(taskId: string, percentComplete: number, etag: string): Promise<boolean> {
    log.info({ taskId, percentComplete }, "Updating task progress");

    if (!isGraphConfigured()) {
      const task = mockTasks.find(t => t.id === taskId);
      if (task) {
        task.percentComplete = percentComplete;
        if (percentComplete === 100) task.completedDateTime = new Date().toISOString();
      }
      return true;
    }

    const result = await graphRequest<any>(`https://graph.microsoft.com/v1.0/planner/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "If-Match": etag },
      body: JSON.stringify({ percentComplete }),
    });

    return result !== null;
  },
};
