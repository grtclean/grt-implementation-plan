/**
 * Sandbox AI Service — Multi-provider orchestration for structured development
 *
 * Three AI orchestration functions:
 *   1. generateProposal(scenario)        → Gemini (方案大脑)
 *   2. executeImplementation(proposal)    → Claude (实施工程队)
 *   3. runRedTeamReview(proposal, impl)   → GPT   (红队/裁决)
 *
 * All invocations write audit rows to sandbox_runs.
 */

import { eq } from "drizzle-orm";
import { requireDb } from "../db";
import { invokeLLMWithProvider, type LLMProvider } from "../_core/llm";
import {
  sandboxScenarios,
  sandboxRuns,
  sandboxChangeTasks,
  releaseGates,
  type SandboxScenario,
} from "../../drizzle/sandbox-console-schema";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("sandbox-ai");

// ── Types ────────────────────────────────────────────────────

export interface ProposalOutput {
  objective: string;
  affectedModules: string[];
  fieldChanges: { table: string; column: string; changeType: string; detail: string }[];
  pageChanges: { page: string; changeType: string; detail: string }[];
  apiChanges: { endpoint: string; method: string; changeType: string; detail: string }[];
  risks: { description: string; severity: string; mitigation: string }[];
  resources: { type: string; estimate: string }[];
  acceptanceCriteria: string[];
}

export interface ImplementationOutput {
  codeChanges: { filePath: string; changeType: string; description: string; before?: string; after?: string; diff?: string }[];
  apiChanges: { endpoint: string; method: string; detail: string }[];
  testResults: { test: string; status: string; detail: string }[];
  incompleteItems: string[];
  rollbackInstructions: string[];
}

export interface RedTeamOutput {
  overallVerdict: "pass" | "conditional_pass" | "fail";
  criteria: {
    name: string;
    passed: boolean;
    comment: string;
  }[];
  risks: string[];
  recommendations: string[];
}

// ── Helper: write sandbox_runs row ───────────────────────────

async function writeRunRecord(opts: {
  scenarioId: number;
  runType: "proposal" | "implementation" | "review" | "dry_run";
  provider: string;
  model: string;
  systemPrompt: string;
  userInput: string;
  aiOutput: unknown;
  status: "completed" | "failed";
  durationMs: number;
  tokenUsage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  errorMessage?: string;
  triggeredById: number;
  parentRunId?: number;
}): Promise<number> {
  const db = await requireDb();
  const [row] = await db.insert(sandboxRuns).values({
    scenarioId: opts.scenarioId,
    runType: opts.runType,
    aiProvider: opts.provider,
    aiModel: opts.model,
    systemPrompt: opts.systemPrompt,
    userInput: opts.userInput,
    aiOutput: opts.aiOutput,
    status: opts.status,
    durationMs: opts.durationMs,
    tokenUsage: opts.tokenUsage,
    errorMessage: opts.errorMessage,
    triggeredById: opts.triggeredById,
    parentRunId: opts.parentRunId,
  }).returning();
  return row.id;
}

// ── 1. Generate Proposal — Gemini ────────────────────────────

const PROPOSAL_SYSTEM_PROMPT = `你是GRT系统的方案架构师(Gemini)。根据用户提供的业务目标和系统上下文，生成结构化的开发方案。

你必须输出严格的JSON，包含以下字段：
{
  "objective": "方案目标摘要",
  "affectedModules": ["模块1", "模块2"],
  "fieldChanges": [{"table": "", "column": "", "changeType": "add|modify|remove", "detail": ""}],
  "pageChanges": [{"page": "", "changeType": "add|modify|remove", "detail": ""}],
  "apiChanges": [{"endpoint": "", "method": "GET|POST|PUT|DELETE", "changeType": "add|modify|remove", "detail": ""}],
  "risks": [{"description": "", "severity": "low|medium|high|critical", "mitigation": ""}],
  "resources": [{"type": "development|testing|review", "estimate": ""}],
  "acceptanceCriteria": ["条件1", "条件2"]
}

不要输出任何非JSON内容。`;

export async function generateProposal(
  scenario: SandboxScenario,
  triggeredById: number,
): Promise<{ runId: number; proposal: ProposalOutput }> {
  const userInput = [
    `## 业务目标\n${scenario.businessGoal || scenario.description || scenario.title}`,
    `## 影响页面\n${JSON.stringify(scenario.affectedPages || [])}`,
    `## 关联项目\n${JSON.stringify(scenario.referenceProjects || [])}`,
    `## 优先级: ${scenario.priority}`,
    `## 标签: ${JSON.stringify(scenario.tags || [])}`,
  ].join("\n\n");

  const start = Date.now();
  let result: { content: string; usage?: any; model: string };
  let status: "completed" | "failed" = "completed";
  let errorMessage: string | undefined;
  let proposal: ProposalOutput;

  try {
    result = await invokeLLMWithProvider({
      provider: "gemini",
      system: PROPOSAL_SYSTEM_PROMPT,
      prompt: userInput,
    });
    proposal = JSON.parse(result.content);
  } catch (err: any) {
    status = "failed";
    errorMessage = err.message;
    log.error({ err, scenarioId: scenario.id }, "Proposal generation failed");
    // Write failed run
    const runId = await writeRunRecord({
      scenarioId: scenario.id,
      runType: "proposal",
      provider: "gemini",
      model: "gemini-2.0-flash",
      systemPrompt: PROPOSAL_SYSTEM_PROMPT,
      userInput,
      aiOutput: null,
      status: "failed",
      durationMs: Date.now() - start,
      errorMessage,
      triggeredById,
    });
    throw new Error(`Proposal generation failed: ${errorMessage}`);
  }

  const runId = await writeRunRecord({
    scenarioId: scenario.id,
    runType: "proposal",
    provider: "gemini",
    model: result.model,
    systemPrompt: PROPOSAL_SYSTEM_PROMPT,
    userInput,
    aiOutput: proposal,
    status: "completed",
    durationMs: Date.now() - start,
    tokenUsage: result.usage,
    triggeredById,
  });

  log.info({ scenarioId: scenario.id, runId, durationMs: Date.now() - start }, "Proposal generated");
  return { runId, proposal };
}

// ── 2. Execute Implementation — Claude ───────────────────────

const IMPLEMENTATION_SYSTEM_PROMPT = `你是GRT系统的实施工程师(Claude)。根据已批准的方案，生成具体的实施计划和代码变更。

你必须输出严格的JSON，包含以下字段：
{
  "codeChanges": [{"filePath": "", "changeType": "create|modify|delete", "description": "", "before": "", "after": "", "diff": ""}],
  "apiChanges": [{"endpoint": "", "method": "", "detail": ""}],
  "testResults": [{"test": "", "status": "pass|fail|skip", "detail": ""}],
  "incompleteItems": ["待完成项1"],
  "rollbackInstructions": ["回滚步骤1"]
}

不要输出任何非JSON内容。`;

export async function executeImplementation(
  scenario: SandboxScenario,
  proposal: ProposalOutput,
  triggeredById: number,
  parentRunId?: number,
): Promise<{ runId: number; implementation: ImplementationOutput }> {
  // Enforce: scenario must be in approved status
  if (!["approved", "implementing"].includes(scenario.status)) {
    throw new Error(`Scenario must be approved before implementation. Current status: ${scenario.status}`);
  }

  const userInput = [
    `## 方案目标\n${proposal.objective}`,
    `## 影响模块\n${JSON.stringify(proposal.affectedModules)}`,
    `## 字段变更\n${JSON.stringify(proposal.fieldChanges)}`,
    `## 页面变更\n${JSON.stringify(proposal.pageChanges)}`,
    `## 接口变更\n${JSON.stringify(proposal.apiChanges)}`,
    `## 验收标准\n${JSON.stringify(proposal.acceptanceCriteria)}`,
  ].join("\n\n");

  const start = Date.now();
  let result: { content: string; usage?: any; model: string };
  let implementation: ImplementationOutput;

  try {
    result = await invokeLLMWithProvider({
      provider: "claude",
      system: IMPLEMENTATION_SYSTEM_PROMPT,
      prompt: userInput,
    });
    implementation = JSON.parse(result.content);
  } catch (err: any) {
    log.error({ err, scenarioId: scenario.id }, "Implementation execution failed");
    await writeRunRecord({
      scenarioId: scenario.id,
      runType: "implementation",
      provider: "claude",
      model: "claude-sonnet-4-20250514",
      systemPrompt: IMPLEMENTATION_SYSTEM_PROMPT,
      userInput,
      aiOutput: null,
      status: "failed",
      durationMs: Date.now() - start,
      errorMessage: err.message,
      triggeredById,
      parentRunId,
    });
    throw new Error(`Implementation failed: ${err.message}`);
  }

  const runId = await writeRunRecord({
    scenarioId: scenario.id,
    runType: "implementation",
    provider: "claude",
    model: result.model,
    systemPrompt: IMPLEMENTATION_SYSTEM_PROMPT,
    userInput,
    aiOutput: implementation,
    status: "completed",
    durationMs: Date.now() - start,
    tokenUsage: result.usage,
    triggeredById,
    parentRunId,
  });

  // Auto-create change tasks from implementation output
  const db = await requireDb();
  for (const change of implementation.codeChanges) {
    await db.insert(sandboxChangeTasks).values({
      scenarioId: scenario.id,
      runId,
      taskType: "code_change",
      title: change.description || `${change.changeType} ${change.filePath}`,
      description: change.description,
      filePath: change.filePath,
      changeDetail: { before: change.before, after: change.after, diff: change.diff },
      status: "ai_generated",
      priority: scenario.priority,
    });
  }

  // Create rollback tasks
  for (const instruction of implementation.rollbackInstructions) {
    await db.insert(sandboxChangeTasks).values({
      scenarioId: scenario.id,
      runId,
      taskType: "rollback_step",
      title: instruction,
      status: "ai_generated",
      priority: scenario.priority,
    });
  }

  log.info({ scenarioId: scenario.id, runId, codeChanges: implementation.codeChanges.length }, "Implementation executed");
  return { runId, implementation };
}

// ── 3. Red Team Review — GPT ─────────────────────────────────

const RED_TEAM_SYSTEM_PROMPT = `你是GRT系统的红队审计官(GPT)。你的任务是从5个维度审查方案和实施：

1. 业务问题是否解决？(business_solved)
2. 是否增加了不必要的复杂度？(complexity_check)
3. 权限是否完整？(permissions_ok)
4. 回滚方案是否可行？(rollback_viable)
5. 是否可灰度发布？(canary_possible)

你必须输出严格的JSON：
{
  "overallVerdict": "pass|conditional_pass|fail",
  "criteria": [
    {"name": "business_solved", "passed": true/false, "comment": ""},
    {"name": "complexity_check", "passed": true/false, "comment": ""},
    {"name": "permissions_ok", "passed": true/false, "comment": ""},
    {"name": "rollback_viable", "passed": true/false, "comment": ""},
    {"name": "canary_possible", "passed": true/false, "comment": ""}
  ],
  "risks": ["风险1"],
  "recommendations": ["建议1"]
}

不要输出任何非JSON内容。`;

export async function runRedTeamReview(
  scenario: SandboxScenario,
  proposal: ProposalOutput,
  implementation: ImplementationOutput,
  triggeredById: number,
  parentRunId?: number,
): Promise<{ runId: number; review: RedTeamOutput }> {
  const userInput = [
    `## 场景: ${scenario.title}`,
    `## 业务目标: ${scenario.businessGoal || scenario.description}`,
    `## 方案摘要\n${JSON.stringify(proposal, null, 2).slice(0, 3000)}`,
    `## 实施摘要\n- ${implementation.codeChanges.length} code changes`,
    `- ${implementation.apiChanges.length} API changes`,
    `- ${implementation.incompleteItems.length} incomplete items`,
    `- ${implementation.rollbackInstructions.length} rollback steps`,
    `## 验收标准\n${JSON.stringify(proposal.acceptanceCriteria)}`,
  ].join("\n\n");

  const start = Date.now();
  let result: { content: string; usage?: any; model: string };
  let review: RedTeamOutput;

  try {
    result = await invokeLLMWithProvider({
      provider: "openai",
      system: RED_TEAM_SYSTEM_PROMPT,
      prompt: userInput,
    });
    review = JSON.parse(result.content);
  } catch (err: any) {
    log.error({ err, scenarioId: scenario.id }, "Red team review failed");
    await writeRunRecord({
      scenarioId: scenario.id,
      runType: "review",
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: RED_TEAM_SYSTEM_PROMPT,
      userInput,
      aiOutput: null,
      status: "failed",
      durationMs: Date.now() - start,
      errorMessage: err.message,
      triggeredById,
      parentRunId,
    });
    throw new Error(`Red team review failed: ${err.message}`);
  }

  const runId = await writeRunRecord({
    scenarioId: scenario.id,
    runType: "review",
    provider: "openai",
    model: result.model,
    systemPrompt: RED_TEAM_SYSTEM_PROMPT,
    userInput,
    aiOutput: review,
    status: "completed",
    durationMs: Date.now() - start,
    tokenUsage: result.usage,
    triggeredById,
    parentRunId,
  });

  // Update red_team gate if it exists
  try {
    const db = await requireDb();
    const [gate] = await db
      .select()
      .from(releaseGates)
      .where(eq(releaseGates.scenarioId, scenario.id))
      .limit(100);

    // Find the red_team gate
    const gates = await db
      .select()
      .from(releaseGates)
      .where(eq(releaseGates.scenarioId, scenario.id))
      .limit(10);

    const redTeamGate = gates.find((g) => g.gateType === "red_team");
    if (redTeamGate) {
      await db
        .update(releaseGates)
        .set({
          status: review.overallVerdict === "fail" ? "failed" : "passed",
          redTeamReport: review,
          passedAt: review.overallVerdict !== "fail" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(releaseGates.id, redTeamGate.id));
    }
  } catch (err) {
    log.warn({ err }, "Failed to update release gate");
  }

  log.info({ scenarioId: scenario.id, runId, verdict: review.overallVerdict }, "Red team review completed");
  return { runId, review };
}
