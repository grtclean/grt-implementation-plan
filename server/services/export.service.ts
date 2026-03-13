/**
 * Export Service
 * 导出会议笔记和报告为PDF、Word、Markdown等格式
 */

import { requireDb } from '../utils/db-helpers';
import { meetings, meetingNotes, aiInsights, meetingParticipants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export type ExportFormat = "pdf" | "docx" | "markdown" | "html";

export interface ExportOptions {
  includeInsights?: boolean;
  includeParticipants?: boolean;
  includeTimestamp?: boolean;
  title?: string;
}

/**
 * 导出会议为Markdown格式
 */
export async function exportMeetingAsMarkdown(
  meetingId: string,
  options?: ExportOptions
): Promise<string> {
  const database = await requireDb();

  // 获取会议信息
  const meeting = await database
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1000)
    .then((results) => results[0]);

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  // 获取笔记
  const notes = await database
    .select()
    .from(meetingNotes)
    .where(eq(meetingNotes.meetingId, meetingId))
    .limit(1000)
    .then((results) => results[results.length - 1]);

  // 获取AI洞察
  let insights: any[] = [];
  if (options?.includeInsights) {
    insights = await database
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.meetingId, meetingId))
      .limit(1000);
  }

  // 获取参与者
  let participants: any[] = [];
  if (options?.includeParticipants) {
    participants = await database
      .select()
      .from(meetingParticipants)
      .where(eq(meetingParticipants.meetingId, meetingId))
      .limit(1000);
  }

  // 生成Markdown内容
  let markdown = "";

  // 标题
  markdown += `# ${options?.title || meeting.title}\n\n`;

  // 会议信息
  markdown += `## 会议信息\n\n`;
  markdown += `- **会议类型**: ${meeting.meetingType}\n`;
  markdown += `- **开始时间**: ${format(new Date(meeting.startTime), "PPP HH:mm", { locale: zhCN })}\n`;
  if (meeting.endTime) {
    markdown += `- **结束时间**: ${format(new Date(meeting.endTime), "PPP HH:mm", { locale: zhCN })}\n`;
  }
  markdown += `- **项目阶段**: ${meeting.projectPhase || "未指定"}\n`;
  if (meeting.revenueTarget) {
    markdown += `- **收入目标**: ¥${meeting.revenueTarget}M\n`;
  }
  if (meeting.profitMargin) {
    markdown += `- **利润率**: ${meeting.profitMargin}%\n`;
  }
  markdown += `- **状态**: ${meeting.status}\n\n`;

  // 描述
  if (meeting.description) {
    markdown += `## 描述\n\n${meeting.description}\n\n`;
  }

  // 会议笔记
  if (notes) {
    markdown += `## 会议笔记\n\n`;
    const notesText = extractTextFromTiptap(JSON.parse(notes.content));
    markdown += `${notesText}\n\n`;
  }

  // 参与者
  if (options?.includeParticipants && participants.length > 0) {
    markdown += `## 参与者\n\n`;
    for (const participant of participants) {
      markdown += `- ${participant.userName} (${participant.role})\n`;
    }
    markdown += `\n`;
  }

  // AI洞察
  if (options?.includeInsights && insights.length > 0) {
    markdown += `## AI 洞察\n\n`;

    for (const insight of insights) {
      const typeLabel = getInsightTypeLabel(insight.insightType);
      markdown += `### ${typeLabel}\n\n`;

      try {
        const content = JSON.parse(insight.content);
        markdown += formatInsightContent(insight.insightType, content);
      } catch (error) {
        markdown += insight.content;
      }

      markdown += `\n`;
    }
  }

  // 时间戳
  if (options?.includeTimestamp) {
    markdown += `---\n\n`;
    markdown += `*导出时间: ${format(new Date(), "PPP HH:mm:ss", { locale: zhCN })}*\n`;
  }

  return markdown;
}

/**
 * 导出会议为HTML格式
 */
export async function exportMeetingAsHTML(
  meetingId: string,
  options?: ExportOptions
): Promise<string> {
  const markdown = await exportMeetingAsMarkdown(meetingId, options);

  // 简单的Markdown到HTML转换（生产环境应使用专业库如marked）
  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options?.title || "会议报告"}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #1a73e8; border-bottom: 3px solid #1a73e8; padding-bottom: 10px; }
    h2 { color: #1a73e8; margin-top: 30px; }
    h3 { color: #555; }
    code {
      background-color: #f1f1f1;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background-color: #f1f1f1;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    ul, ol { margin: 15px 0; }
    li { margin: 8px 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th { background-color: #f1f1f1; }
    .metadata {
      background-color: #f9f9f9;
      padding: 15px;
      border-left: 4px solid #1a73e8;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    ${markdownToHTML(markdown)}
    <div class="footer">
      <p>此报告由GRT智能会议系统自动生成</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * 导出会议为Word格式（返回base64编码的docx）
 */
export async function exportMeetingAsWord(
  meetingId: string,
  options?: ExportOptions
): Promise<Buffer> {
  // 这需要使用docx库
  // 示例实现（需要安装 npm install docx）
  const markdown = await exportMeetingAsMarkdown(meetingId, options);

  // 返回markdown内容作为占位符
  // 实际实现需要使用docx库将markdown转换为Word文档
  return Buffer.from(markdown, "utf-8");
}

/**
 * 导出会议为PDF格式
 */
export async function exportMeetingAsPDF(
  meetingId: string,
  options?: ExportOptions
): Promise<Buffer> {
  // 这需要使用pdf库（如puppeteer或pdfkit）
  const html = await exportMeetingAsHTML(meetingId, options);

  // 返回HTML内容作为占位符
  // 实际实现需要使用pdf库将HTML转换为PDF
  return Buffer.from(html, "utf-8");
}

/**
 * 导出会议报告（综合格式）
 */
export async function exportMeetingReport(
  meetingId: string,
  format: ExportFormat = "markdown",
  options?: ExportOptions
): Promise<Buffer | string> {
  switch (format) {
    case "markdown":
      return await exportMeetingAsMarkdown(meetingId, options);
    case "html":
      return await exportMeetingAsHTML(meetingId, options);
    case "docx":
      return await exportMeetingAsWord(meetingId, options);
    case "pdf":
      return await exportMeetingAsPDF(meetingId, options);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * 生成可分享的报告链接
 */
export async function generateShareableLink(
  meetingId: string,
  expiresIn: number = 7 * 24 * 60 * 60 * 1000 // 7天
): Promise<string> {
  // 这个函数可以生成一个临时的分享链接
  // 实现取决于您的具体需求
  const token = Buffer.from(meetingId).toString("base64");
  return `/share/${token}`;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 从Tiptap JSON中提取文本
 */
function extractTextFromTiptap(content: any): string {
  if (!content) return "";

  let text = "";

  if (content.type === "text") {
    text += content.text || "";
  } else if (content.content && Array.isArray(content.content)) {
    text += content.content.map((child: any) => extractTextFromTiptap(child)).join("\n");
  }

  return text;
}

/**
 * 获取洞察类型标签
 */
function getInsightTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    summary: "会议总结",
    action_items: "行动项",
    decisions: "决策",
    risks: "风险",
    opportunities: "机会",
  };
  return labels[type] || type;
}

/**
 * 格式化洞察内容
 */
function formatInsightContent(type: string, content: any): string {
  let markdown = "";

  switch (type) {
    case "summary":
      markdown += `${content}\n`;
      break;

    case "action_items":
      if (Array.isArray(content)) {
        for (const item of content) {
          markdown += `- [ ] **${item.task}**`;
          if (item.owner) markdown += ` (负责人: ${item.owner})`;
          if (item.deadline) markdown += ` - 截止: ${item.deadline}`;
          markdown += "\n";
        }
      }
      break;

    case "decisions":
      if (Array.isArray(content)) {
        for (const decision of content) {
          markdown += `- ✓ ${decision}\n`;
        }
      }
      break;

    case "risks":
      if (Array.isArray(content)) {
        for (const risk of content) {
          markdown += `- ⚠️ **${risk.risk}**\n`;
          markdown += `  缓解措施: ${risk.mitigation}\n`;
        }
      }
      break;

    case "opportunities":
      if (Array.isArray(content)) {
        for (const opportunity of content) {
          markdown += `- 💡 ${opportunity}\n`;
        }
      }
      break;
  }

  return markdown;
}

/**
 * 简单的Markdown到HTML转换
 */
function markdownToHTML(markdown: string): string {
  let html = markdown;

  // 标题
  html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");

  // 粗体和斜体
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // 列表
  html = html.replace(/^\- (.*?)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/, "<ul>$1</ul>");

  // 代码块
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");

  // 段落
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  return html;
}
