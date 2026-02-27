/**
 * WorkflowEngine — Automation Trigger Service
 *
 * Connects Strategy OKRs → Automation Triggers → Executive Meetings
 * into a closed-loop management rhythm.
 *
 * Rules implemented:
 *   Rule 1 — MONTHLY_PM_REVIEW:  M2 contract sign → auto-create monthly PM review meeting
 *   Rule 2 — EXCEPTION_ESCALATION: T-node delay → auto-create emergency escalation meeting
 *   Rule 3 — OKR_AT_RISK: OKR objective progress < threshold → auto-create recovery meeting
 *   Rule 4 — QUALITY_ESCALATION: 8D/CAPA severity HIGH/CRITICAL → auto-create quality review meeting
 *   Rule 5 — SUPPLIER_PENALTY: Supplier penalty count ≥ threshold → auto-create supplier review meeting
 *
 * ═══════════════════════════════════════════════════════════════════
 * FUTURE ARCHITECTURE: Configurable Database-Driven Rules Engine
 * ═══════════════════════════════════════════════════════════════════
 *
 * DATABASE-DRIVEN RULES:
 *   `workflow_rules` table concept:
 *     id | name | trigger | conditionJson | actionType | actionParams | enabled | priority | createdAt
 *
 * RULE TYPES (actionType enum):
 *   - MEETING_SCHEDULE   — Create a meeting in sys_meetings
 *   - TASK_ASSIGN        — Create a task in project_tasks or meeting_action_items
 *   - NOTIFICATION_PUSH  — Push to DingTalk / WeChat / Email
 *   - OKR_UPDATE         — Auto-update OKR key result values
 *   - APPROVAL_TRIGGER   — Initiate an OA approval workflow
 *
 * TRIGGER CATALOG:
 *   - onPhaseChange(phase)          — Project phase transitions (M0→M12)
 *   - onTNodeDelay(tNode, severity) — T-pipeline node delays (T1-T15)
 *   - onOKRAtRisk(objectiveId)      — OKR progress drops below threshold
 *   - onQualityEscalation(8dId)     — 8D/CAPA severity escalation
 *   - onSupplierPenalty(supplierId) — Supplier penalty threshold reached
 *
 * IDEMPOTENCY:
 *   Future: Check for duplicate meetings with same trigger context
 *   within 30 days before creating. Use a `trigger_hash` column
 *   (SHA256 of trigger+context) + date range query.
 *
 * CRON:
 *   Future: Integrate `node-cron` for time-based triggers:
 *   - Weekly OKR progress check → auto-flag at-risk objectives
 *   - Monthly meeting preparation → auto-schedule review meetings
 *   - Quarterly OKR rollover → cascade new period objectives
 *
 * EXECUTION TRACING:
 *   `workflow_execution_logs` table:
 *     id | ruleId | triggerPayload | result | durationMs | error | createdAt
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { requireDb } from "../db";
import { sysMeetings } from "../../drizzle/smart-meetings-schema";

/**
 * Private helper: insert a meeting into sys_meetings and return the inserted row ID.
 */
async function createMeeting(
  db: any,
  payload: {
    title: string;
    type: string;
    status: string;
    description: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    organizerName: string;
    expectedAttendees: number;
  }
): Promise<number> {
  const rows = await db
    .insert(sysMeetings)
    .values({
      title: payload.title,
      type: payload.type,
      status: payload.status,
      description: payload.description,
      scheduledStart: payload.scheduledStart,
      scheduledEnd: payload.scheduledEnd,
      organizerName: payload.organizerName,
      expectedAttendees: payload.expectedAttendees,
    })
    .returning({ id: sysMeetings.id });

  const row = rows[0];
  if (!row) throw new Error("Failed to insert automation-triggered meeting");
  return row.id;
}

/**
 * Round a date to the next weekday at 09:00.
 */
function nextWeekday0900(from: Date): Date {
  const d = new Date(from);
  d.setHours(9, 0, 0, 0);
  // If the target day is Saturday (6) or Sunday (0), advance to Monday
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1); // Sun → Mon
  else if (day === 6) d.setDate(d.getDate() + 2); // Sat → Mon
  return d;
}

export class WorkflowEngine {
  /**
   * Rule 1 — Monthly Review: triggered when a project phase changes to M2_SIGNED.
   * Creates a monthly PM review meeting scheduled 30 days out.
   */
  static async onPhaseChange(
    phase: string,
    context: { projectId?: number; projectTitle?: string; pmName?: string }
  ): Promise<{ triggered: boolean; meetingId?: number; rule?: string }> {
    // Only trigger on M2_SIGNED or ANNUAL_REVIEW
    if (phase !== "M2_SIGNED" && phase !== "ANNUAL_REVIEW") {
      return { triggered: false };
    }

    const db = await requireDb();

    const now = new Date();
    const scheduledStart = nextWeekday0900(
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    );
    const scheduledEnd = new Date(scheduledStart.getTime() + 90 * 60 * 1000); // +90 min

    const title =
      phase === "ANNUAL_REVIEW"
        ? `【自动触发】年度总结暨绩效评审 — ${context.projectTitle ?? "年度总结"}`
        : `【自动触发】月度项目PM例会 — ${context.projectTitle ?? "未命名项目"}`;

    const description =
      phase === "ANNUAL_REVIEW"
        ? [
            "📋 年度总结暨绩效评审议程：",
            "1. OKR年度达成回顾",
            "2. 各BU业绩汇报",
            "3. 人员绩效评估与激励",
            "4. 下一年度战略目标设定",
          ].join("\n")
        : [
            "📋 月度项目PM例会议程：",
            "1. 合同执行进度汇报",
            "2. T流程进展与里程碑确认",
            "3. 风险预警与资源协调",
            "4. 下月目标与任务分配",
          ].join("\n");

    const meetingId = await createMeeting(db, {
      title,
      type: "MAJOR",
      status: "UPCOMING",
      description,
      scheduledStart,
      scheduledEnd,
      organizerName: context.pmName ?? "系统自动触发",
      expectedAttendees: 8,
    });

    return { triggered: true, meetingId, rule: "MONTHLY_PM_REVIEW" };
  }

  /**
   * Rule 2 — Exception Alert: triggered when a T-node reports a delay.
   * Creates an emergency escalation meeting scheduled 48 hours out.
   */
  static async onTNodeDelay(
    tNode: string,
    context: {
      projectId?: number;
      projectTitle?: string;
      severity?: "WARNING" | "CRITICAL";
    }
  ): Promise<{
    triggered: boolean;
    meetingId?: number;
    rule?: string;
    notificationSent?: boolean;
  }> {
    const db = await requireDb();

    const now = new Date();
    const scheduledStart = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48h
    // Round to next hour
    scheduledStart.setMinutes(0, 0, 0);
    const scheduledEnd = new Date(
      scheduledStart.getTime() + 120 * 60 * 1000
    ); // +120 min

    // T12 (FAT) failures auto-escalate to CRITICAL — FAT failure is a P0 event
    const isT12FAT = /^T12/i.test(tNode);
    const severity = isT12FAT ? "CRITICAL" : (context.severity ?? "WARNING");
    const title = isT12FAT
      ? `【自动触发】FAT试验失败紧急处置会议 — [${tNode}]`
      : `【自动触发】紧急高层介入会议 — T节点异常 [${tNode}]`;

    const description = isT12FAT
      ? [
          "🚨 FAT试验失败 — P0级紧急处置议程：",
          "1. FAT试验失败根因分析",
          "2. 清洗工艺参数紧急调整",
          "3. 客户FAT重新排期",
          "4. 资源紧急协调与重新分配",
          "5. 根因分析与防再发措施",
          "",
          `项目: ${context.projectTitle ?? "未指定"}`,
          `严重程度: ${severity} (FAT失败自动升级)`,
        ].join("\n")
      : [
          `⚠️ ${severity === "CRITICAL" ? "严重" : ""}异常升级议程：`,
          `1. ${tNode} 节点失败/延迟处置方案`,
          "2. 资源紧急协调与重新分配",
          "3. 客户沟通预案与时间线调整",
          "4. 根因分析与防再发措施",
          "",
          `项目: ${context.projectTitle ?? "未指定"}`,
          `严重程度: ${severity}`,
        ].join("\n");

    const meetingId = await createMeeting(db, {
      title,
      type: "MAJOR",
      status: "UPCOMING",
      description,
      scheduledStart,
      scheduledEnd,
      organizerName: "事业部总经理",
      expectedAttendees: 5,
    });

    // Mock notification to division manager
    console.log(
      `[AUTOMATION] Notification sent to Division Manager: T-node ${tNode} delay detected for project "${context.projectTitle ?? "N/A"}". Emergency meeting #${meetingId} created.`
    );

    return {
      triggered: true,
      meetingId,
      rule: "EXCEPTION_ESCALATION",
      notificationSent: true,
    };
  }

  /**
   * Rule 3 — OKR At-Risk: triggered when an objective's progress drops below threshold.
   * Creates a recovery planning meeting scheduled 72 hours out.
   */
  static async onOKRAtRisk(context: {
    objectiveId?: number;
    objectiveTitle?: string;
    progress?: number;
    threshold?: number;
    ownerName?: string;
  }): Promise<{ triggered: boolean; meetingId?: number; rule?: string }> {
    const progress = context.progress ?? 0;
    const threshold = context.threshold ?? 40;

    // Only trigger if progress is below threshold
    if (progress >= threshold) {
      return { triggered: false };
    }

    const db = await requireDb();

    const now = new Date();
    const scheduledStart = nextWeekday0900(
      new Date(now.getTime() + 72 * 60 * 60 * 1000) // +72h
    );
    const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000); // +60 min

    const title = `【自动触发】OKR滞后预警会议 — ${context.objectiveTitle ?? "目标滞后"}`;

    const description = [
      `⚠️ OKR目标滞后预警 — 当前进度 ${progress}% (阈值 ${threshold}%)`,
      "",
      "📋 恢复计划会议议程：",
      "1. 目标达成障碍分析",
      "2. 资源缺口评估与补充方案",
      "3. KR里程碑重新校准",
      "4. 下一周期行动计划制定",
      "",
      `目标: ${context.objectiveTitle ?? "未指定"}`,
      `当前进度: ${progress}%`,
      `责任人: ${context.ownerName ?? "未指定"}`,
    ].join("\n");

    const meetingId = await createMeeting(db, {
      title,
      type: "REGULAR",
      status: "UPCOMING",
      description,
      scheduledStart,
      scheduledEnd,
      organizerName: context.ownerName ?? "OKR管理员",
      expectedAttendees: 4,
    });

    console.log(
      `[AUTOMATION] OKR at-risk alert: "${context.objectiveTitle}" at ${progress}% (threshold ${threshold}%). Recovery meeting #${meetingId} created.`
    );

    return { triggered: true, meetingId, rule: "OKR_AT_RISK" };
  }

  /**
   * Rule 4 — Quality Escalation: triggered when an 8D/CAPA severity is HIGH or CRITICAL.
   * Creates a quality review meeting scheduled 24 hours out.
   */
  static async onQualityEscalation(context: {
    reportId?: number;
    reportTitle?: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    productName?: string;
    customerName?: string;
  }): Promise<{ triggered: boolean; meetingId?: number; rule?: string }> {
    const severity = context.severity ?? "MEDIUM";

    // Only trigger on HIGH or CRITICAL
    if (severity !== "HIGH" && severity !== "CRITICAL") {
      return { triggered: false };
    }

    const db = await requireDb();

    const isCritical = severity === "CRITICAL";
    const now = new Date();
    // CRITICAL: 24h, HIGH: 48h
    const scheduledStart = new Date(
      now.getTime() + (isCritical ? 24 : 48) * 60 * 60 * 1000
    );
    scheduledStart.setMinutes(0, 0, 0);
    const scheduledEnd = new Date(
      scheduledStart.getTime() + (isCritical ? 120 : 90) * 60 * 1000
    );

    const title = isCritical
      ? `【自动触发】质量重大问题紧急评审 — ${context.productName ?? "产品质量问题"}`
      : `【自动触发】质量问题评审会议 — ${context.reportTitle ?? "8D报告"}`;

    const description = [
      `${isCritical ? "🚨" : "⚠️"} ${isCritical ? "重大" : ""}质量问题升级 — 8D/CAPA评审议程：`,
      `1. 问题描述与影响范围确认`,
      `2. 根本原因分析 (5-Why / 鱼骨图)`,
      `3. ${isCritical ? "紧急遏制措施" : "临时遏制措施"}`,
      `4. 永久纠正措施制定`,
      `5. 效果验证计划与时间表`,
      "",
      `8D报告: ${context.reportTitle ?? "未指定"}`,
      `涉及产品: ${context.productName ?? "未指定"}`,
      `客户: ${context.customerName ?? "内部发现"}`,
      `严重程度: ${severity}`,
    ].join("\n");

    const meetingId = await createMeeting(db, {
      title,
      type: "MAJOR",
      status: "UPCOMING",
      description,
      scheduledStart,
      scheduledEnd,
      organizerName: "品质部经理",
      expectedAttendees: isCritical ? 8 : 5,
    });

    console.log(
      `[AUTOMATION] Quality escalation: "${context.reportTitle}" severity=${severity}. Quality review meeting #${meetingId} created.`
    );

    return { triggered: true, meetingId, rule: "QUALITY_ESCALATION" };
  }

  /**
   * Rule 5 — Supplier Penalty: triggered when supplier penalty count reaches threshold.
   * Creates a supplier review meeting scheduled 5 business days out.
   */
  static async onSupplierPenalty(context: {
    supplierId?: number;
    supplierName?: string;
    penaltyCount?: number;
    threshold?: number;
    latestReason?: string;
  }): Promise<{ triggered: boolean; meetingId?: number; rule?: string }> {
    const penaltyCount = context.penaltyCount ?? 0;
    const threshold = context.threshold ?? 3;

    // Only trigger if penalty count >= threshold
    if (penaltyCount < threshold) {
      return { triggered: false };
    }

    const db = await requireDb();

    const now = new Date();
    const scheduledStart = nextWeekday0900(
      new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) // +5 days
    );
    const scheduledEnd = new Date(scheduledStart.getTime() + 90 * 60 * 1000); // +90 min

    const isBlacklist = penaltyCount >= 10;
    const title = isBlacklist
      ? `【自动触发】供应商黑名单评审 — ${context.supplierName ?? "供应商"}`
      : `【自动触发】供应商绩效预警会议 — ${context.supplierName ?? "供应商"}`;

    const description = [
      `${isBlacklist ? "🚫" : "⚠️"} 供应商违约次数达到${penaltyCount}次 (阈值 ${threshold}次)`,
      "",
      `📋 ${isBlacklist ? "黑名单评审" : "绩效预警"}议程：`,
      `1. 供应商历史违约记录回顾`,
      `2. ${context.latestReason ? `最新违约: ${context.latestReason}` : "最新违约原因确认"}`,
      `3. ${isBlacklist ? "黑名单纳入决策" : "整改要求与期限制定"}`,
      `4. 替代供应商评估`,
      `5. 采购合同条款修订建议`,
      "",
      `供应商: ${context.supplierName ?? "未指定"}`,
      `累计违约: ${penaltyCount}次`,
      `处置建议: ${isBlacklist ? "黑名单" : penaltyCount >= 5 ? "严重警告" : "预警"}`,
    ].join("\n");

    const meetingId = await createMeeting(db, {
      title,
      type: isBlacklist ? "MAJOR" : "REGULAR",
      status: "UPCOMING",
      description,
      scheduledStart,
      scheduledEnd,
      organizerName: "采购部经理",
      expectedAttendees: isBlacklist ? 6 : 4,
    });

    console.log(
      `[AUTOMATION] Supplier penalty: "${context.supplierName}" penalties=${penaltyCount} (threshold ${threshold}). ${isBlacklist ? "Blacklist" : "Warning"} meeting #${meetingId} created.`
    );

    return { triggered: true, meetingId, rule: "SUPPLIER_PENALTY" };
  }
}
