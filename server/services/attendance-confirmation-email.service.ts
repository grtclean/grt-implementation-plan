/**
 * Attendance Confirmation Email Service
 *
 * Generates an HTML report of all employees' monthly attendance data
 * and sends it to the authorized payroll reviewer for confirmation
 * before payroll calculation is finalized.
 *
 * Recipients:
 *   TO: 倪微薇 (niwewei@gerrytech.com) — authorized reviewer
 *   CC: 倪亚东 (gerry@grtclean.ai) — CEO
 */

import { requireDb } from "../db";
import { eq, sql } from "drizzle-orm";
import { attendanceRecords } from "../../drizzle/smart-payroll-schema";
import { attendanceExcursions } from "../../drizzle/attendance-clock-schema";
import { sendEmail, type EmailSendResult } from "./email.service";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("attendance-confirm-email");

// ── Authorized Recipients ────────────────────────────────
const REVIEWER_EMAIL = "niwewei@gerrytech.com";   // 倪微薇
const CEO_EMAIL = "gerry@grtclean.ai";             // 倪亚东

interface AttendanceRow {
  employeeId: number;
  employeeName: string;
  department: string;
  scheduledDays: number;
  actualDays: number;
  personalLeaveHours: number;
  sickLeaveHours: number;
  lateCount: number;
  absentDays: number;
  overtimeHours: number;
  unauthorizedExcursions: number;
  anomalies: string[];
}

// ── Build Report ─────────────────────────────────────────

export async function buildAttendanceReport(period: string): Promise<AttendanceRow[]> {
  const db = await requireDb();

  // Get attendance records with employee info
  const rows = await db.execute(sql`
    SELECT
      ar.employee_id,
      COALESCE(e.name, CONCAT('员工#', ar.employee_id)) AS employee_name,
      COALESCE(e.department, '') AS department,
      ar.scheduled_days,
      ar.actual_days,
      ar.personal_leave_hours,
      ar.sick_leave_hours,
      ar.late_count,
      ar.absent_days,
      ar.weekday_overtime_hours,
      ar.weekend_overtime_hours,
      ar.holiday_overtime_hours,
      ar.unauthorized_excursions
    FROM attendance_records ar
    LEFT JOIN hrm_employees e ON e.id = ar.employee_id
    WHERE ar.period = ${period}
    ORDER BY COALESCE(e.department, ''), COALESCE(e.name, '')
    LIMIT 500
  `);

  const result: AttendanceRow[] = [];

  for (const r of rows.rows as any[]) {
    const scheduled = Number(r.scheduled_days || 22);
    const actual = Number(r.actual_days || 0);
    const plHours = Number(r.personal_leave_hours || 0);
    const slHours = Number(r.sick_leave_hours || 0);
    const late = Number(r.late_count || 0);
    const absent = Number(r.absent_days || 0);
    const ot = Number(r.weekday_overtime_hours || 0)
      + Number(r.weekend_overtime_hours || 0)
      + Number(r.holiday_overtime_hours || 0);
    const excursions = Number(r.unauthorized_excursions || 0);

    // Detect anomalies
    const anomalies: string[] = [];
    if (absent > 0) anomalies.push(`旷工${absent}天`);
    if (late > 3) anomalies.push(`迟到${late}次`);
    if (excursions > 0) anomalies.push(`非休息离岗${excursions}次`);
    if (actual < scheduled * 0.8) anomalies.push("出勤率<80%");
    if (plHours > 40) anomalies.push(`事假${plHours}h`);

    result.push({
      employeeId: Number(r.employee_id),
      employeeName: String(r.employee_name),
      department: String(r.department),
      scheduledDays: scheduled,
      actualDays: actual,
      personalLeaveHours: plHours,
      sickLeaveHours: slHours,
      lateCount: late,
      absentDays: absent,
      overtimeHours: Math.round(ot * 10) / 10,
      unauthorizedExcursions: excursions,
      anomalies,
    });
  }

  return result;
}

// ── Generate HTML ────────────────────────────────────────

function generateConfirmationHtml(period: string, rows: AttendanceRow[]): string {
  const totalHeadcount = rows.length;
  const totalAnomalies = rows.filter(r => r.anomalies.length > 0).length;
  const totalExcursions = rows.reduce((s, r) => s + r.unauthorizedExcursions, 0);
  const totalLeaveHours = rows.reduce((s, r) => s + r.personalLeaveHours + r.sickLeaveHours, 0);
  const totalLate = rows.reduce((s, r) => s + r.lateCount, 0);

  const tableRows = rows.map(r => {
    const hasAnomaly = r.anomalies.length > 0;
    const bgColor = hasAnomaly ? "#fff5f5" : "#ffffff";
    return `
      <tr style="background: ${bgColor};">
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 12px;">${r.employeeName}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 12px;">${r.department}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 12px; text-align: center;">${r.scheduledDays}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 12px; text-align: center;">${r.actualDays}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 12px; text-align: center;">${r.personalLeaveHours > 0 ? r.personalLeaveHours + "h" : "--"}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 12px; text-align: center;">${r.sickLeaveHours > 0 ? r.sickLeaveHours + "h" : "--"}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 12px; text-align: center;">${r.lateCount > 0 ? r.lateCount : "--"}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 12px; text-align: center;">
          ${r.unauthorizedExcursions > 0
            ? `<span style="color: #dc2626; font-weight: bold;">${r.unauthorizedExcursions}</span>`
            : "--"}
        </td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 12px; text-align: center;">${r.overtimeHours > 0 ? r.overtimeHours + "h" : "--"}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 11px;">
          ${r.anomalies.length > 0
            ? r.anomalies.map(a => `<span style="display:inline-block;padding:1px 5px;margin:1px;background:#fef2f2;color:#dc2626;border-radius:3px;font-size:10px;">${a}</span>`).join("")
            : '<span style="color:#22c55e;">正常</span>'}
        </td>
      </tr>`;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI',Arial,sans-serif; background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
    <tr><td align="center">
      <table width="900" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e293b,#334155); padding:24px 30px; border-radius:8px 8px 0 0;">
            <h1 style="color:#f8fafc; margin:0; font-size:20px;">GRT考勤确认报告</h1>
            <p style="color:#94a3b8; margin:6px 0 0; font-size:13px;">${period} 月度考勤汇总 — 请在工资核算前确认</p>
          </td>
        </tr>

        <!-- Summary Cards -->
        <tr>
          <td style="padding:20px 30px 10px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="20%" style="padding:8px;">
                  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px;text-align:center;">
                    <div style="font-size:22px;font-weight:bold;color:#16a34a;">${totalHeadcount}</div>
                    <div style="font-size:11px;color:#4ade80;">在册人数</div>
                  </div>
                </td>
                <td width="20%" style="padding:8px;">
                  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:12px;text-align:center;">
                    <div style="font-size:22px;font-weight:bold;color:#ca8a04;">${totalLate}</div>
                    <div style="font-size:11px;color:#facc15;">迟到总次数</div>
                  </div>
                </td>
                <td width="20%" style="padding:8px;">
                  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px;text-align:center;">
                    <div style="font-size:22px;font-weight:bold;color:#2563eb;">${totalLeaveHours}h</div>
                    <div style="font-size:11px;color:#60a5fa;">请假总时数</div>
                  </div>
                </td>
                <td width="20%" style="padding:8px;">
                  <div style="background:${totalExcursions > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${totalExcursions > 0 ? '#fecaca' : '#bbf7d0'};border-radius:6px;padding:12px;text-align:center;">
                    <div style="font-size:22px;font-weight:bold;color:${totalExcursions > 0 ? '#dc2626' : '#16a34a'};">${totalExcursions}</div>
                    <div style="font-size:11px;color:${totalExcursions > 0 ? '#f87171' : '#4ade80'};">非休息离岗</div>
                  </div>
                </td>
                <td width="20%" style="padding:8px;">
                  <div style="background:${totalAnomalies > 0 ? '#fff7ed' : '#f0fdf4'};border:1px solid ${totalAnomalies > 0 ? '#fed7aa' : '#bbf7d0'};border-radius:6px;padding:12px;text-align:center;">
                    <div style="font-size:22px;font-weight:bold;color:${totalAnomalies > 0 ? '#ea580c' : '#16a34a'};">${totalAnomalies}</div>
                    <div style="font-size:11px;color:${totalAnomalies > 0 ? '#fb923c' : '#4ade80'};">异常员工数</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Detail Table -->
        <tr>
          <td style="padding:10px 30px 30px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <thead>
                <tr style="background:#f1f5f9;">
                  <th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#475569;text-align:left;">姓名</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#475569;text-align:left;">部门</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#475569;text-align:center;">应出勤</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#475569;text-align:center;">实出勤</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#475569;text-align:center;">事假</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#475569;text-align:center;">病假</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#475569;text-align:center;">迟到</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#475569;text-align:center;">非休息离岗</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#475569;text-align:center;">加班</th>
                  <th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#475569;text-align:left;">异常标记</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc; padding:16px 30px; border-radius:0 0 8px 8px; border-top:1px solid #e2e8f0;">
            <p style="color:#64748b; font-size:11px; margin:0;">
              此报告由GRT智能考勤系统自动生成 | ${new Date().toLocaleString("zh-CN")} |
              请回复确认或提出修改意见后，HR方可进行工资核算。
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Send Confirmation Email ──────────────────────────────

export async function sendAttendanceConfirmationEmail(
  period: string,
  reviewerEmail = REVIEWER_EMAIL,
  ccEmail = CEO_EMAIL,
): Promise<EmailSendResult & { rowCount: number; anomalyCount: number }> {
  log.info({ period, to: reviewerEmail, cc: ccEmail }, "Building attendance confirmation report");

  const rows = await buildAttendanceReport(period);
  const anomalyCount = rows.filter(r => r.anomalies.length > 0).length;
  const html = generateConfirmationHtml(period, rows);

  const result = await sendEmail({
    to: reviewerEmail,
    cc: ccEmail,
    subject: `[GRT考勤确认] ${period} 月度考勤汇总 — 请确认 (${rows.length}人${anomalyCount > 0 ? `, ${anomalyCount}项异常` : ""})`,
    html,
  });

  log.info({
    period, rowCount: rows.length, anomalyCount,
    success: result.success, provider: result.provider,
  }, "Attendance confirmation email sent");

  return { ...result, rowCount: rows.length, anomalyCount };
}
