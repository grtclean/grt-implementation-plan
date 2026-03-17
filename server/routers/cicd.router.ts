/**
 * GRT CI/CD Pipeline Matrix Router
 *
 * Implements the "Dual-AI Collaboration Matrix":
 *   - Gemini (Strategist): analyzes requirements, suggests categories/scopes,
 *     provides Go/No-Go advice at each stage transition
 *   - Claude (Executor): runs tasks through the Dev → Test → Prod pipeline
 *   - CEO (Approver): reviews Gemini's analysis and approves stage promotions
 *
 * Source modes:
 *   AUTO_FETCH — scrapes error logs, monitoring alerts, user feedback
 *   MANUAL     — CEO/CTO types in a requirement or bug description
 *
 * 12 procedures:
 *   Queries    (4): list, getById, getStageLogs, getDashboardStats
 *   Mutations  (8): create, updateStage, promoteStage, rejectStage,
 *                    addGeminiAnalysis, askGeminiPlanner, autoFetch, delete
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { jsonValue } from "@shared/validators";
import {router, protectedProcedure, requirePermission} from "../_core/trpc";
import { requireDb } from "../db";
import { cicdTasks, cicdStageLogs } from "../../drizzle/cicd-pipeline-schema";
import { eq, desc, sql, and, count, type SQL } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import fs from "fs";
import path from "path";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("cicd");

// ── File-Based Queue Bridge ────────────────────────────────
// When a task enters IN_PROGRESS, the backend writes a .md file to
// data/dev-queue/pending/. Claude CLI (in Sentinel Mode) watches this
// folder, executes the task, then moves the file to completed/.
// The backend polls completed/ to detect finished tasks and updates the DB.
const QUEUE_BASE = path.resolve(process.cwd(), "data", "dev-queue");
const PENDING_DIR = path.join(QUEUE_BASE, "pending");
const COMPLETED_DIR = path.join(QUEUE_BASE, "completed");
const QUESTIONS_DIR = path.join(QUEUE_BASE, "questions");
const ANSWERS_DIR = path.join(QUEUE_BASE, "answers");
const RULEBOOK_PATH = path.join(QUEUE_BASE, "grtclaudeexcute.txt");

// Ensure queue directories exist at startup
for (const dir of [PENDING_DIR, COMPLETED_DIR, QUESTIONS_DIR, ANSWERS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log.info({ dir }, "Created directory");
  }
}

/**
 * writeTaskFile — Writes a Claude-prompt .md file to the pending queue.
 * This is the BRIDGE between the web UI and the Claude CLI terminal.
 * The file content is a direct instruction for Claude to execute.
 */
function writeTaskFile(task: {
  id: number;
  title: string;
  scope: string | null;
  categories: string[] | null;
  rules: string | null;
  currentStage: string;
  priority: number;
}) {
  const filename = `task_${task.id}.md`;
  const filepath = path.join(PENDING_DIR, filename);

  const content = `# AUTOGEN TASK ${task.id}

**Title:** ${task.title}
**Scope:** ${task.scope || "General"}
**Stage:** ${task.currentStage}
**Priority:** P${task.priority}
**Categories:** ${(task.categories || []).join(", ") || "N/A"}
**Rules:** ${task.rules || "No specific rules"}
**Generated:** ${new Date().toISOString()}

---

## Instruction for Claude

Please analyze the codebase related to the scope "${task.scope || "General"}" and implement the following:

> ${task.title}

### Acceptance Criteria
${task.rules || "- Ensure the implementation is complete and functional"}

### Constraints
- Work within the existing project architecture (React + Vite + tRPC + Drizzle)
- Follow existing code patterns and naming conventions
- Do NOT break any existing functionality
- Do NOT stop until the code is fully updated and the build passes

### When Done
After completing all changes, create a brief summary of what was modified.

---

## HUMAN-IN-THE-LOOP (HITL) PROTOCOL — MANDATORY

> **CRITICAL INSTRUCTION**: If you reach a point where you need interaction,
> confirmation, or a decision to proceed, you MUST follow this 3-step protocol:

### Step 1: Check the Rulebook
Read \`data/dev-queue/grtclaudeexcute.txt\`. If your question is answered
by those rules, **proceed automatically** — do NOT ask for human input.

### Step 2: Escalate to CEO
If the rulebook does **NOT** cover your situation, write your question into:
\`\`\`
data/dev-queue/questions/task_${task.id}.json
\`\`\`
Format:
\`\`\`json
{
  "taskId": ${task.id},
  "question": "Your specific question here",
  "context": "Brief context about what you were doing",
  "options": ["Option A", "Option B"],
  "timestamp": "<ISO timestamp>"
}
\`\`\`

### Step 3: Wait for Answer
Pause your execution and **continuously watch** for:
\`\`\`
data/dev-queue/answers/task_${task.id}.txt
\`\`\`
Once the answer file appears, read it, **resume execution** using the CEO's
decision, and then **delete the question file** from \`data/dev-queue/questions/\`.

> **DO NOT** skip this protocol. **DO NOT** guess or make assumptions when
> the rulebook is silent. The CEO's answer is the ONLY source of truth.
`;

  fs.writeFileSync(filepath, content, "utf-8");
  log.info({ filepath }, "Task file written");
  return { filepath, filename };
}

const idInput = z.object({ id: z.union([z.string(), z.number()]) });
const toNum = (id: string | number) =>
  typeof id === "string" ? parseInt(id) : id;

// Valid stages in pipeline order
const STAGES = ["DEV", "TEST", "PROD"] as const;
const STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "SKIPPED"] as const;

export const cicdRouter = router({
  // ══════════════════════════════════════════════════════════════
  //  Queries
  // ══════════════════════════════════════════════════════════════

  // List all pipeline tasks, optionally filtered by stage/status
  list: protectedProcedure
    .input(
      z.object({
        stage: z.enum(STAGES).optional(),
        scope: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: SQL[] = [];
      if (input?.stage) conditions.push(eq(cicdTasks.currentStage, input.stage));
      if (input?.scope) conditions.push(eq(cicdTasks.scope, input.scope));

      const rows = await db
        .select()
        .from(cicdTasks)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(cicdTasks.updatedAt))
        .limit(input?.limit ?? 100)
        .offset(input?.offset ?? 0);

      return rows;
    }),

  // Get a single task by ID
  getById: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db
      .select()
      .from(cicdTasks)
      .where(eq(cicdTasks.id, toNum(input.id)))
      .limit(1000);
    return row ?? null;
  }),

  // Get stage transition logs for a task
  getStageLogs: protectedProcedure.input(idInput).query(async ({ input }) => {
    const db = await requireDb();
    return db
      .select()
      .from(cicdStageLogs)
      .where(eq(cicdStageLogs.taskId, toNum(input.id)))
      .orderBy(desc(cicdStageLogs.createdAt))
      .limit(1000);
  }),

  // Dashboard aggregation stats
  getDashboardStats: protectedProcedure.query(async () => {
    const db = await requireDb();
    // Count tasks per stage
    const stageCounts = await db
      .select({
        stage: cicdTasks.currentStage,
        count: count(),
      })
      .from(cicdTasks)
      .groupBy(cicdTasks.currentStage);

    // Count per status within each stage
    const devStatusCounts = await db
      .select({ status: cicdTasks.devStatus, count: count() })
      .from(cicdTasks)
      .where(eq(cicdTasks.currentStage, "DEV"))
      .groupBy(cicdTasks.devStatus);

    const testStatusCounts = await db
      .select({ status: cicdTasks.testStatus, count: count() })
      .from(cicdTasks)
      .where(eq(cicdTasks.currentStage, "TEST"))
      .groupBy(cicdTasks.testStatus);

    const prodStatusCounts = await db
      .select({ status: cicdTasks.prodStatus, count: count() })
      .from(cicdTasks)
      .where(eq(cicdTasks.currentStage, "PROD"))
      .groupBy(cicdTasks.prodStatus);

    return {
      stageCounts: Object.fromEntries(stageCounts.map((r) => [r.stage, Number(r.count)])),
      devStatusCounts: Object.fromEntries(devStatusCounts.map((r) => [r.status, Number(r.count)])),
      testStatusCounts: Object.fromEntries(testStatusCounts.map((r) => [r.status, Number(r.count)])),
      prodStatusCounts: Object.fromEntries(prodStatusCounts.map((r) => [r.status, Number(r.count)])),
    };
  }),

  // ══════════════════════════════════════════════════════════════
  //  Mutations
  // ══════════════════════════════════════════════════════════════

  // Create a new pipeline task (from Gemini suggestion or manual input)
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        sourceMode: z.enum(["AUTO_FETCH", "MANUAL"]).default("MANUAL"),
        sourceData: z.string().optional(),
        categories: z.array(z.string()).default([]),
        scope: z.string().optional(),
        priority: z.number().min(1).max(4).default(3),
        rules: z.string().optional(),
        assignee: z.string().default("Claude"),
        // Optional: Gemini's initial analysis
        geminiAnalysis: z.record(z.string(), jsonValue).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [task] = await db
        .insert(cicdTasks)
        .values({
          title: input.title,
          sourceMode: input.sourceMode,
          sourceData: input.sourceData ?? null,
          categories: input.categories,
          scope: input.scope ?? null,
          priority: input.priority,
          rules: input.rules ?? null,
          assignee: input.assignee,
          currentStage: "DEV",
          devStatus: "PENDING",
          testStatus: "PENDING",
          prodStatus: "PENDING",
          geminiAnalysis: input.geminiAnalysis ?? {},
        })
        .returning();

      // Log the creation
      await db.insert(cicdStageLogs).values({
        taskId: task.id,
        fromStage: null,
        toStage: "DEV",
        action: "create",
        actor: input.sourceMode === "AUTO_FETCH" ? "Auto" : "CEO",
        note: `Task created: ${input.title}`,
      });

      return task;
    }),

  // Update status within the current stage.
  // CRITICAL: When status transitions to IN_PROGRESS, the backend writes
  // a Claude-prompt .md file to data/dev-queue/pending/. This is the
  // FILE-BASED QUEUE BRIDGE that connects the web UI to the CLI.
  updateStage: requirePermission('devops:deployment:manage')
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        status: z.enum(STATUSES),
        detail: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [task] = await db
        .select()
        .from(cicdTasks)
        .where(eq(cicdTasks.id, toNum(input.id)))
        .limit(1000);
      if (!task) throw new Error("Task not found");

      const stageField =
        task.currentStage === "DEV"
          ? { devStatus: input.status, devDetail: input.detail }
          : task.currentStage === "TEST"
          ? { testStatus: input.status, testDetail: input.detail }
          : { prodStatus: input.status, prodDetail: input.detail };

      const [updated] = await db
        .update(cicdTasks)
        .set({ ...stageField, updatedAt: new Date() })
        .where(eq(cicdTasks.id, toNum(input.id)))
        .returning();

      // ── FILE-BASED QUEUE BRIDGE ──
      // When a task enters IN_PROGRESS, write the instruction file
      // so Claude CLI Sentinel can pick it up and execute it.
      if (input.status === "IN_PROGRESS") {
        try {
          const { filepath } = writeTaskFile({
            id: toNum(input.id),
            title: task.title,
            scope: task.scope,
            categories: task.categories as string[] | null,
            rules: task.rules,
            currentStage: task.currentStage,
            priority: task.priority,
          });

          // Log the stage transition with file path reference
          await db.insert(cicdStageLogs).values({
            taskId: toNum(input.id),
            fromStage: task.currentStage,
            toStage: task.currentStage,
            action: "dispatch",
            actor: "System",
            note: `Task dispatched to Claude CLI queue: ${filepath}`,
          });
        } catch (err: any) {
          log.error({ err: err?.message }, "Failed to write task file");
        }
      }

      return updated;
    }),

  // Promote task to next stage (requires approval)
  promoteStage: requirePermission('devops:deployment:manage')
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [task] = await db
        .select()
        .from(cicdTasks)
        .where(eq(cicdTasks.id, toNum(input.id)))
        .limit(1000);
      if (!task) throw new Error("Task not found");

      const stageIdx = STAGES.indexOf(task.currentStage as typeof STAGES[number]);
      if (stageIdx >= STAGES.length - 1) throw new Error("Already in PROD — cannot promote further");
      const nextStage = STAGES[stageIdx + 1];

      // Set CEO approval for current stage + advance
      const approvalField =
        task.currentStage === "DEV"
          ? { ceoApprovedDev: true }
          : { ceoApprovedTest: true };

      const approverName = ctx.user!.name ?? `User#${ctx.user!.id}`;
      const [updated] = await db
        .update(cicdTasks)
        .set({
          ...approvalField,
          currentStage: nextStage,
          approvedBy: approverName,
          updatedAt: new Date(),
        })
        .where(eq(cicdTasks.id, toNum(input.id)))
        .returning();

      // Audit log
      await db.insert(cicdStageLogs).values({
        taskId: toNum(input.id),
        fromStage: task.currentStage,
        toStage: nextStage,
        action: "promote",
        actor: approverName,
        note: input.note ?? `Promoted from ${task.currentStage} to ${nextStage}`,
      });

      return updated;
    }),

  // Reject / rollback a stage (CEO says No-Go)
  rejectStage: requirePermission('devops:deployment:manage')
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        reason: z.string(),
        rollbackTo: z.enum(STAGES).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [task] = await db
        .select()
        .from(cicdTasks)
        .where(eq(cicdTasks.id, toNum(input.id)))
        .limit(1000);
      if (!task) throw new Error("Task not found");

      const target = input.rollbackTo ?? "DEV";
      const statusField =
        target === "DEV"
          ? { devStatus: "PENDING" as const }
          : target === "TEST"
          ? { testStatus: "PENDING" as const }
          : { prodStatus: "PENDING" as const };

      const [updated] = await db
        .update(cicdTasks)
        .set({
          currentStage: target,
          ...statusField,
          updatedAt: new Date(),
        })
        .where(eq(cicdTasks.id, toNum(input.id)))
        .returning();

      await db.insert(cicdStageLogs).values({
        taskId: toNum(input.id),
        fromStage: task.currentStage,
        toStage: target,
        action: "reject",
        actor: "CEO",
        note: input.reason,
      });

      return updated;
    }),

  // Store Gemini's analysis for a given stage
  addGeminiAnalysis: requirePermission('devops:deployment:manage')
    .input(
      z.object({
        id: z.union([z.string(), z.number()]),
        stage: z.enum(STAGES),
        analysis: z.record(z.string(), jsonValue),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [task] = await db
        .select()
        .from(cicdTasks)
        .where(eq(cicdTasks.id, toNum(input.id)))
        .limit(1000);
      if (!task) throw new Error("Task not found");

      const existing = (task.geminiAnalysis ?? {}) as Record<string, unknown>;
      existing[input.stage] = input.analysis;

      const [updated] = await db
        .update(cicdTasks)
        .set({ geminiAnalysis: existing, updatedAt: new Date() })
        .where(eq(cicdTasks.id, toNum(input.id)))
        .returning();

      return updated;
    }),

  // ── Gemini Planner — GRT开发第一定律: Async Task Queue ──
  // Enqueues LLM call via task worker, returns taskId for polling.
  startGeminiPlanner: requirePermission('devops:deployment:manage')
    .input(z.object({ prompt: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { submitTask, registerTaskHandler } = await import("../services/task-worker.service");

      // Register handler (idempotent)
      registerTaskHandler("GEMINI_PLANNER", async (_taskId, taskInput) => {
        try {
          const system = `You are Gemini, the strategic AI planner for the GRT manufacturing system.
Analyze the user's requirement and return a JSON object with:
{
  "reply": "Your strategic analysis and decomposition advice",
  "suggestedTask": {
    "title": "Short task title",
    "scope": "Target module (e.g. M6-MES, CRM, HR, Quality, SupplyChain)",
    "categories": ["Frontend", "Backend", "DB", "API", ...],
    "rules": "Acceptance criteria or performance targets",
    "priority": 1-4 (1=critical)
  }
}
Always respond in the same language as the user's prompt.`;

          const result = await invokeLLM({ system, prompt: taskInput.prompt as string });
          const content = result.content ?? "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
          return { reply: content, suggestedTask: null };
        } catch {
          // Fallback: rule-based mock response
          const prompt = taskInput.prompt as string;
          const scopeGuess = prompt.includes("报表") || prompt.includes("dashboard")
            ? "M6-MES"
            : prompt.includes("客户") || prompt.includes("CRM")
            ? "CRM"
            : prompt.includes("质量") || prompt.includes("quality")
            ? "Quality"
            : "General";
          return {
            reply: `[Gemini Mock] 分析您的需求："${prompt}"。建议拆分为前端优化 + 后端数据查询两个子任务。`,
            suggestedTask: {
              title: prompt.slice(0, 80),
              scope: scopeGuess,
              categories: ["Frontend", "Backend"],
              rules: "Response < 500ms",
              priority: 3,
            },
          };
        }
      });

      const { taskId } = await submitTask(
        "GEMINI_PLANNER",
        { prompt: input.prompt },
        ctx.user?.name ?? "system",
        { submittedById: ctx.user?.id },
      );
      return { taskId };
    }),

  // Poll for Gemini Planner result
  getGeminiPlannerResult: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const { getTaskStatus } = await import("../services/task-worker.service");
      const task = await getTaskStatus(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      return {
        status: task.status,
        result: task.resultData,
        error: task.errorMessage,
      };
    }),

  // ── Auto-Fetch: Scrape system logs/errors/feedback ──
  // In production, this would poll monitoring endpoints, Sentry, etc.
  autoFetch: requirePermission('devops:deployment:manage').mutation(async () => {
    // Mock: return a few "scraped" issues
    const mockIssues = [
      {
        title: "生产报表页面加载超时 (>3s)",
        sourceData: "Sentry alert #4521: ProductionDailyReport.tsx — useQuery timeout at 3200ms",
        scope: "M6-MES",
        categories: ["Frontend", "DB"],
        priority: 2,
      },
      {
        title: "客户反馈：移动端审批按钮偏小",
        sourceData: "User feedback #892: 手机上审批按钮太小，经常误触",
        scope: "Mobile",
        categories: ["Frontend", "UX"],
        priority: 3,
      },
      {
        title: "质量月报导出 PDF 乱码",
        sourceData: "QualityMonthlyReport export — font encoding issue on CN locale",
        scope: "Quality",
        categories: ["Backend", "Export"],
        priority: 2,
      },
    ];

    // Insert them as AUTO_FETCH tasks
    const db = await requireDb();
    const created = [];
    for (const issue of mockIssues) {
      const [task] = await db
        .insert(cicdTasks)
        .values({
          title: issue.title,
          sourceMode: "AUTO_FETCH",
          sourceData: issue.sourceData,
          scope: issue.scope,
          categories: issue.categories,
          priority: issue.priority,
          currentStage: "DEV",
          devStatus: "PENDING",
          testStatus: "PENDING",
          prodStatus: "PENDING",
        })
        .returning();
      created.push(task);
    }
    return { fetched: created.length, tasks: created };
  }),

  // ══════════════════════════════════════════════════════════════
  //  GitHub Actions Dispatch — Cloud Execution Engine
  // ══════════════════════════════════════════════════════════════
  //
  //  This mutation triggers the `.github/workflows/claude-auto-dev.yml`
  //  workflow via the GitHub repository_dispatch API.
  //
  //  HOW IT WORKS:
  //  ─────────────
  //  1. The CEO clicks "Trigger GitHub Actions" in the Launch Modal
  //  2. Frontend calls cicd.triggerGitHubDispatch with the task details
  //  3. This mutation POSTs to https://api.github.com/repos/OWNER/REPO/dispatches
  //  4. GitHub receives the event_type "claude-task" and fires the workflow
  //  5. The workflow runs Claude CLI in the cloud runner
  //
  //  AUTHENTICATION:
  //  ───────────────
  //  Requires a GitHub Personal Access Token (PAT) with `repo` scope.
  //  Store it as GITHUB_TOKEN in environment variables.
  //
  //  API REFERENCE:
  //  https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event
  //
  triggerGitHubDispatch: requirePermission('devops:deployment:manage')
    .input(
      z.object({
        taskId: z.union([z.string(), z.number()]),
        title: z.string().min(1),
        scope: z.string().default("General"),
        rules: z.string().default("Ensure build passes and no regressions"),
      })
    )
    .mutation(async ({ input }) => {
      // In production, these come from environment variables
      const OWNER = process.env.GITHUB_OWNER || "GRT-Automation";
      const REPO = process.env.GITHUB_REPO || "grt-implementation-plan";
      const TOKEN = process.env.GITHUB_TOKEN || "";

      // GitHub repository_dispatch endpoint
      const url = `https://api.github.com/repos/${OWNER}/${REPO}/dispatches`;

      // event_type MUST match `types: [claude-task]` in the workflow YAML
      const body = {
        event_type: "claude-task",
        client_payload: {
          task_title: input.title,
          task_scope: input.scope,
          task_rules: input.rules,
          task_id: String(input.taskId),
          triggered_at: new Date().toISOString(),
        },
      };

      let dispatched = false;
      let runUrl = "";

      if (TOKEN) {
        // Production: call GitHub API (returns 204 No Content on success)
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${TOKEN}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify(body),
        });
        dispatched = response.status === 204;
        if (!dispatched) {
          const errorText = await response.text();
          log.error({ status: response.status, errorText }, "GitHub dispatch failed");
          throw new Error(`GitHub dispatch failed: ${response.status}`);
        }
        runUrl = `https://github.com/${OWNER}/${REPO}/actions`;
        log.info({ title: input.title }, "Triggered GitHub Actions workflow");
      } else {
        // Demo mode: simulate dispatch (no GITHUB_TOKEN configured)
        log.info({ url }, "MOCK: Would POST to GitHub dispatch URL");
        log.info({ payload: body }, "MOCK: Dispatch payload");
        dispatched = true;
        runUrl = `https://github.com/${OWNER}/${REPO}/actions`;
      }

      // Audit log (best-effort)
      try {
        const db = await requireDb();
        await db.insert(cicdStageLogs).values({
          taskId: toNum(input.taskId),
          fromStage: "DEV",
          toStage: "DEV",
          action: "github_dispatch",
          actor: "CEO",
          note: `GitHub Actions triggered: ${input.title} [${TOKEN ? "LIVE" : "MOCK"}]`,
        });
      } catch { /* best-effort */ }

      return {
        success: dispatched,
        runUrl,
        message: TOKEN
          ? "GitHub Actions workflow triggered successfully!"
          : "[DEMO] GitHub dispatch simulated (set GITHUB_TOKEN for real dispatch)",
      };
    }),

  // Delete a task
  delete: requirePermission('devops:deployment:manage').input(idInput).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(cicdStageLogs).where(eq(cicdStageLogs.taskId, toNum(input.id)));
    await db.delete(cicdTasks).where(eq(cicdTasks.id, toNum(input.id)));
    return { success: true };
  }),

  // ══════════════════════════════════════════════════════════════
  //  File-Based Queue Bridge — Completion Scanner
  // ══════════════════════════════════════════════════════════════

  // Get the current state of the file queue (pending + completed files)
  getQueueStatus: protectedProcedure.query(() => {
    const pendingFiles = fs.existsSync(PENDING_DIR)
      ? fs.readdirSync(PENDING_DIR).filter((f) => f.endsWith(".md"))
      : [];
    const completedFiles = fs.existsSync(COMPLETED_DIR)
      ? fs.readdirSync(COMPLETED_DIR).filter((f) => f.endsWith(".md"))
      : [];

    return {
      pendingDir: PENDING_DIR,
      completedDir: COMPLETED_DIR,
      pending: pendingFiles.map((f) => ({
        filename: f,
        taskId: parseInt(f.replace("task_", "").replace(".md", "")) || 0,
      })),
      completed: completedFiles.map((f) => ({
        filename: f,
        taskId: parseInt(f.replace("task_", "").replace(".md", "")) || 0,
      })),
    };
  }),

  // Scan the completed/ folder for finished tasks.
  // For each task_[id].md found in completed/, update the DB status
  // to COMPLETED and log the transition. Called by frontend polling.
  checkCompletedTasks: requirePermission('devops:deployment:manage').mutation(async () => {
    const db = await requireDb();
    const updated: number[] = [];

    if (!fs.existsSync(COMPLETED_DIR)) return { updated: [] };

    const completedFiles = fs
      .readdirSync(COMPLETED_DIR)
      .filter((f) => f.endsWith(".md"));

    for (const filename of completedFiles) {
      // Extract task ID from filename: task_42.md → 42
      const match = filename.match(/task_(\d+)\.md/);
      if (!match) continue;
      const taskId = parseInt(match[1]);

      // Fetch the task from DB
      const [task] = await db
        .select()
        .from(cicdTasks)
        .where(eq(cicdTasks.id, taskId))
        .limit(1000);
      if (!task) continue;

      // Only update if the task is still IN_PROGRESS
      const currentStatus =
        task.currentStage === "DEV"
          ? task.devStatus
          : task.currentStage === "TEST"
          ? task.testStatus
          : task.prodStatus;

      if (currentStatus === "IN_PROGRESS") {
        // Read the completed file for any summary Claude left
        const completedPath = path.join(COMPLETED_DIR, filename);
        const completedContent = fs.readFileSync(completedPath, "utf-8");

        // Update DB status to COMPLETED
        const stageField =
          task.currentStage === "DEV"
            ? { devStatus: "COMPLETED" as const, devDetail: "Completed by Claude CLI" }
            : task.currentStage === "TEST"
            ? { testStatus: "COMPLETED" as const, testDetail: "Completed by Claude CLI" }
            : { prodStatus: "COMPLETED" as const, prodDetail: "Completed by Claude CLI" };

        await db
          .update(cicdTasks)
          .set({ ...stageField, updatedAt: new Date() })
          .where(eq(cicdTasks.id, taskId));

        // Audit log
        await db.insert(cicdStageLogs).values({
          taskId,
          fromStage: task.currentStage,
          toStage: task.currentStage,
          action: "complete",
          actor: "Claude CLI",
          note: `Task completed by Sentinel. File: ${filename}`,
        });

        updated.push(taskId);
        log.info({ taskId }, "Task marked COMPLETED from file queue");
      }
    }

    return { updated };
  }),

  // ══════════════════════════════════════════════════════════════
  //  HITL Protocol — Question/Answer Bridge
  // ══════════════════════════════════════════════════════════════

  // Poll the questions/ folder for pending questions from Claude CLI.
  // Returns all *.json files parsed into an array of question objects.
  getQuestions: protectedProcedure.query(() => {
    if (!fs.existsSync(QUESTIONS_DIR)) return [];

    const files = fs.readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith(".json"));
    const questions: Array<{
      taskId: number;
      question: string;
      context: string;
      options: string[];
      timestamp: string;
      filename: string;
    }> = [];

    for (const filename of files) {
      try {
        const content = fs.readFileSync(path.join(QUESTIONS_DIR, filename), "utf-8");
        const parsed = JSON.parse(content);
        questions.push({
          taskId: parsed.taskId ?? 0,
          question: parsed.question ?? "No question provided",
          context: parsed.context ?? "",
          options: Array.isArray(parsed.options) ? parsed.options : [],
          timestamp: parsed.timestamp ?? new Date().toISOString(),
          filename,
        });
      } catch {
        // Skip malformed JSON files
        log.warn({ filename }, "Skipping malformed question file");
      }
    }

    return questions;
  }),

  // CEO writes an answer. This creates an answer file that Claude CLI
  // is watching for, allowing it to resume execution.
  answerQuestion: requirePermission('devops:deployment:manage')
    .input(
      z.object({
        taskId: z.number(),
        answer: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const answerFile = path.join(ANSWERS_DIR, `task_${input.taskId}.txt`);
      const questionFile = path.join(QUESTIONS_DIR, `task_${input.taskId}.json`);

      // Write the CEO's answer
      const content = `${input.answer}\n\n--- Answered by CEO at ${new Date().toISOString()} ---`;
      fs.writeFileSync(answerFile, content, "utf-8");
      log.info({ taskId: input.taskId, answerFile }, "CEO answered HITL question");

      // Log the interaction in the DB audit trail
      try {
        const db = await requireDb();
        await (db.insert(cicdStageLogs) as any).values({
          taskId: input.taskId,
          fromStage: null,
          toStage: null,
          action: "hitl_answer",
          actor: "CEO",
          note: `HITL answer provided: "${input.answer.slice(0, 200)}"`,
        });
      } catch {
        // DB logging is best-effort — don't block the answer
      }

      // Read the original question for reference
      let question = "";
      if (fs.existsSync(questionFile)) {
        try {
          const qContent = fs.readFileSync(questionFile, "utf-8");
          question = JSON.parse(qContent).question ?? "";
        } catch { /* ignore */ }
      }

      return {
        success: true,
        answerFile,
        taskId: input.taskId,
        question,
      };
    }),
});
