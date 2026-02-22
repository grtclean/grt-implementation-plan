/**
 * GRT Smart OA Service — Enterprise Backend Logic
 *
 * Responsibilities:
 *   1. OA workflow lifecycle (create → approve / reject / cancel)
 *   2. Monday morning meeting agenda auto-generation
 *   3. Business trip report submission
 *   4. DingTalk webhook notification (fire-and-forget, never blocks workflow)
 *
 * Design decisions:
 *   - Status guards: approve/reject verify current status is PENDING
 *   - FK validation: existence checks before insert where critical
 *   - DingTalk: best-effort — failures are logged, never thrown
 *   - DB type: `DbClient` alias avoids `any` while staying DRY
 */

import { eq, and, lt, gt, ne } from "drizzle-orm";
import { requireDb } from "../db";
import {
  oaWorkflows,
  companyEventsMeetings,
  meetingAgendasActions,
  businessTripReports,
  oaLeaveBalances,
  oaAnnouncements,
  type AutoAgendaContext,
  type OaWorkflow,
  type OaWorkflowType,
  type InsertOaWorkflow,
  type BusinessTripReport,
  type InsertBusinessTripReport,
  type OaLeaveBalance,
  type OaAnnouncement,
  type InsertOaAnnouncement,
} from "../../drizzle/oa-schema";
import { projectTasks, eightDReports, users, projects } from "../../drizzle/schema";
import { sendDingTalkMessage } from "../dingtalk-webhook";

// ══════════════════════════════════════════════════════
// DB type alias (mirrors time-reconciliation.service.ts pattern)
// ══════════════════════════════════════════════════════

type DbClient = NonNullable<Awaited<ReturnType<typeof requireDb>>>;

// ══════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════

const WORKFLOW_TYPE_LABELS: Readonly<Record<OaWorkflowType, string>> = {
  LEAVE: "请假",
  OVERTIME: "加班",
  ATTENDANCE_FIX: "补卡",
  OUTING: "外出",
  VEHICLE: "用车",
  STATIONERY: "文具领用",
  PROCUREMENT: "采购",
  EXPENSE: "报销",
  SEAL: "用印",
  GIFT: "礼品",
};

const DEFAULT_AGENDA_CONFIG: AutoAgendaContext = {
  sourceTypes: ["overdue_task", "8d_report"],
  lookbackDays: 7,
  maxItems: 20,
};

// ══════════════════════════════════════════════════════
// Internal Helpers
// ══════════════════════════════════════════════════════

async function resolveUserName(db: DbClient, userId: number): Promise<string> {
  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.name ?? `User#${userId}`;
}

async function assertUserExists(db: DbClient, userId: number): Promise<void> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) throw new Error(`FK violation: users.id=${userId} does not exist`);
}

async function assertProjectExists(db: DbClient, projectId: number): Promise<void> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!row) throw new Error(`FK violation: projects.id=${projectId} does not exist`);
}

async function assertWorkflowPending(db: DbClient, id: number): Promise<OaWorkflow> {
  const [workflow] = await db
    .select()
    .from(oaWorkflows)
    .where(eq(oaWorkflows.id, id))
    .limit(1);
  if (!workflow) throw new Error(`Workflow #${id} not found`);
  if (workflow.status !== "PENDING") {
    throw new Error(
      `Workflow #${id} is ${workflow.status}; only PENDING workflows can be approved/rejected`
    );
  }
  return workflow;
}

/**
 * Best-effort DingTalk notification.
 * Returns `true` if sent successfully, `false` otherwise.
 * Never throws — callers should not block on notification failures.
 */
async function notifyDingTalk(
  title: string,
  contentLines: string[],
): Promise<boolean> {
  try {
    const result = await sendDingTalkMessage({
      title,
      content: contentLines.filter(Boolean).join("\n"),
      type: "markdown",
    });
    return result.success;
  } catch (e) {
    console.error("[OA] DingTalk notification failed:", e);
    return false;
  }
}

function nowISO(): string {
  return new Date().toISOString();
}

function nowLocale(): string {
  return new Date().toLocaleString("zh-CN");
}

// ══════════════════════════════════════════════════════
// 1. createOARequest
// ══════════════════════════════════════════════════════

/**
 * Create an OA workflow request.
 *
 * - Validates FK references (applicant, approver, project) before insert
 * - Sends DingTalk notification to approver (best-effort)
 * - Updates `dingtalkNotified` flag on success
 */
export async function createOARequest(data: InsertOaWorkflow): Promise<OaWorkflow> {
  const db = await requireDb();

  // FK validation (parallel)
  const checks: Promise<void>[] = [];
  if (data.applicantId) checks.push(assertUserExists(db, data.applicantId));
  if (data.approverId) checks.push(assertUserExists(db, data.approverId));
  if (data.linkedProjectId) checks.push(assertProjectExists(db, data.linkedProjectId));
  if (checks.length > 0) await Promise.all(checks);

  // Insert
  const [workflow] = await db.insert(oaWorkflows).values({
    ...data,
    status: "PENDING",
  }).returning();

  // Notify approver via DingTalk (best-effort, fire-and-forget for the caller)
  if (workflow.approverId) {
    const applicantName = workflow.applicantId
      ? await resolveUserName(db, workflow.applicantId)
      : "未知";
    const typeLabel = WORKFLOW_TYPE_LABELS[workflow.type];

    const sent = await notifyDingTalk(
      "新OA申请待审批",
      [
        `**类型**: ${typeLabel}`,
        `**标题**: ${workflow.title}`,
        `**申请人**: ${applicantName}`,
        `**时间**: ${nowLocale()}`,
        "",
        "请登录GRT系统进行审批。",
      ],
    );

    if (sent) {
      await db.update(oaWorkflows)
        .set({ dingtalkNotified: true })
        .where(eq(oaWorkflows.id, workflow.id));
    }
  }

  return workflow;
}

// ══════════════════════════════════════════════════════
// 2. approveOARequest
// ══════════════════════════════════════════════════════

/**
 * Approve a PENDING workflow.
 *
 * - Status guard: throws if workflow is not PENDING
 * - Transitions status to APPROVED
 * - Sends DingTalk notification to applicant (best-effort)
 */
export async function approveOARequest(
  id: number,
  approverId: number,
  comment?: string,
): Promise<OaWorkflow> {
  const db = await requireDb();

  // Pre-flight: verify workflow exists and is PENDING
  await assertWorkflowPending(db, id);

  const now = nowISO();
  const [workflow] = await db.update(oaWorkflows)
    .set({
      status: "APPROVED",
      approverId,
      approvedAt: now,
      approverComment: comment ?? null,
      updatedAt: now,
    })
    .where(eq(oaWorkflows.id, id))
    .returning();

  if (!workflow) throw new Error(`Workflow #${id} not found after update`);

  // Notify applicant
  if (workflow.applicantId) {
    const approverName = await resolveUserName(db, approverId);
    const typeLabel = WORKFLOW_TYPE_LABELS[workflow.type];
    await notifyDingTalk(
      "OA申请已批准",
      [
        `**类型**: ${typeLabel}`,
        `**标题**: ${workflow.title}`,
        `**审批人**: ${approverName}`,
        comment ? `**批注**: ${comment}` : "",
        `**时间**: ${nowLocale()}`,
      ],
    );
  }

  return workflow;
}

// ══════════════════════════════════════════════════════
// 3. rejectOARequest
// ══════════════════════════════════════════════════════

/**
 * Reject a PENDING workflow.
 *
 * - Status guard: throws if workflow is not PENDING
 * - Transitions status to REJECTED
 * - Sends DingTalk notification to applicant (best-effort)
 */
export async function rejectOARequest(
  id: number,
  approverId: number,
  comment?: string,
): Promise<OaWorkflow> {
  const db = await requireDb();

  // Pre-flight: verify workflow exists and is PENDING
  await assertWorkflowPending(db, id);

  const now = nowISO();
  const [workflow] = await db.update(oaWorkflows)
    .set({
      status: "REJECTED",
      approverId,
      approvedAt: now,
      approverComment: comment ?? null,
      updatedAt: now,
    })
    .where(eq(oaWorkflows.id, id))
    .returning();

  if (!workflow) throw new Error(`Workflow #${id} not found after update`);

  // Notify applicant
  if (workflow.applicantId) {
    const approverName = await resolveUserName(db, approverId);
    const typeLabel = WORKFLOW_TYPE_LABELS[workflow.type];
    await notifyDingTalk(
      "OA申请被驳回",
      [
        `**类型**: ${typeLabel}`,
        `**标题**: ${workflow.title}`,
        `**审批人**: ${approverName}`,
        comment ? `**驳回原因**: ${comment}` : "",
        `**时间**: ${nowLocale()}`,
      ],
    );
  }

  return workflow;
}

// ══════════════════════════════════════════════════════
// 4. generateMondayMorningAgenda
// ══════════════════════════════════════════════════════

/** Shape of a pending agenda item before DB insert */
interface PendingAgendaItem {
  agendaItem: string;
  sourceType: string;
  sourceId: number;
}

/**
 * Auto-generate meeting agenda from overdue project tasks + recent 8D reports.
 *
 * Reads `autoAgendaContext` from the meeting definition to control:
 *   - which source types to query
 *   - lookback window (days)
 *   - max items cap
 *
 * Falls back to sensible defaults if no config is stored.
 */
export async function generateMondayMorningAgenda(
  meetingId: number,
): Promise<{ meetingId: number; meetingDate: string; itemsGenerated: number }> {
  const db = await requireDb();

  // 1. Load meeting definition
  const [meeting] = await db
    .select()
    .from(companyEventsMeetings)
    .where(eq(companyEventsMeetings.id, meetingId))
    .limit(1);
  if (!meeting) throw new Error(`Meeting #${meetingId} not found`);

  const config: AutoAgendaContext = meeting.autoAgendaContext ?? DEFAULT_AGENDA_CONFIG;

  const now = new Date();
  const meetingDate = now.toISOString().split("T")[0]!; // YYYY-MM-DD
  const lookbackCutoff = new Date(now.getTime() - config.lookbackDays * 86_400_000);
  const items: PendingAgendaItem[] = [];

  // 2. Overdue tasks — plannedEndDate < now & status not in (done, cancelled)
  if (config.sourceTypes.includes("overdue_task")) {
    const overdueTasks = await db
      .select({
        id: projectTasks.id,
        name: projectTasks.name,
        plannedEndDate: projectTasks.plannedEndDate,
      })
      .from(projectTasks)
      .where(
        and(
          lt(projectTasks.plannedEndDate, now.toISOString()),
          ne(projectTasks.status, "done"),
          ne(projectTasks.status, "cancelled"),
        ),
      )
      .limit(config.maxItems);

    for (const task of overdueTasks) {
      items.push({
        agendaItem: `[逾期任务] ${task.name} (到期: ${task.plannedEndDate?.split("T")[0] ?? "N/A"})`,
        sourceType: "overdue_task",
        sourceId: task.id,
      });
    }
  }

  // 3. Recent 8D reports — created within lookback window
  if (config.sourceTypes.includes("8d_report")) {
    const remaining = Math.max(config.maxItems - items.length, 1);
    const recent8D = await db
      .select({
        id: eightDReports.id,
        title: eightDReports.title,
        severity: eightDReports.severity,
        currentStep: eightDReports.currentStep,
      })
      .from(eightDReports)
      .where(gt(eightDReports.createdAt, lookbackCutoff.toISOString()))
      .limit(remaining);

    for (const report of recent8D) {
      items.push({
        agendaItem: `[8D报告] ${report.title} (严重性: ${report.severity ?? "N/A"}, 阶段: ${report.currentStep})`,
        sourceType: "8d_report",
        sourceId: report.id,
      });
    }
  }

  // 4. Bulk-insert agenda items
  if (items.length > 0) {
    await db.insert(meetingAgendasActions).values(
      items.map((item, idx) => ({
        meetingId,
        meetingDate,
        agendaItem: item.agendaItem,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        status: "open" as const,
        sortOrder: idx,
      })),
    );
  }

  return { meetingId, meetingDate, itemsGenerated: items.length };
}

// ══════════════════════════════════════════════════════
// 5. submitTripReport
// ══════════════════════════════════════════════════════

/**
 * Submit a business trip report.
 *
 * - Validates FK references (employee, project) before insert
 * - Sets status to 'submitted' and stamps `submittedAt`
 */
export async function submitTripReport(
  data: InsertBusinessTripReport,
): Promise<BusinessTripReport> {
  const db = await requireDb();

  // FK validation (parallel)
  const checks: Promise<void>[] = [];
  if (data.employeeId) checks.push(assertUserExists(db, data.employeeId));
  if (data.projectId) checks.push(assertProjectExists(db, data.projectId));
  if (checks.length > 0) await Promise.all(checks);

  const [report] = await db.insert(businessTripReports).values({
    ...data,
    status: "submitted",
    submittedAt: nowISO(),
  }).returning();

  return report;
}

// ══════════════════════════════════════════════════════
// 6. getLeaveBalances
// ══════════════════════════════════════════════════════

/**
 * Get all leave balances for an employee in a given year.
 * Returns array of leave type → balance records.
 */
export async function getLeaveBalances(
  employeeId: number,
  year: number,
): Promise<OaLeaveBalance[]> {
  const db = await requireDb();
  return db.select().from(oaLeaveBalances)
    .where(and(
      eq(oaLeaveBalances.employeeId, employeeId),
      eq(oaLeaveBalances.year, year),
    ));
}

/**
 * Initialize leave balances for an employee (called once per year by HR).
 */
export async function initLeaveBalances(
  employeeId: number,
  year: number,
  allocations: { leaveType: string; totalDays: number; carriedOverDays?: number }[],
): Promise<OaLeaveBalance[]> {
  const db = await requireDb();
  await assertUserExists(db, employeeId);

  const rows = allocations.map((a) => ({
    employeeId,
    year,
    leaveType: a.leaveType,
    totalDays: a.totalDays,
    usedDays: 0,
    pendingDays: 0,
    carriedOverDays: a.carriedOverDays ?? 0,
  }));

  return db.insert(oaLeaveBalances).values(rows).returning();
}

// ══════════════════════════════════════════════════════
// 7. publishAnnouncement
// ══════════════════════════════════════════════════════

/**
 * Create and optionally publish an announcement.
 * If `publish` is true, sets status to 'published' and fires DingTalk.
 */
export async function createAnnouncement(
  data: InsertOaAnnouncement,
  publish: boolean = false,
): Promise<OaAnnouncement> {
  const db = await requireDb();

  if (data.authorId) await assertUserExists(db, data.authorId);

  const now = nowISO();
  const [announcement] = await db.insert(oaAnnouncements).values({
    ...data,
    status: publish ? "published" : "draft",
    publishedAt: publish ? now : null,
  }).returning();

  // Send DingTalk if published + notifyDingtalk flag
  if (publish && announcement.notifyDingtalk) {
    const sent = await notifyDingTalk(
      "公司公告",
      [
        `**${announcement.title}**`,
        "",
        announcement.content?.substring(0, 200) ?? "",
        announcement.content && announcement.content.length > 200 ? "..." : "",
        "",
        `发布时间: ${nowLocale()}`,
      ],
    );
    if (sent) {
      await db.update(oaAnnouncements)
        .set({ dingtalkNotified: true })
        .where(eq(oaAnnouncements.id, announcement.id));
    }
  }

  return announcement;
}
