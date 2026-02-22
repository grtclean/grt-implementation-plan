/**
 * AI Agent Fleet Schema
 *
 * 多级AI智能体军团 + G-Token数字货币账本
 *
 * 3 tables:
 *   1. ai_agent_fleet       — L1-L5 五个等级Agent，每员工5个
 *   2. g_token_ledger       — G-Token交易流水（原子记账）
 *   3. agent_task_executions — Agent任务执行记录
 *
 * FK chain: hrmEmployees → employeeAiAssistants(1:1 M级) → ai_agent_fleet(1:5)
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  decimal,
  boolean,
  index,
  unique,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────

export const agentAutonomyLevelEnum = pgEnum("agent_autonomy_level", [
  "supervised",
  "semi_autonomous",
  "autonomous",
]);

export const agentStatusEnum = pgEnum("agent_status", [
  "inactive",
  "active",
  "paused",
  "decommissioned",
]);

export const gTokenTxTypeEnum = pgEnum("g_token_tx_type", [
  "task_reward",
  "task_expense",
  "royalty_income",
  "penalty",
  "bonus",
  "transfer_in",
  "transfer_out",
]);

export const gTokenRefTypeEnum = pgEnum("g_token_ref_type", [
  "task_bid",
  "smart_contract",
  "skill_capsule",
  "admin_adjustment",
  "task_execution",
]);

export const agentTaskTypeEnum = pgEnum("agent_task_type", [
  "document_draft",
  "data_analysis",
  "code_review",
  "report_generation",
  "meeting_summary",
  "email_draft",
  "risk_assessment",
  "quality_inspection",
]);

export const agentTaskStatusEnum = pgEnum("agent_task_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
]);

// ─── Table 1: ai_agent_fleet ─────────────────────────────────

export const aiAgentFleet = pgTable(
  "ai_agent_fleet",
  {
    id: serial("id").primaryKey(),
    masterAssistantId: integer("master_assistant_id").notNull(),
    employeeId: integer("employee_id").notNull(),

    // Identity
    agentCode: varchar("agent_code", { length: 50 }).notNull(),
    agentDid: varchar("agent_did", { length: 100 }).notNull(),
    agentName: varchar("agent_name", { length: 100 }).notNull(),
    level: integer("level").notNull(), // 1-5

    // Configuration
    personalityConfig: text("personality_config"), // JSON string
    capabilityMask: text("capability_mask"), // JSON string[]
    maxTaskComplexity: integer("max_task_complexity").notNull().default(1),
    autonomyLevel: agentAutonomyLevelEnum("autonomy_level")
      .notNull()
      .default("supervised"),
    dataScope: varchar("data_scope", { length: 20 }).default("self"),

    // Bidding
    canBidTasks: boolean("can_bid_tasks").default(false),
    maxConcurrentTasks: integer("max_concurrent_tasks").default(1),
    bidPriceRangeLow: decimal("bid_price_range_low", {
      precision: 12,
      scale: 2,
    }).default("0"),
    bidPriceRangeHigh: decimal("bid_price_range_high", {
      precision: 12,
      scale: 2,
    }).default("100"),

    // G-Token Balance
    gTokenBalance: decimal("g_token_balance", {
      precision: 14,
      scale: 4,
    })
      .notNull()
      .default("0"),
    totalEarned: decimal("total_earned", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),
    totalSpent: decimal("total_spent", { precision: 14, scale: 4 })
      .notNull()
      .default("0"),

    // Performance
    taskCompletionCount: integer("task_completion_count").notNull().default(0),
    avgQualityScore: decimal("avg_quality_score", { precision: 5, scale: 2 }).default(
      "0",
    ),
    reputationScore: decimal("reputation_score", { precision: 5, scale: 2 })
      .notNull()
      .default("50"),

    // Status
    status: agentStatusEnum("status").notNull().default("inactive"),
    activatedAt: timestamp("activated_at", { mode: "string" }),
    lastTaskAt: timestamp("last_task_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    unique("uq_employee_level").on(table.employeeId, table.level),
    index("idx_agent_code").on(table.agentCode),
    index("idx_agent_employee").on(table.employeeId),
    index("idx_agent_master").on(table.masterAssistantId),
    index("idx_agent_status").on(table.status),
  ],
);

// ─── Table 2: g_token_ledger ─────────────────────────────────

export const gTokenLedger = pgTable(
  "g_token_ledger",
  {
    id: serial("id").primaryKey(),
    agentId: integer("agent_id"), // nullable — can be employee-level tx
    employeeId: integer("employee_id"), // nullable — for employee direct tx
    agentCode: varchar("agent_code", { length: 50 }),

    txType: gTokenTxTypeEnum("tx_type").notNull(),
    amount: decimal("amount", { precision: 14, scale: 4 }).notNull(),
    balanceAfter: decimal("balance_after", { precision: 14, scale: 4 }).notNull(),

    referenceType: gTokenRefTypeEnum("reference_type"),
    referenceId: varchar("reference_id", { length: 100 }),
    description: text("description"),

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_ledger_agent").on(table.agentId),
    index("idx_ledger_employee").on(table.employeeId),
    index("idx_ledger_created").on(table.createdAt),
    index("idx_ledger_tx_type").on(table.txType),
  ],
);

// ─── Table 3: agent_task_executions ──────────────────────────

export const agentTaskExecutions = pgTable(
  "agent_task_executions",
  {
    id: serial("id").primaryKey(),
    agentId: integer("agent_id").notNull(),
    taskBidId: integer("task_bid_id"), // nullable — not all tasks come from bids

    taskType: agentTaskTypeEnum("task_type").notNull(),
    taskTitle: varchar("task_title", { length: 200 }).notNull(),
    taskInput: text("task_input"), // JSON
    taskOutput: text("task_output"), // JSON

    status: agentTaskStatusEnum("status").notNull().default("pending"),
    qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
    humanReviewRequired: boolean("human_review_required").default(true),
    humanReviewedBy: integer("human_reviewed_by"),
    humanApproved: boolean("human_approved"),

    startedAt: timestamp("started_at", { mode: "string" }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    durationMs: integer("duration_ms"),

    llmTokensUsed: integer("llm_tokens_used"),
    gTokenReward: decimal("g_token_reward", { precision: 12, scale: 4 }),

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_exec_agent").on(table.agentId),
    index("idx_exec_status").on(table.status),
    index("idx_exec_type").on(table.taskType),
    index("idx_exec_created").on(table.createdAt),
  ],
);
