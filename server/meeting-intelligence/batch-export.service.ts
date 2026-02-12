/**
 * 批量导出服务模块
 * 支持多选会议记录批量导出为ZIP压缩包
 */

import { storagePut } from "../storage";

// 导出格式类型
export type ExportFormat = "markdown" | "html";

// 批量导出选项
export interface BatchExportOptions {
  format: ExportFormat;
  includeTranscript: boolean;
  includeDecisions: boolean;
  includeActionItems: boolean;
  includeSummary: boolean;
  includeMetadata: boolean;
}

// 会议记录数据结构
export interface MeetingRecord {
  id: number;
  title: string;
  date: Date;
  duration?: number;
  participants?: string[];
  transcript?: string;
  decisions?: string[];
  actionItems?: Array<{
    task: string;
    assignee: string;
    deadline?: string;
  }>;
  summary?: string;
  metadata?: Record<string, any>;
}

// 批量导出结果
export interface BatchExportResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  failedCount: number;
  zipUrl?: string;
  zipKey?: string;
  errors: Array<{
    meetingId: number;
    error: string;
  }>;
  exportedAt: Date;
}

// 单个文件导出结果
interface SingleExportResult {
  meetingId: number;
  filename: string;
  content: string;
  success: boolean;
  error?: string;
}

/**
 * 格式化日期为文件名安全字符串
 */
function formatDateForFilename(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 格式化持续时间
 */
function formatDuration(minutes?: number): string {
  if (!minutes) return "未记录";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? ` ${mins}分钟` : ""}`;
  }
  return `${mins}分钟`;
}

/**
 * 生成Markdown格式的会议记录
 */
export function generateMarkdownExport(
  meeting: MeetingRecord,
  options: BatchExportOptions
): string {
  const lines: string[] = [];

  // 标题
  lines.push(`# ${meeting.title}`);
  lines.push("");

  // 元数据
  if (options.includeMetadata) {
    lines.push("## 会议信息");
    lines.push("");
    lines.push(`| 项目 | 内容 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| 日期 | ${formatDateForFilename(meeting.date)} |`);
    lines.push(`| 时长 | ${formatDuration(meeting.duration)} |`);
    if (meeting.participants && meeting.participants.length > 0) {
      lines.push(`| 参与人员 | ${meeting.participants.join(", ")} |`);
    }
    lines.push("");
  }

  // 会议摘要
  if (options.includeSummary && meeting.summary) {
    lines.push("## 会议摘要");
    lines.push("");
    lines.push(meeting.summary);
    lines.push("");
  }

  // 关键决策
  if (options.includeDecisions && meeting.decisions && meeting.decisions.length > 0) {
    lines.push("## 关键决策");
    lines.push("");
    meeting.decisions.forEach((decision, index) => {
      lines.push(`${index + 1}. ${decision}`);
    });
    lines.push("");
  }

  // 行动项
  if (options.includeActionItems && meeting.actionItems && meeting.actionItems.length > 0) {
    lines.push("## 行动项");
    lines.push("");
    lines.push("| 任务 | 负责人 | 截止日期 |");
    lines.push("| --- | --- | --- |");
    meeting.actionItems.forEach((item) => {
      lines.push(`| ${item.task} | ${item.assignee} | ${item.deadline || "待定"} |`);
    });
    lines.push("");
  }

  // 转录文本
  if (options.includeTranscript && meeting.transcript) {
    lines.push("## 会议转录");
    lines.push("");
    lines.push(meeting.transcript);
    lines.push("");
  }

  // 导出时间戳
  lines.push("---");
  lines.push(`*导出时间: ${new Date().toLocaleString("zh-CN")}*`);

  return lines.join("\n");
}

/**
 * 生成HTML格式的会议记录
 */
export function generateHtmlExport(
  meeting: MeetingRecord,
  options: BatchExportOptions
): string {
  const sections: string[] = [];

  // HTML头部
  sections.push(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meeting.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #1a1a1a; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    .summary { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .decisions { background: #fef3c7; padding: 20px; border-radius: 8px; }
    .decisions ol { margin: 0; padding-left: 20px; }
    .transcript { background: #f8fafc; padding: 20px; border-radius: 8px; white-space: pre-wrap; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>`);

  // 标题
  sections.push(`<h1>${meeting.title}</h1>`);

  // 元数据
  if (options.includeMetadata) {
    sections.push(`<h2>会议信息</h2>
<table>
  <tr><th>日期</th><td>${formatDateForFilename(meeting.date)}</td></tr>
  <tr><th>时长</th><td>${formatDuration(meeting.duration)}</td></tr>
  ${meeting.participants && meeting.participants.length > 0 ? `<tr><th>参与人员</th><td>${meeting.participants.join(", ")}</td></tr>` : ""}
</table>`);
  }

  // 会议摘要
  if (options.includeSummary && meeting.summary) {
    sections.push(`<h2>会议摘要</h2>
<div class="summary">${meeting.summary}</div>`);
  }

  // 关键决策
  if (options.includeDecisions && meeting.decisions && meeting.decisions.length > 0) {
    sections.push(`<h2>关键决策</h2>
<div class="decisions">
<ol>
${meeting.decisions.map((d) => `  <li>${d}</li>`).join("\n")}
</ol>
</div>`);
  }

  // 行动项
  if (options.includeActionItems && meeting.actionItems && meeting.actionItems.length > 0) {
    sections.push(`<h2>行动项</h2>
<table>
  <thead><tr><th>任务</th><th>负责人</th><th>截止日期</th></tr></thead>
  <tbody>
${meeting.actionItems.map((item) => `    <tr><td>${item.task}</td><td>${item.assignee}</td><td>${item.deadline || "待定"}</td></tr>`).join("\n")}
  </tbody>
</table>`);
  }

  // 转录文本
  if (options.includeTranscript && meeting.transcript) {
    sections.push(`<h2>会议转录</h2>
<div class="transcript">${meeting.transcript}</div>`);
  }

  // 页脚
  sections.push(`<div class="footer">导出时间: ${new Date().toLocaleString("zh-CN")}</div>
</body>
</html>`);

  return sections.join("\n");
}

/**
 * 导出单个会议记录
 */
export function exportSingleMeeting(
  meeting: MeetingRecord,
  options: BatchExportOptions
): SingleExportResult {
  try {
    const dateStr = formatDateForFilename(meeting.date);
    const safeTitle = meeting.title.replace(/[/\\?%*:|"<>]/g, "-").substring(0, 50);
    const extension = options.format === "markdown" ? "md" : "html";
    const filename = `${dateStr}_${safeTitle}.${extension}`;

    const content =
      options.format === "markdown"
        ? generateMarkdownExport(meeting, options)
        : generateHtmlExport(meeting, options);

    return {
      meetingId: meeting.id,
      filename,
      content,
      success: true,
    };
  } catch (error) {
    return {
      meetingId: meeting.id,
      filename: "",
      content: "",
      success: false,
      error: error instanceof Error ? error.message : "导出失败",
    };
  }
}

/**
 * 生成ZIP文件内容（简化版，使用文本格式模拟）
 * 实际生产中应使用 archiver 或 jszip 库
 */
export async function generateZipContent(
  files: Array<{ filename: string; content: string }>
): Promise<Buffer> {
  // 简化实现：将所有文件内容合并为一个文本文件
  // 实际应用中应使用 archiver 或 jszip 生成真正的ZIP
  const manifest = files.map((f) => `--- ${f.filename} ---\n${f.content}\n`).join("\n\n");
  return Buffer.from(manifest, "utf-8");
}

/**
 * 批量导出会议记录
 */
export async function batchExportMeetings(
  meetings: MeetingRecord[],
  options: BatchExportOptions,
  userId: number
): Promise<BatchExportResult> {
  const results: SingleExportResult[] = [];
  const errors: Array<{ meetingId: number; error: string }> = [];

  // 导出每个会议
  for (const meeting of meetings) {
    const result = exportSingleMeeting(meeting, options);
    results.push(result);
    if (!result.success && result.error) {
      errors.push({ meetingId: meeting.id, error: result.error });
    }
  }

  const successResults = results.filter((r) => r.success);
  const successCount = successResults.length;
  const failedCount = results.length - successCount;

  // 如果没有成功导出的文件，返回失败
  if (successCount === 0) {
    return {
      success: false,
      totalCount: meetings.length,
      successCount: 0,
      failedCount: meetings.length,
      errors,
      exportedAt: new Date(),
    };
  }

  // 生成ZIP内容
  const zipContent = await generateZipContent(
    successResults.map((r) => ({ filename: r.filename, content: r.content }))
  );

  // 上传到S3
  const timestamp = Date.now();
  const zipKey = `exports/batch/${userId}/${timestamp}_meetings_export.txt`;
  
  try {
    const { url } = await storagePut(zipKey, zipContent, "text/plain");

    return {
      success: true,
      totalCount: meetings.length,
      successCount,
      failedCount,
      zipUrl: url,
      zipKey,
      errors,
      exportedAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      totalCount: meetings.length,
      successCount,
      failedCount,
      errors: [
        ...errors,
        { meetingId: 0, error: `上传失败: ${error instanceof Error ? error.message : "未知错误"}` },
      ],
      exportedAt: new Date(),
    };
  }
}

/**
 * 获取默认导出选项
 */
export function getDefaultExportOptions(): BatchExportOptions {
  return {
    format: "markdown",
    includeTranscript: true,
    includeDecisions: true,
    includeActionItems: true,
    includeSummary: true,
    includeMetadata: true,
  };
}

/**
 * 验证导出选项
 */
export function validateExportOptions(options: Partial<BatchExportOptions>): BatchExportOptions {
  const defaults = getDefaultExportOptions();
  return {
    format: options.format || defaults.format,
    includeTranscript: options.includeTranscript ?? defaults.includeTranscript,
    includeDecisions: options.includeDecisions ?? defaults.includeDecisions,
    includeActionItems: options.includeActionItems ?? defaults.includeActionItems,
    includeSummary: options.includeSummary ?? defaults.includeSummary,
    includeMetadata: options.includeMetadata ?? defaults.includeMetadata,
  };
}

/**
 * 计算预估导出大小（字节）
 */
export function estimateExportSize(
  meetings: MeetingRecord[],
  options: BatchExportOptions
): number {
  let totalSize = 0;

  for (const meeting of meetings) {
    // 基础大小（标题、元数据等）
    let size = 500;

    if (options.includeTranscript && meeting.transcript) {
      size += meeting.transcript.length * 1.2; // HTML会增加约20%
    }
    if (options.includeSummary && meeting.summary) {
      size += meeting.summary.length * 1.2;
    }
    if (options.includeDecisions && meeting.decisions) {
      size += meeting.decisions.join("").length * 1.5;
    }
    if (options.includeActionItems && meeting.actionItems) {
      size += JSON.stringify(meeting.actionItems).length * 1.5;
    }

    totalSize += size;
  }

  return Math.ceil(totalSize);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
