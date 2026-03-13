/**
 * AI Insights Service
 * 使用Gemini 1.5 Pro进行会议分析和洞察生成
 */

import { invokeLLM } from "../_core/llm";
import { requireDb } from '../utils/db-helpers';
import { v4 as uuidv4 } from "uuid";
import { aiInsights, meetingNotes, meetings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ai-insights");

export interface AIInsightRequest {
  meetingId: string;
  insightTypes: ("summary" | "action_items" | "decisions" | "risks" | "opportunities")[];
}

export interface AIInsightResponse {
  summary?: string;
  actionItems?: Array<{
    task: string;
    owner?: string;
    deadline?: string;
    priority?: "high" | "medium" | "low";
  }>;
  decisions?: string[];
  risks?: Array<{
    risk: string;
    mitigation: string;
    severity?: "high" | "medium" | "low";
  }>;
  opportunities?: string[];
}

/**
 * 生成会议AI洞察
 */
export async function generateMeetingInsights(
  request: AIInsightRequest,
  userId: number
): Promise<AIInsightResponse> {
  const database = await requireDb();

  // 获取会议信息
  const meeting = await database
    .select()
    .from(meetings)
    .where(eq(meetings.id, request.meetingId))
    .limit(1000)
    .then((results) => results[0]);

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  // 获取会议笔记
  const notes = await database
    .select()
    .from(meetingNotes)
    .where(eq(meetingNotes.meetingId, request.meetingId))
    .orderBy((t) => t.updatedAt)
    .then((results) => results[results.length - 1]); // 获取最新版本

  if (!notes) {
    throw new Error("Meeting notes not found");
  }

  // 提取笔记内容
  const notesContent = extractTextFromTiptap(notes.content);

  // 构建系统提示
  const systemPrompt = buildSystemPrompt(meeting);

  // 构建用户提示
  const userPrompt = buildUserPrompt(meeting, notesContent, request.insightTypes);

  try {
    // 调用Gemini API
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "meeting_insights",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "Executive summary of the meeting",
              },
              actionItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task: { type: "string" },
                    owner: { type: "string" },
                    deadline: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["task"],
                },
              },
              decisions: {
                type: "array",
                items: { type: "string" },
              },
              risks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    risk: { type: "string" },
                    mitigation: { type: "string" },
                    severity: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["risk", "mitigation"],
                },
              },
              opportunities: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["summary"],
          },
        },
      },
    });

    // 解析响应
    const insightsText =
      typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : JSON.stringify(response.choices[0].message.content);

    const insights: AIInsightResponse = JSON.parse(insightsText);

    // 存储洞察到数据库
    await storeInsights(request.meetingId, insights);

    return insights;
  } catch (error) {
    log.error({ err: error }, "Error generating AI insights");
    throw error;
  }
}

/**
 * 存储AI洞察到数据库
 */
async function storeInsights(
  meetingId: string,
  insights: AIInsightResponse
): Promise<void> {
  const database = await requireDb();

  const insightsToStore = [];

  if (insights.summary) {
    insightsToStore.push({
      id: uuidv4(),
      meetingId,
      insightType: "summary" as const,
      content: insights.summary,
      confidenceScore: "0.95",
      generatedBy: "gemini-1.5-pro",
    });
  }

  if (insights.actionItems && insights.actionItems.length > 0) {
    insightsToStore.push({
      id: uuidv4(),
      meetingId,
      insightType: "action_items" as const,
      content: JSON.stringify(insights.actionItems),
      confidenceScore: "0.90",
      generatedBy: "gemini-1.5-pro",
    });
  }

  if (insights.decisions && insights.decisions.length > 0) {
    insightsToStore.push({
      id: uuidv4(),
      meetingId,
      insightType: "decisions" as const,
      content: JSON.stringify(insights.decisions),
      confidenceScore: "0.92",
      generatedBy: "gemini-1.5-pro",
    });
  }

  if (insights.risks && insights.risks.length > 0) {
    insightsToStore.push({
      id: uuidv4(),
      meetingId,
      insightType: "risks" as const,
      content: JSON.stringify(insights.risks),
      confidenceScore: "0.88",
      generatedBy: "gemini-1.5-pro",
    });
  }

  if (insights.opportunities && insights.opportunities.length > 0) {
    insightsToStore.push({
      id: uuidv4(),
      meetingId,
      insightType: "opportunities" as const,
      content: JSON.stringify(insights.opportunities),
      confidenceScore: "0.85",
      generatedBy: "gemini-1.5-pro",
    });
  }

  // 批量插入
  if (insightsToStore.length > 0) {
    await database.insert(aiInsights).values(insightsToStore);
  }
}

/**
 * 构建系统提示
 */
function buildSystemPrompt(meeting: any): string {
  return `You are an expert business analyst for GRT, an industrial cleaning equipment manufacturer.

Context:
- Organization: GRT (工业清洁设备制造商)
- Annual Revenue Target: 50M USD
- Profit Margin Target: 14%
- Project Lifecycle: M0-M12 phases
- Current Meeting: ${meeting.title}
- Meeting Type: ${meeting.meetingType}
- Project Phase: ${meeting.projectPhase || "Not specified"}

Your task is to analyze the meeting notes and provide comprehensive insights.

Guidelines:
1. Always link recommendations to the 50M revenue target and 14% profit margin goal
2. Use M0-M12 project phase terminology when applicable
3. Identify actionable items with clear owners and deadlines
4. Highlight risks and mitigation strategies
5. Identify opportunities for revenue/margin improvement
6. Provide an executive summary (2-3 sentences)
7. Format all responses as JSON

Be concise, professional, and focused on business impact.`;
}

/**
 * 构建用户提示
 */
function buildUserPrompt(
  meeting: any,
  notesContent: string,
  insightTypes: string[]
): string {
  const requestedInsights = insightTypes.join(", ");

  return `Please analyze the following meeting notes and provide the requested insights: ${requestedInsights}

Meeting Details:
- Title: ${meeting.title}
- Type: ${meeting.meetingType}
- Project Phase: ${meeting.projectPhase || "Not specified"}
- Revenue Target: ${meeting.revenueTarget || "Not specified"}
- Profit Margin Target: ${meeting.profitMargin || "Not specified"}%

Meeting Notes:
${notesContent}

Please provide insights in the following format:
- Summary: 2-3 sentence executive summary
- Action Items: List of tasks with owners and deadlines
- Decisions: Key decisions made
- Risks: Identified risks with mitigation strategies
- Opportunities: Opportunities for improvement

Focus on business impact and alignment with GRT's strategic goals.`;
}

/**
 * 从Tiptap JSON中提取文本
 */
function extractTextFromTiptap(content: string): string {
  try {
    const doc = JSON.parse(content);
    return extractTextFromNode(doc);
  } catch (error) {
    log.error({ err: error }, "Error parsing Tiptap content");
    return content;
  }
}

/**
 * 递归提取文本节点
 */
function extractTextFromNode(node: any): string {
  if (!node) return "";

  let text = "";

  if (node.type === "text") {
    text += node.text || "";
  } else if (node.content && Array.isArray(node.content)) {
    text += node.content.map((child: any) => extractTextFromNode(child)).join("");
  }

  return text;
}

/**
 * 获取会议的所有洞察
 */
export async function getMeetingInsights(meetingId: string): Promise<any[]> {
  const database = await requireDb();

  return database
    .select()
    .from(aiInsights)
    .where(eq(aiInsights.meetingId, meetingId))
    .limit(1000);
}

/**
 * 流式生成AI洞察（用于实时显示）
 */
export async function streamMeetingInsights(
  request: AIInsightRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  const database = await requireDb();

  // 获取会议信息
  const meeting = await database
    .select()
    .from(meetings)
    .where(eq(meetings.id, request.meetingId))
    .limit(1000)
    .then((results) => results[0]);

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  // 获取会议笔记
  const notes = await database
    .select()
    .from(meetingNotes)
    .where(eq(meetingNotes.meetingId, request.meetingId))
    .limit(1000)
    .then((results) => results[results.length - 1]);

  if (!notes) {
    throw new Error("Meeting notes not found");
  }

  const notesContent = extractTextFromTiptap(notes.content);
  const systemPrompt = buildSystemPrompt(meeting);
  const userPrompt = buildUserPrompt(meeting, notesContent, request.insightTypes);

  try {
    // 调用Gemini API进行流式生成
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // 模拟流式响应
    const content =
      typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : JSON.stringify(response.choices[0].message.content);

    // 分块发送
    const chunks = content.match(/.{1,100}/g) || [];
    for (const chunk of chunks) {
      onChunk(chunk);
      // 模拟流式延迟
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } catch (error) {
    log.error({ err: error }, "Error streaming AI insights");
    throw error;
  }
}
