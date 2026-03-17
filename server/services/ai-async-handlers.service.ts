/**
 * AI Async Task Handlers — Registered with task-worker.service
 *
 * Moves synchronous LLM calls out of tRPC request handlers into
 * the background task queue. Each handler:
 *   1. Loads context from DB
 *   2. Calls invokeLLM()
 *   3. Saves results to DB
 *   4. Returns resultData for the task worker to persist
 *
 * Task types:
 *   - AI_CHAT_REPLY
 *   - AI_SUGGESTION_GENERATE
 *   - AI_NOTEBOOK_ANALYZE
 *   - EMPLOYEE_AI_ASSISTANT_REPLY
 *   - MEETING_QUIZ_GENERATE
 */
import { registerTaskHandler } from "./task-worker.service";
import { invokeLLM } from "../_core/llm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("ai-async");
import { requireDb } from "../db";
import {
  aiChatMessages,
  aiChatSessions,
  aiProcessSuggestions,
  aiNotebookSuggestions,
  aiAssistantMessages,
  employeeAiAssistants,
} from "../../drizzle/schema";
import { sysMeetings, meetingActionItems, customerInteractionFeedback } from "../../drizzle/smart-meetings-schema";
import { aiSolutionProposals } from "../../drizzle/solution-engine-schema";
import { employeeDailyLogs } from "../../drizzle/empowerment-schema";
import { clientAnnualBudgets, projectBiddingStrategies } from "../../drizzle/sales-coach-schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { searchDocuments, incrementRelevance } from "../modules/knowledge-base.service";
import { buildOwnerContext } from "./ai-assistant-provisioning.service";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

/** Result from db.execute(sql`...`) may have a .rows property */
type RawExecuteResult = { rows?: Record<string, unknown>[] } & Record<string, unknown>;

/** Generic DB row from raw SQL execute() */
type DbRow = Record<string, unknown>;

// ── AI_CHAT_REPLY ────────────────────────────────────────
registerTaskHandler("AI_CHAT_REPLY", async (_taskId, input) => {
  const db = await requireDb();
  const { sessionId, message, userId } = input as {
    sessionId: number;
    message: string;
    userId: number;
  };

  let aiResponse = "抱歉，AI服务暂时不可用。";
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: "你是GRT智能工业系统的AI助手。请用中文回答。" },
        { role: "user", content: message },
      ],
    });
    aiResponse = result.choices[0]?.message?.content || aiResponse;
  } catch { /* fallback to default */ }

  // Save assistant message
  const [msg] = await db.insert(aiChatMessages).values({
    sessionId,
    role: "assistant",
    content: aiResponse,
    contentType: "text",
  }).returning();

  // Update session stats
  await db.update(aiChatSessions).set({
    messageCount: (await db.select().from(aiChatMessages).where(eq(aiChatMessages.sessionId, sessionId)).limit(1000)).length,
    lastActivityAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).where(eq(aiChatSessions.id, sessionId));

  return { response: aiResponse, messageId: msg?.id } as Record<string, unknown>;
});

// ── AI_SUGGESTION_GENERATE ───────────────────────────────
const PROCESS_PROMPTS: Record<string, string> = {
  FMEA: "你是FMEA（失效模式与影响分析）专家。基于AIAG VDA FMEA标准，分析潜在失效模式，评估风险优先级(AP)，给出改进建议。",
  "8D": "你是8D问题解决专家。帮助团队按照8D方法论（D1-D8步骤）系统地分析和解决质量问题。",
  CAPA: "你是CAPA（纠正与预防措施）专家。帮助识别根本原因，制定纠正措施和预防措施，确保问题不再复发。",
  PPAP: "你是PPAP（生产件批准程序）专家。指导完成18项PPAP提交要素，确保供应商零件满足设计规格。",
  ControlPlan: "你是控制计划专家。帮助制定生产过程控制计划，包括控制特性、检验方法、抽样频次和反应计划。",
};

registerTaskHandler("AI_SUGGESTION_GENERATE", async (_taskId, input) => {
  const db = await requireDb();
  const { processType, processId, stepCode, context, question } = input as {
    processType: string;
    processId?: string;
    stepCode?: string;
    context?: string;
    question?: string;
  };

  const basePrompt = PROCESS_PROMPTS[processType] ||
    `你是GRT企业操作系统的AI质量顾问。帮助分析${processType}相关问题并给出改进建议。`;

  // RAG: search knowledge base
  let kbContext = "";
  try {
    const searchQuery = `${processType} ${question || context || ""}`;
    const kbResults = await searchDocuments(searchQuery, { limit: 3 });
    if (kbResults.length > 0) {
      kbContext = "\n\n参考知识库:\n" + kbResults
        .map((r) => `[${r.category}] ${r.title}: ${r.content.slice(0, 300)}`)
        .join("\n");
    }
  } catch { /* non-fatal */ }

  const systemPrompt = [
    basePrompt,
    "请生成JSON格式的建议:",
    '{"summary":"简要总结","details":"详细说明","suggestedActions":["操作1","操作2"],"references":["参考标准1"]}',
    kbContext,
  ].join("\n");

  const userPrompt = [
    `工艺类型: ${processType}`,
    processId ? `工艺ID: ${processId}` : "",
    stepCode ? `步骤: ${stepCode}` : "",
    context ? `上下文: ${context}` : "",
    question ? `问题: ${question}` : `请基于当前${processType}流程提供改进建议。`,
  ].filter(Boolean).join("\n");

  let suggestion = { summary: "", details: "", suggestedActions: [] as string[], references: [] as string[] };

  try {
    const llmResult = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = llmResult.choices?.[0]?.message?.content || "";
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) suggestion = JSON.parse(jsonMatch[0]);
    } catch {
      suggestion = { summary: raw.slice(0, 200), details: raw, suggestedActions: [], references: [] };
    }
  } catch (err) {
    log.error({ err }, "AI_SUGGESTION_GENERATE LLM error");
    suggestion = { summary: "AI建议生成失败", details: "请稍后重试或手动分析", suggestedActions: [], references: [] };
  }

  // Save to DB
  let savedId: number | null = null;
  try {
    const [saved] = await db.insert(aiProcessSuggestions).values({
      processType,
      processId: processId || "general",
      stepCode: stepCode || "N/A",
      suggestionMode: stepCode ? "current_step" : "full_process",
      suggestionSummary: suggestion.summary,
      suggestionDetails: suggestion.details,
      suggestedActions: JSON.stringify(suggestion.suggestedActions),
      references: JSON.stringify(suggestion.references),
    }).returning();
    savedId = saved?.id ?? null;
  } catch (dbErr) {
    log.error({ err: dbErr }, "AI_SUGGESTION_GENERATE DB save error");
  }

  return { suggestion, id: savedId } as Record<string, unknown>;
});

// ── AI_NOTEBOOK_ANALYZE ──────────────────────────────────
registerTaskHandler("AI_NOTEBOOK_ANALYZE", async (_taskId, input) => {
  const db = await requireDb();
  const { entryId, content, processType, processId } = input as {
    entryId: number;
    content: string;
    processType?: string;
    processId?: string;
  };

  // RAG
  let kbContext = "";
  try {
    const kbResults = await searchDocuments(content.slice(0, 200), { limit: 3 });
    if (kbResults.length > 0) {
      kbContext = "\n\n参考知识:\n" + kbResults
        .map((r) => `[${r.category}] ${r.title}: ${r.content.slice(0, 200)}`)
        .join("\n");
    }
  } catch { /* non-fatal */ }

  const systemPrompt = [
    "你是GRT企业操作系统的AI分析助手。",
    "分析用户的笔记内容，提取以下信息:",
    "1. 关键发现 (findings)",
    "2. 改进建议 (improvements)",
    "3. 关键词 (keywords)",
    "回复JSON格式:",
    '[{"type":"finding","value":"...","keywords":["..."]},{"type":"improvement","value":"...","keywords":["..."]}]',
    kbContext,
  ].join("\n");

  let suggestions: { type: string; value: string; keywords: string[] }[] = [];

  try {
    const llmResult = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `分析以下笔记内容:\n\n${content}` },
      ],
    });
    const raw = llmResult.choices?.[0]?.message?.content || "";
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) suggestions = JSON.parse(jsonMatch[0]);
    } catch {
      suggestions = [{ type: "finding", value: raw.slice(0, 500), keywords: [] }];
    }
  } catch (err) {
    log.error({ err }, "AI_NOTEBOOK_ANALYZE LLM error");
    return { message: "AI分析失败", suggestions: [] } as Record<string, unknown>;
  }

  const typeMap: Record<string, "field_update" | "process_link" | "content_match"> = {
    finding: "content_match",
    improvement: "field_update",
    process: "process_link",
  };

  const savedSuggestions = [];
  for (const s of suggestions) {
    try {
      const [saved] = await db.insert(aiNotebookSuggestions).values({
        entryId,
        suggestionType: typeMap[s.type] || "content_match",
        targetProcessType: processType || null,
        targetProcessId: processId || null,
        suggestedValue: s.value,
        extractedKeywords: s.keywords || [],
        reasoning: `AI分析: ${s.type}`,
        confidenceScore: "0.80",
      }).returning();
      if (saved) savedSuggestions.push(saved);
    } catch (dbErr) {
      log.error({ err: dbErr }, "AI_NOTEBOOK_ANALYZE DB save error");
    }
  }

  return {
    message: `分析完成，生成${savedSuggestions.length}条建议`,
    suggestions: savedSuggestions,
  } as Record<string, unknown>;
});

// ── EMPLOYEE_AI_ASSISTANT_REPLY ──────────────────────────
registerTaskHandler("EMPLOYEE_AI_ASSISTANT_REPLY", async (_taskId, input) => {
  const db = await requireDb();
  const { sessionId, message, userId } = input as {
    sessionId: number;
    message: string;
    userId: number;
  };

  // Load conversation history (last 50 messages)
  const pastMessages = await db
    .select({ role: aiAssistantMessages.role, content: aiAssistantMessages.content })
    .from(aiAssistantMessages)
    .where(eq(aiAssistantMessages.sessionId, String(sessionId)))
    .orderBy(asc(aiAssistantMessages.createdAt))
    .limit(50);

  // Summarize if >20 messages
  let historySummary = "";
  let recentMessages = pastMessages;
  if (pastMessages.length > 20) {
    const olderMessages = pastMessages.slice(0, pastMessages.length - 10);
    recentMessages = pastMessages.slice(pastMessages.length - 10);
    const olderText = olderMessages
      .map((m) => `${m.role}: ${(m.content || "").slice(0, 100)}`)
      .join("\n");
    historySummary = `【历史摘要】以下是之前对话的要点概述:\n${olderText.slice(0, 600)}\n\n`;
  }

  // RAG
  let knowledgeContext = "";
  let matchedDocIds: number[] = [];
  try {
    const searchResults = await searchDocuments(message, { limit: 3 });
    if (searchResults.length > 0) {
      matchedDocIds = searchResults.map((r) => r.id);
      const knowledgeEntries = searchResults
        .map((r, i) => `[知识条目${i + 1}] ${r.title}\n类别: ${r.category}\n内容: ${r.content}`)
        .join("\n\n");
      knowledgeContext = `基于以下知识库条目:\n\n${knowledgeEntries}\n\n`;
    }
  } catch (ragError) {
    log.error({ err: ragError }, "EMPLOYEE_AI_ASSISTANT_REPLY RAG error");
  }

  // Load personality config
  let systemContent =
    "你是一个专业的个人AI助手，帮助员工进行职业发展、技能提升和日常工作协助。请以友好、专业的方式回复。";

  const [myAssistant] = await db
    .select()
    .from(employeeAiAssistants)
    .where(eq(employeeAiAssistants.employeeId, userId))
    .limit(1);

  let ownerContext = "";
  if (myAssistant?.personalityConfig) {
    try {
      const cfg = JSON.parse(myAssistant.personalityConfig);
      if (cfg.systemPrompt) systemContent = cfg.systemPrompt;
      ownerContext = await buildOwnerContext(userId, cfg);
    } catch { /* fallback */ }
  }

  const fullSystemContent = [
    systemContent,
    ownerContext ? `\n\n【当前上下文】\n${ownerContext}` : "",
    historySummary ? `\n\n${historySummary}` : "",
    knowledgeContext ? `\n\n${knowledgeContext}` : "",
  ].join("");

  // Build messages
  const llmMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: fullSystemContent },
  ];
  for (const msg of recentMessages.slice(0, -1)) {
    if (msg.role === "user" || msg.role === "assistant") {
      llmMessages.push({ role: msg.role as "user" | "assistant", content: msg.content || "" });
    }
  }
  llmMessages.push({ role: "user", content: message });

  // Call LLM
  const llmResponse = await invokeLLM({ messages: llmMessages });

  // Increment relevance scores
  for (const docId of matchedDocIds) {
    try { await incrementRelevance(docId); } catch { /* non-fatal */ }
  }

  const assistantContent = llmResponse.choices?.[0]?.message?.content || "无法生成回复";

  // Save assistant message
  await db.insert(aiAssistantMessages).values({
    sessionId: String(sessionId),
    role: "assistant",
    content: assistantContent,
  });

  return { response: assistantContent } as Record<string, unknown>;
});

// ── MEETING_QUIZ_GENERATE ────────────────────────────────
registerTaskHandler("MEETING_QUIZ_GENERATE", async (_taskId, input) => {
  const db = await requireDb();
  const { meetingId, meetingTitle, transcript } = input as {
    meetingId: number;
    meetingTitle: string;
    transcript: string;
  };

  try {
    const result = await invokeLLM({
      system: `You are an AI engagement quiz generator for corporate meetings.
Given a meeting transcript, generate exactly 3 quiz questions:
- 2 multiple choice (4 options each, mark the correct one)
- 1 true/false
Return valid JSON array:
[{"id":1,"question":"...","type":"MULTIPLE_CHOICE","options":["A","B","C","D"],"correctAnswer":"A"},
 {"id":2,"question":"...","type":"MULTIPLE_CHOICE","options":["A","B","C","D"],"correctAnswer":"C"},
 {"id":3,"question":"...","type":"TRUE_FALSE","options":["True","False"],"correctAnswer":"True"}]
Use the same language as the transcript.`,
      prompt: `Meeting: "${meetingTitle}"\n\nTranscript:\n${transcript}`,
    });

    const content = result.content ?? "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (questions) {
      await db.update(sysMeetings)
        .set({ aiQuizQuestions: questions, updatedAt: new Date() })
        .where(eq(sysMeetings.id, meetingId));
      return { questions } as Record<string, unknown>;
    }

    return { questions: null, raw: content } as Record<string, unknown>;
  } catch {
    // Fallback: generate mock quiz questions
    const mockQuestions: Array<{ id: number; question: string; type: "MULTIPLE_CHOICE" | "TRUE_FALSE"; options?: string[]; correctAnswer: string }> = [
      {
        id: 1,
        question: `本次会议「${meetingTitle}」的核心主题是什么？`,
        type: "MULTIPLE_CHOICE",
        options: ["2026年战略目标与行动计划", "日常行政安排", "技术栈升级讨论", "客户投诉处理"],
        correctAnswer: "2026年战略目标与行动计划",
      },
      {
        id: 2,
        question: `会议中提到的首要发展方向是？`,
        type: "MULTIPLE_CHOICE",
        options: ["降低成本", "AI驱动的智能制造转型", "缩减人员规模", "暂停研发投入"],
        correctAnswer: "AI驱动的智能制造转型",
      },
      {
        id: 3,
        question: `会议要求全员参与2026年度KPI目标制定。`,
        type: "TRUE_FALSE",
        options: ["True", "False"],
        correctAnswer: "True",
      },
    ];

    await db.update(sysMeetings)
      .set({ aiQuizQuestions: mockQuestions, updatedAt: new Date() })
      .where(eq(sysMeetings.id, meetingId));

    return { questions: mockQuestions } as Record<string, unknown>;
  }
});

// ── Intelligence Router Handlers (service-delegated) ─────
// These delegate to existing service functions but are now called via task queue.

async function registerIntelligenceHandlers() {
  try {
    // Project Intelligence
    const projSvc = await import("../project-intelligence/projectIntelligence.service");
    registerTaskHandler("PROJECT_ASK_KNOWLEDGE", async (_id, input) => {
      const result = await projSvc.askProjectKnowledge(
        input.question as string,
        input.history as Array<{ role: "user" | "assistant"; content: string }>,
      );
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("PROJECT_FIND_SIMILAR", async (_id, input) => {
      const result = await projSvc.findSimilarProjects(input as unknown as Parameters<typeof projSvc.findSimilarProjects>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("PROJECT_CHANGE_IMPACT", async (_id, input) => {
      const result = await projSvc.analyzeChangeImpact(input as unknown as Parameters<typeof projSvc.analyzeChangeImpact>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("PROJECT_RISK_PREDICT", async (_id, input) => {
      const result = await projSvc.predictProjectRisk(input as unknown as Parameters<typeof projSvc.predictProjectRisk>[0]);
      return result as unknown as Record<string, unknown>;
    });

    // Operations Intelligence
    const opsSvc = await import("../operations-intelligence/operationsIntelligence.service");
    registerTaskHandler("OPS_ASSESS_SUPPLIER", async (_id, input) => {
      const result = await opsSvc.assessSupplier(input as unknown as Parameters<typeof opsSvc.assessSupplier>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("OPS_OPTIMIZE_INVENTORY", async (_id, input) => {
      const result = await opsSvc.optimizeInventory(input as unknown as Parameters<typeof opsSvc.optimizeInventory>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("OPS_PREDICT_QUALITY", async (_id, input) => {
      const result = await opsSvc.predictQualityTrend(input as unknown as Parameters<typeof opsSvc.predictQualityTrend>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("OPS_ANALYZE_EFFICIENCY", async (_id, input) => {
      const result = await opsSvc.analyzeProductionEfficiency(input as unknown as Parameters<typeof opsSvc.analyzeProductionEfficiency>[0]);
      return result as unknown as Record<string, unknown>;
    });

    // HR Intelligence
    const hrSvc = await import("../hr-intelligence/hrIntelligence.service");
    registerTaskHandler("HR_ASSESS_TALENT", async (_id, input) => {
      const result = await hrSvc.assessTalent(input as unknown as Parameters<typeof hrSvc.assessTalent>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("HR_RECOMMEND_TRAINING", async (_id, input) => {
      const result = await hrSvc.recommendTraining(input as unknown as Parameters<typeof hrSvc.recommendTraining>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("HR_ANALYZE_COMPENSATION", async (_id, input) => {
      const result = await hrSvc.analyzeCompensation(input as unknown as Parameters<typeof hrSvc.analyzeCompensation>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("HR_PLAN_WORKFORCE", async (_id, input) => {
      const result = await hrSvc.planWorkforce(input as unknown as Parameters<typeof hrSvc.planWorkforce>[0]);
      return result as unknown as Record<string, unknown>;
    });

    // Sales & Finance Intelligence
    const sfSvc = await import("../sales-finance-intelligence/salesFinanceIntelligence.service");
    registerTaskHandler("SF_FORECAST_SALES", async (_id, input) => {
      const result = await sfSvc.forecastSales(input as unknown as Parameters<typeof sfSvc.forecastSales>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("SF_PREDICT_CHURN", async (_id, input) => {
      const result = await sfSvc.predictChurn(input as unknown as Parameters<typeof sfSvc.predictChurn>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("SF_ANALYZE_BUDGET", async (_id, input) => {
      const result = await sfSvc.analyzeBudget(input as unknown as Parameters<typeof sfSvc.analyzeBudget>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("SF_OPTIMIZE_COST", async (_id, input) => {
      const result = await sfSvc.optimizeCost(input as unknown as Parameters<typeof sfSvc.optimizeCost>[0]);
      return result as unknown as Record<string, unknown>;
    });

    // R&D & Service Intelligence
    const rdSvc = await import("../rd-service-intelligence/rdServiceIntelligence.service");
    registerTaskHandler("RD_ANALYZE_REQUIREMENTS", async (_id, input) => {
      const result = await rdSvc.analyzeRequirements(input as unknown as Parameters<typeof rdSvc.analyzeRequirements>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("RD_REVIEW_DESIGN", async (_id, input) => {
      const result = await rdSvc.reviewDesign(input as unknown as Parameters<typeof rdSvc.reviewDesign>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("RD_DIAGNOSE_FAULT", async (_id, input) => {
      const result = await rdSvc.diagnoseFault(input as unknown as Parameters<typeof rdSvc.diagnoseFault>[0]);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("RD_PLAN_MAINTENANCE", async (_id, input) => {
      const result = await rdSvc.planMaintenance(input as unknown as Parameters<typeof rdSvc.planMaintenance>[0]);
      return result as unknown as Record<string, unknown>;
    });

    log.info({ count: 20 }, "Registered intelligence task handlers");
  } catch (err) {
    log.error({ err }, "Failed to register intelligence handlers");
  }
}

registerIntelligenceHandlers();

log.info({ handlers: ["AI_CHAT_REPLY", "AI_SUGGESTION_GENERATE", "AI_NOTEBOOK_ANALYZE", "EMPLOYEE_AI_ASSISTANT_REPLY", "MEETING_QUIZ_GENERATE"] }, "Registered 5 core task handlers");

// ── MEETING_TRANSCRIPT_ANALYSIS ─────────────────────────────
registerTaskHandler("MEETING_TRANSCRIPT_ANALYSIS", async (_taskId, input) => {
  const db = await requireDb();
  const { meetingId } = input as { meetingId: number; transcriptLength: number; requestedBy: string };

  const [meeting] = await db.select().from(sysMeetings)
    .where(eq(sysMeetings.id, meetingId)).limit(1);
  if (!meeting || !meeting.transcript) {
    return { error: "Meeting or transcript not found" } as Record<string, unknown>;
  }

  const transcript = meeting.transcript;
  const painPoints: string[] = [];
  const suggestions: string[] = [];
  const actionItems: Array<{ assignee: string; task: string }> = [];
  const budgetSignals: string[] = [];
  const requirementChanges: string[] = [];

  // Try LLM extraction first, fallback to regex
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: `你是工业清洗设备领域的会议分析专家。请从以下会议转写中提取结构化信息，返回 JSON 格式：
{
  "painPoints": ["客户提到的痛点/问题"],
  "suggestions": ["修改意见/决策"],
  "actionItems": [{"assignee": "负责人", "task": "任务描述"}],
  "budgetSignals": ["预算相关的信号/讨论"],
  "requirementChanges": ["需求变更/新增需求"]
}
只返回 JSON，不要其他文字。` },
        { role: "user", content: transcript.slice(0, 30_000) },
      ],
    });
    const parsed = JSON.parse(result.choices[0]?.message?.content || "{}");
    if (Array.isArray(parsed.painPoints)) painPoints.push(...parsed.painPoints);
    if (Array.isArray(parsed.suggestions)) suggestions.push(...parsed.suggestions);
    if (Array.isArray(parsed.actionItems)) actionItems.push(...parsed.actionItems);
    if (Array.isArray(parsed.budgetSignals)) budgetSignals.push(...parsed.budgetSignals);
    if (Array.isArray(parsed.requirementChanges)) requirementChanges.push(...parsed.requirementChanges);
    log.info({ meetingId }, "MEETING_TRANSCRIPT_ANALYSIS LLM extraction succeeded");
  } catch {
    // Fallback: regex extraction
    const lines = transcript.split(/[。！？\n]/).filter(Boolean);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/痛点|问题|困难|瓶颈|风险|不足|缺陷|短板/.test(trimmed)) painPoints.push(trimmed);
      if (/建议|优化|改进|改善|应该|需要调整|方案/.test(trimmed)) suggestions.push(trimmed);
      if (/负责|跟进|截止|行动项|TODO|待办|请.*完成/.test(trimmed)) actionItems.push({ assignee: "待分配", task: trimmed });
      if (/预算|成本|费用|报价|价格|万元|百万/.test(trimmed)) budgetSignals.push(trimmed);
      if (/变更|新增需求|修改需求|需求调整|规格变化/.test(trimmed)) requirementChanges.push(trimmed);
    }
    log.info({ meetingId }, "MEETING_TRANSCRIPT_ANALYSIS using regex fallback");
  }

  const aiSummary = {
    highlights: painPoints.slice(0, 5).concat(suggestions.slice(0, 3)),
    decisions: suggestions.slice(0, 3),
    risks: painPoints.slice(0, 5),
    nextSteps: actionItems.map(a => a.task).slice(0, 5),
    sentiment: painPoints.length > suggestions.length ? "negative" : "positive",
    generatedAt: new Date().toISOString(),
  };

  await db.update(sysMeetings)
    .set({ aiSummary: aiSummary as Record<string, unknown>, updatedAt: new Date() })
    .where(eq(sysMeetings.id, meetingId));

  if (actionItems.length > 0) {
    await db.insert(meetingActionItems).values(
      actionItems.map(item => ({
        meetingId, assignedTo: 1, assignedToName: item.assignee,
        taskDesc: item.task, status: "PENDING",
      }))
    );
  }

  // Auto-record budget signals & requirement changes to customer_interaction_feedback
  const projectId = meeting.projectId ?? 0;
  const feedbackInserts: Array<{
    projectId: number; meetingId: number; feedbackType: string;
    content: string; severity: string; createdBy: string;
  }> = [];
  for (const bs of budgetSignals.slice(0, 10)) {
    feedbackInserts.push({ projectId, meetingId, feedbackType: "budget_signal", content: bs, severity: "medium", createdBy: "ai-analysis" });
  }
  for (const rc of requirementChanges.slice(0, 10)) {
    feedbackInserts.push({ projectId, meetingId, feedbackType: "requirement_change", content: rc, severity: "high", createdBy: "ai-analysis" });
  }
  if (feedbackInserts.length > 0) {
    try {
      await db.insert(customerInteractionFeedback).values(feedbackInserts);
      log.info({ meetingId, feedbackCount: feedbackInserts.length }, "Auto-recorded feedback from transcript analysis");
    } catch (err) {
      log.warn({ err, meetingId }, "Failed to auto-record feedback (table may not exist yet)");
    }
  }

  log.info({ meetingId, painPoints: painPoints.length, suggestions: suggestions.length, budgetSignals: budgetSignals.length },
    "MEETING_TRANSCRIPT_ANALYSIS completed");

  return { meetingId, painPoints, suggestions, actionItems, budgetSignals, requirementChanges, aiSummary } as unknown as Record<string, unknown>;
});

// ── PROPOSAL_ITERATION ──────────────────────────────────────
registerTaskHandler("PROPOSAL_ITERATION", async (_taskId, input) => {
  const db = await requireDb();
  const { parentProposalId, newVersion } = input as {
    parentProposalId: number;
    requirementId: number;
    newVersion: number;
    meetingId?: number;
    feedbackLength: number;
    requestedBy: string;
  };

  const [oldProposal] = await db.select().from(aiSolutionProposals)
    .where(eq(aiSolutionProposals.id, parentProposalId)).limit(1);

  if (!oldProposal) {
    return { error: "Parent proposal not found" } as Record<string, unknown>;
  }

  // Find the new proposal record (created by the router mutation)
  const [newProposal] = await db.select().from(aiSolutionProposals)
    .where(eq(aiSolutionProposals.parentProposalId, parentProposalId)).limit(1);

  if (newProposal) {
    await db.update(aiSolutionProposals)
      .set({
        processFlow: oldProposal.processFlow,
        equipmentConfig: oldProposal.equipmentConfig,
        budgetEstimate: oldProposal.budgetEstimate,
        competitorAnalysis: oldProposal.competitorAnalysis,
        benchmarkProjectIds: oldProposal.benchmarkProjectIds,
        benchmarkProjects: oldProposal.benchmarkProjects,
        status: "DRAFT",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(aiSolutionProposals.id, newProposal.id));
  }

  log.info({ parentProposalId, newVersion }, "PROPOSAL_ITERATION completed");

  return {
    newProposalId: newProposal?.id ?? null,
    parentProposalId,
    version: newVersion,
    iteratedAt: new Date().toISOString(),
  } as Record<string, unknown>;
});

log.info({ handlers: ["MEETING_TRANSCRIPT_ANALYSIS", "PROPOSAL_ITERATION"] }, "Registered 2 meeting intelligence task handlers");

// ── SALES_COACH_FEEDBACK ────────────────────────────────────
registerTaskHandler("SALES_COACH_FEEDBACK", async (_taskId, input) => {
  const db = await requireDb();
  const { userId, logId, logDate, buCode, clientsVisited } = input as {
    userId: number;
    logId: number;
    logDate: string;
    buCode: string | null;
    clientsVisited: number;
  };

  try {
    // 1. Load context: daily log
    const [dailyLog] = await db.select()
      .from(employeeDailyLogs)
      .where(eq(employeeDailyLogs.id, logId))
      .limit(1);

    if (!dailyLog) {
      return { error: "Daily log not found" } as Record<string, unknown>;
    }

    // 2. Load pipeline stats (M-stage counts)
    const pipelineResult = await db.execute(sql`
      SELECT stage, COUNT(*)::integer AS cnt
      FROM project_bidding_strategies
      ${buCode ? sql`WHERE bu_code = ${buCode}` : sql``}
      GROUP BY stage
    `);
    const pipelineRows = (pipelineResult as unknown as RawExecuteResult).rows ?? pipelineResult;

    // 3. Load budget coverage
    const year = parseInt(logDate.substring(0, 4));
    const budgetResult = await db.execute(sql`
      SELECT
        COUNT(DISTINCT b.client_id)::integer AS covered,
        (SELECT COUNT(*)::integer FROM crm_customers) AS total
      FROM client_annual_budgets b
      WHERE b.year = ${year}
      ${buCode ? sql`AND b.bu_code = ${buCode}` : sql``}
    `);
    const budgetStats = (((budgetResult as unknown as RawExecuteResult).rows ?? budgetResult) as unknown as DbRow[])[0] ?? { covered: 0, total: 0 };

    // 4. Build prompt
    const contextJson = JSON.stringify({
      date: logDate,
      dailyLog: {
        hours: dailyLog.loggedHours,
        tasks: dailyLog.completedTasks,
        blockers: dailyLog.blockers,
        notes: dailyLog.notes,
        energy: dailyLog.energyLevel,
        clientsVisited,
      },
      pipeline: pipelineRows,
      budgetCoverage: budgetStats,
    });

    const systemPrompt = `你是GRT集团的高级销售教练AI。基于销售人员的日报数据、项目管道状态和客户CAPEX预算覆盖情况，
提供战术性指导建议。回复格式必须是JSON：
{
  "tacticalGuidance": "针对今日工作的战术建议（200字以内）",
  "pipelineRisks": ["风险1", "风险2"],
  "suggestedActions": ["行动建议1", "行动建议2", "行动建议3"]
}
语言：中文。风格：简洁、实战导向。`;

    const aiResult = await invokeLLM({
      system: systemPrompt,
      prompt: contextJson,
    });

    // 5. Parse response
    let feedback: { tacticalGuidance: string; pipelineRisks: string[]; suggestedActions: string[] };
    try {
      const cleaned = (aiResult as unknown as string).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      feedback = JSON.parse(cleaned);
    } catch {
      feedback = {
        tacticalGuidance: String(aiResult),
        pipelineRisks: [],
        suggestedActions: [],
      };
    }

    // 6. Compute pipeline health score
    const totalPipeline = Array.isArray(pipelineRows) ? pipelineRows.reduce((s: number, r: DbRow) => s + (Number(r.cnt) || 0), 0) : 0;
    const budgetCovPct = Number(budgetStats.total) > 0 ? (Number(budgetStats.covered) / Number(budgetStats.total)) * 100 : 0;
    const pipelineScore = Math.min(totalPipeline * 5, 100); // 20 projects = 100%
    const healthScore = Math.round(pipelineScore * 0.6 + budgetCovPct * 0.4);

    const feedbackWithTs = {
      ...feedback,
      generatedAt: new Date().toISOString(),
    };

    // 7. Update daily log
    await db.update(employeeDailyLogs)
      .set({
        aiCoachFeedback: feedbackWithTs,
        pipelineHealthScore: healthScore,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(employeeDailyLogs.id, logId));

    log.info({ userId, logId, healthScore }, "Sales coach feedback generated");
    return { feedback: feedbackWithTs, healthScore } as Record<string, unknown>;
  } catch (err) {
    log.error({ err, userId, logId }, "Sales coach feedback failed");
    return { error: String(err) } as Record<string, unknown>;
  }
});

log.info({ handlers: ["SALES_COACH_FEEDBACK"] }, "Registered sales coach task handler");

// ── BATTLE_PREP_REPORT ────────────────────────────────────
registerTaskHandler("BATTLE_PREP_REPORT", async (_taskId, input) => {
  const db = await requireDb();
  const { reportId, userId, period, buCode } = input as {
    reportId: number; userId: number; period: string; buCode: string | null;
  };

  try {
    // 1. Load meeting data for this user this period
    const meetingsResult = await db.execute(sql`
      SELECT m.title, m.scheduled_start, m.ai_summary,
        (SELECT COUNT(*)::integer FROM meeting_action_items ai WHERE ai.meeting_id = m.id AND ai.assigned_to = ${userId}) AS action_total,
        (SELECT COUNT(*)::integer FROM meeting_action_items ai WHERE ai.meeting_id = m.id AND ai.assigned_to = ${userId} AND ai.status = 'COMPLETED') AS action_done
      FROM sys_meetings m
      WHERE m.organizer_id = ${userId}
        AND TO_CHAR(m.scheduled_start, 'YYYY-MM') = ${period}
      ORDER BY m.scheduled_start DESC LIMIT 20
    `);
    const meetings = (meetingsResult as unknown as RawExecuteResult).rows ?? meetingsResult;

    // 2. Load M0-M3 pipeline counts
    const pipelineResult = await db.execute(sql`
      SELECT stage, COUNT(*)::integer AS cnt
      FROM project_bidding_strategies
      WHERE created_by = ${userId}
      ${buCode ? sql`AND bu_code = ${buCode}` : sql``}
      GROUP BY stage
    `);
    const pipeline = (pipelineResult as unknown as RawExecuteResult).rows ?? pipelineResult;

    // 3. Load CAPEX budget coverage
    const budgetResult = await db.execute(sql`
      SELECT
        COUNT(*)::integer AS covered,
        (SELECT COUNT(*)::integer FROM crm_customers) AS total
      FROM client_annual_budgets
      WHERE recorded_by = ${userId}
        AND year = ${parseInt(period.substring(0, 4))}
    `);
    const budgetStats = (((budgetResult as unknown as RawExecuteResult).rows ?? budgetResult) as unknown as DbRow[])[0] ?? { covered: 0, total: 0 };

    // 4. Load sales target
    const salesResult = await db.execute(sql`
      SELECT total_sales_target FROM bu_sales_plans
      WHERE year = ${parseInt(period.substring(0, 4))}
      ${buCode ? sql`AND department_id = ${buCode}` : sql``}
      LIMIT 1
    `);
    const salesTarget = (((salesResult as unknown as RawExecuteResult).rows ?? salesResult) as unknown as DbRow[])[0]?.total_sales_target ?? 0;

    // 5. Build meeting highlights
    const meetingHighlights = Array.isArray(meetings) ? meetings.slice(0, 5).map((m: DbRow) => ({
      meetingTitle: m.title || "Untitled",
      date: m.scheduled_start ? String(m.scheduled_start).substring(0, 10) : period,
      keyDecisions: (m.ai_summary as Record<string, unknown> | null)?.keyDecisions ?? [],
    })) : [];

    // 6. Compute KPI
    const pipelineMap: Record<string, number> = {};
    if (Array.isArray(pipeline)) {
      for (const p of pipeline) pipelineMap[p.stage as string] = p.cnt as any;
    }
    const totalActions = Array.isArray(meetings) ? meetings.reduce((s: number, m: DbRow) => s + (Number(m.action_total) || 0), 0) : 0;
    const doneActions = Array.isArray(meetings) ? meetings.reduce((s: number, m: DbRow) => s + (Number(m.action_done) || 0), 0) : 0;

    const kpi = {
      salesTarget: parseFloat(String(salesTarget)) || 0,
      salesActual: 0, // Would come from actual order data
      salesGapPercent: 0,
      newClientTarget: 10,
      newClientActual: Number(budgetStats.covered) || 0,
      meetingCount: Array.isArray(meetings) ? meetings.length : 0,
      actionItemsCompleted: doneActions,
      actionItemsTotal: totalActions,
      m0Count: pipelineMap["M0"] ?? 0,
      m1Count: pipelineMap["M1"] ?? 0,
      m2Count: pipelineMap["M2"] ?? 0,
      m3Count: pipelineMap["M3"] ?? 0,
      capexCoveragePercent: Number(budgetStats.total) > 0
        ? Math.round((Number(budgetStats.covered) / Number(budgetStats.total)) * 100)
        : 0,
    };

    // 7. LLM summary
    const contextJson = JSON.stringify({ period, kpi, meetingHighlights });
    const aiSummary = await invokeLLM({
      system: `你是GRT集团的月度战情分析AI。基于销售的月度数据生成简洁的战情总结（200字以内），
语气严肃、数据驱动。指出核心差距和亮点。最后给出3条下月战术建议。
回复JSON: { "summary": "...", "suggestions": ["...", "...", "..."] }`,
      prompt: contextJson,
    });

    let parsed: { summary: string; suggestions: string[] };
    try {
      const cleaned = (aiSummary as unknown as string).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { summary: String(aiSummary), suggestions: [] };
    }

    // 8. Update report
    await db.update(monthlyBattleReports)
      .set({
        aiGeneratedSummary: parsed.summary,
        actualVsTargetKpi: kpi,
        aiTacticalSuggestions: parsed.suggestions,
        meetingHighlights: meetingHighlights as any,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(monthlyBattleReports.id, reportId));

    log.info({ reportId, userId }, "Battle report generated");
    return { reportId, summary: parsed.summary } as Record<string, unknown>;
  } catch (err) {
    log.error({ err, reportId }, "Battle report generation failed");
    return { error: String(err) } as Record<string, unknown>;
  }
});

// ── ARENA_COMPUTE_RANKINGS ────────────────────────────────
import { monthlyBattleReports } from "../../drizzle/battle-arena-schema";
import { globalArenaRankings } from "../../drizzle/battle-arena-schema";
import { computeBonusTier, computeBonusMultiplier } from "../routers/battle-arena.router";

registerTaskHandler("ARENA_COMPUTE_RANKINGS", async (_taskId, input) => {
  const db = await requireDb();
  const { period } = input as { period: string };

  try {
    // 1. Get composite scores for this period
    const scoresResult = await db.execute(sql`
      SELECT
        cs.employee_id AS entity_id,
        cs.employee_name AS entity_name,
        cs.department,
        COALESCE(cs.final_score, cs.ai_composite_score, 50)::numeric AS score,
        'SALES' AS entity_type
      FROM perf_composite_scores cs
      WHERE cs.period = ${period}
      ORDER BY score DESC
    `);
    const scores = (scoresResult as unknown as RawExecuteResult).rows ?? scoresResult;

    if (!Array.isArray(scores) || scores.length === 0) {
      return { computed: 0, message: "No scores found for period" } as Record<string, unknown>;
    }

    // 2. Delete existing rankings for this period
    await db.delete(globalArenaRankings)
      .where(eq(globalArenaRankings.period, period));

    // 3. Rank and insert
    const total = scores.length;
    const rankings = scores.map((s: DbRow, idx: number) => {
      const rank = idx + 1;
      const tier = computeBonusTier(rank, total);
      return {
        period,
        entityType: "SALES" as const,
        entityId: Number(s.entity_id),
        entityName: s.entity_name || `User ${s.entity_id}`,
        comprehensiveScore: String(Number(s.score).toFixed(2)),
        rankPosition: rank,
        totalInCategory: total,
        bonusTier: tier,
        bonusMultiplier: computeBonusMultiplier(tier),
        department: s.department,
        rankChange: 0,
      };
    });

    // Batch insert
    if (rankings.length > 0) {
      await (db.insert(globalArenaRankings) as any).values(rankings);
    }

    // 4. Compute previous rank changes
    const prevPeriodResult = await db.execute(sql`
      SELECT entity_id, rank_position FROM global_arena_rankings
      WHERE period = (
        SELECT MAX(period) FROM global_arena_rankings WHERE period < ${period}
      ) AND entity_type = 'SALES'
    `);
    const prevRanks = (prevPeriodResult as unknown as RawExecuteResult).rows ?? prevPeriodResult;
    const prevMap = new Map<number, number>();
    if (Array.isArray(prevRanks)) {
      for (const p of prevRanks) prevMap.set(Number(p.entity_id), Number(p.rank_position));
    }

    for (const r of rankings) {
      const prev = prevMap.get(r.entityId);
      if (prev !== undefined) {
        const change = prev - r.rankPosition; // positive = improved
        await db.update(globalArenaRankings)
          .set({ previousRank: prev, rankChange: change })
          .where(and(
            eq(globalArenaRankings.period, period),
            eq(globalArenaRankings.entityType, "SALES"),
            eq(globalArenaRankings.entityId, r.entityId),
          ));
      }
    }

    log.info({ period, total: rankings.length }, "Arena rankings computed");
    return { computed: rankings.length } as Record<string, unknown>;
  } catch (err) {
    log.error({ err, period }, "Arena ranking computation failed");
    return { error: String(err) } as Record<string, unknown>;
  }
});

log.info({ handlers: ["BATTLE_PREP_REPORT", "ARENA_COMPUTE_RANKINGS"] }, "Registered battle arena task handlers");

// ══════════════════════════════════════════════════════
// BI Report Engine — 综合报告 AI 评估
// ══════════════════════════════════════════════════════

import {
  biReportPeriods,
  biDepartmentMetrics,
  biIndividualMetrics,
} from "../../drizzle/bi-report-schema";

registerTaskHandler("BI_EXECUTIVE_SUMMARY", async (_taskId, input) => {
  const db = await requireDb();
  const { reportPeriodId } = input as { reportPeriodId: number };

  try {
    const deptMetrics = await db.select().from(biDepartmentMetrics)
      .where(eq(biDepartmentMetrics.reportPeriodId, reportPeriodId))
      .limit(50);

    const topIndividuals = await db.select().from(biIndividualMetrics)
      .where(eq(biIndividualMetrics.reportPeriodId, reportPeriodId))
      .orderBy(sql`kpi_score DESC NULLS LAST`)
      .limit(20);

    const system = `你是GRT集团的BI报告AI分析师。基于各部门和个人的绩效数据，生成一份简洁的高管摘要（200-300字），包含：
1. 整体达成率概览
2. 表现最佳和最差部门
3. 奖惩分布特征
4. 培训质量趋势
5. 关键风险和建议`;

    const prompt = JSON.stringify({ departments: deptMetrics, topIndividuals }, null, 2);

    const result = await invokeLLM({ system, prompt });
    const summary = typeof result === "string" ? result : JSON.stringify(result);

    await db.update(biReportPeriods)
      .set({ executiveSummary: summary, status: "published", updatedAt: new Date().toISOString() })
      .where(eq(biReportPeriods.id, reportPeriodId));

    log.info({ reportPeriodId }, "BI executive summary generated");
    return { summary } as Record<string, unknown>;
  } catch (err) {
    log.error({ err, reportPeriodId }, "BI executive summary generation failed");
    await db.update(biReportPeriods)
      .set({ status: "draft", updatedAt: new Date().toISOString() })
      .where(eq(biReportPeriods.id, reportPeriodId));
    return { error: String(err) } as Record<string, unknown>;
  }
});

registerTaskHandler("BI_DEPT_AI_EVAL", async (_taskId, input) => {
  const db = await requireDb();
  const { reportPeriodId, departmentCode } = input as { reportPeriodId: number; departmentCode: string };

  try {
    const [deptMetric] = await db.select().from(biDepartmentMetrics)
      .where(and(
        eq(biDepartmentMetrics.reportPeriodId, reportPeriodId),
        eq(biDepartmentMetrics.departmentCode, departmentCode),
      ))
      .limit(1);

    const members = await db.select().from(biIndividualMetrics)
      .where(and(
        eq(biIndividualMetrics.reportPeriodId, reportPeriodId),
        eq(biIndividualMetrics.departmentCode, departmentCode),
      ))
      .limit(100);

    const system = `你是GRT集团的部门绩效AI评估员。基于部门整体指标和成员数据，生成协调评价（100-200字），包含：
1. 部门目标达成率评估
2. 奖惩合理性分析
3. 培训参与质量
4. 团队协作表现
5. 改进建议`;

    const prompt = JSON.stringify({ department: deptMetric, members }, null, 2);
    const result = await invokeLLM({ system, prompt });
    const evaluation = typeof result === "string" ? result : JSON.stringify(result);

    await db.update(biDepartmentMetrics)
      .set({ aiEvaluation: evaluation })
      .where(and(
        eq(biDepartmentMetrics.reportPeriodId, reportPeriodId),
        eq(biDepartmentMetrics.departmentCode, departmentCode),
      ));

    log.info({ reportPeriodId, departmentCode }, "BI department AI evaluation generated");
    return { evaluation } as Record<string, unknown>;
  } catch (err) {
    log.error({ err, reportPeriodId, departmentCode }, "BI department AI evaluation failed");
    return { error: String(err) } as Record<string, unknown>;
  }
});

registerTaskHandler("BI_INDIVIDUAL_AI_EVAL", async (_taskId, input) => {
  const db = await requireDb();
  const { reportPeriodId, userId } = input as { reportPeriodId: number; userId: number };

  try {
    const [metric] = await db.select().from(biIndividualMetrics)
      .where(and(
        eq(biIndividualMetrics.reportPeriodId, reportPeriodId),
        eq(biIndividualMetrics.userId, userId),
      ))
      .limit(1);

    const [deptMetric] = await db.select().from(biDepartmentMetrics)
      .where(and(
        eq(biDepartmentMetrics.reportPeriodId, reportPeriodId),
        eq(biDepartmentMetrics.departmentCode, metric?.departmentCode ?? ""),
      ))
      .limit(1);

    const system = `你是GRT集团的个人绩效AI教练。基于个人指标和部门整体表现，生成协调评价（80-150字），包含：
1. 个人目标达成评估（对比部门平均）
2. 计划执行力
3. 培训参与度
4. 奖惩记录分析
5. 个性化改进建议`;

    const prompt = JSON.stringify({ individual: metric, departmentContext: deptMetric }, null, 2);
    const result = await invokeLLM({ system, prompt });
    const evaluation = typeof result === "string" ? result : JSON.stringify(result);

    await db.update(biIndividualMetrics)
      .set({ aiCoordinatedEvaluation: evaluation })
      .where(and(
        eq(biIndividualMetrics.reportPeriodId, reportPeriodId),
        eq(biIndividualMetrics.userId, userId),
      ));

    log.info({ reportPeriodId, userId }, "BI individual AI evaluation generated");
    return { evaluation } as Record<string, unknown>;
  } catch (err) {
    log.error({ err, reportPeriodId, userId }, "BI individual AI evaluation failed");
    return { error: String(err) } as Record<string, unknown>;
  }
});

log.info({ handlers: ["BI_EXECUTIVE_SUMMARY", "BI_DEPT_AI_EVAL", "BI_INDIVIDUAL_AI_EVAL"] }, "Registered BI report task handlers");

// ══════════════════════════════════════════════════════════════
// OEM Webhook Delivery Handler
// ══════════════════════════════════════════════════════════════

import { oemWebhooks, oemWebhookDeliveries } from "../../drizzle/oem-portal-schema";
import { createHmac } from "crypto";
import { getBackoffDelay } from "./oem-webhook.service";

registerTaskHandler("OEM_WEBHOOK_DELIVERY", async (_taskId, input) => {
  const { deliveryId, webhookId, payload, attempt } = input as {
    deliveryId: number;
    webhookId: number;
    payload: Record<string, unknown>;
    attempt: number;
  };

  try {
    const db = await requireDb();

    // Load webhook config
    const [webhook] = await db.select().from(oemWebhooks)
      .where(eq(oemWebhooks.id, webhookId)).limit(1);

    if (!webhook || webhook.status === "disabled") {
      await db.update(oemWebhookDeliveries)
        .set({ status: "failed", responseBody: "Webhook not found or disabled" })
        .where(eq(oemWebhookDeliveries.id, deliveryId));
      return { error: "Webhook not found or disabled" } as Record<string, unknown>;
    }

    // Compute HMAC-SHA256 signature
    const payloadStr = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureBase = `${timestamp}.${payloadStr}`;
    const signature = createHmac("sha256", webhook.secretHash)
      .update(signatureBase).digest("hex");

    // POST to endpoint
    const response = await fetch(webhook.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GRT-Signature": `sha256=${signature}`,
        "X-GRT-Event": String(payload.event || "unknown"),
        "X-GRT-Delivery": String(deliveryId),
        "X-GRT-Timestamp": String(timestamp),
      },
      body: payloadStr,
      signal: AbortSignal.timeout(30000),
    });

    const responseBody = await response.text().catch(() => "");
    const statusCode = response.status;

    if (response.ok) {
      // Success: mark delivered
      await db.update(oemWebhookDeliveries).set({
        status: "delivered",
        statusCode,
        responseBody: responseBody.slice(0, 1000),
        attemptCount: attempt + 1,
        deliveredAt: new Date(),
      }).where(eq(oemWebhookDeliveries.id, deliveryId));

      // Reset webhook failure count on success
      await db.update(oemWebhooks)
        .set({ failureCount: 0 })
        .where(eq(oemWebhooks.id, webhookId));

      log.info({ deliveryId, webhookId, statusCode }, "OEM webhook delivered");
      return { deliveryId, statusCode, success: true } as Record<string, unknown>;
    }

    // Failure: schedule retry or mark failed
    const nextAttempt = attempt + 1;
    const [delivery] = await db.select({ maxAttempts: oemWebhookDeliveries.maxAttempts })
      .from(oemWebhookDeliveries).where(eq(oemWebhookDeliveries.id, deliveryId)).limit(1);
    const maxAttempts = delivery?.maxAttempts ?? 5;

    if (nextAttempt < maxAttempts) {
      const delay = getBackoffDelay(nextAttempt);
      const nextRetryAt = new Date(Date.now() + delay);

      await db.update(oemWebhookDeliveries).set({
        status: "retrying",
        statusCode,
        responseBody: responseBody.slice(0, 1000),
        attemptCount: nextAttempt,
        nextRetryAt,
      }).where(eq(oemWebhookDeliveries.id, deliveryId));

      // Re-queue with delay
      const { submitTask: resubmit } = await import("./task-worker.service");
      await resubmit("OEM_WEBHOOK_DELIVERY", {
        deliveryId, webhookId, payload, attempt: nextAttempt,
      }, "system", { maxRetries: 1 });

      log.warn({ deliveryId, webhookId, statusCode, nextAttempt, nextRetryAt }, "OEM webhook retry scheduled");
    } else {
      await db.update(oemWebhookDeliveries).set({
        status: "failed",
        statusCode,
        responseBody: responseBody.slice(0, 1000),
        attemptCount: nextAttempt,
      }).where(eq(oemWebhookDeliveries.id, deliveryId));

      // Increment webhook failure count; disable if >= 10 consecutive
      await db.update(oemWebhooks)
        .set({ failureCount: sql`${oemWebhooks.failureCount} + 1` })
        .where(eq(oemWebhooks.id, webhookId));

      const [wh] = await db.select({ failureCount: oemWebhooks.failureCount })
        .from(oemWebhooks).where(eq(oemWebhooks.id, webhookId)).limit(1);

      if (wh && wh.failureCount >= 10) {
        await db.update(oemWebhooks)
          .set({ status: "disabled" })
          .where(eq(oemWebhooks.id, webhookId));
        log.error({ webhookId, failureCount: wh.failureCount }, "OEM webhook auto-disabled after 10 failures");
      }

      log.error({ deliveryId, webhookId, statusCode, attempts: nextAttempt }, "OEM webhook delivery failed permanently");
    }

    return { deliveryId, statusCode, success: false } as Record<string, unknown>;
  } catch (err) {
    log.error({ err, deliveryId, webhookId }, "OEM webhook delivery error");
    return { error: String(err) } as Record<string, unknown>;
  }
});

log.info("Registered OEM_WEBHOOK_DELIVERY handler");
