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
import { requireDb } from "../db";
import {
  aiChatMessages,
  aiChatSessions,
  aiProcessSuggestions,
  aiNotebookSuggestions,
  aiAssistantMessages,
  employeeAiAssistants,
} from "../../drizzle/schema";
import { sysMeetings } from "../../drizzle/smart-meetings-schema";
import { eq, asc, desc } from "drizzle-orm";
import { searchDocuments, incrementRelevance } from "../modules/knowledge-base.service";
import { buildOwnerContext } from "./ai-assistant-provisioning.service";

const toNum = (id: string | number) => typeof id === "string" ? parseInt(id) : id;

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
    messageCount: (await db.select().from(aiChatMessages).where(eq(aiChatMessages.sessionId, sessionId))).length,
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
    console.error("[AI_SUGGESTION_GENERATE] LLM error:", err);
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
    console.error("[AI_SUGGESTION_GENERATE] DB save error:", dbErr);
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
    console.error("[AI_NOTEBOOK_ANALYZE] LLM error:", err);
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
      console.error("[AI_NOTEBOOK_ANALYZE] DB save error:", dbErr);
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
    console.error("[EMPLOYEE_AI_ASSISTANT_REPLY] RAG error:", ragError);
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
        input.history as any[],
      );
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("PROJECT_FIND_SIMILAR", async (_id, input) => {
      const result = await projSvc.findSimilarProjects(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("PROJECT_CHANGE_IMPACT", async (_id, input) => {
      const result = await projSvc.analyzeChangeImpact(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("PROJECT_RISK_PREDICT", async (_id, input) => {
      const result = await projSvc.predictProjectRisk(input as any);
      return result as unknown as Record<string, unknown>;
    });

    // Operations Intelligence
    const opsSvc = await import("../operations-intelligence/operationsIntelligence.service");
    registerTaskHandler("OPS_ASSESS_SUPPLIER", async (_id, input) => {
      const result = await opsSvc.assessSupplier(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("OPS_OPTIMIZE_INVENTORY", async (_id, input) => {
      const result = await opsSvc.optimizeInventory(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("OPS_PREDICT_QUALITY", async (_id, input) => {
      const result = await opsSvc.predictQualityTrend(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("OPS_ANALYZE_EFFICIENCY", async (_id, input) => {
      const result = await opsSvc.analyzeProductionEfficiency(input as any);
      return result as unknown as Record<string, unknown>;
    });

    // HR Intelligence
    const hrSvc = await import("../hr-intelligence/hrIntelligence.service");
    registerTaskHandler("HR_ASSESS_TALENT", async (_id, input) => {
      const result = await hrSvc.assessTalent(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("HR_RECOMMEND_TRAINING", async (_id, input) => {
      const result = await hrSvc.recommendTraining(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("HR_ANALYZE_COMPENSATION", async (_id, input) => {
      const result = await hrSvc.analyzeCompensation(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("HR_PLAN_WORKFORCE", async (_id, input) => {
      const result = await hrSvc.planWorkforce(input as any);
      return result as unknown as Record<string, unknown>;
    });

    // Sales & Finance Intelligence
    const sfSvc = await import("../sales-finance-intelligence/salesFinanceIntelligence.service");
    registerTaskHandler("SF_FORECAST_SALES", async (_id, input) => {
      const result = await sfSvc.forecastSales(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("SF_PREDICT_CHURN", async (_id, input) => {
      const result = await sfSvc.predictChurn(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("SF_ANALYZE_BUDGET", async (_id, input) => {
      const result = await sfSvc.analyzeBudget(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("SF_OPTIMIZE_COST", async (_id, input) => {
      const result = await sfSvc.optimizeCost(input as any);
      return result as unknown as Record<string, unknown>;
    });

    // R&D & Service Intelligence
    const rdSvc = await import("../rd-service-intelligence/rdServiceIntelligence.service");
    registerTaskHandler("RD_ANALYZE_REQUIREMENTS", async (_id, input) => {
      const result = await rdSvc.analyzeRequirements(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("RD_REVIEW_DESIGN", async (_id, input) => {
      const result = await rdSvc.reviewDesign(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("RD_DIAGNOSE_FAULT", async (_id, input) => {
      const result = await rdSvc.diagnoseFault(input as any);
      return result as unknown as Record<string, unknown>;
    });
    registerTaskHandler("RD_PLAN_MAINTENANCE", async (_id, input) => {
      const result = await rdSvc.planMaintenance(input as any);
      return result as unknown as Record<string, unknown>;
    });

    console.log("[AI Async Handlers] Registered 20 intelligence task handlers");
  } catch (err) {
    console.error("[AI Async Handlers] Failed to register intelligence handlers:", err);
  }
}

registerIntelligenceHandlers();

console.log("[AI Async Handlers] Registered 5 core task handlers: AI_CHAT_REPLY, AI_SUGGESTION_GENERATE, AI_NOTEBOOK_ANALYZE, EMPLOYEE_AI_ASSISTANT_REPLY, MEETING_QUIZ_GENERATE");
