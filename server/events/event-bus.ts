/**
 * Sandbox Event Bus — cross-sandbox communication
 *
 * Based on Node EventEmitter + DB audit log (no external MQ).
 * Events flow between sandboxes; each emission is logged to sandbox_event_log.
 */
import { EventEmitter } from "events";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("event-bus");

export interface SandboxEvent {
  type: string;
  sourceModule: string;
  targetModules: string[];
  payload: Record<string, unknown>;
  userId: number;
  timestamp: Date;
}

type EventHandler = (event: SandboxEvent) => void | Promise<void>;

class SandboxEventBus extends EventEmitter {
  private registeredTypes = new Set<string>();
  private moduleHandlers = new Map<string, Set<EventHandler>>();

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /** Emit an event and persist to DB */
  async publish(event: SandboxEvent): Promise<void> {
    log.info({ type: event.type, source: event.sourceModule, targets: event.targetModules }, "Event published");

    // Persist to DB
    try {
      const { requireDb } = await import("../db");
      const { sandboxEventLog } = await import("../../drizzle/sandbox-event-schema");
      const db = await requireDb();
      await db.insert(sandboxEventLog).values({
        eventType: event.type,
        sourceModule: event.sourceModule,
        targetModules: event.targetModules,
        payload: event.payload,
        userId: event.userId,
      });
    } catch (err) {
      log.warn({ err, type: event.type }, "Failed to persist event to DB");
    }

    // Emit to type-specific listeners
    this.emit(event.type, event);

    // Emit to target-module listeners
    for (const target of event.targetModules) {
      this.emit(`module:${target}`, event);
    }
  }

  /** Subscribe to events of a specific type */
  subscribe(eventType: string, handler: EventHandler): () => void {
    this.on(eventType, handler);
    this.registeredTypes.add(eventType);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  /** Subscribe to ALL events targeting a specific module */
  subscribeModule(moduleId: string, handler: EventHandler): () => void {
    const internalType = `module:${moduleId}`;
    this.on(internalType, handler);

    if (!this.moduleHandlers.has(moduleId)) {
      this.moduleHandlers.set(moduleId, new Set());
    }
    this.moduleHandlers.get(moduleId)!.add(handler);

    return () => {
      this.off(internalType, handler);
      this.moduleHandlers.get(moduleId)?.delete(handler);
    };
  }

  /** Get registered event types */
  getRegisteredTypes(): string[] {
    return Array.from(this.registeredTypes);
  }

  /** Get modules with active subscriptions */
  getSubscribedModules(): string[] {
    return Array.from(this.moduleHandlers.keys()).filter(
      (m) => (this.moduleHandlers.get(m)?.size ?? 0) > 0
    );
  }
}

// Singleton
export const eventBus = new SandboxEventBus();

// ── Pre-defined event types ──
export const SANDBOX_EVENTS = {
  // ① Annual Planning
  PLANNING_BUDGET_APPROVED: "planning.budget.approved",
  PLANNING_HEADCOUNT_SET: "planning.headcount.set",
  // ② Payroll
  PAYROLL_CYCLE_CALCULATED: "payroll.cycle.calculated",
  PAYROLL_ANOMALY_DETECTED: "payroll.anomaly.detected",
  // ③ Performance
  PERF_CALIBRATION_DONE: "perf.calibration.done",
  PERF_SCORE_FINALIZED: "perf.score.finalized",
  // ④ HR
  HR_EMPLOYEE_ONBOARDED: "hr.employee.onboarded",
  HR_EMPLOYEE_DEPARTED: "hr.employee.departed",
  HR_POSITION_CHANGED: "hr.position.changed",
  HR_SKILL_ASSESSED: "hr.skill.assessed",
  // ⑤ Project
  PROJECT_GATE_PASSED: "project.gate.passed",
  PROJECT_RESOURCE_REQUEST: "project.resource.request",
  PROJECT_MILESTONE_HIT: "project.milestone.hit",
  PROJECT_PROCESS_COMPLETED: "project.process.completed",
  // ⑥ Quoting
  QUOTE_APPROVED: "quote.approved",
  BOM_FINALIZED: "bom.finalized",
  // ⑦ Mechanical
  MECH_CONFIG_VALIDATED: "mech.config.validated",
  // ⑧ Electrical
  ELEC_CONFIG_VALIDATED: "elec.config.validated",
  // ⑨ Customer
  CUSTOMER_PROFILE_UPDATED: "customer.profile.updated",
  // ⑩ Acceptance
  ACCEPTANCE_COMPLETED: "acceptance.completed",
  SATISFACTION_SCORE_SUBMITTED: "satisfaction.score.submitted",
  // ⑪ Production Scheduling
  SCHEDULING_PLAN_PUBLISHED: "scheduling.plan.published",
  LABOR_REPORT_SUBMITTED: "labor.report.submitted",
  LABOR_REPORT_APPROVED: "labor.report.approved",
  LABOR_COST_ROLLUP_COMPLETED: "labor.cost.rollup.completed",
  LABOR_CATEGORY_STATS_UPDATED: "labor.category.stats.updated",
  // Scenario Init
  SCENARIO_BATCH_STARTED: "scenario.batch.started",
  SCENARIO_BATCH_COMPLETED: "scenario.batch.completed",
  SCENARIO_INIT_FAILED: "scenario.init.failed",
} as const;
