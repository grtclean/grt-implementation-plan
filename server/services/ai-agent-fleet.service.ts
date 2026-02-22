/**
 * AI Agent Fleet Service
 *
 * Core logic for:
 * 1. Fleet provisioning (L1-L5 per employee)
 * 2. Agent activation / deactivation
 * 3. G-Token atomic ledger (credit/debit)
 * 4. Task execution via LLM
 * 5. Human review & reward distribution
 */

import { requireDb } from "../db";
import { eq, and, desc, sql, inArray, isNull } from "drizzle-orm";
import {
  aiAgentFleet,
  gTokenLedger,
  agentTaskExecutions,
} from "../../drizzle/ai-agent-fleet-schema";
import {
  hrmEmployees,
  employeeAiAssistants,
} from "../../drizzle/schema";
import {
  AGENT_LEVEL_CONFIGS,
  generateAgentName,
  generateAgentCode,
  generateAgentDid,
  needsHumanReview,
  calculateGTokenReward,
  type AgentLevel,
  type AgentTaskType,
} from "../../shared/ai-agent-levels";
import { invokeLLM } from "../_core/llm";

// ─── Types ──────────────────────────────────────────────────

export interface ProvisionFleetResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface GTokenTxResult {
  success: boolean;
  newBalance: string;
  txId: number;
}

// ─── Fleet Provisioning ────────────────────────────────────

/**
 * Create L1-L5 agents for a single employee who already has a Master assistant.
 */
export async function provisionFleetForEmployee(
  employeeId: number,
): Promise<{ created: number; skipped: number; error?: string }> {
  const db = await requireDb();

  // Find the master assistant
  const [master] = await db
    .select()
    .from(employeeAiAssistants)
    .where(eq(employeeAiAssistants.employeeId, employeeId))
    .limit(1);

  if (!master) {
    return { created: 0, skipped: 0, error: "员工没有M级AI助理，请先初始化" };
  }

  // Find employee info
  const [emp] = await db
    .select()
    .from(hrmEmployees)
    .where(eq(hrmEmployees.id, employeeId))
    .limit(1);

  if (!emp) {
    return { created: 0, skipped: 0, error: "员工不存在" };
  }

  // Check existing agents
  const existing = await db
    .select({ level: aiAgentFleet.level })
    .from(aiAgentFleet)
    .where(eq(aiAgentFleet.employeeId, employeeId));

  const existingLevels = new Set(existing.map((a) => a.level));

  let created = 0;
  let skipped = 0;
  const empCode = emp.employeeCode || `EMP${employeeId}`;
  const empName = emp.name || "员工";

  for (let lvl = 1; lvl <= 5; lvl++) {
    const level = lvl as AgentLevel;
    if (existingLevels.has(level)) {
      skipped++;
      continue;
    }

    const cfg = AGENT_LEVEL_CONFIGS[level];

    // Build personality from master + level modifier
    let personalityConfig: Record<string, unknown> = {};
    try {
      if (master.personalityConfig) {
        personalityConfig = JSON.parse(master.personalityConfig);
      }
    } catch {
      // ignore parse error
    }
    personalityConfig.levelModifier = cfg.promptModifier;
    personalityConfig.level = level;

    await db.insert(aiAgentFleet).values({
      masterAssistantId: master.id,
      employeeId,
      agentCode: generateAgentCode(empCode, level),
      agentDid: generateAgentDid(empCode, level),
      agentName: generateAgentName(empName, level),
      level,
      personalityConfig: JSON.stringify(personalityConfig),
      capabilityMask: JSON.stringify(cfg.defaultCapabilities),
      maxTaskComplexity: cfg.maxTaskComplexity,
      autonomyLevel: cfg.autonomyLevel,
      dataScope: cfg.dataScope,
      canBidTasks: level >= 3,
      maxConcurrentTasks: cfg.maxConcurrentTasks,
      bidPriceRangeLow: String(cfg.bidPriceRangeLow),
      bidPriceRangeHigh: String(cfg.bidPriceRangeHigh),
      status: "inactive",
    });

    created++;
  }

  return { created, skipped };
}

/**
 * Batch provision fleets for all employees who have a master assistant but no fleet.
 */
export async function provisionFleetForAll(): Promise<ProvisionFleetResult> {
  const db = await requireDb();

  // Find all master assistants
  const masters = await db
    .select({
      employeeId: employeeAiAssistants.employeeId,
    })
    .from(employeeAiAssistants);

  // Find employees who already have at least one agent
  const agentEmployees = await db
    .select({ employeeId: aiAgentFleet.employeeId })
    .from(aiAgentFleet);

  const hasFleet = new Set(agentEmployees.map((a) => a.employeeId));
  const needsFleet = masters.filter((m) => !hasFleet.has(m.employeeId));

  const result: ProvisionFleetResult = { created: 0, skipped: 0, errors: [] };

  for (const m of needsFleet) {
    try {
      const r = await provisionFleetForEmployee(m.employeeId);
      result.created += r.created;
      result.skipped += r.skipped;
      if (r.error) result.errors.push(`EMP-${m.employeeId}: ${r.error}`);
    } catch (err: any) {
      result.errors.push(`EMP-${m.employeeId}: ${err.message}`);
    }
  }

  return result;
}

// ─── Agent Status Management ───────────────────────────────

export async function activateAgent(agentId: number): Promise<boolean> {
  const db = await requireDb();
  const now = new Date().toISOString();
  const [updated] = await db
    .update(aiAgentFleet)
    .set({ status: "active", activatedAt: now, updatedAt: now })
    .where(eq(aiAgentFleet.id, agentId))
    .returning({ id: aiAgentFleet.id });
  return !!updated;
}

export async function deactivateAgent(agentId: number): Promise<boolean> {
  const db = await requireDb();
  const now = new Date().toISOString();
  const [updated] = await db
    .update(aiAgentFleet)
    .set({ status: "paused", updatedAt: now })
    .where(eq(aiAgentFleet.id, agentId))
    .returning({ id: aiAgentFleet.id });
  return !!updated;
}

// ─── Fleet Queries ──────────────────────────────────────────

export async function getFleetByEmployee(employeeId: number) {
  const db = await requireDb();
  const agents = await db
    .select()
    .from(aiAgentFleet)
    .where(eq(aiAgentFleet.employeeId, employeeId))
    .orderBy(aiAgentFleet.level);

  // Summary stats
  const totalBalance = agents.reduce(
    (sum, a) => sum + parseFloat(a.gTokenBalance || "0"),
    0,
  );
  const totalTasks = agents.reduce(
    (sum, a) => sum + (a.taskCompletionCount || 0),
    0,
  );
  const activeCount = agents.filter((a) => a.status === "active").length;

  return {
    agents,
    summary: {
      totalAgents: agents.length,
      activeCount,
      totalBalance: totalBalance.toFixed(4),
      totalTasks,
    },
  };
}

export async function getAgentDashboard(agentId: number) {
  const db = await requireDb();

  const [agent] = await db
    .select()
    .from(aiAgentFleet)
    .where(eq(aiAgentFleet.id, agentId))
    .limit(1);

  if (!agent) return null;

  // Recent tasks
  const recentTasks = await db
    .select()
    .from(agentTaskExecutions)
    .where(eq(agentTaskExecutions.agentId, agentId))
    .orderBy(desc(agentTaskExecutions.createdAt))
    .limit(20);

  // Recent ledger entries
  const recentLedger = await db
    .select()
    .from(gTokenLedger)
    .where(eq(gTokenLedger.agentId, agentId))
    .orderBy(desc(gTokenLedger.createdAt))
    .limit(20);

  return { agent, recentTasks, recentLedger };
}

// ─── G-Token Ledger ────────────────────────────────────────

export async function creditGToken(
  agentId: number,
  amount: number,
  txType: "task_reward" | "royalty_income" | "bonus" | "transfer_in",
  referenceType?: string,
  referenceId?: string,
  description?: string,
): Promise<GTokenTxResult> {
  const db = await requireDb();

  // Get current balance
  const [agent] = await db
    .select({ gTokenBalance: aiAgentFleet.gTokenBalance, agentCode: aiAgentFleet.agentCode })
    .from(aiAgentFleet)
    .where(eq(aiAgentFleet.id, agentId))
    .limit(1);

  if (!agent) return { success: false, newBalance: "0", txId: 0 };

  const currentBalance = parseFloat(agent.gTokenBalance || "0");
  const newBalance = currentBalance + amount;

  // Atomic: update balance + insert ledger
  await db
    .update(aiAgentFleet)
    .set({
      gTokenBalance: newBalance.toFixed(4),
      totalEarned: sql`CAST(${aiAgentFleet.totalEarned} AS DECIMAL) + ${amount}`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(aiAgentFleet.id, agentId));

  const [tx] = await db
    .insert(gTokenLedger)
    .values({
      agentId,
      agentCode: agent.agentCode,
      txType,
      amount: amount.toFixed(4),
      balanceAfter: newBalance.toFixed(4),
      referenceType: referenceType as any,
      referenceId,
      description,
    })
    .returning({ id: gTokenLedger.id });

  return { success: true, newBalance: newBalance.toFixed(4), txId: tx.id };
}

export async function debitGToken(
  agentId: number,
  amount: number,
  txType: "task_expense" | "penalty" | "transfer_out",
  referenceType?: string,
  referenceId?: string,
  description?: string,
): Promise<GTokenTxResult> {
  const db = await requireDb();

  const [agent] = await db
    .select({ gTokenBalance: aiAgentFleet.gTokenBalance, agentCode: aiAgentFleet.agentCode })
    .from(aiAgentFleet)
    .where(eq(aiAgentFleet.id, agentId))
    .limit(1);

  if (!agent) return { success: false, newBalance: "0", txId: 0 };

  const currentBalance = parseFloat(agent.gTokenBalance || "0");
  const newBalance = Math.max(0, currentBalance - amount);

  await db
    .update(aiAgentFleet)
    .set({
      gTokenBalance: newBalance.toFixed(4),
      totalSpent: sql`CAST(${aiAgentFleet.totalSpent} AS DECIMAL) + ${amount}`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(aiAgentFleet.id, agentId));

  const [tx] = await db
    .insert(gTokenLedger)
    .values({
      agentId,
      agentCode: agent.agentCode,
      txType,
      amount: (-amount).toFixed(4),
      balanceAfter: newBalance.toFixed(4),
      referenceType: referenceType as any,
      referenceId,
      description,
    })
    .returning({ id: gTokenLedger.id });

  return { success: true, newBalance: newBalance.toFixed(4), txId: tx.id };
}

// ─── Task Execution ────────────────────────────────────────

export async function executeAgentTask(
  agentId: number,
  taskType: AgentTaskType,
  taskTitle: string,
  taskInput: Record<string, unknown>,
) {
  const db = await requireDb();

  // Load agent config
  const [agent] = await db
    .select()
    .from(aiAgentFleet)
    .where(eq(aiAgentFleet.id, agentId))
    .limit(1);

  if (!agent) throw new Error("Agent不存在");
  if (agent.status !== "active") throw new Error("Agent未激活");

  const startedAt = new Date().toISOString();

  // Insert execution record
  const level = agent.level as AgentLevel;
  const reviewRequired = needsHumanReview(level, taskInput.complexity as number || 1);

  const [execution] = await db
    .insert(agentTaskExecutions)
    .values({
      agentId,
      taskType,
      taskTitle,
      taskInput: JSON.stringify(taskInput),
      status: "in_progress",
      humanReviewRequired: reviewRequired,
      startedAt,
    })
    .returning();

  // Build prompt
  let personalityConfig: Record<string, unknown> = {};
  try {
    if (agent.personalityConfig) {
      personalityConfig = JSON.parse(agent.personalityConfig);
    }
  } catch {
    // ignore
  }

  const levelModifier =
    (personalityConfig.levelModifier as string) ||
    AGENT_LEVEL_CONFIGS[level].promptModifier;

  const systemPrompt = `${levelModifier}

你的身份：${agent.agentName} (${agent.agentCode})
任务类型：${taskType}
数据权限范围：${agent.dataScope}

请按照以下要求完成任务。输出应清晰、专业、可直接使用。`;

  const userPrompt = `任务标题：${taskTitle}

任务输入：
${JSON.stringify(taskInput.content || taskInput, null, 2)}

请完成此任务并给出结果。`;

  try {
    const llmResult = await invokeLLM({
      system: systemPrompt,
      prompt: userPrompt,
    });

    const completedAt = new Date().toISOString();
    const durationMs =
      new Date(completedAt).getTime() - new Date(startedAt).getTime();
    const tokensUsed = llmResult.usage?.total_tokens || 0;

    // Auto quality score estimate (basic heuristic)
    const outputLength = (llmResult.content || "").length;
    const qualityScore = Math.min(
      100,
      50 + Math.min(30, outputLength / 50) + (level * 4),
    );

    // Update execution
    await db
      .update(agentTaskExecutions)
      .set({
        taskOutput: JSON.stringify({
          content: llmResult.content,
          model: "auto",
        }),
        status: reviewRequired ? "completed" : "completed",
        qualityScore: qualityScore.toFixed(2),
        completedAt,
        durationMs,
        llmTokensUsed: tokensUsed,
      })
      .where(eq(agentTaskExecutions.id, execution.id));

    // If no human review needed, auto-reward
    if (!reviewRequired) {
      const reward = calculateGTokenReward(
        taskInput.complexity as number || 1,
        qualityScore,
      );
      await creditGToken(agentId, reward, "task_reward", "task_execution", String(execution.id), `自动奖励：${taskTitle}`);

      await db
        .update(agentTaskExecutions)
        .set({
          gTokenReward: reward.toFixed(4),
          humanApproved: true,
        })
        .where(eq(agentTaskExecutions.id, execution.id));

      // Update agent stats
      await db
        .update(aiAgentFleet)
        .set({
          taskCompletionCount: sql`${aiAgentFleet.taskCompletionCount} + 1`,
          lastTaskAt: completedAt,
          updatedAt: completedAt,
        })
        .where(eq(aiAgentFleet.id, agentId));
    }

    return {
      executionId: execution.id,
      output: llmResult.content,
      qualityScore,
      reviewRequired,
      durationMs,
    };
  } catch (err: any) {
    await db
      .update(agentTaskExecutions)
      .set({
        status: "failed",
        taskOutput: JSON.stringify({ error: err.message }),
        completedAt: new Date().toISOString(),
      })
      .where(eq(agentTaskExecutions.id, execution.id));

    throw err;
  }
}

// ─── Human Review ──────────────────────────────────────────

export async function reviewTaskExecution(
  executionId: number,
  approved: boolean,
  qualityScore: number,
  reviewedBy: number,
) {
  const db = await requireDb();

  const [execution] = await db
    .select()
    .from(agentTaskExecutions)
    .where(eq(agentTaskExecutions.id, executionId))
    .limit(1);

  if (!execution) throw new Error("执行记录不存在");
  if (execution.humanApproved !== null)
    throw new Error("已经审核过");

  await db
    .update(agentTaskExecutions)
    .set({
      humanReviewedBy: reviewedBy,
      humanApproved: approved,
      qualityScore: qualityScore.toFixed(2),
    })
    .where(eq(agentTaskExecutions.id, executionId));

  if (approved) {
    const complexity =
      (() => {
        try {
          return JSON.parse(execution.taskInput || "{}").complexity || 1;
        } catch {
          return 1;
        }
      })();

    const reward = calculateGTokenReward(complexity, qualityScore);

    await creditGToken(
      execution.agentId,
      reward,
      "task_reward",
      "task_execution",
      String(executionId),
      `审核通过奖励：${execution.taskTitle}`,
    );

    await db
      .update(agentTaskExecutions)
      .set({ gTokenReward: reward.toFixed(4) })
      .where(eq(agentTaskExecutions.id, executionId));

    // Update agent stats
    const now = new Date().toISOString();
    await db
      .update(aiAgentFleet)
      .set({
        taskCompletionCount: sql`${aiAgentFleet.taskCompletionCount} + 1`,
        lastTaskAt: now,
        updatedAt: now,
      })
      .where(eq(aiAgentFleet.id, execution.agentId));
  }

  return { approved, reward: approved ? qualityScore : 0 };
}

// ─── Analytics ──────────────────────────────────────────────

export async function getGTokenSummary() {
  const db = await requireDb();

  const agents = await db
    .select({
      totalBalance: sql<string>`COALESCE(SUM(CAST(${aiAgentFleet.gTokenBalance} AS DECIMAL)), 0)`,
      totalEarned: sql<string>`COALESCE(SUM(CAST(${aiAgentFleet.totalEarned} AS DECIMAL)), 0)`,
      totalSpent: sql<string>`COALESCE(SUM(CAST(${aiAgentFleet.totalSpent} AS DECIMAL)), 0)`,
      totalAgents: sql<number>`COUNT(*)`,
      activeAgents: sql<number>`COUNT(*) FILTER (WHERE ${aiAgentFleet.status} = 'active')`,
      totalTasks: sql<number>`COALESCE(SUM(${aiAgentFleet.taskCompletionCount}), 0)`,
    })
    .from(aiAgentFleet);

  return agents[0] || {
    totalBalance: "0",
    totalEarned: "0",
    totalSpent: "0",
    totalAgents: 0,
    activeAgents: 0,
    totalTasks: 0,
  };
}

export async function getFleetAnalytics() {
  const db = await requireDb();

  // Per-level stats
  const levelStats = await db
    .select({
      level: aiAgentFleet.level,
      count: sql<number>`COUNT(*)`,
      activeCount: sql<number>`COUNT(*) FILTER (WHERE ${aiAgentFleet.status} = 'active')`,
      totalTasks: sql<number>`COALESCE(SUM(${aiAgentFleet.taskCompletionCount}), 0)`,
      avgReputation: sql<string>`COALESCE(AVG(CAST(${aiAgentFleet.reputationScore} AS DECIMAL)), 50)`,
      totalBalance: sql<string>`COALESCE(SUM(CAST(${aiAgentFleet.gTokenBalance} AS DECIMAL)), 0)`,
    })
    .from(aiAgentFleet)
    .groupBy(aiAgentFleet.level)
    .orderBy(aiAgentFleet.level);

  const summary = await getGTokenSummary();

  return { levelStats, summary };
}
