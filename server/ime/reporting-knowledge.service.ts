/**
 * G-IME: Reporting, Knowledge Graph & AI Assistant
 * 报告生成、知识图谱、AI助手、工作流服务
 */

import { requireDb } from "../db";
import { sql, type SQL } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ime:reporting");

// ============================================================================
// Phase 6: Report Exports — Excel Dashboard
// ============================================================================

export async function generateExecutiveDashboardExcel(filters?: {
  channelId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const db = await requireDb();
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GRT智能会议分析系统";
  workbook.created = new Date();

  // Build WHERE clause fragments
  const whereParts: string[] = [];
  if (filters?.channelId) whereParts.push(`mr.channel_id = ${filters.channelId}`);
  if (filters?.dateFrom) whereParts.push(`mr.meeting_date >= ${filters.dateFrom}`);
  if (filters?.dateTo) whereParts.push(`mr.meeting_date <= ${filters.dateTo}`);
  const whereClause = whereParts.length > 0 ? sql`WHERE ${whereParts.join(" AND ")}` : sql``;
  const andClause = whereParts.length > 0 ? sql`AND ${whereParts.join(" AND ")}` : sql``;

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF4472C4" } },
  };

  // --- Sheet 1: 概览 ---
  const overviewSheet = workbook.addWorksheet("概览");
  overviewSheet.columns = [
    { header: "指标", key: "metric", width: 30 },
    { header: "值", key: "value", width: 25 },
  ];

  const meetingCountRes = await db.execute(sql`SELECT COUNT(*) as cnt, AVG(mes.overall_score) as avg_eff
     FROM meeting_records mr
     LEFT JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id
     ${whereClause}`);
  const overview = (meetingCountRes.rows as any[])[0] || {};

  const topContribRes = await db.execute(sql`SELECT mc.employee_name, AVG(mc.contribution_score) as avg_score, COUNT(*) as meetings
     FROM meeting_contributions mc
     JOIN meeting_records mr ON mc.meeting_id = mr.id
     ${whereClause}
     GROUP BY mc.employee_name ORDER BY avg_score DESC LIMIT 10`);

  overviewSheet.addRows([
    { metric: "会议总数", value: Number(overview.cnt) || 0 },
    { metric: "平均效能评分", value: Math.round(Number(overview.avg_eff) || 0) },
    { metric: "报告生成时间", value: new Date().toLocaleString("zh-CN") },
  ]);
  overviewSheet.addRow({});
  overviewSheet.addRow({ metric: "Top 贡献者", value: "平均分 / 参会次数" });
  for (const r of topContribRes.rows as any[]) {
    overviewSheet.addRow({ metric: r.employee_name, value: `${Math.round(Number(r.avg_score))} / ${r.meetings}次` });
  }
  overviewSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 2: ROI汇总 ---
  const roiSheet = workbook.addWorksheet("ROI汇总");
  roiSheet.columns = [
    { header: "会议", key: "meeting", width: 30 },
    { header: "评级", key: "grade", width: 10 },
    { header: "成本", key: "cost", width: 15 },
    { header: "ROI分数", key: "score", width: 12 },
    { header: "结果数", key: "outcomes", width: 10 },
    { header: "计算日期", key: "date", width: 18 },
  ];
  const roiRes = await db.execute(sql`SELECT mr.title, roi.roi_grade, roi.total_cost, roi.roi_score, roi.tangible_outcome_count, roi.computed_at
     FROM ime_meeting_roi roi
     JOIN meeting_records mr ON roi.meeting_id = mr.id
     ${whereClause}
     LIMIT 1000
     ORDER BY roi.computed_at DESC`);
  for (const r of roiRes.rows as any[]) {
    const row = roiSheet.addRow({
      meeting: r.title, grade: r.roi_grade, cost: Number(r.total_cost || 0).toFixed(2),
      score: Math.round(Number(r.roi_score) || 0), outcomes: Number(r.tangible_outcome_count) || 0,
      date: r.computed_at ? new Date(r.computed_at).toLocaleDateString("zh-CN") : "",
    });
    const gradeCell = row.getCell("grade");
    const grade = String(r.roi_grade || "");
    if (grade === "A" || grade === "A+") gradeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
    else if (grade === "B") gradeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
    else if (grade === "D" || grade === "F") gradeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
  }
  roiSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 3: 情感趋势 ---
  const sentimentSheet = workbook.addWorksheet("情感趋势");
  sentimentSheet.columns = [
    { header: "会议", key: "meeting", width: 30 },
    { header: "整体情感", key: "sentiment", width: 12 },
    { header: "紧张度", key: "tension", width: 10 },
    { header: "协作度", key: "collaboration", width: 10 },
    { header: "分析日期", key: "date", width: 18 },
  ];
  const sentRes = await db.execute(sql`SELECT mr.title, s.overall_sentiment, s.tension_level, s.collaboration_score, s.analyzed_at
     FROM ime_meeting_sentiment s
     JOIN meeting_records mr ON s.meeting_id = mr.id
     ${whereClause}
     LIMIT 1000
     ORDER BY s.analyzed_at DESC`);
  for (const r of sentRes.rows as any[]) {
    sentimentSheet.addRow({
      meeting: r.title, sentiment: r.overall_sentiment,
      tension: Number(r.tension_level || 0).toFixed(2), collaboration: Number(r.collaboration_score || 0).toFixed(2),
      date: r.analyzed_at ? new Date(r.analyzed_at).toLocaleDateString("zh-CN") : "",
    });
  }
  sentimentSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 4: 部门对比 ---
  const deptSheet = workbook.addWorksheet("部门对比");
  deptSheet.columns = [
    { header: "部门", key: "dept", width: 20 },
    { header: "会议数", key: "count", width: 10 },
    { header: "平均效能", key: "avgEff", width: 12 },
    { header: "平均成本", key: "avgCost", width: 12 },
    { header: "行动项完成率", key: "aiRate", width: 14 },
    { header: "期间", key: "period", width: 15 },
  ];
  const deptRes = await db.execute(sql`SELECT department, meeting_count, avg_effectiveness_score, avg_cost_per_meeting, action_item_completion_rate, period
    LIMIT 1000
     FROM ime_department_rollups ORDER BY avg_effectiveness_score DESC`);
  for (const r of deptRes.rows as any[]) {
    deptSheet.addRow({
      dept: r.department, count: Number(r.meeting_count) || 0,
      avgEff: Math.round(Number(r.avg_effectiveness_score) || 0),
      avgCost: Number(r.avg_cost_per_meeting || 0).toFixed(2),
      aiRate: `${Math.round(Number(r.action_item_completion_rate || 0) * 100)}%`,
      period: r.period,
    });
  }
  deptSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 5: 行动项 ---
  const actionSheet = workbook.addWorksheet("行动项");
  actionSheet.columns = [
    { header: "内容", key: "content", width: 40 },
    { header: "负责人", key: "owner", width: 15 },
    { header: "状态", key: "status", width: 12 },
    { header: "优先级", key: "priority", width: 10 },
    { header: "截止日期", key: "dueDate", width: 15 },
    { header: "来源会议", key: "meeting", width: 25 },
  ];
  const actionRes = await db.execute(sql`SELECT ai.content, ai.assigned_to, ai.status, ai.priority, ai.due_date, mr.title
     FROM ime_action_items ai
     JOIN meeting_records mr ON ai.meeting_id = mr.id
     ${whereClause}
     LIMIT 1000
     ORDER BY ai.created_at DESC`);
  for (const r of actionRes.rows as any[]) {
    const row = actionSheet.addRow({
      content: r.content, owner: r.assigned_to, status: r.status,
      priority: r.priority, dueDate: r.due_date ? new Date(r.due_date).toLocaleDateString("zh-CN") : "",
      meeting: r.title,
    });
    const statusCell = row.getCell("status");
    if (r.status === "completed") statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
    else if (r.status === "overdue") statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
    else if (r.status === "in_progress") statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
  }
  actionSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 6: 预测与风险 ---
  const predSheet = workbook.addWorksheet("预测与风险");
  predSheet.columns = [
    { header: "会议", key: "meeting", width: 30 },
    { header: "预测类型", key: "type", width: 15 },
    { header: "预测分数", key: "score", width: 12 },
    { header: "置信度", key: "confidence", width: 10 },
    { header: "风险等级", key: "risk", width: 10 },
    { header: "疲劳指数", key: "fatigue", width: 10 },
  ];
  const predRes = await db.execute(sql`SELECT mr.title, p.prediction_type, p.predicted_score, p.confidence_level, p.risk_level, p.fatigue_index
     FROM ime_meeting_predictions p
     JOIN meeting_records mr ON p.meeting_id = mr.id
     LIMIT 1000
     ORDER BY p.predicted_at DESC`);
  for (const r of predRes.rows as any[]) {
    const row = predSheet.addRow({
      meeting: r.title, type: r.prediction_type,
      score: Math.round(Number(r.predicted_score) || 0),
      confidence: Number(Number(r.confidence_level || 0).toFixed(2)),
      risk: r.risk_level, fatigue: Number(Number(r.fatigue_index || 0).toFixed(2)),
    });
    const riskCell = row.getCell("risk");
    if (r.risk_level === "high") riskCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
    else if (r.risk_level === "medium") riskCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
    else if (r.risk_level === "low") riskCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
  }
  predSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // --- Sheet 7: 参会优化 ---
  const optSheet = workbook.addWorksheet("参会优化");
  optSheet.columns = [
    { header: "会议", key: "meeting", width: 30 },
    { header: "当前人数", key: "current", width: 12 },
    { header: "最佳人数", key: "optimal", width: 12 },
    { header: "过多邀请", key: "overInvited", width: 12 },
    { header: "预估节省", key: "saving", width: 15 },
  ];
  const optRes = await db.execute(sql`SELECT mr.title, o.current_count, o.optimal_count, o.over_invited_count, o.estimated_cost_saving
     FROM ime_attendee_optimization o
     JOIN meeting_records mr ON o.meeting_id = mr.id
     LIMIT 1000
     ORDER BY o.estimated_cost_saving DESC`);
  for (const r of optRes.rows as any[]) {
    optSheet.addRow({
      meeting: r.title, current: Number(r.current_count) || 0,
      optimal: Number(r.optimal_count) || 0, overInvited: Number(r.over_invited_count) || 0,
      saving: `¥${Number(r.estimated_cost_saving || 0).toFixed(2)}`,
    });
  }
  optSheet.getRow(1).eachCell((cell) => { Object.assign(cell, { style: headerStyle }); });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `IME-仪表盘导出-${dateStr}.xlsx`;

  // Record export history
  await db.execute(sql`
    INSERT INTO ime_report_exports (report_type, scope, filters, format, filename, file_size, generated_by, generated_at, created_at)
    VALUES ('dashboard', 'all', '${JSON.stringify(filters || {})}', 'xlsx', ${filename}, ${Buffer.from(buffer).length}, 'system', NOW(), NOW())
  `);

  return { base64, filename };
}

// ============================================================================
// Phase 6: Report Exports — Single Meeting PDF Report
// ============================================================================

function drawTable(doc: any, headers: string[], rows: string[][], colWidths: number[], startX: number, startY: number): number {
  const rowHeight = 22;
  const padding = 6;
  let y = startY;

  // Header row
  doc.fillColor("#4472C4").rect(startX, y, colWidths.reduce((a: number, b: number) => a + b, 0), rowHeight).fill();
  doc.fillColor("#FFFFFF").fontSize(9);
  let x = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x + padding, y + 5, { width: colWidths[i] - padding * 2, height: rowHeight, ellipsis: true });
    x += colWidths[i];
  }
  y += rowHeight;

  // Data rows
  doc.fillColor("#333333").fontSize(8);
  for (const row of rows) {
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
    // Zebra stripe
    if (rows.indexOf(row) % 2 === 1) {
      doc.fillColor("#F2F2F2").rect(startX, y, colWidths.reduce((a: number, b: number) => a + b, 0), rowHeight).fill();
    }
    doc.fillColor("#333333");
    x = startX;
    for (let i = 0; i < row.length; i++) {
      doc.text(String(row[i] ?? ""), x + padding, y + 5, { width: colWidths[i] - padding * 2, height: rowHeight, ellipsis: true });
      x += colWidths[i];
    }
    y += rowHeight;
  }
  return y;
}

function addSectionTitle(doc: any, title: string, y: number): number {
  if (y > 700) { doc.addPage(); y = 50; }
  doc.fillColor("#2E5090").fontSize(14).text(title, 50, y);
  y += 25;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#4472C4").lineWidth(1).stroke();
  return y + 10;
}

export async function generateMeetingReport(meetingId: string) {
  const db = await requireDb();
  const PDFDocument = (await import("pdfkit")).default;

  // Fetch data from 8 tables
  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const contribRes = await db.execute(sql`SELECT * FROM meeting_contributions WHERE meeting_id = ${meetingId} ORDER BY contribution_score DESC LIMIT 1000`);
  const effRes = await db.execute(sql`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId} LIMIT 1`);
  const sentimentRes = await db.execute(sql`SELECT * FROM ime_meeting_sentiment WHERE meeting_id = ${meetingId} LIMIT 1`);
  const roiRes = await db.execute(sql`SELECT * FROM ime_meeting_roi WHERE meeting_id = ${meetingId} LIMIT 1`);
  const actionRes = await db.execute(sql`SELECT * FROM ime_action_items WHERE meeting_id = ${meetingId} ORDER BY priority DESC LIMIT 1000`);
  const topicRes = await db.execute(sql`SELECT * FROM ime_topic_continuity WHERE meeting_id = ${meetingId} LIMIT 1000`);
  const optRes = await db.execute(sql`SELECT * FROM ime_attendee_optimization WHERE meeting_id = ${meetingId} LIMIT 1`);

  const contributions = contribRes.rows as any[];
  const effectiveness = (effRes.rows as any[])[0];
  const sentiment = (sentimentRes.rows as any[])[0];
  const roi = (roiRes.rows as any[])[0];
  const actionItems = actionRes.rows as any[];
  const topics = topicRes.rows as any[];
  const optimization = (optRes.rows as any[])[0];

  // Create PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Register Chinese font
  doc.registerFont("Chinese", "C:/Windows/Fonts/msyh.ttc");
  doc.font("Chinese");

  // --- Cover Page ---
  doc.fillColor("#2E5090").fontSize(28).text("GRT智能会议分析报告", 50, 200, { align: "center" });
  doc.fontSize(16).fillColor("#555555").text(meeting.title || "未命名会议", 50, 260, { align: "center" });
  doc.fontSize(12).text(`会议日期: ${meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString("zh-CN") : "N/A"}`, 50, 300, { align: "center" });
  doc.text(`生成时间: ${new Date().toLocaleString("zh-CN")}`, 50, 320, { align: "center" });
  doc.text(`报告ID: IME-${meetingId.slice(0, 8)}`, 50, 340, { align: "center" });

  // --- Section 1: 参会者贡献分析 ---
  doc.addPage();
  let y = 50;
  y = addSectionTitle(doc, "1. 参会者贡献分析", y);
  if (contributions.length > 0) {
    // Bar visualization
    const maxScore = Math.max(...contributions.map((c: any) => Number(c.contribution_score) || 0), 1);
    for (const c of contributions.slice(0, 10)) {
      if (y > 700) { doc.addPage(); y = 50; }
      const score = Number(c.contribution_score) || 0;
      const barWidth = (score / maxScore) * 300;
      doc.fillColor("#333333").fontSize(9).text(c.employee_name || "匿名", 50, y + 2, { width: 100 });
      doc.fillColor("#4472C4").rect(160, y, barWidth, 14).fill();
      doc.fillColor("#333333").fontSize(8).text(String(Math.round(score)), 165 + barWidth, y + 2);
      y += 22;
    }
    y += 10;
    y = drawTable(doc,
      ["姓名", "发言次数", "贡献分数", "角色"],
      contributions.map((c: any) => [c.employee_name || "匿名", String(Number(c.speaking_count) || 0), String(Math.round(Number(c.contribution_score) || 0)), c.role_in_meeting || ""]),
      [140, 80, 80, 195], 50, y
    );
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 2: 会议效能评分 ---
  y = addSectionTitle(doc, "2. 会议效能评分", y + 15);
  if (effectiveness) {
    const dims = [
      ["综合评分", effectiveness.overall_score],
      ["目标达成", effectiveness.goal_achievement],
      ["时间效率", effectiveness.time_efficiency],
      ["参与均衡", effectiveness.participation_balance],
      ["决策质量", effectiveness.decision_quality],
    ];
    for (const [label, val] of dims) {
      if (y > 750) { doc.addPage(); y = 50; }
      const score = Math.round(Number(val) || 0);
      doc.fillColor("#333333").fontSize(10).text(String(label), 50, y + 2, { width: 100 });
      doc.fillColor("#E0E0E0").rect(160, y, 300, 16).fill();
      const color = score >= 80 ? "#4CAF50" : score >= 60 ? "#FFC107" : "#F44336";
      doc.fillColor(color).rect(160, y, score * 3, 16).fill();
      doc.fillColor("#333333").fontSize(9).text(`${score}分`, 470, y + 2);
      y += 24;
    }
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 3: 情感分析 ---
  y = addSectionTitle(doc, "3. 情感分析", y + 15);
  if (sentiment) {
    y = drawTable(doc,
      ["维度", "值"],
      [
        ["整体情感", sentiment.overall_sentiment || "N/A"],
        ["紧张度", String(Number(sentiment.tension_level || 0).toFixed(2))],
        ["协作度", String(Number(sentiment.collaboration_score || 0).toFixed(2))],
        ["能量水平", sentiment.energy_level || "N/A"],
      ],
      [200, 295], 50, y
    );
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 4: ROI分析 ---
  y = addSectionTitle(doc, "4. ROI分析", y + 15);
  if (roi) {
    y = drawTable(doc,
      ["维度", "值"],
      [
        ["ROI评级", roi.roi_grade || "N/A"],
        ["ROI分数", String(Math.round(Number(roi.roi_score) || 0))],
        ["总成本", `¥${Number(roi.total_cost || 0).toFixed(2)}`],
        ["有形成果数", String(Number(roi.tangible_outcome_count) || 0)],
        ["价值评估", roi.value_assessment || "N/A"],
      ],
      [200, 295], 50, y
    );
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 5: 行动项 ---
  y = addSectionTitle(doc, "5. 行动项", y + 15);
  if (actionItems.length > 0) {
    y = drawTable(doc,
      ["内容", "负责人", "状态", "优先级"],
      actionItems.map((a: any) => [a.content || "", a.assigned_to || "", a.status || "", a.priority || ""]),
      [220, 90, 80, 105], 50, y
    );
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 6: 议题追踪 ---
  y = addSectionTitle(doc, "6. 议题追踪", y + 15);
  if (topics.length > 0) {
    y = drawTable(doc,
      ["议题", "状态", "出现次数"],
      topics.map((t: any) => [t.topic_name || "", t.status || "", String(Number(t.meeting_appearances) || 0)]),
      [250, 120, 125], 50, y
    );
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 7: 参会优化 ---
  y = addSectionTitle(doc, "7. 参会优化建议", y + 15);
  if (optimization) {
    y = drawTable(doc,
      ["维度", "值"],
      [
        ["当前参会人数", String(Number(optimization.current_count) || 0)],
        ["最佳参会人数", String(Number(optimization.optimal_count) || 0)],
        ["过多邀请人数", String(Number(optimization.over_invited_count) || 0)],
        ["预估节省", `¥${Number(optimization.estimated_cost_saving || 0).toFixed(2)}`],
      ],
      [200, 295], 50, y
    );
    if (optimization.composition_advice) {
      y += 10;
      doc.fillColor("#333333").fontSize(9).text(optimization.composition_advice, 50, y, { width: 495 });
      y += doc.heightOfString(optimization.composition_advice, { width: 495 }) + 5;
    }
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
    y += 20;
  }

  // --- Section 8: AI综合分析 ---
  y = addSectionTitle(doc, "8. AI综合分析", y + 15);
  const narratives = [
    effectiveness?.ai_narrative,
    sentiment?.ai_narrative,
    roi?.ai_narrative,
    optimization?.ai_narrative,
  ].filter(Boolean);
  if (narratives.length > 0) {
    for (const narrative of narratives) {
      if (y > 700) { doc.addPage(); y = 50; }
      doc.fillColor("#333333").fontSize(9).text(narrative, 50, y, { width: 495 });
      y += doc.heightOfString(narrative, { width: 495 }) + 10;
    }
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无数据", 50, y);
  }

  // Finalize
  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  const pdfBuffer = Buffer.concat(chunks);
  const base64 = pdfBuffer.toString("base64");
  const titleSlug = (meeting.title || "meeting").slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "-");
  const dateStr = meeting.meeting_date ? new Date(meeting.meeting_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const filename = `IME-会议报告-${titleSlug}-${dateStr}.pdf`;

  // Record export
  await db.execute(sql`
    INSERT INTO ime_report_exports (report_type, scope, scope_id, format, filename, file_size, generated_by, generated_at, created_at)
    VALUES ('meeting', 'meeting', ${meetingId}, 'pdf', ${filename}, ${pdfBuffer.length}, 'system', NOW(), NOW())
  `);

  return { base64, filename };
}

// ============================================================================
// Phase 6: Report Exports — Benchmark Report (PDF)
// ============================================================================

export async function generateBenchmarkReport(
  scope: string,
  scopeId?: string,
  period?: string,
) {
  const db = await requireDb();
  const PDFDocument = (await import("pdfkit")).default;

  const periodDays = period === "quarterly" ? 90 : 30;
  const periodLabel = period === "quarterly" ? "季度" : "月度";
  const now = new Date();
  const currentEnd = now.toISOString().slice(0, 10);
  const currentStart = new Date(now.getTime() - periodDays * 86400000).toISOString().slice(0, 10);
  const prevEnd = currentStart;
  const prevStart = new Date(now.getTime() - periodDays * 2 * 86400000).toISOString().slice(0, 10);

  // Build scope filter
  let scopeFilter: SQL = sql``;
  if (scope === "channel" && scopeId) {
    scopeFilter = sql`AND mr.channel_id = ${scopeId}`;
  } else if (scope === "department" && scopeId) {
    scopeFilter = sql`AND mr.channel_id IN (SELECT id FROM meeting_records WHERE summary LIKE ${`%${scopeId}%`})`;
  }

  // Query metrics for a given date range
  async function queryPeriodMetrics(dateFrom: string, dateTo: string) {
    const meetingStats = await db.execute(sql`
      SELECT COUNT(*) as cnt, AVG(mes.overall_score) as avg_eff
      FROM meeting_records mr
      LEFT JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id
      WHERE mr.meeting_date >= ${dateFrom} AND mr.meeting_date <= ${dateTo} ${scopeFilter}
    `);
    const costStats = await db.execute(sql`
      SELECT AVG(mc.total_cost) as avg_cost
      FROM ime_meeting_costs mc
      JOIN meeting_records mr ON mc.meeting_id = mr.id
      WHERE mr.meeting_date >= ${dateFrom} AND mr.meeting_date <= ${dateTo} ${scopeFilter}
    `);
    const actionStats = await db.execute(sql`
      SELECT COUNT(*) as total, SUM(CASE WHEN ai.status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM ime_action_items ai
      JOIN meeting_records mr ON ai.meeting_id = mr.id
      WHERE mr.meeting_date >= ${dateFrom} AND mr.meeting_date <= ${dateTo} ${scopeFilter}
    `);
    const roiStats = await db.execute(sql`
      SELECT AVG(roi.roi_score) as avg_roi
      FROM ime_meeting_roi roi
      JOIN meeting_records mr ON roi.meeting_id = mr.id
      WHERE mr.meeting_date >= ${dateFrom} AND mr.meeting_date <= ${dateTo} ${scopeFilter}
    `);
    const fatigueStats = await db.execute(sql`
      SELECT AVG(p.fatigue_index) as avg_fatigue
      FROM ime_meeting_predictions p
      JOIN meeting_records mr ON p.meeting_id = mr.id
      WHERE mr.meeting_date >= ${dateFrom} AND mr.meeting_date <= ${dateTo} ${scopeFilter}
      AND p.fatigue_index IS NOT NULL
    `);

    const ms = (meetingStats.rows as any[])[0] || {};
    const cs = (costStats.rows as any[])[0] || {};
    const as_ = (actionStats.rows as any[])[0] || {};
    const rs = (roiStats.rows as any[])[0] || {};
    const fs = (fatigueStats.rows as any[])[0] || {};
    const total = Number(as_.total) || 0;
    const completed = Number(as_.completed) || 0;

    return {
      meetingCount: Number(ms.cnt) || 0,
      avgEffectiveness: Math.round(Number(ms.avg_eff) || 0),
      avgCost: Number(Number(cs.avg_cost || 0).toFixed(2)),
      actionCompletionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgRoi: Math.round(Number(rs.avg_roi) || 0),
      avgFatigue: Number(Number(fs.avg_fatigue || 0).toFixed(2)),
    };
  }

  const current = await queryPeriodMetrics(currentStart, currentEnd);
  const previous = await queryPeriodMetrics(prevStart, prevEnd);

  // Compute deltas
  function computeDelta(cur: number, prev: number): string {
    if (prev === 0) return cur > 0 ? "▲ 新增" : "—";
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    if (pct > 0) return `▲ +${pct.toFixed(1)}%`;
    if (pct < 0) return `▼ ${pct.toFixed(1)}%`;
    return "— 持平";
  }

  // Top 3 best + worst meetings in current period
  const bestRes = await db.execute(sql`
    SELECT mr.title, mes.overall_score FROM meeting_records mr
    JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id
    WHERE mr.meeting_date >= ${currentStart} AND mr.meeting_date <= ${currentEnd} ${scopeFilter}
    ORDER BY mes.overall_score DESC LIMIT 3
  `);
  const worstRes = await db.execute(sql`
    SELECT mr.title, mes.overall_score FROM meeting_records mr
    JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id
    WHERE mr.meeting_date >= ${currentStart} AND mr.meeting_date <= ${currentEnd} ${scopeFilter}
    ORDER BY mes.overall_score ASC LIMIT 3
  `);

  // Recommendations from predictions
  const recsRes = await db.execute(sql`
    SELECT recommendations FROM ime_meeting_predictions p
    JOIN meeting_records mr ON p.meeting_id = mr.id
    WHERE mr.meeting_date >= ${currentStart} AND mr.meeting_date <= ${currentEnd} ${scopeFilter}
    AND p.recommendations IS NOT NULL
    ORDER BY p.predicted_at DESC LIMIT 5
  `);

  // Build PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  doc.registerFont("Chinese", "C:/Windows/Fonts/msyh.ttc");
  doc.font("Chinese");

  // --- Cover ---
  doc.fillColor("#2E5090").fontSize(28).text("会议智能基准报告", 50, 180, { align: "center" });
  doc.fontSize(14).fillColor("#555555").text(`范围: ${scope}${scopeId ? ` — ${scopeId}` : ""}`, 50, 240, { align: "center" });
  doc.text(`对比周期: ${periodLabel} (${currentStart} ~ ${currentEnd})`, 50, 270, { align: "center" });
  doc.text(`对比基准: ${prevStart} ~ ${prevEnd}`, 50, 295, { align: "center" });
  doc.text(`生成时间: ${new Date().toLocaleString("zh-CN")}`, 50, 325, { align: "center" });

  // --- Metrics Comparison ---
  doc.addPage();
  let y = 50;
  y = addSectionTitle(doc, "1. 核心指标对比", y);

  const metrics = [
    { name: "会议数量", cur: current.meetingCount, prev: previous.meetingCount, unit: "次" },
    { name: "平均效能", cur: current.avgEffectiveness, prev: previous.avgEffectiveness, unit: "分" },
    { name: "平均成本", cur: current.avgCost, prev: previous.avgCost, unit: "¥" },
    { name: "行动项完成率", cur: current.actionCompletionRate, prev: previous.actionCompletionRate, unit: "%" },
    { name: "平均ROI", cur: current.avgRoi, prev: previous.avgRoi, unit: "分" },
    { name: "疲劳指数", cur: current.avgFatigue, prev: previous.avgFatigue, unit: "" },
  ];

  y = drawTable(doc,
    ["指标", "当前期间", "上一期间", "变化"],
    metrics.map(m => [m.name, `${m.cur}${m.unit}`, `${m.prev}${m.unit}`, computeDelta(m.cur, m.prev)]),
    [130, 110, 110, 145], 50, y
  );

  // --- Sparklines (simple trend visualization) ---
  y += 20;
  y = addSectionTitle(doc, "2. 趋势概览", y);
  for (const m of metrics.slice(0, 4)) {
    if (y > 720) { doc.addPage(); y = 50; }
    doc.fillColor("#333333").fontSize(9).text(m.name, 50, y + 5, { width: 100 });
    // Simple two-point sparkline
    const x1 = 170, x2 = 370;
    const maxVal = Math.max(m.prev, m.cur, 1);
    const y1 = y + 20 - (m.prev / maxVal) * 15;
    const y2 = y + 20 - (m.cur / maxVal) * 15;
    doc.strokeColor(m.cur >= m.prev ? "#4CAF50" : "#F44336").lineWidth(2);
    doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
    doc.fillColor("#4472C4").circle(x1, y1, 3).fill();
    doc.fillColor("#4472C4").circle(x2, y2, 3).fill();
    doc.fillColor("#999999").fontSize(7).text("上期", x1 - 10, y + 22).text("当期", x2 - 10, y + 22);
    y += 40;
  }

  // --- Best / Worst Meetings ---
  y += 10;
  y = addSectionTitle(doc, "3. 最佳 / 最差会议", y);
  const best = bestRes.rows as any[];
  const worst = worstRes.rows as any[];
  if (best.length > 0) {
    doc.fillColor("#4CAF50").fontSize(11).text("Top 3 最佳", 50, y);
    y += 18;
    for (const m of best) {
      doc.fillColor("#333333").fontSize(9).text(`• ${m.title} — ${Math.round(Number(m.overall_score))}分`, 60, y);
      y += 16;
    }
  }
  y += 8;
  if (worst.length > 0) {
    doc.fillColor("#F44336").fontSize(11).text("Bottom 3 待改进", 50, y);
    y += 18;
    for (const m of worst) {
      doc.fillColor("#333333").fontSize(9).text(`• ${m.title} — ${Math.round(Number(m.overall_score))}分`, 60, y);
      y += 16;
    }
  }

  // --- Recommendations ---
  y += 15;
  y = addSectionTitle(doc, "4. AI建议汇总", y);
  const recs = recsRes.rows as any[];
  if (recs.length > 0) {
    for (const r of recs) {
      if (y > 720) { doc.addPage(); y = 50; }
      const text = String(r.recommendations || "").slice(0, 300);
      doc.fillColor("#333333").fontSize(9).text(`• ${text}`, 50, y, { width: 495 });
      y += doc.heightOfString(`• ${text}`, { width: 495 }) + 6;
    }
  } else {
    doc.fillColor("#999999").fontSize(10).text("暂无建议数据", 50, y);
  }

  // Finalize
  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  const pdfBuffer = Buffer.concat(chunks);
  const base64 = pdfBuffer.toString("base64");
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `IME-基准报告-${scope}-${periodLabel}-${dateStr}.pdf`;

  // Record export
  await db.execute(sql`
    INSERT INTO ime_report_exports (report_type, scope, scope_id, format, filename, file_size, generated_by, generated_at, created_at)
    VALUES ('benchmark', ${scope}, ${scopeId || ""}, 'pdf', ${filename}, ${pdfBuffer.length}, 'system', NOW(), NOW())
  `);

  return { base64, filename };
}

// ============================================================================
// Phase 7: Knowledge Entity Extraction
// ============================================================================

export async function extractKnowledgeEntities(meetingId: string) {
  const db = await requireDb();

  // Fetch meeting + content blocks
  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const blocksRes = await db.execute(sql`SELECT speaker, content, block_type FROM meeting_content_blocks WHERE meeting_id = ${meetingId} ORDER BY timestamp_start LIMIT 1000`);
  const blocks = blocksRes.rows as any[];

  const transcript = blocks.map((b: any) => `[${b.speaker}] ${b.content}`).join("\n").slice(0, 6000);

  // Use LLM to extract entities
  const llmResult = await invokeLLM({
    system: "你是会议知识提取专家。从会议记录中提取关键实体：决策(decision)、风险(risk)、机会(opportunity)、依赖(dependency)、洞察(insight)。",
    prompt: `会议标题: ${meeting.title || ""}\n会议摘要: ${meeting.summary || ""}\n\n会议内容:\n${transcript}\n\n请提取所有关键实体，返回JSON数组格式。`,
    schema: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entity_type: { type: "string", enum: ["decision", "risk", "opportunity", "dependency", "insight"] },
              entity_value: { type: "string" },
              confidence: { type: "number" },
              related_speaker: { type: "string" },
              context: { type: "string" },
            },
            required: ["entity_type", "entity_value"],
          },
        },
        narrative: { type: "string" },
      },
      required: ["entities"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;
  const entities = parsed.entities || [];

  // Delete old extractions for this meeting
  await db.execute(sql`DELETE FROM ime_knowledge_entities WHERE meeting_id = ${meetingId}`);

  // Insert new entities
  const insertedIds: number[] = [];
  for (const e of entities) {
    const res = await db.execute(sql`
      INSERT INTO ime_knowledge_entities (meeting_id, entity_type, entity_value, confidence, related_speaker, context, ai_narrative, extracted_at, created_at)
      VALUES (${meetingId}, ${e.entity_type || "insight"}, ${String(e.entity_value || "")}, ${Number(e.confidence) || 0.8}, ${String(e.related_speaker || "")}, ${String(e.context || "")}, ${String(parsed.narrative || "")}, NOW(), NOW())
      RETURNING id
    `);
    const row = (res.rows as any[])[0];
    if (row) insertedIds.push(Number(row.id));
  }

  return { meetingId, entitiesExtracted: entities.length, entityIds: insertedIds, narrative: parsed.narrative || "" };
}

// ============================================================================
// Phase 7: Build Entity Relationships (cross-meeting linking)
// ============================================================================

export async function buildEntityRelationships(meetingId: string) {
  const db = await requireDb();

  // Get entities from this meeting
  const currentRes = await db.execute(sql`SELECT id, entity_type, entity_value, meeting_id FROM ime_knowledge_entities WHERE meeting_id = ${meetingId} LIMIT 1000`);
  const currentEntities = currentRes.rows as any[];
  if (currentEntities.length === 0) return { relationships: 0 };

  // Get entities from other meetings for linking
  const otherRes = await db.execute(sql`SELECT id, entity_type, entity_value, meeting_id FROM ime_knowledge_entities WHERE meeting_id != ${meetingId} ORDER BY extracted_at DESC LIMIT 200`);
  const otherEntities = otherRes.rows as any[];

  if (otherEntities.length === 0) return { relationships: 0 };

  // Use LLM to find relationships
  const currentSummary = currentEntities.map((e: any) => `[${e.id}] ${e.entity_type}: ${e.entity_value}`).join("\n");
  const otherSummary = otherEntities.slice(0, 50).map((e: any) => `[${e.id}] ${e.entity_type}: ${e.entity_value}`).join("\n");

  const llmResult = await invokeLLM({
    system: "你是知识图谱关系分析专家。分析两组实体之间的关系。",
    prompt: `当前会议实体:\n${currentSummary}\n\n历史实体:\n${otherSummary}\n\n找出实体间的关系(depends_on/follows_up/contradicts/supports/evolves_from)，返回JSON数组。`,
    schema: {
      type: "object",
      properties: {
        relationships: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entity_from_id: { type: "number" },
              entity_to_id: { type: "number" },
              relationship_type: { type: "string", enum: ["depends_on", "follows_up", "contradicts", "supports", "evolves_from"] },
              strength: { type: "number" },
              context: { type: "string" },
            },
            required: ["entity_from_id", "entity_to_id", "relationship_type"],
          },
        },
      },
      required: ["relationships"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;
  const relationships = parsed.relationships || [];

  // Validate entity IDs and insert
  const validFromIds = new Set(currentEntities.map((e: any) => Number(e.id)));
  const validToIds = new Set(otherEntities.map((e: any) => Number(e.id)));
  let inserted = 0;

  for (const rel of relationships) {
    if (!validFromIds.has(rel.entity_from_id) || !validToIds.has(rel.entity_to_id)) continue;
    await db.execute(sql`
      INSERT INTO ime_entity_relationships (entity_from_id, entity_to_id, relationship_type, strength, context, created_at)
      VALUES (${rel.entity_from_id}, ${rel.entity_to_id}, ${String(rel.relationship_type)}, ${Number(rel.strength) || 0.7}, ${String(rel.context || "")}, NOW())
    `);
    inserted++;
  }

  return { meetingId, relationshipsCreated: inserted };
}

// ============================================================================
// Phase 7: Track Decision Outcome
// ============================================================================

export async function trackDecisionOutcome(
  entityId: number,
  outcomeStatus: string,
  outcomeNotes?: string,
  impactScore?: number,
  lessonsLearned?: string,
) {
  const db = await requireDb();

  // Verify entity exists and is a decision
  const entityRes = await db.execute(sql`SELECT id, meeting_id, entity_value FROM ime_knowledge_entities WHERE id = ${entityId} AND entity_type = 'decision' LIMIT 1000`);
  const entity = (entityRes.rows as any[])[0];
  if (!entity) throw new Error("Decision entity not found");

  // Upsert decision outcome
  await db.execute(sql`DELETE FROM ime_decision_outcomes WHERE entity_id = ${entityId}`);
  await db.execute(sql`
    INSERT INTO ime_decision_outcomes (entity_id, meeting_id, decision_text, decision_date, outcome_status, outcome_notes, impact_score, lessons_learned, outcome_date, created_at)
    VALUES (${entityId}, ${entity.meeting_id}, ${String(entity.entity_value)}, NOW(), ${outcomeStatus}, ${String(outcomeNotes || "")}, ${impactScore ?? 0}, ${String(lessonsLearned || "")}, NOW(), NOW())
  `);

  return { entityId, outcomeStatus, tracked: true };
}

// ============================================================================
// Phase 7: Generate Meeting Retrospective
// ============================================================================

export async function generateRetrospective(meetingId: string) {
  const db = await requireDb();

  // Gather data from multiple tables
  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const effRes = await db.execute(sql`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId} LIMIT 1`);
  const sentRes = await db.execute(sql`SELECT * FROM ime_meeting_sentiment WHERE meeting_id = ${meetingId} LIMIT 1`);
  const actionRes = await db.execute(sql`SELECT content, status, assigned_to FROM ime_action_items WHERE meeting_id = ${meetingId} LIMIT 1000`);
  const entityRes = await db.execute(sql`SELECT entity_type, entity_value FROM ime_knowledge_entities WHERE meeting_id = ${meetingId} LIMIT 1000`);

  const effectiveness = (effRes.rows as any[])[0];
  const sentiment = (sentRes.rows as any[])[0];
  const actionItems = actionRes.rows as any[];
  const entities = entityRes.rows as any[];

  const contextSummary = [
    `会议: ${meeting.title || "未命名"}`,
    `摘要: ${meeting.summary || "无"}`,
    effectiveness ? `效能评分: ${effectiveness.overall_score}` : "",
    sentiment ? `情感: ${sentiment.overall_sentiment}, 紧张度: ${sentiment.tension_level}` : "",
    actionItems.length > 0 ? `行动项(${actionItems.length}): ${actionItems.map((a: any) => a.content).join("; ")}` : "",
    entities.length > 0 ? `知识实体(${entities.length}): ${entities.map((e: any) => `${e.entity_type}:${e.entity_value}`).join("; ")}` : "",
  ].filter(Boolean).join("\n");

  const llmResult = await invokeLLM({
    system: "你是会议回顾分析专家。基于会议数据生成结构化的会议回顾。",
    prompt: `请为以下会议生成详细回顾:\n${contextSummary}`,
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        key_learnings: { type: "array", items: { type: "string" } },
        improvement_areas: { type: "array", items: { type: "string" } },
        what_went_well: { type: "array", items: { type: "string" } },
        actionable_insights: { type: "array", items: { type: "string" } },
        overall_grade: { type: "string" },
        narrative: { type: "string" },
      },
      required: ["summary", "key_learnings", "overall_grade"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  // Upsert retrospective
  await db.execute(sql`DELETE FROM ime_meeting_retrospectives WHERE meeting_id = ${meetingId}`);
  await db.execute(sql`
    INSERT INTO ime_meeting_retrospectives (meeting_id, ai_summary, key_learnings, improvement_areas, what_went_well, actionable_insights, overall_grade, ai_narrative, generated_at, created_at)
    VALUES (${meetingId}, ${String(parsed.summary || "")}, ${JSON.stringify(parsed.key_learnings || [])}, ${JSON.stringify(parsed.improvement_areas || [])}, ${JSON.stringify(parsed.what_went_well || [])}, ${JSON.stringify(parsed.actionable_insights || [])}, ${String(parsed.overall_grade || "B")}, ${String(parsed.narrative || "")}, NOW(), NOW())
  `);

  return {
    meetingId,
    summary: parsed.summary,
    keyLearnings: parsed.key_learnings,
    improvementAreas: parsed.improvement_areas || [],
    whatWentWell: parsed.what_went_well || [],
    actionableInsights: parsed.actionable_insights || [],
    overallGrade: parsed.overall_grade,
    narrative: parsed.narrative || "",
  };
}

// ============================================================================
// Phase 7: Compute Expert Profiles
// ============================================================================

export async function computeExpertProfiles(department?: string) {
  const db = await requireDb();

  const deptFilter: SQL = department ? sql`WHERE mc.employee_name IN (SELECT employee_name FROM meeting_contributions mc2 JOIN meeting_records mr ON mc2.meeting_id = mr.id WHERE mr.channel_id LIKE ${`%${department}%`})` : sql``;

  // Aggregate contribution data per employee
  const contribRes = await db.execute(sql`
    SELECT mc.employee_id, mc.employee_name,
           COUNT(DISTINCT mc.meeting_id) as meeting_count,
           AVG(mc.contribution_score) as avg_score,
           COUNT(CASE WHEN mc.role_in_meeting = 'facilitator' OR mc.role_in_meeting = 'presenter' THEN 1 END) as leadership_count
    FROM meeting_contributions mc
    ${deptFilter}
    GROUP BY mc.employee_id, mc.employee_name
    HAVING COUNT(DISTINCT mc.meeting_id) >= 3
    ORDER BY avg_score DESC
    LIMIT 50
  `);
  const contributors = contribRes.rows as any[];

  // For each contributor, check decision influence
  const profiles: any[] = [];
  for (const c of contributors) {
    const employeeId = String(c.employee_id || "");
    const employeeName = String(c.employee_name || "");

    // Count decisions they're associated with
    const decisionRes = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM ime_knowledge_entities
      WHERE entity_type = 'decision' AND related_speaker = ${employeeName}
    `);
    const decisionCount = Number((decisionRes.rows as any[])[0]?.cnt) || 0;

    // Get top topics from their meetings
    const topicRes = await db.execute(sql`
      SELECT tc.topic_name, COUNT(*) as cnt
      FROM ime_topic_continuity tc
      WHERE tc.meeting_id IN (SELECT meeting_id FROM meeting_contributions WHERE employee_id = ${employeeId})
      GROUP BY tc.topic_name ORDER BY cnt DESC LIMIT 5
    `);
    const topTopics = (topicRes.rows as any[]).map((t: any) => t.topic_name);

    const meetingCount = Number(c.meeting_count) || 0;
    const avgScore = Number(c.avg_score) || 0;
    const leadershipRate = meetingCount > 0 ? Number(c.leadership_count) / meetingCount : 0;
    const credibility = Math.min(100, avgScore * 0.5 + meetingCount * 2 + leadershipRate * 20 + decisionCount * 3);

    const expertiseAreas: string[] = [];
    if (leadershipRate > 0.3) expertiseAreas.push("会议引导");
    if (decisionCount > 5) expertiseAreas.push("决策推动");
    if (avgScore > 80) expertiseAreas.push("高贡献度");
    if (topTopics.length > 0) expertiseAreas.push(...topTopics.slice(0, 3));

    // Upsert
    await db.execute(sql`DELETE FROM ime_expert_profiles WHERE employee_id = ${employeeId}`);
    await db.execute(sql`
      INSERT INTO ime_expert_profiles (employee_id, employee_name, department, expertise_areas, credibility_score, meeting_count, avg_contribution_score, decision_influence_rate, top_topics, computed_at, created_at)
      VALUES (${employeeId}, ${employeeName}, ${department || ""}, ${JSON.stringify(expertiseAreas)}, ${Math.round(credibility)}, ${meetingCount}, ${Math.round(avgScore)}, ${Number(decisionCount / Math.max(meetingCount, 1)).toFixed(2)}, ${JSON.stringify(topTopics)}, NOW(), NOW())
    `);

    profiles.push({
      employeeId: c.employee_id,
      employeeName: c.employee_name,
      credibilityScore: Math.round(credibility),
      meetingCount,
      avgContributionScore: Math.round(avgScore),
      expertiseAreas,
      topTopics,
    });
  }

  return { profilesComputed: profiles.length, profiles };
}

// ============================================================================
// Phase 7: Knowledge Dashboard
// ============================================================================

export async function getKnowledgeDashboard(filters?: {
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const db = await requireDb();

  const whereParts: SQL[] = [];
  if (filters?.entityType) whereParts.push(sql`ke.entity_type = ${filters.entityType}`);
  if (filters?.dateFrom) whereParts.push(sql`ke.extracted_at >= ${filters.dateFrom}`);
  if (filters?.dateTo) whereParts.push(sql`ke.extracted_at <= ${filters.dateTo}`);
  const whereClause = whereParts.length > 0 ? sql`WHERE ${sql.join(whereParts, sql` AND `)}` : sql``;

  // Entity type distribution
  const typeStatsRes = await db.execute(sql`
    SELECT entity_type, COUNT(*) as cnt, AVG(confidence) as avg_confidence
    FROM ime_knowledge_entities ke ${whereClause}
    GROUP BY entity_type ORDER BY cnt DESC
  `);

  // Recent entities
  const recentRes = await db.execute(sql`
    SELECT ke.*, mr.title as meeting_title
    FROM ime_knowledge_entities ke
    JOIN meeting_records mr ON ke.meeting_id = mr.id
    ${whereClause}
    ORDER BY ke.extracted_at DESC LIMIT 20
  `);

  // Relationship stats (no interpolation -- static SQL, but convert for consistency)
  const relStatsRes = await db.execute(sql`
    SELECT relationship_type, COUNT(*) as cnt, AVG(strength) as avg_strength
    FROM ime_entity_relationships
    GROUP BY relationship_type ORDER BY cnt DESC
  `);

  // Decision outcomes summary
  const decisionRes = await db.execute(sql`
    SELECT outcome_status, COUNT(*) as cnt, AVG(impact_score) as avg_impact
    FROM ime_decision_outcomes
    GROUP BY outcome_status ORDER BY cnt DESC
  `);

  // Recent retrospectives
  const retroRes = await db.execute(sql`
    SELECT r.meeting_id, r.overall_grade, r.ai_summary, mr.title, r.generated_at
    FROM ime_meeting_retrospectives r
    JOIN meeting_records mr ON r.meeting_id = mr.id
    ORDER BY r.generated_at DESC LIMIT 10
  `);

  // Top experts
  const expertRes = await db.execute(sql`
    SELECT employee_name, credibility_score, meeting_count, expertise_areas, top_topics
    FROM ime_expert_profiles
    ORDER BY credibility_score DESC LIMIT 10
  `);

  // Total counts
  const totalEntities = (typeStatsRes.rows as any[]).reduce((sum: number, r: any) => sum + Number(r.cnt), 0);
  const totalRelationships = (relStatsRes.rows as any[]).reduce((sum: number, r: any) => sum + Number(r.cnt), 0);

  return {
    summary: {
      totalEntities,
      totalRelationships,
      totalDecisions: (decisionRes.rows as any[]).reduce((sum: number, r: any) => sum + Number(r.cnt), 0),
      totalRetrospectives: retroRes.rows.length,
      totalExperts: (await db.execute(sql`SELECT COUNT(*) as cnt FROM ime_expert_profiles`)).rows[0] as any,
    },
    entityTypeStats: (typeStatsRes.rows as any[]).map((r: any) => ({
      type: r.entity_type,
      count: Number(r.cnt),
      avgConfidence: Number(Number(r.avg_confidence || 0).toFixed(2)),
    })),
    recentEntities: recentRes.rows,
    relationshipStats: (relStatsRes.rows as any[]).map((r: any) => ({
      type: r.relationship_type,
      count: Number(r.cnt),
      avgStrength: Number(Number(r.avg_strength || 0).toFixed(2)),
    })),
    decisionOutcomes: decisionRes.rows,
    recentRetrospectives: retroRes.rows,
    topExperts: (expertRes.rows as any[]).map((r: any) => ({
      ...r,
      expertiseAreas: (() => { try { return JSON.parse(r.expertise_areas || "[]"); } catch { return []; } })(),
      topTopics: (() => { try { return JSON.parse(r.top_topics || "[]"); } catch { return []; } })(),
    })),
  };
}

// ============================================================================
// Phase 8: Meeting AI Assistant — Pre-Meeting Brief
// ============================================================================

export async function generateMeetingBrief(meetingId: string) {
  const db = await requireDb();

  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  // Gather participant history
  const contribRes = await db.execute(sql`
    SELECT employee_name, employee_id, AVG(contribution_score) as avg_score, COUNT(*) as meetings
     FROM meeting_contributions WHERE meeting_id = ${meetingId} OR employee_id IN
       (SELECT DISTINCT employee_id FROM meeting_contributions WHERE meeting_id = ${meetingId})
     GROUP BY employee_name, employee_id ORDER BY avg_score DESC LIMIT 15
  `);

  // Pending action items from past meetings with same participants
  const actionRes = await db.execute(sql`SELECT ai.content, ai.assigned_to, ai.status, ai.due_date, mr.title as source_meeting
     FROM ime_action_items ai
     JOIN meeting_records mr ON ai.meeting_id = mr.id
     WHERE ai.status NOT IN ('completed', 'cancelled')
     ORDER BY ai.created_at DESC LIMIT 10`);

  // Recent decisions related to this meeting's channel
  const decisionRes = await db.execute(sql`SELECT ke.entity_value, ke.related_speaker, mr.title, ke.extracted_at
     FROM ime_knowledge_entities ke
     JOIN meeting_records mr ON ke.meeting_id = mr.id
     WHERE ke.entity_type = 'decision'
     ORDER BY ke.extracted_at DESC LIMIT 10`);

  // Topic history
  const topicRes = await db.execute(sql`SELECT topic_name, status, meeting_appearances FROM ime_topic_continuity
     WHERE status NOT IN ('closed') ORDER BY created_at DESC LIMIT 10`);

  const contextData = [
    `会议: ${meeting.title || "未命名"}`,
    `摘要: ${meeting.summary || "无"}`,
    `参与者: ${(contribRes.rows as any[]).map((c: any) => c.employee_name).join(", ")}`,
    `待办行动项: ${(actionRes.rows as any[]).map((a: any) => `${a.content}(${a.assigned_to})`).join("; ")}`,
    `近期决策: ${(decisionRes.rows as any[]).map((d: any) => d.entity_value).join("; ")}`,
    `活跃议题: ${(topicRes.rows as any[]).map((t: any) => t.topic_name).join(", ")}`,
  ].join("\n");

  const llmResult = await invokeLLM({
    system: "你是会议准备助手。基于会议历史数据，为即将召开的会议生成准备简报。",
    prompt: `请为以下会议生成准备简报:\n${contextData}`,
    schema: {
      type: "object",
      properties: {
        participant_summary: { type: "array", items: { type: "object", properties: { name: { type: "string" }, role: { type: "string" }, note: { type: "string" } } } },
        pending_items: { type: "array", items: { type: "string" } },
        relevant_decisions: { type: "array", items: { type: "string" } },
        topic_context: { type: "array", items: { type: "string" } },
        suggested_questions: { type: "array", items: { type: "string" } },
        risk_alerts: { type: "array", items: { type: "string" } },
        narrative: { type: "string" },
      },
      required: ["suggested_questions", "narrative"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  await db.execute(sql`DELETE FROM ime_meeting_briefs WHERE meeting_id = ${meetingId}`);
  await db.execute(sql`
    INSERT INTO ime_meeting_briefs (meeting_id, participant_summary, pending_action_items, relevant_decisions, topic_history, suggested_questions, risk_alerts, ai_narrative, generated_at, created_at)
    VALUES (${meetingId}, ${JSON.stringify(parsed.participant_summary || [])}, ${JSON.stringify(parsed.pending_items || [])}, ${JSON.stringify(parsed.relevant_decisions || [])}, ${JSON.stringify(parsed.topic_context || [])}, ${JSON.stringify(parsed.suggested_questions || [])}, ${JSON.stringify(parsed.risk_alerts || [])}, ${String(parsed.narrative || "")}, NOW(), NOW())
  `);

  return {
    meetingId,
    participantSummary: parsed.participant_summary || [],
    pendingItems: parsed.pending_items || [],
    relevantDecisions: parsed.relevant_decisions || [],
    topicContext: parsed.topic_context || [],
    suggestedQuestions: parsed.suggested_questions || [],
    riskAlerts: parsed.risk_alerts || [],
    narrative: parsed.narrative || "",
  };
}

// ============================================================================
// Phase 8: Meeting AI Assistant — Agenda Suggestion
// ============================================================================

export async function generateAgendaSuggestion(
  topic: string,
  participants?: string[],
  durationMinutes?: number,
) {
  const duration = durationMinutes || 60;
  const participantList = participants?.join(", ") || "未指定";

  const llmResult = await invokeLLM({
    system: "你是会议议程设计专家。基于主题、参与者和时长设计最佳议程。",
    prompt: `请设计会议议程:\n主题: ${topic}\n参与者: ${participantList}\n时长: ${duration}分钟`,
    schema: {
      type: "object",
      properties: {
        agenda_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              duration_minutes: { type: "number" },
              description: { type: "string" },
              facilitator: { type: "string" },
            },
            required: ["title", "duration_minutes"],
          },
        },
        success_criteria: { type: "array", items: { type: "string" } },
        preparation_notes: { type: "array", items: { type: "string" } },
        tips: { type: "string" },
      },
      required: ["agenda_items"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  return {
    topic,
    duration,
    agendaItems: parsed.agenda_items || [],
    successCriteria: parsed.success_criteria || [],
    preparationNotes: parsed.preparation_notes || [],
    tips: parsed.tips || "",
  };
}

// ============================================================================
// Phase 8: Meeting AI Assistant — Meeting Minutes
// ============================================================================

export async function generateMeetingMinutes(meetingId: string) {
  const db = await requireDb();

  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const blocksRes = await db.execute(sql`SELECT speaker, content, block_type FROM meeting_content_blocks WHERE meeting_id = ${meetingId} ORDER BY timestamp_start LIMIT 1000`);
  const contribRes = await db.execute(sql`SELECT employee_name FROM meeting_contributions WHERE meeting_id = ${meetingId} LIMIT 1000`);
  const actionRes = await db.execute(sql`SELECT content, assigned_to, status, priority, due_date FROM ime_action_items WHERE meeting_id = ${meetingId} LIMIT 1000`);
  const entityRes = await db.execute(sql`SELECT entity_type, entity_value FROM ime_knowledge_entities WHERE meeting_id = ${meetingId} AND entity_type = 'decision' LIMIT 1000`);

  const transcript = (blocksRes.rows as any[]).map((b: any) => `[${b.speaker}] ${b.content}`).join("\n").slice(0, 6000);
  const attendees = (contribRes.rows as any[]).map((c: any) => c.employee_name);
  const decisions = (entityRes.rows as any[]).map((e: any) => e.entity_value);
  const actions = (actionRes.rows as any[]).map((a: any) => ({ item: a.content, owner: a.assigned_to, status: a.status }));

  const llmResult = await invokeLLM({
    system: "你是会议纪要生成专家。基于会议内容生成结构化的会议纪要。",
    prompt: `会议: ${meeting.title || "未命名"}\n日期: ${meeting.meeting_date || "N/A"}\n参与者: ${attendees.join(", ")}\n已知决策: ${decisions.join("; ")}\n行动项: ${actions.map(a => `${a.item}(${a.owner})`).join("; ")}\n\n会议内容:\n${transcript}`,
    schema: {
      type: "object",
      properties: {
        agenda_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              topic: { type: "string" },
              discussion: { type: "string" },
              outcome: { type: "string" },
            },
            required: ["topic"],
          },
        },
        decisions: { type: "array", items: { type: "string" } },
        action_items: {
          type: "array",
          items: {
            type: "object",
            properties: { item: { type: "string" }, owner: { type: "string" }, due: { type: "string" } },
            required: ["item"],
          },
        },
        key_points: { type: "array", items: { type: "string" } },
        next_steps: { type: "array", items: { type: "string" } },
        narrative: { type: "string" },
      },
      required: ["agenda_items", "decisions"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  await db.execute(sql`DELETE FROM ime_meeting_minutes WHERE meeting_id = ${meetingId}`);
  await db.execute(sql`
    INSERT INTO ime_meeting_minutes (meeting_id, attendees, agenda_items, decisions_recorded, action_items_summary, key_discussion_points, next_steps, ai_narrative, generated_at, created_at)
    VALUES (${meetingId}, ${JSON.stringify(attendees)}, ${JSON.stringify(parsed.agenda_items || [])}, ${JSON.stringify(parsed.decisions || [])}, ${JSON.stringify(parsed.action_items || [])}, ${JSON.stringify(parsed.key_points || [])}, ${JSON.stringify(parsed.next_steps || [])}, ${String(parsed.narrative || "")}, NOW(), NOW())
  `);

  return {
    meetingId,
    attendees,
    agendaItems: parsed.agenda_items || [],
    decisions: parsed.decisions || [],
    actionItems: parsed.action_items || [],
    keyPoints: parsed.key_points || [],
    nextSteps: parsed.next_steps || [],
    narrative: parsed.narrative || "",
  };
}

// ============================================================================
// Phase 8: Meeting AI Assistant — Follow-Up Plan
// ============================================================================

export async function generateFollowUpPlan(meetingId: string) {
  const db = await requireDb();

  const meetingRes = await db.execute(sql`SELECT * FROM meeting_records WHERE id = ${meetingId} LIMIT 1`);
  const meeting = (meetingRes.rows as any[])[0];
  if (!meeting) throw new Error("Meeting not found");

  const actionRes = await db.execute(sql`SELECT * FROM ime_action_items WHERE meeting_id = ${meetingId} LIMIT 1000`);
  const entityRes = await db.execute(sql`SELECT * FROM ime_knowledge_entities WHERE meeting_id = ${meetingId} LIMIT 1000`);
  const effRes = await db.execute(sql`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId} LIMIT 1`);
  const retroRes = await db.execute(sql`SELECT * FROM ime_meeting_retrospectives WHERE meeting_id = ${meetingId} LIMIT 1`);

  const context = [
    `会议: ${meeting.title}`,
    `行动项: ${(actionRes.rows as any[]).map((a: any) => `${a.content}→${a.assigned_to}(${a.status})`).join("; ")}`,
    `关键实体: ${(entityRes.rows as any[]).map((e: any) => `${e.entity_type}:${e.entity_value}`).join("; ")}`,
    (effRes.rows as any[])[0] ? `效能: ${(effRes.rows as any[])[0].overall_score}分` : "",
    (retroRes.rows as any[])[0] ? `回顾评级: ${(retroRes.rows as any[])[0].overall_grade}` : "",
  ].filter(Boolean).join("\n");

  const llmResult = await invokeLLM({
    system: "你是会议跟进计划专家。基于会议结果生成详细的后续行动计划。",
    prompt: `请为以下会议生成跟进计划:\n${context}`,
    schema: {
      type: "object",
      properties: {
        immediate_actions: { type: "array", items: { type: "object", properties: { action: { type: "string" }, owner: { type: "string" }, deadline: { type: "string" } }, required: ["action"] } },
        follow_up_meetings: { type: "array", items: { type: "object", properties: { topic: { type: "string" }, suggested_date: { type: "string" }, participants: { type: "string" } }, required: ["topic"] } },
        risk_mitigations: { type: "array", items: { type: "string" } },
        communication_plan: { type: "array", items: { type: "object", properties: { audience: { type: "string" }, message: { type: "string" }, channel: { type: "string" } }, required: ["audience", "message"] } },
        narrative: { type: "string" },
      },
      required: ["immediate_actions"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  return {
    meetingId,
    immediateActions: parsed.immediate_actions || [],
    followUpMeetings: parsed.follow_up_meetings || [],
    riskMitigations: parsed.risk_mitigations || [],
    communicationPlan: parsed.communication_plan || [],
    narrative: parsed.narrative || "",
  };
}

// ============================================================================
// Phase 8: Meeting AI Assistant — Conversational Q&A
// ============================================================================

export async function askMeetingAssistant(
  sessionId: string,
  question: string,
  userId?: string,
) {
  const db = await requireDb();
  /* parameterized queries below - no manual escaping needed */

  // Store user question
  await db.execute(sql`
    INSERT INTO ime_ai_conversations (session_id, user_id, role, content, created_at)
    VALUES (${sessionId}, ${userId || "anonymous"}, 'user', ${question}, NOW())
  `);

  // Get conversation history for context
  const historyRes = await db.execute(sql`
    SELECT role, content FROM ime_ai_conversations WHERE session_id = ${sessionId} ORDER BY created_at DESC LIMIT 10
  `);
  const history = (historyRes.rows as any[]).reverse();

  // Gather relevant meeting data for RAG context
  const recentMeetingsRes = await db.execute(sql`SELECT id, title, summary, meeting_date FROM meeting_records ORDER BY meeting_date DESC LIMIT 10`);
  const recentStatsRes = await db.execute(sql`SELECT COUNT(*) as total_meetings,
            AVG(mes.overall_score) as avg_effectiveness
     FROM meeting_records mr
     LEFT JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id`);
  const recentActionsRes = await db.execute(sql`SELECT content, assigned_to, status FROM ime_action_items ORDER BY created_at DESC LIMIT 10`);
  const recentDecisionsRes = await db.execute(sql`SELECT entity_value, related_speaker FROM ime_knowledge_entities WHERE entity_type = 'decision' ORDER BY extracted_at DESC LIMIT 10`);

  const ragContext = [
    `最近会议: ${(recentMeetingsRes.rows as any[]).map((m: any) => `${m.title}(${m.meeting_date ? new Date(m.meeting_date).toLocaleDateString("zh-CN") : ""})`).join(", ")}`,
    `统计: 总计${(recentStatsRes.rows as any[])[0]?.total_meetings || 0}次会议, 平均效能${Math.round(Number((recentStatsRes.rows as any[])[0]?.avg_effectiveness) || 0)}分`,
    `待办行动项: ${(recentActionsRes.rows as any[]).filter((a: any) => a.status !== "completed").map((a: any) => `${a.content}(${a.assigned_to})`).join("; ")}`,
    `近期决策: ${(recentDecisionsRes.rows as any[]).map((d: any) => d.entity_value).join("; ")}`,
  ].join("\n");

  const conversationMessages = history.map((h: any) => `${h.role === "user" ? "用户" : "助手"}: ${h.content}`).join("\n");

  const llmResult = await invokeLLM({
    system: `你是GRT智能会议助手。基于会议数据回答用户问题。提供准确、有帮助的回答。\n\n可用数据:\n${ragContext}`,
    prompt: `对话历史:\n${conversationMessages}\n\n用户问题: ${question}`,
    schema: {
      type: "object",
      properties: {
        answer: { type: "string" },
        referenced_meetings: { type: "array", items: { type: "string" } },
        suggestions: { type: "array", items: { type: "string" } },
      },
      required: ["answer"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;
  const answer = parsed.answer || "抱歉，无法回答此问题。";

  // Store assistant response
  await db.execute(sql`
    INSERT INTO ime_ai_conversations (session_id, user_id, role, content, context, created_at)
    VALUES (${sessionId}, ${userId || "anonymous"}, 'assistant', ${answer}, ${JSON.stringify({ referenced_meetings: parsed.referenced_meetings, suggestions: parsed.suggestions })}, NOW())
  `);

  return {
    answer,
    referencedMeetings: parsed.referenced_meetings || [],
    suggestions: parsed.suggestions || [],
  };
}

// ============================================================================
// Phase 9: Meeting Workflow Automation & Coaching
// ============================================================================

// Phase 9 — Feature 1: Create Workflow Rule
export async function createWorkflowRule(rule: {
  name: string;
  description?: string;
  triggerEvent: string;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  actionType: string;
  actionConfig?: any;
  scope?: string;
  scopeId?: string;
  createdBy?: string;
}) {
  const db = await requireDb();

  await db.execute(sql`
    INSERT INTO ime_workflow_rules (name, description, trigger_event, condition_field, condition_operator, condition_value, action_type, action_config, scope, scope_id, is_active, created_by, created_at, updated_at)
    VALUES (${rule.name}, ${rule.description || ""}, ${rule.triggerEvent}, ${rule.conditionField ?? null}, ${rule.conditionOperator ?? null}, ${rule.conditionValue ?? null}, ${rule.actionType}, ${JSON.stringify(rule.actionConfig || {})}, ${rule.scope || "global"}, ${rule.scopeId ?? null}, 1, ${rule.createdBy || "system"}, NOW(), NOW())
  `);

  return { success: true, name: rule.name };
}

// Phase 9 — Feature 2: Evaluate Workflow Rules for a Meeting Event
export async function evaluateWorkflowRules(meetingId: string, event: string) {
  const db = await requireDb();

  // Get active rules matching this event
  const rulesRes = await db.execute(sql`SELECT * FROM ime_workflow_rules WHERE trigger_event = ${event} AND is_active = 1 LIMIT 1000`);
  const rules = rulesRes.rows as any[];
  if (rules.length === 0) return { executed: 0, results: [] };

  // Gather meeting metrics for condition evaluation
  const healthRes = await db.execute(sql`SELECT * FROM ime_meeting_health WHERE meeting_id = ${meetingId} ORDER BY assessed_at DESC LIMIT 1`);
  const roiRes = await db.execute(sql`SELECT * FROM ime_meeting_roi WHERE meeting_id = ${meetingId} ORDER BY calculated_at DESC LIMIT 1`);
  const sentimentRes = await db.execute(sql`SELECT * FROM ime_meeting_sentiment WHERE meeting_id = ${meetingId} ORDER BY analyzed_at DESC LIMIT 1`);
  const effRes = await db.execute(sql`SELECT * FROM meeting_effectiveness_scores WHERE meeting_id = ${meetingId} LIMIT 1`);

  const metrics: Record<string, number | string> = {};
  const health = (healthRes.rows as any[])[0];
  const roi = (roiRes.rows as any[])[0];
  const sentiment = (sentimentRes.rows as any[])[0];
  const eff = (effRes.rows as any[])[0];

  if (health) { metrics.health_score = Number(health.health_score); metrics.fatigue_index = Number(health.fatigue_index); }
  if (roi) { metrics.roi_score = Number(roi.roi_score); metrics.roi_grade = roi.roi_grade; }
  if (sentiment) { metrics.overall_sentiment = Number(sentiment.overall_sentiment); metrics.tension_level = Number(sentiment.tension_level); }
  if (eff) { metrics.overall_score = Number(eff.overall_score); }

  const results: any[] = [];
  for (const rule of rules) {
    let conditionMet = true;

    if (rule.condition_field && rule.condition_operator && rule.condition_value !== null) {
      const actual = metrics[rule.condition_field];
      const threshold = Number(rule.condition_value);
      if (actual !== undefined) {
        const numActual = Number(actual);
        switch (rule.condition_operator) {
          case "<": conditionMet = numActual < threshold; break;
          case ">": conditionMet = numActual > threshold; break;
          case "<=": conditionMet = numActual <= threshold; break;
          case ">=": conditionMet = numActual >= threshold; break;
          case "==": conditionMet = String(actual) === rule.condition_value; break;
          case "!=": conditionMet = String(actual) !== rule.condition_value; break;
        }
      } else {
        conditionMet = false;
      }
    }

    const status = conditionMet ? "success" : "skipped";
    const actionResult = conditionMet
      ? { triggered: true, actionType: rule.action_type, config: JSON.parse(rule.action_config || "{}"), metricsAtTrigger: metrics }
      : { triggered: false, reason: "condition_not_met" };

    await db.execute(sql`
      INSERT INTO ime_workflow_executions (rule_id, rule_name, trigger_event, trigger_meeting_id, condition_snapshot, action_type, action_result, status, executed_at)
      VALUES (${rule.id}, ${rule.name || ""}, ${event}, ${meetingId}, ${JSON.stringify(metrics)}, ${rule.action_type}, ${JSON.stringify(actionResult)}, ${status}, NOW())
    `);

    results.push({ ruleId: rule.id, ruleName: rule.name, status, actionResult });
  }

  return { executed: results.filter(r => r.status === "success").length, total: rules.length, results };
}

// Phase 9 — Feature 3: Generate Coaching Plan (AI-powered)
export async function generateCoachingPlan(scope: string, scopeId?: string, period?: string) {
  const db = await requireDb();
  const periodDays = period === "quarterly" ? 90 : 30;
  const periodInterval = `${periodDays} days`;

  // Gather aggregate meeting data for the scope
  const scopeCondition: SQL = (scope === "department" && scopeId)
    ? sql`AND mr.channel_id IN (SELECT id FROM meeting_channels WHERE name LIKE ${`%${scopeId}%`})`
    : sql``;

  const meetingStatsRes = await db.execute(sql`
    SELECT COUNT(*) as total_meetings,
           AVG(mes.overall_score) as avg_effectiveness,
           AVG(mh.health_score) as avg_health,
           AVG(mh.fatigue_index) as avg_fatigue,
           AVG(mr2.roi_score) as avg_roi
    FROM meeting_records mr
    LEFT JOIN meeting_effectiveness_scores mes ON mr.id = mes.meeting_id
    LEFT JOIN ime_meeting_health mh ON mr.id = mh.meeting_id
    LEFT JOIN ime_meeting_roi mr2 ON mr.id = mr2.meeting_id
    WHERE mr.meeting_date >= NOW() - INTERVAL ${sql.raw(`'${periodInterval}'`)} ${scopeCondition}
  `);

  const actionRes = await db.execute(sql`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM ime_action_items
    WHERE created_at >= NOW() - INTERVAL ${sql.raw(`'${periodInterval}'`)}
  `);

  const sentimentRes = await db.execute(sql`
    SELECT AVG(overall_sentiment) as avg_sentiment,
           AVG(collaboration_score) as avg_collaboration,
           AVG(tension_level) as avg_tension
    FROM ime_meeting_sentiment
    WHERE analyzed_at >= NOW() - INTERVAL ${sql.raw(`'${periodInterval}'`)}
  `);

  const stats = (meetingStatsRes.rows as any[])[0] || {};
  const actions = (actionRes.rows as any[])[0] || {};
  const sentiments = (sentimentRes.rows as any[])[0] || {};

  const context = [
    `范围: ${scope}${scopeId ? ` (${scopeId})` : ""}, 周期: ${period || "monthly"} (${periodDays}天)`,
    `会议统计: ${stats.total_meetings || 0}次会议`,
    `平均效能: ${Math.round(Number(stats.avg_effectiveness) || 0)}分`,
    `平均健康度: ${Math.round(Number(stats.avg_health) || 0)}分`,
    `平均疲劳指数: ${Number(stats.avg_fatigue || 0).toFixed(1)}`,
    `平均ROI: ${Number(stats.avg_roi || 0).toFixed(1)}分`,
    `行动项完成率: ${actions.total ? Math.round((Number(actions.completed) / Number(actions.total)) * 100) : 0}%`,
    `平均情感: ${Number(sentiments.avg_sentiment || 0).toFixed(2)}, 协作: ${Number(sentiments.avg_collaboration || 0).toFixed(2)}, 紧张度: ${Number(sentiments.avg_tension || 0).toFixed(2)}`,
  ].join("\n");

  const llmResult = await invokeLLM({
    system: "你是会议文化教练。基于会议数据分析团队会议文化，提供改进建议和具体行动计划。",
    prompt: `请为以下团队生成会议教练计划:\n${context}`,
    schema: {
      type: "object",
      properties: {
        culture_score: { type: "number" },
        dimensions: {
          type: "object",
          properties: {
            punctuality: { type: "number" },
            engagement: { type: "number" },
            follow_through: { type: "number" },
            inclusivity: { type: "number" },
            efficiency: { type: "number" },
          },
        },
        strengths: { type: "array", items: { type: "string" } },
        improvements: {
          type: "array",
          items: {
            type: "object",
            properties: { area: { type: "string" }, recommendation: { type: "string" }, priority: { type: "string" }, expected_impact: { type: "string" } },
            required: ["area", "recommendation"],
          },
        },
        action_plan: {
          type: "array",
          items: {
            type: "object",
            properties: { step: { type: "string" }, owner: { type: "string" }, timeline: { type: "string" }, metric: { type: "string" } },
            required: ["step"],
          },
        },
        narrative: { type: "string" },
      },
      required: ["culture_score", "strengths", "improvements"],
    },
  });

  const parsed = typeof llmResult === "string" ? JSON.parse(llmResult) : llmResult;

  // Save coaching plan
  await db.execute(sql`
    INSERT INTO ime_coaching_plans (scope, scope_id, period, culture_score, dimensions, strengths, improvements, action_plan, ai_narrative, generated_at, created_at)
    VALUES (${scope}, ${scopeId ?? null}, ${period || "monthly"}, ${parsed.culture_score || 0}, ${JSON.stringify(parsed.dimensions || {})}, ${JSON.stringify(parsed.strengths || [])}, ${JSON.stringify(parsed.improvements || [])}, ${JSON.stringify(parsed.action_plan || [])}, ${parsed.narrative || ""}, NOW(), NOW())
  `);

  return {
    scope,
    scopeId,
    period: period || "monthly",
    cultureScore: parsed.culture_score || 0,
    dimensions: parsed.dimensions || {},
    strengths: parsed.strengths || [],
    improvements: parsed.improvements || [],
    actionPlan: parsed.action_plan || [],
    narrative: parsed.narrative || "",
  };
}

// Phase 9 — Feature 4: Meeting Culture Score
export async function getMeetingCultureScore(department?: string, period?: string) {
  const db = await requireDb();
  const periodDays = period === "quarterly" ? 90 : period === "yearly" ? 365 : 30;

  const dateInterval = `${periodDays} days`;

  // Effectiveness dimension
  const effRes = await db.execute(sql`
    SELECT AVG(overall_score) as avg, COUNT(*) as cnt FROM meeting_effectiveness_scores WHERE created_at >= NOW() - INTERVAL ${sql.raw(`'${dateInterval}'`)}
  `);
  // Health dimension
  const healthRes = await db.execute(sql`
    SELECT AVG(health_score) as avg_health, AVG(fatigue_index) as avg_fatigue FROM ime_meeting_health WHERE assessed_at >= NOW() - INTERVAL ${sql.raw(`'${dateInterval}'`)}
  `);
  // Action item follow-through
  const actionRes = await db.execute(sql`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed FROM ime_action_items WHERE created_at >= NOW() - INTERVAL ${sql.raw(`'${dateInterval}'`)}
  `);
  // Sentiment
  const sentRes = await db.execute(sql`
    SELECT AVG(overall_sentiment) as avg_sent, AVG(collaboration_score) as avg_collab FROM ime_meeting_sentiment WHERE analyzed_at >= NOW() - INTERVAL ${sql.raw(`'${dateInterval}'`)}
  `);
  // ROI
  const roiRes = await db.execute(sql`
    SELECT AVG(roi_score) as avg_roi FROM ime_meeting_roi WHERE calculated_at >= NOW() - INTERVAL ${sql.raw(`'${dateInterval}'`)}
  `);
  // Meeting volume
  const volRes = await db.execute(sql`
    SELECT COUNT(*) as cnt, AVG(duration_minutes) as avg_duration FROM meeting_records WHERE meeting_date >= NOW() - INTERVAL ${sql.raw(`'${dateInterval}'`)}
  `);

  const eff = (effRes.rows as any[])[0] || {};
  const hlth = (healthRes.rows as any[])[0] || {};
  const act = (actionRes.rows as any[])[0] || {};
  const sent = (sentRes.rows as any[])[0] || {};
  const roiData = (roiRes.rows as any[])[0] || {};
  const vol = (volRes.rows as any[])[0] || {};

  const effectiveness = Math.min(Number(eff.avg || 0), 100);
  const healthScore = Math.min(Number(hlth.avg_health || 0), 100);
  const followThrough = act.total > 0 ? Math.round((Number(act.completed) / Number(act.total)) * 100) : 50;
  const sentiment = Math.round(((Number(sent.avg_sent || 0) + 1) / 2) * 100); // normalize -1..1 to 0..100
  const collaboration = Math.round(Number(sent.avg_collab || 50));
  const roi = Math.min(Number(roiData.avg_roi || 0), 100);

  const cultureScore = Math.round((effectiveness * 0.25 + healthScore * 0.2 + followThrough * 0.2 + sentiment * 0.15 + collaboration * 0.1 + roi * 0.1) * 100) / 100;

  return {
    cultureScore,
    period: period || "monthly",
    dimensions: {
      effectiveness: Math.round(effectiveness),
      healthScore: Math.round(healthScore),
      followThrough,
      sentiment,
      collaboration,
      roi: Math.round(roi),
    },
    volume: {
      totalMeetings: Number(vol.cnt || 0),
      avgDuration: Math.round(Number(vol.avg_duration || 0)),
    },
    fatigueIndex: Number(hlth.avg_fatigue || 0).toFixed(1),
  };
}

// Phase 9 — Feature 5: Workflow Automation Dashboard
export async function getWorkflowDashboard(filters?: { limit?: number }) {
  const db = await requireDb();
  const limit = filters?.limit || 50;

  // Active rules
  const rulesRes = await db.execute(sql`SELECT * FROM ime_workflow_rules WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1000`);

  // Recent executions
  const execRes = await db.execute(sql`
    SELECT * FROM ime_workflow_executions ORDER BY executed_at DESC LIMIT ${limit}
  `);

  // Execution stats
  const statsRes = await db.execute(sql`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as succeeded,
           SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM ime_workflow_executions
    WHERE executed_at >= NOW() - INTERVAL '30 days'
  `);

  // Recent coaching plans
  const coachingRes = await db.execute(sql`SELECT * FROM ime_coaching_plans ORDER BY generated_at DESC LIMIT 5`);

  const stats = (statsRes.rows as any[])[0] || {};

  return {
    activeRules: rulesRes.rows,
    recentExecutions: execRes.rows,
    stats: {
      total: Number(stats.total || 0),
      succeeded: Number(stats.succeeded || 0),
      skipped: Number(stats.skipped || 0),
      failed: Number(stats.failed || 0),
    },
    recentCoachingPlans: coachingRes.rows,
  };
}

