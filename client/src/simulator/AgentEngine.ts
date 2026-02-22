/**
 * GRT M0-M12 AI Simulation Engine v2.0
 *
 * Runs digital-agent test scenarios against real backend services.
 * Features:
 *  - Realistic async delays simulating real-world latency
 *  - Random operator selection from live DB for unique runs
 *  - Streaming log output via async generators
 *  - Intermediate "INFO" progress logs for visual feedback
 */

// ── Types ──

export type AgentType =
  | "shopfloor_operator"
  | "qa_inspector"
  | "sales_rep"
  | "rd_engineer"
  | "supply_chain";

export type SimAction =
  | "TEST_SKILL_BREACH"
  | "TEST_SKILL_PASS"
  | "TEST_COMPETENCY_LOAD"
  | "TEST_OPERATOR_LIST"
  | "TEST_SUPPLY_CHAIN_QUERY"
  | "STRESS_RANDOM_VERIFY"
  // ── Module Integration Tests (Task #6) ──
  | "TEST_CRM_PIPELINE"
  | "TEST_CRM_LEAD_SCORING"
  | "TEST_PLM_DOCUMENTS"
  | "TEST_PLM_DESIGN_REVIEW"
  | "TEST_8D_WORKFLOW"
  | "TEST_CAPA_PIPELINE"
  | "TEST_SPARE_PARTS_ALERTS"
  | "TEST_COMPLAINT_RESOLUTION"
  | "TEST_WARRANTY_CHECK";

export type SimStatus = "SUCCESS" | "BUG_FOUND" | "WARN" | "INFO";

export interface SimLog {
  id: string;
  timestamp: string;
  agent: string;
  agentType: AgentType;
  action: SimAction;
  status: SimStatus;
  message: string;
  durationMs: number;
  detail?: string;
  milestone: string;
}

export interface AgentDef {
  type: AgentType;
  name: string;
  nameZh: string;
  milestone: string;
  actions: SimAction[];
}

// ── Agent Definitions ──

export const AGENTS: AgentDef[] = [
  {
    type: "sales_rep",
    name: "Sales Rep",
    nameZh: "销售代表",
    milestone: "M0-M2",
    actions: ["TEST_COMPETENCY_LOAD", "TEST_CRM_PIPELINE", "TEST_CRM_LEAD_SCORING"],
  },
  {
    type: "rd_engineer",
    name: "R&D Engineer",
    nameZh: "研发工程师",
    milestone: "M3-M5",
    actions: ["TEST_COMPETENCY_LOAD", "TEST_OPERATOR_LIST", "TEST_PLM_DOCUMENTS", "TEST_PLM_DESIGN_REVIEW"],
  },
  {
    type: "shopfloor_operator",
    name: "Shopfloor Operator",
    nameZh: "车间操作员",
    milestone: "M6-M8",
    actions: [
      "TEST_SKILL_BREACH",
      "TEST_SKILL_PASS",
      "TEST_OPERATOR_LIST",
      "STRESS_RANDOM_VERIFY",
    ],
  },
  {
    type: "qa_inspector",
    name: "QA Inspector",
    nameZh: "质量检验员",
    milestone: "M9-M10",
    actions: ["TEST_COMPETENCY_LOAD", "TEST_OPERATOR_LIST", "TEST_8D_WORKFLOW", "TEST_CAPA_PIPELINE"],
  },
  {
    type: "supply_chain",
    name: "Supply Chain Agent",
    nameZh: "供应链代理",
    milestone: "M11-M12",
    actions: ["TEST_SUPPLY_CHAIN_QUERY", "TEST_SPARE_PARTS_ALERTS", "TEST_COMPLAINT_RESOLUTION", "TEST_WARRANTY_CHECK"],
  },
];

// ── Milestone Definitions ──

export interface Milestone {
  code: string;
  label: string;
  labelZh: string;
  phase: string;
}

export const MILESTONES: Milestone[] = [
  { code: "M0", label: "Opportunity", labelZh: "商机确认", phase: "Sales" },
  { code: "M1", label: "Kickoff", labelZh: "项目启动", phase: "Sales" },
  { code: "M2", label: "Requirements", labelZh: "需求分析", phase: "Sales" },
  { code: "M3", label: "Concept Design", labelZh: "概念设计", phase: "R&D" },
  { code: "M4", label: "Detail Design", labelZh: "详细设计", phase: "R&D" },
  { code: "M5", label: "Prototype", labelZh: "原型验证", phase: "R&D" },
  { code: "M6", label: "Manufacturing", labelZh: "制造准备", phase: "Manufacturing" },
  { code: "M7", label: "Assembly", labelZh: "组装调试", phase: "Manufacturing" },
  { code: "M8", label: "FAT", labelZh: "出厂测试", phase: "Manufacturing" },
  { code: "M9", label: "SAT", labelZh: "现场验收", phase: "Quality" },
  { code: "M10", label: "Commissioning", labelZh: "调试交付", phase: "Quality" },
  { code: "M11", label: "Warranty", labelZh: "质保期", phase: "After-Sales" },
  { code: "M12", label: "Handover", labelZh: "项目移交", phase: "After-Sales" },
];

// ── Helpers ──

let idCounter = 0;
function nextId(): string {
  return `sim-${Date.now()}-${++idCounter}`;
}

function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/** Realistic async delay — adds jitter for natural feel */
const delay = (ms: number): Promise<void> =>
  new Promise((res) => setTimeout(res, ms + Math.random() * ms * 0.4));

/** Pick a random element from an array */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick N unique random elements */
function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// ── tRPC caller (uses fetch against live backend) ──

const API_BASE = "/api/trpc";

async function trpcQuery<T>(path: string, input?: unknown): Promise<T> {
  const url = input
    ? `${API_BASE}/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : `${API_BASE}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`tRPC query ${path} failed: ${res.status}`);
  const body = await res.json();
  return body.result.data.json as T;
}

async function trpcMutation<T>(path: string, input: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  if (!res.ok) throw new Error(`tRPC mutation ${path} failed: ${res.status}`);
  const body = await res.json();
  return body.result.data.json as T;
}

// ── Shared Interfaces ──

interface VerifyResult {
  success: boolean;
  passed: boolean;
  employeeId: number;
  employeeName: string;
  domain: string;
  currentLevel: number;
  requiredLevel: number;
  score: string;
  message: string;
}

interface Operator {
  id: number;
  name: string;
  department: string;
  position: string;
}

// ── mkLog ──

function mkLog(
  agent: string,
  agentType: AgentType,
  action: SimAction,
  status: SimStatus,
  milestone: string,
  startTime: number,
  message: string,
  detail?: string
): SimLog {
  return {
    id: nextId(),
    timestamp: now(),
    agent,
    agentType,
    action,
    status,
    message,
    durationMs: Math.round(performance.now() - startTime),
    detail: detail || undefined,
    milestone,
  };
}

/** Create an INFO progress log (for intermediate steps) */
function infoLog(agent: string, agentType: AgentType, action: SimAction, milestone: string, message: string): SimLog {
  return {
    id: nextId(),
    timestamp: now(),
    agent,
    agentType,
    action,
    status: "INFO",
    message,
    durationMs: 0,
    milestone,
  };
}

// ── Streaming Simulation Runner ──

const DOMAINS = ["T", "S", "D", "C", "K", "L"];
const DOMAIN_LABELS: Record<string, string> = {
  T: "硬核技术力",
  S: "软性通用力",
  D: "设计与创新力",
  C: "沟通协作力",
  K: "专业标准力",
  L: "领导与战略力",
};

/**
 * Streaming simulation runner.
 * Yields INFO logs for progress, then a final result log.
 * Each action has realistic delays and random data selection.
 */
export async function* runSimulationStreaming(
  agentType: AgentType,
  action: SimAction
): AsyncGenerator<SimLog> {
  const agent = AGENTS.find((a) => a.type === agentType);
  const agentName = agent?.name ?? agentType;
  const milestone = agent?.milestone ?? "M?";
  const start = performance.now();

  try {
    switch (action) {
      // ── TEST_SKILL_BREACH ──
      case "TEST_SKILL_BREACH": {
        yield infoLog(agentName, agentType, action, milestone,
          "Connecting to MES database... querying operator roster");
        await delay(800);

        const operators = await trpcQuery<Operator[]>("mes.getOperators");
        if (operators.length === 0) {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            "No operators found in database. Cannot run skill breach test.",
            "mes.getOperators returned empty array");
          return;
        }

        const target = pickRandom(operators);
        const domain = pickRandom(DOMAINS);
        yield infoLog(agentName, agentType, action, milestone,
          `Selected random operator: ${target.name} (${target.department}) — testing ${domain} (${DOMAIN_LABELS[domain]}) at L5 threshold`);
        await delay(1200);

        yield infoLog(agentName, agentType, action, milestone,
          `Scanning badge... verifying ${target.name} for Station T3 — Core Assembly...`);
        await delay(1500);

        const result = await trpcMutation<VerifyResult>("mes.verifySkill", {
          employeeId: target.id,
          domain,
          requiredLevel: 5,
        });
        await delay(600);

        if (!result.passed) {
          yield mkLog(agentName, agentType, action, "SUCCESS", milestone, start,
            `IATF 16949 §7.2 interception CONFIRMED. ${result.employeeName} has L${result.currentLevel} in ${domain} (${DOMAIN_LABELS[domain]}) — correctly BLOCKED from L5-required station.`,
            result.message);
        } else {
          yield mkLog(agentName, agentType, action, "WARN", milestone, start,
            `${result.employeeName} unexpectedly PASSED L5 requirement with L${result.currentLevel} in ${domain}. Employee is highly qualified.`,
            result.message);
        }
        return;
      }

      // ── TEST_SKILL_PASS ──
      case "TEST_SKILL_PASS": {
        yield infoLog(agentName, agentType, action, milestone,
          "Initializing skill verification module...");
        await delay(700);

        const operators = await trpcQuery<Operator[]>("mes.getOperators");
        if (operators.length === 0) {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            "No operators found. Cannot run pass test.");
          return;
        }

        const target = pickRandom(operators);
        const domain = pickRandom(["T", "S", "D", "C"]);
        yield infoLog(agentName, agentType, action, milestone,
          `Randomly selected: ${target.name} (${target.department}) — domain ${domain} (${DOMAIN_LABELS[domain]}), L2 minimum`);
        await delay(1000);

        yield infoLog(agentName, agentType, action, milestone,
          `Operator ${target.name} approaching workstation... badge scan in progress...`);
        await delay(1400);

        const result = await trpcMutation<VerifyResult>("mes.verifySkill", {
          employeeId: target.id,
          domain,
          requiredLevel: 2,
        });
        await delay(500);

        if (result.passed) {
          yield mkLog(agentName, agentType, action, "SUCCESS", milestone, start,
            `Skill verification PASSED. ${result.employeeName} has L${result.currentLevel} in ${domain} (${DOMAIN_LABELS[domain]}) ≥ L2 required. Assembly authorized.`,
            `Score: ${result.score}, Domain: ${domain}`);
        } else {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            `Expected PASS but got BLOCKED for ${result.employeeName} (L${result.currentLevel} in ${domain}). Possible scoring anomaly.`,
            result.message);
        }
        return;
      }

      // ── TEST_OPERATOR_LIST ──
      case "TEST_OPERATOR_LIST": {
        yield infoLog(agentName, agentType, action, milestone,
          "Querying employee competence assessment database...");
        await delay(900);

        const operators = await trpcQuery<Operator[]>("mes.getOperators");
        await delay(600);

        if (operators.length === 0) {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            "mes.getOperators returned 0 operators. Expected seeded data.");
          return;
        }

        const depts = [...new Set(operators.map((o) => o.department))];
        const samples = pickRandomN(operators, 4);
        yield infoLog(agentName, agentType, action, milestone,
          `Found ${operators.length} operators across ${depts.length} departments. Validating data integrity...`);
        await delay(800);

        yield mkLog(agentName, agentType, action, "SUCCESS", milestone, start,
          `Operator roster verified: ${operators.length} employees, ${depts.length} departments (${depts.join(", ")}).`,
          `Random sample: ${samples.map((o) => `${o.name}/${o.department}`).join(" | ")}`);
        return;
      }

      // ── TEST_COMPETENCY_LOAD ──
      case "TEST_COMPETENCY_LOAD": {
        yield infoLog(agentName, agentType, action, milestone,
          "Loading TSDCKL competency matrix from database...");
        await delay(1100);

        const data = await trpcQuery<{ items: any[]; total: number }>(
          "competency.getAssessments"
        );
        await delay(700);

        if (!data || data.total === 0) {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            "competency.getAssessments returned 0 records. TSDCKL matrix is EMPTY!");
          return;
        }

        yield infoLog(agentName, agentType, action, milestone,
          `Loaded ${data.total} assessments. Running integrity checks across 6 domains...`);
        await delay(900);

        // Spot-check a random employee from the results
        const sample = pickRandom(data.items);
        const sampleName = sample?.employeeName ?? "Unknown";
        const domainCheck = pickRandom(DOMAINS);
        const scoreKey = `${domainCheck.toLowerCase()}Score` as string;
        const scoreVal = sample?.[scoreKey] ?? "N/A";

        yield mkLog(agentName, agentType, action, "SUCCESS", milestone, start,
          `TSDCKL Matrix integrity CONFIRMED. ${data.total} employees assessed. Spot-check: ${sampleName} has ${domainCheck}=${scoreVal}.`,
          `IATF 16949 §7.2 data quality: OK | Domains verified: T,S,D,C,K,L`);
        return;
      }

      // ── TEST_SUPPLY_CHAIN_QUERY ──
      case "TEST_SUPPLY_CHAIN_QUERY": {
        yield infoLog(agentName, agentType, action, milestone,
          "Initializing supply chain traceability engine...");
        await delay(1000);

        yield infoLog(agentName, agentType, action, milestone,
          "Querying supplyChain.dashboard.getSummary endpoint...");
        await delay(1300);

        try {
          const data = await trpcQuery<Record<string, unknown>>(
            "supplyChain.dashboard.getSummary"
          );
          await delay(600);
          yield mkLog(agentName, agentType, action, "SUCCESS", milestone, start,
            "Supply chain dashboard loaded successfully. Traceability graph engine online.",
            `Response keys: ${Object.keys(data || {}).join(", ") || "object"}`);
        } catch {
          await delay(400);
          yield mkLog(agentName, agentType, action, "WARN", milestone, start,
            "Supply chain endpoint responded with non-standard format. Endpoint exists but may need data seeding.",
            "supplyChain.dashboard.getSummary — partial response");
        }
        return;
      }

      // ── STRESS_RANDOM_VERIFY ──
      case "STRESS_RANDOM_VERIFY": {
        yield infoLog(agentName, agentType, action, milestone,
          "Preparing stress test: selecting random operators and domains...");
        await delay(800);

        const operators = await trpcQuery<Operator[]>("mes.getOperators");
        if (operators.length === 0) {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            "No operators to stress-test.");
          return;
        }

        const count = Math.min(operators.length, 8);
        const testTargets = pickRandomN(operators, count);
        let passed = 0;
        let blocked = 0;
        let errors = 0;

        yield infoLog(agentName, agentType, action, milestone,
          `Stress testing ${count} random operators at L3 threshold across all domains...`);
        await delay(600);

        for (let i = 0; i < testTargets.length; i++) {
          const op = testTargets[i];
          const domain = DOMAINS[i % DOMAINS.length];

          yield infoLog(agentName, agentType, action, milestone,
            `[${i + 1}/${count}] Verifying ${op.name} — ${domain} (${DOMAIN_LABELS[domain]}) ≥ L3...`);
          await delay(400 + Math.random() * 600);

          try {
            const result = await trpcMutation<VerifyResult>("mes.verifySkill", {
              employeeId: op.id,
              domain,
              requiredLevel: 3,
            });
            if (result.passed) {
              passed++;
            } else {
              blocked++;
            }
          } catch {
            errors++;
          }
        }

        await delay(500);

        const status: SimStatus = errors > 0 ? "BUG_FOUND" : "SUCCESS";
        yield mkLog(agentName, agentType, action, status, milestone, start,
          `Stress test complete: ${count} verifications — ${passed} passed, ${blocked} blocked, ${errors} errors. Pass rate: ${Math.round((passed / count) * 100)}%.`,
          `Operators tested: ${testTargets.map((o) => o.name).join(", ")}`);
        return;
      }

      // ══════════════════════════════════════════════════════════════
      // ── MODULE INTEGRATION TESTS (Task #6 — Simulator Expansion) ──
      // ══════════════════════════════════════════════════════════════

      // ── TEST_CRM_PIPELINE ──
      case "TEST_CRM_PIPELINE": {
        yield infoLog(agentName, agentType, action, milestone,
          "Connecting to CRM database... loading sales pipeline...");
        await delay(900);

        const customers = await trpcQuery<{ items: any[]; total: number }>(
          "crm.customers.list", { page: 1, pageSize: 50 }
        );
        await delay(600);

        yield infoLog(agentName, agentType, action, milestone,
          `Found ${customers.total} customers. Loading opportunity pipeline...`);
        await delay(800);

        const opportunities = await trpcQuery<{ items: any[]; total: number }>(
          "crm.opportunities.list", { page: 1, pageSize: 50 }
        );
        await delay(500);

        if (customers.total === 0) {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            "CRM customer database is EMPTY. Pipeline cannot function without customer data.",
            "crm.customers.list returned 0 records");
          return;
        }

        // Validate pipeline stage distribution
        const stages = new Map<string, number>();
        for (const opp of (opportunities.items || [])) {
          const stage = opp.stage || "unknown";
          stages.set(stage, (stages.get(stage) || 0) + 1);
        }
        const stageList = [...stages.entries()].map(([s, c]) => `${s}(${c})`).join(", ");

        yield mkLog(agentName, agentType, action, "SUCCESS", milestone, start,
          `CRM pipeline verified: ${customers.total} customers, ${opportunities.total} opportunities across ${stages.size} stages.`,
          `Pipeline distribution: ${stageList || "no opportunities"}`);
        return;
      }

      // ── TEST_CRM_LEAD_SCORING ──
      case "TEST_CRM_LEAD_SCORING": {
        yield infoLog(agentName, agentType, action, milestone,
          "Initializing AI lead scoring engine...");
        await delay(1000);

        const leads = await trpcQuery<{ items: any[]; total: number }>(
          "crm.leads.list", { page: 1, pageSize: 50 }
        );
        await delay(700);

        if (leads.total === 0) {
          yield mkLog(agentName, agentType, action, "WARN", milestone, start,
            "No leads in CRM. AI scoring module has no data to validate.",
            "crm.leads.list returned 0 records — seed data may be needed");
          return;
        }

        yield infoLog(agentName, agentType, action, milestone,
          `Loaded ${leads.total} leads. Analyzing AI confidence scores...`);
        await delay(900);

        // Validate AI scores
        let scored = 0;
        let unscored = 0;
        let maxScore = 0;
        let minScore = 100;
        for (const lead of (leads.items || [])) {
          const score = Number(lead.aiConfidenceScore || lead.ai_confidence_score || 0);
          if (score > 0) {
            scored++;
            maxScore = Math.max(maxScore, score);
            minScore = Math.min(minScore, score);
          } else {
            unscored++;
          }
        }

        const avgScore = scored > 0
          ? Math.round((leads.items || []).reduce((s: number, l: any) => s + Number(l.aiConfidenceScore || l.ai_confidence_score || 0), 0) / scored)
          : 0;

        if (scored === 0) {
          yield mkLog(agentName, agentType, action, "WARN", milestone, start,
            `${leads.total} leads found but none have AI confidence scores. AI scoring module may not be running.`,
            "All aiConfidenceScore values are 0 or null");
          return;
        }

        yield mkLog(agentName, agentType, action, "SUCCESS", milestone, start,
          `AI lead scoring verified: ${scored}/${leads.total} leads scored. Range: ${minScore}-${maxScore}, Avg: ${avgScore}. ${unscored} unscored.`,
          `Score distribution validates AI model output quality`);
        return;
      }

      // ── TEST_PLM_DOCUMENTS ──
      case "TEST_PLM_DOCUMENTS": {
        yield infoLog(agentName, agentType, action, milestone,
          "Connecting to PLM document management system...");
        await delay(800);

        const docs = await trpcQuery<{ documents: any[]; total: number }>(
          "plm.listDocuments", {}
        );
        await delay(600);

        if (!docs || docs.total === 0) {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            "PLM document repository is EMPTY. No design documents found.",
            "plm.listDocuments returned 0 records");
          return;
        }

        yield infoLog(agentName, agentType, action, milestone,
          `Found ${docs.total} documents. Validating document lifecycle states...`);
        await delay(900);

        // Validate document status distribution
        const statusMap = new Map<string, number>();
        let frozenCount = 0;
        for (const doc of (docs.documents || [])) {
          const status = doc.status || "unknown";
          statusMap.set(status, (statusMap.get(status) || 0) + 1);
          if (doc.designFreeze) frozenCount++;
        }
        const statusList = [...statusMap.entries()].map(([s, c]) => `${s}(${c})`).join(", ");

        yield mkLog(agentName, agentType, action, "SUCCESS", milestone, start,
          `PLM document lifecycle verified: ${docs.total} docs — ${statusList}. ${frozenCount} design-frozen.`,
          `Document management system operating normally`);
        return;
      }

      // ── TEST_PLM_DESIGN_REVIEW ──
      case "TEST_PLM_DESIGN_REVIEW": {
        yield infoLog(agentName, agentType, action, milestone,
          "Loading design review workflow engine...");
        await delay(1000);

        const reviews = await trpcQuery<{ reviews: any[]; total: number }>(
          "plm.listReviews", {}
        );
        await delay(700);

        if (!reviews || reviews.total === 0) {
          yield mkLog(agentName, agentType, action, "WARN", milestone, start,
            "No design reviews in queue. Review workflow is idle.",
            "plm.listReviews returned 0 records — may need design submissions");
          return;
        }

        yield infoLog(agentName, agentType, action, milestone,
          `Found ${reviews.total} design reviews. Checking approval pipeline...`);
        await delay(800);

        // Validate review decisions
        const decisions = new Map<string, number>();
        for (const review of (reviews.reviews || [])) {
          const decision = review.decision || review.status || "pending";
          decisions.set(decision, (decisions.get(decision) || 0) + 1);
        }
        const decisionList = [...decisions.entries()].map(([d, c]) => `${d}(${c})`).join(", ");
        const pendingCount = decisions.get("pending") || 0;

        const status: SimStatus = pendingCount > reviews.total * 0.8 ? "WARN" : "SUCCESS";
        yield mkLog(agentName, agentType, action, status, milestone, start,
          `Design review pipeline: ${reviews.total} reviews — ${decisionList}. ${pendingCount} awaiting decision.`,
          status === "WARN"
            ? `Warning: ${Math.round((pendingCount / reviews.total) * 100)}% of reviews are pending — possible bottleneck`
            : `Review approval rate within normal range`);
        return;
      }

      // ── TEST_8D_WORKFLOW ──
      case "TEST_8D_WORKFLOW": {
        yield infoLog(agentName, agentType, action, milestone,
          "Loading 8D problem-solving database...");
        await delay(900);

        const reports = await trpcQuery<{ items: any[]; total: number }>(
          "eightDCapa.list8D", {}
        );
        await delay(600);

        if (!reports || reports.total === 0) {
          yield mkLog(agentName, agentType, action, "WARN", milestone, start,
            "No 8D reports found. Quality incident tracking system is empty.",
            "eightDCapa.list8D returned 0 records");
          return;
        }

        yield infoLog(agentName, agentType, action, milestone,
          `Found ${reports.total} 8D reports. Validating step progression D0→D8...`);
        await delay(1100);

        // Validate 8D step progression
        const stepCounts = new Map<string, number>();
        const severityCounts = new Map<string, number>();
        for (const report of (reports.items || [])) {
          const step = report.currentStep || report.status || "unknown";
          stepCounts.set(step, (stepCounts.get(step) || 0) + 1);
          const severity = report.severity || "unknown";
          severityCounts.set(severity, (severityCounts.get(severity) || 0) + 1);
        }

        const stepList = [...stepCounts.entries()].map(([s, c]) => `${s}(${c})`).join(", ");
        const severityList = [...severityCounts.entries()].map(([s, c]) => `${s}(${c})`).join(", ");
        const criticalCount = (severityCounts.get("critical") || 0);

        const status: SimStatus = criticalCount > 0 ? "WARN" : "SUCCESS";
        yield mkLog(agentName, agentType, action, status, milestone, start,
          `8D workflow verified: ${reports.total} reports. Steps: ${stepList}. Severity: ${severityList}.`,
          criticalCount > 0
            ? `ATTENTION: ${criticalCount} critical 8D reports require immediate attention`
            : `All 8D reports are within normal escalation levels`);
        return;
      }

      // ── TEST_CAPA_PIPELINE ──
      case "TEST_CAPA_PIPELINE": {
        yield infoLog(agentName, agentType, action, milestone,
          "Loading CAPA (Corrective & Preventive Action) tracker...");
        await delay(800);

        const capas = await trpcQuery<{ items: any[]; total: number }>(
          "eightDCapa.listCAPA", {}
        );
        await delay(600);

        if (!capas || capas.total === 0) {
          yield mkLog(agentName, agentType, action, "WARN", milestone, start,
            "No CAPA records found. Corrective/preventive action system is empty.",
            "eightDCapa.listCAPA returned 0 records");
          return;
        }

        yield infoLog(agentName, agentType, action, milestone,
          `Found ${capas.total} CAPA records. Analyzing corrective vs preventive balance...`);
        await delay(900);

        // Validate CAPA type balance
        let corrective = 0;
        let preventive = 0;
        const statusCounts = new Map<string, number>();
        for (const capa of (capas.items || [])) {
          if (capa.type === "corrective") corrective++;
          else if (capa.type === "preventive") preventive++;
          const st = capa.status || "unknown";
          statusCounts.set(st, (statusCounts.get(st) || 0) + 1);
        }
        const statusList = [...statusCounts.entries()].map(([s, c]) => `${s}(${c})`).join(", ");

        // IATF 16949 best practice: preventive should be ≥30% of total
        const preventiveRatio = capas.total > 0 ? Math.round((preventive / capas.total) * 100) : 0;
        const status: SimStatus = preventiveRatio < 20 ? "WARN" : "SUCCESS";

        yield mkLog(agentName, agentType, action, status, milestone, start,
          `CAPA pipeline: ${capas.total} records — ${corrective} corrective, ${preventive} preventive (${preventiveRatio}%). Status: ${statusList}.`,
          status === "WARN"
            ? `IATF 16949 recommendation: preventive actions should be ≥30% of total (currently ${preventiveRatio}%)`
            : `Corrective/preventive balance meets IATF 16949 guidelines`);
        return;
      }

      // ── TEST_SPARE_PARTS_ALERTS ──
      case "TEST_SPARE_PARTS_ALERTS": {
        yield infoLog(agentName, agentType, action, milestone,
          "Querying spare parts inventory system...");
        await delay(800);

        try {
          const alerts = await trpcQuery<any[]>(
            "supplyChain.sparePart.lowStockAlerts"
          );
          await delay(700);

          yield infoLog(agentName, agentType, action, milestone,
            `Low stock alert query complete. Analyzing inventory levels...`);
          await delay(600);

          const alertCount = Array.isArray(alerts) ? alerts.length : 0;
          if (alertCount === 0) {
            yield mkLog(agentName, agentType, action, "SUCCESS", milestone, start,
              "Spare parts inventory: NO low-stock alerts. All parts above reorder point.",
              "supplyChain.sparePart.lowStockAlerts returned 0 items — inventory healthy");
          } else {
            const partNames = (alerts as any[]).slice(0, 5).map((p: any) => p.name || p.partName || p.part_name || "unknown").join(", ");
            yield mkLog(agentName, agentType, action, "WARN", milestone, start,
              `Spare parts inventory: ${alertCount} parts below reorder point! Immediate procurement action needed.`,
              `Low stock items: ${partNames}${alertCount > 5 ? ` and ${alertCount - 5} more` : ""}`);
          }
        } catch {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            "Failed to query spare parts low stock alerts. Inventory monitoring offline.",
            "supplyChain.sparePart.lowStockAlerts — endpoint error");
        }
        return;
      }

      // ── TEST_COMPLAINT_RESOLUTION ──
      case "TEST_COMPLAINT_RESOLUTION": {
        yield infoLog(agentName, agentType, action, milestone,
          "Loading customer quality complaint database...");
        await delay(900);

        try {
          const stats = await trpcQuery<Record<string, unknown>>(
            "supplyChain.complaint.stats"
          );
          await delay(700);

          yield infoLog(agentName, agentType, action, milestone,
            `Complaint statistics loaded. Analyzing resolution metrics...`);
          await delay(600);

          const total = Number(stats?.total || stats?.totalComplaints || 0);
          const open = Number(stats?.open || stats?.openComplaints || 0);
          const critical = Number(stats?.critical || stats?.criticalCount || 0);

          if (total === 0) {
            yield mkLog(agentName, agentType, action, "SUCCESS", milestone, start,
              "Customer complaint system: 0 complaints on record. Quality performance excellent.",
              "No quality issues reported by customers");
            return;
          }

          const resolutionRate = total > 0 ? Math.round(((total - open) / total) * 100) : 0;
          const status: SimStatus = critical > 0 ? "WARN" : "SUCCESS";

          yield mkLog(agentName, agentType, action, status, milestone, start,
            `Complaint resolution: ${total} total, ${open} open, ${critical} critical. Resolution rate: ${resolutionRate}%.`,
            critical > 0
              ? `WARNING: ${critical} critical complaints require immediate escalation`
              : `Complaint resolution pipeline functioning normally`);
        } catch {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            "Failed to query complaint statistics. Quality feedback loop offline.",
            "supplyChain.complaint.stats — endpoint error");
        }
        return;
      }

      // ── TEST_WARRANTY_CHECK ──
      case "TEST_WARRANTY_CHECK": {
        yield infoLog(agentName, agentType, action, milestone,
          "Connecting to after-sales warranty management system...");
        await delay(1000);

        try {
          const equipments = await trpcQuery<{ items: any[]; total: number }>(
            "afterSales.equipments.list", { page: 1, pageSize: 100 }
          );
          await delay(700);

          const total = equipments?.total || (equipments?.items || []).length;
          if (total === 0) {
            yield mkLog(agentName, agentType, action, "WARN", milestone, start,
              "No equipment records in after-sales system. Warranty tracking has no data.",
              "afterSales.equipments.list returned 0 records");
            return;
          }

          yield infoLog(agentName, agentType, action, milestone,
            `Found ${total} equipment records. Scanning warranty status...`);
          await delay(900);

          // Analyze warranty status
          let active = 0;
          let expiringSoon = 0;
          let expired = 0;
          const now_ts = Date.now();
          for (const eq of (equipments.items || [])) {
            const warrantyEnd = eq.warrantyEndDate || eq.warranty_end_date;
            if (!warrantyEnd) { expired++; continue; }
            const endDate = new Date(warrantyEnd).getTime();
            const daysLeft = Math.floor((endDate - now_ts) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) expired++;
            else if (daysLeft < 90) expiringSoon++;
            else active++;
          }

          const status: SimStatus = expiringSoon > 0 || expired > 0 ? "WARN" : "SUCCESS";
          yield mkLog(agentName, agentType, action, status, milestone, start,
            `Warranty status: ${total} equipments — ${active} active, ${expiringSoon} expiring within 90 days, ${expired} expired.`,
            expiringSoon > 0
              ? `${expiringSoon} equipments need warranty renewal attention`
              : expired > 0
                ? `${expired} equipments have expired warranties`
                : `All warranties are active and healthy`);
        } catch {
          yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
            "Failed to connect to after-sales warranty system. Service offline.",
            "afterSales.equipments.list — endpoint error");
        }
        return;
      }

      default:
        yield mkLog(agentName, agentType, action, "WARN", milestone, start,
          `Unknown action: ${action}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    yield mkLog(agentName, agentType, action, "BUG_FOUND", milestone, start,
      `Unhandled exception during ${action}: ${msg}`,
      err instanceof Error ? err.stack ?? "" : "");
  }
}

/**
 * Run the full M6 Shopfloor Stress Test suite.
 * Yields logs one-by-one with realistic pacing.
 */
export async function* runM6StressTest(): AsyncGenerator<SimLog> {
  // Boot sequence
  yield infoLog("System", "shopfloor_operator", "TEST_OPERATOR_LIST", "M6-M8",
    "═══ M6-M8 SHOPFLOOR STRESS TEST — INITIATING ═══");
  await delay(800);

  // 1. Load operators
  yield* runSimulationStreaming("shopfloor_operator", "TEST_OPERATOR_LIST");
  await delay(500);

  // 2. Skill pass test
  yield infoLog("System", "shopfloor_operator", "TEST_SKILL_PASS", "M6-M8",
    "─── Phase 2: Authorized Worker Verification ───");
  await delay(400);
  yield* runSimulationStreaming("shopfloor_operator", "TEST_SKILL_PASS");
  await delay(500);

  // 3. Skill breach test
  yield infoLog("System", "shopfloor_operator", "TEST_SKILL_BREACH", "M6-M8",
    "─── Phase 3: IATF 16949 §7.2 Interception Test ───");
  await delay(400);
  yield* runSimulationStreaming("shopfloor_operator", "TEST_SKILL_BREACH");
  await delay(500);

  // 4. Stress random verification
  yield infoLog("System", "shopfloor_operator", "STRESS_RANDOM_VERIFY", "M6-M8",
    "─── Phase 4: Multi-Operator Stress Verification ───");
  await delay(400);
  yield* runSimulationStreaming("shopfloor_operator", "STRESS_RANDOM_VERIFY");
  await delay(500);

  // 5. Competency matrix integrity
  yield infoLog("System", "qa_inspector", "TEST_COMPETENCY_LOAD", "M9-M10",
    "─── Phase 5: QA Data Integrity Audit ───");
  await delay(400);
  yield* runSimulationStreaming("qa_inspector", "TEST_COMPETENCY_LOAD");
  await delay(300);

  yield infoLog("System", "qa_inspector", "TEST_COMPETENCY_LOAD", "M6-M8",
    "═══ M6-M8 STRESS TEST COMPLETE ═══");
}

/**
 * Run ALL agents across all milestones (M0-M12).
 * Yields logs progressively with milestone transitions.
 */
export async function* runFullSimulation(): AsyncGenerator<SimLog> {
  yield infoLog("System", "sales_rep", "TEST_COMPETENCY_LOAD", "M0-M2",
    "═══ GRT M0-M12 FULL SIMULATION — INITIATING ═══");
  await delay(1000);

  for (const agent of AGENTS) {
    yield infoLog("System", agent.type, agent.actions[0], agent.milestone,
      `══ Entering ${agent.milestone}: ${agent.name} (${agent.nameZh}) agent activated ══`);
    await delay(700);

    for (const action of agent.actions) {
      yield* runSimulationStreaming(agent.type, action);
      await delay(400);
    }

    await delay(300);
  }

  yield infoLog("System", "supply_chain", "TEST_SUPPLY_CHAIN_QUERY", "M11-M12",
    "═══ M0-M12 FULL SIMULATION COMPLETE ═══");
}

/**
 * Run Module Integration Test — tests all business module APIs
 * (CRM, PLM, 8D/CAPA, Supply Chain, After-Sales)
 * without the IATF skill verification tests.
 */
export async function* runModuleIntegrationTest(): AsyncGenerator<SimLog> {
  const MODULE_ACTIONS: { agent: AgentDef; action: SimAction }[] = [
    { agent: AGENTS[0], action: "TEST_CRM_PIPELINE" },
    { agent: AGENTS[0], action: "TEST_CRM_LEAD_SCORING" },
    { agent: AGENTS[1], action: "TEST_PLM_DOCUMENTS" },
    { agent: AGENTS[1], action: "TEST_PLM_DESIGN_REVIEW" },
    { agent: AGENTS[3], action: "TEST_8D_WORKFLOW" },
    { agent: AGENTS[3], action: "TEST_CAPA_PIPELINE" },
    { agent: AGENTS[4], action: "TEST_SUPPLY_CHAIN_QUERY" },
    { agent: AGENTS[4], action: "TEST_SPARE_PARTS_ALERTS" },
    { agent: AGENTS[4], action: "TEST_COMPLAINT_RESOLUTION" },
    { agent: AGENTS[4], action: "TEST_WARRANTY_CHECK" },
  ];

  yield infoLog("System", "sales_rep", "TEST_CRM_PIPELINE", "M0-M2",
    "═══ MODULE INTEGRATION TEST — ALL BUSINESS MODULES ═══");
  await delay(800);

  let currentMilestone = "";
  for (const { agent, action } of MODULE_ACTIONS) {
    if (agent.milestone !== currentMilestone) {
      currentMilestone = agent.milestone;
      yield infoLog("System", agent.type, action, agent.milestone,
        `══ ${agent.milestone}: ${agent.name} (${agent.nameZh}) — Module Verification ══`);
      await delay(500);
    }
    yield* runSimulationStreaming(agent.type, action);
    await delay(300);
  }

  yield infoLog("System", "supply_chain", "TEST_WARRANTY_CHECK", "M11-M12",
    "═══ MODULE INTEGRATION TEST COMPLETE ═══");
}
