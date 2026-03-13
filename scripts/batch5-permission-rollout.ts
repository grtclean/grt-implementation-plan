/**
 * Batch 5: Automated requirePermission rollout for remaining routers.
 * Maps each router file to a permission code, then replaces
 * `protectedProcedure` with `requirePermission('...')` on mutation lines only.
 *
 * Run: npx tsx scripts/batch5-permission-rollout.ts
 * Dry-run: npx tsx scripts/batch5-permission-rollout.ts --dry-run
 */
import fs from "fs";
import path from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const ROOT = path.resolve(import.meta.dirname ?? ".", "..");

// ── Router → Permission Code mapping ────────────────────

const ROUTER_PERMISSION_MAP: Record<string, string> = {
  // AI / ML
  "server/ai-adapter/ai-adapter.router.ts": "ai:hub:access",
  "server/ai-assistants/ai-assistant.router.ts": "ai:assistant:chat",
  "server/ai-services/ai-services.router.ts": "ai:hub:access",
  "server/ai/ai.router.ts": "ai:hub:access",
  "server/routers/ai-agent-fleet.router.ts": "ai:agents:manage",
  "server/routers/ai-canvas.router.ts": "ai:hub:access",
  "server/routers/ai-chat.router.ts": "ai:assistant:chat",
  "server/routers/ai-execution-mode.router.ts": "ai:hub:access",
  "server/routers/ai-intervention.router.ts": "ai:hub:access",
  "server/routers/ai-model.router.ts": "ai:models:train",
  "server/routers/ai-notebook.router.ts": "ai:hub:access",
  "server/routers/ai-performance.router.ts": "ai:effectiveness:view",
  "server/routers/ai-planning.router.ts": "ai:hub:access",
  "server/routers/ai-suggestion.router.ts": "ai:hub:access",
  "server/routers/ai-task.router.ts": "ai:hub:access",
  "server/routers/ai-trigger.router.ts": "ai:hub:access",
  "server/routers/new-ai-assistant.router.ts": "ai:assistant:chat",
  "server/routers/employee-ai-assistant.router.ts": "ai:assistant:chat",
  "server/services/ai-early-warning.router.ts": "ai:warning:view",
  "server/routers/genesis.router.ts": "ai:genesis:generate",

  // HR
  "server/routers/hr-lifecycle.router.ts": "hr:lifecycle:view",
  "server/routers/hr-sandbox.router.ts": "hr:employees:edit",
  "server/routers/employee.router.ts": "hr:employees:edit",
  "server/routers/employee-da.router.ts": "hr:employees:edit",
  "server/routers/employee-profile.router.ts": "hr:employees:edit",
  "server/routers/competency.router.ts": "capability:matrix:manage",
  "server/offboarding/offboarding.router.ts": "hr:offboarding:manage",
  "server/routers/training-assessment.router.ts": "hr:training:manage",
  "server/routers/training-certificate.router.ts": "hr:training:manage",
  "server/perf-salary/perfSalary.router.ts": "hr:compensation:manage",
  "server/lifecycle/lifecycle.router.ts": "hr:lifecycle:view",
  "server/delegation/delegation.router.ts": "hr:delegation:manage",
  "server/hr-intelligence/hrIntelligence.router.ts": "hr:employees:edit",
  "server/routers/performance-record.router.ts": "hr:performance:manage",
  "server/routers/skill-recommendation.router.ts": "capability:matrix:manage",

  // Finance
  "server/routers/expense-report.router.ts": "finance:expense:create",
  "server/routers/expense-comparison.router.ts": "finance:expense:view",
  "server/routers/expense-comparison-export.router.ts": "finance:expense:view",
  "server/routers/expense-forecast.router.ts": "finance:analytics:view",
  "server/routers/expense-report-scheduler.router.ts": "finance:expense:create",
  "server/routers/trip-request.router.ts": "finance:trip:create",
  "server/routers/budget-overrun-approval.router.ts": "finance:budget:approve",
  "server/routers/cost.router.ts": "finance:cost:manage",
  "server/routers/cost-alert.router.ts": "finance:cost:manage",
  "server/services/cost-standards.router.ts": "finance:cost:standards",
  "server/routers/travel-dashboard.router.ts": "finance:travel:dashboard",
  "server/sales-finance-intelligence/salesFinanceIntelligence.router.ts": "finance:analytics:view",

  // Manufacturing
  "server/routers/scheduling.router.ts": "mfg:scheduling:run",
  "server/routers/processManagement.router.ts": "mfg:process:manage",
  "server/production-execution/production-execution.router.ts": "mfg:execution:report",
  "server/production-advanced/productionAdvanced.router.ts": "mfg:process:manage",
  "server/routers/oee-dashboard.router.ts": "mfg:oee:view",
  "server/shift-handover/shiftHandover.router.ts": "mfg:shift:manage",
  "server/routers/kiosk.router.ts": "mfg:kiosk:access",
  "server/routers/worker.router.ts": "mfg:workers:manage",
  "server/routers/mes.router.ts": "mfg:process:manage",
  "server/routers/uwb.router.ts": "mfg:uwb:manage",
  "server/production-steps/processSteps.router.ts": "mfg:steps:manage",
  "server/production-steps/bomExcelImport.router.ts": "rnd:bom:manage",
  "server/production-steps/bomImport.router.ts": "rnd:bom:manage",
  "server/production-steps/bomVerification.router.ts": "rnd:bom:verify",
  "server/production-steps/ccdIntegration.router.ts": "mfg:ccd:view",
  "server/production-steps/ccdWebSocket.router.ts": "mfg:ccd:view",
  "server/production-steps/qualityInterlock.router.ts": "mfg:interlock:manage",
  "server/production-steps/qualityMaterialPerformance.router.ts": "mfg:qc:manage",
  "server/production-steps/salaryBonus.router.ts": "hr:bonus:manage",
  "server/routers/smart-scheduler.router.ts": "mfg:scheduling:run",

  // Quality
  "server/routers/fmea.router.ts": "mfg:fmea:manage",
  "server/routers/fmea-dynamic.router.ts": "mfg:fmea:manage",
  "server/routers/control-plan.router.ts": "mfg:control-plan:manage",
  "server/routers/eight-d-capa.router.ts": "mfg:8d:manage",
  "server/routers/msa.router.ts": "mfg:msa:manage",
  "server/routers/ppap.router.ts": "mfg:ppap:manage",
  "server/routers/safety-rule.router.ts": "mfg:safety:manage",
  "server/quality-advanced/qualityAdvanced.router.ts": "mfg:qc:manage",
  "server/routers/process-notebook.router.ts": "mfg:process:manage",
  "server/routers/sop-interlock.router.ts": "mfg:interlock:manage",
  "server/routers/sop-db.router.ts": "project:sop:manage",
  "server/sop-editor/sopEditor.router.ts": "project:sop:manage",
  "server/services/sop.router.ts": "project:sop:manage",
  "server/routers/rd-verification.router.ts": "rnd:bom:verify",

  // Project
  "server/routers/project360.router.ts": "project:edit",
  "server/routers/projectGate.router.ts": "project:stage-gate:manage",
  "server/routers/project-agent.router.ts": "project:edit",
  "server/routers/planning-dependency.router.ts": "project:tasks:manage",
  "server/modules/stageGate.router.ts": "project:stage-gate:manage",
  "server/modules/stageGateEnhanced.router.ts": "project:stage-gate:manage",
  "server/project-intelligence/projectIntelligence.router.ts": "project:edit",
  "server/routers/rnd-pipeline.router.ts": "rnd:requirements:manage",

  // Supply chain
  "server/routers/supply-chain.router.ts": "supply:procurement:manage",
  "server/routers/smart-inventory.router.ts": "mfg:inventory:manage",
  "server/routers/supplier-risk.router.ts": "supply:supplier:assess",
  "server/routers/warehouse.router.ts": "supply:warehouse:manage",
  "server/procurement/procurement.router.ts": "supply:procurement:manage",
  "server/materials/material.router.ts": "supply:materials:manage",
  "server/routers/p2p-lifecycle.router.ts": "supply:procurement:manage",

  // CRM / Sales
  "server/crm/crm.router.ts": "crm:customers:edit",
  "server/routers/lead-analytics.router.ts": "crm:leads:manage",
  "server/routers/lead-auto-follow.router.ts": "crm:leads:manage",
  "server/routers/lead-import.router.ts": "crm:leads:manage",
  "server/modules/aiSales.router.ts": "crm:leads:manage",
  "server/modules/aiSalesEnhanced.router.ts": "crm:leads:manage",
  "server/customer-ticket/customerComm.router.ts": "service:tickets:manage",
  "server/customer-ticket/customerTicket.router.ts": "service:tickets:manage",
  "server/customer-repair/customerRepair.router.ts": "service:repair:portal",

  // Service
  "server/services/after-sales.router.ts": "service:tickets:manage",
  "server/services/fat-sat.router.ts": "mfg:fat:manage",
  "server/services/field-service.router.ts": "service:installation:manage",
  "server/routers/service-dashboard.router.ts": "service:workbench:view",
  "server/service-sales-advanced/serviceSalesAdvanced.router.ts": "service:tickets:manage",
  "server/rd-service-intelligence/rdServiceIntelligence.router.ts": "service:diagnosis:use",

  // System / Admin
  "server/permission-management/permission.router.ts": "system:permissions:assign",
  "server/permissions/permission.router.ts": "system:permissions:assign",
  "server/routers/permission-management.router.ts": "system:permissions:assign",
  "server/routers/access-control.router.ts": "system:permissions:assign",
  "server/routers/auth.router.ts": "system:users:edit",
  "server/menu-management/menu.router.ts": "system:menu:manage",
  "server/routers/org.router.ts": "system:org:manage",
  "server/routers/naming.router.ts": "system:naming:manage",
  "server/routers/data-migration.router.ts": "system:data:migrate",
  "server/routers/migration.router.ts": "system:data:migrate",
  "server/routers/scheduler.router.ts": "system:scheduler:manage",
  "server/routers/notification.router.ts": "system:notifications:config",
  "server/routers/notification-channel-test.router.ts": "system:notifications:config",
  "server/routers/webhook.router.ts": "system:webhooks:manage",
  "server/monitoring/monitoring.router.ts": "system:monitoring:view",
  "server/routers/compliance.router.ts": "system:compliance:manage",
  "server/routers/compliance-calendar.router.ts": "system:compliance:manage",
  "server/routers/governance.router.ts": "system:compliance:manage",
  "server/routers/deadlock-monitor.router.ts": "system:monitoring:view",
  "server/routers/analytics.router.ts": "system:monitoring:view",
  "server/routers/socialPlatformConfig.router.ts": "system:dingtalk:config",
  "server/dingtalk/dingtalk.router.ts": "system:dingtalk:config",
  "server/sync/sync.router.ts": "system:erp:config",
  "server/routers/sync-dispatch.router.ts": "system:erp:config",

  // Strategy
  "server/routers/okr.router.ts": "strategy:okr:manage",
  "server/routers/strategy-goals.router.ts": "strategy:okr:manage",
  "server/routers/agenda.router.ts": "strategy:agenda:manage",
  "server/annual-agenda/annual-agenda.router.ts": "strategy:agenda:manage",
  "server/certification/certification.router.ts": "strategy:certification:manage",
  "server/regional-compliance/regionalCompliance.router.ts": "project:compliance:manage",

  // Collaboration
  "server/routers/collaboration-docs.router.ts": "collab:docs:manage",
  "server/routers/community.router.ts": "collab:community:post",
  "server/routers/smart-meeting.router.ts": "collab:meeting:hub",
  "server/meeting-intelligence/meeting.router.ts": "collab:meeting:hub",
  "server/meeting-intelligence/case-library.router.ts": "collab:meeting:hub",
  "server/meeting-intelligence/customer-solution-meeting.router.ts": "collab:meeting:hub",
  "server/meeting-intelligence/meeting-task-loop.router.ts": "collab:meeting:hub",
  "server/meeting-intelligence/webhook-config.router.ts": "system:webhooks:manage",

  // OA
  "server/routers/oa-forms.router.ts": "oa:forms:manage",
  "server/routers/oa.router.ts": "oa:forms:manage",
  "server/routers/questionnaire.router.ts": "oa:questionnaire:manage",
  "server/routers/report-center.router.ts": "oa:reports:manage",
  "server/routers/report-scheduler.router.ts": "oa:reports:manage",
  "server/routers/report-template.router.ts": "oa:reports:manage",
  "server/routers/vision-dashboard.router.ts": "oa:vision:lobby",

  // Capability
  "server/capability-management/capability.router.ts": "capability:matrix:manage",
  "server/capability-evidence/capability-evidence.router.ts": "capability:evidence:submit",
  "server/routers/capability-os.router.ts": "capability:matrix:manage",
  "server/routers/capability-system.router.ts": "capability:matrix:manage",
  "server/routers/excellence-culture.router.ts": "capability:badges:award",
  "server/services/gamification.router.ts": "capability:badges:award",

  // POS
  "server/pos/pos.router.ts": "pos:projects:manage",

  // Digital twin / IoT
  "server/routers/digital-twin.router.ts": "rnd:digital-twin:view",
  "server/routers/digital-thread.router.ts": "rnd:digital-twin:view",
  "server/services/iot-digital-twin.router.ts": "rnd:digital-twin:view",

  // Vault / PLM
  "server/routers/vault.router.ts": "rnd:vault:access",
  "server/routers/plm.router.ts": "rnd:plm:access",

  // ERP
  "server/erp/erp.router.ts": "system:erp:config",
  "server/erp/tiansi-erp.router.ts": "system:erp:config",

  // Contract
  "server/contract/contract.router.ts": "crm:contracts:manage",

  // Doc intelligence
  "server/doc-intelligence/doc-intelligence.router.ts": "ai:rag:train",

  // Misc
  "server/routers/feedback.router.ts": "workspace:preferences:manage",
  "server/routers/help.router.ts": "workspace:preferences:manage",
  "server/routers/chat-history.router.ts": "ai:assistant:chat",
  "server/routers/user-profile.router.ts": "workspace:profile:edit",
  "server/routers/workspace.router.ts": "workspace:preferences:manage",
  "server/routers/bu.router.ts": "system:org:manage",
  "server/routers/bu-mapping.router.ts": "system:org:manage",
  "server/routers/import-history.router.ts": "system:data:migrate",
  "server/routers/externalSync.router.ts": "system:data:migrate",
  "server/routers/field-mapping.router.ts": "system:data:migrate",
  "server/routers/field-mapping-recommend.router.ts": "system:data:migrate",
  "server/routers/cicd.router.ts": "devops:deployment:manage",
  "server/routers/cloud-hall.router.ts": "devops:matrix:view",
  "server/routers/concurrent-command.router.ts": "devops:concurrent:operate",
  "server/routers/da-integration.router.ts": "system:erp:config",
  "server/routers/devTasks.router.ts": "devops:concurrent:operate",
  "server/routers/red-blue.router.ts": "devops:simulator:access",
  "server/routers/role-agent.router.ts": "ai:agents:manage",
  "server/routers/rule-template.router.ts": "system:naming:manage",
  "server/routers/rule-version.router.ts": "system:naming:manage",
  "server/routers/test-engine.router.ts": "devops:simulator:access",
  "server/routers/alert-rule.router.ts": "system:notifications:config",
  "server/routers/automation.router.ts": "system:scheduler:manage",
  "server/routers/carbon-footprint.router.ts": "system:compliance:manage",
  "server/routers/eco-impact.router.ts": "system:compliance:manage",
  "server/routers/equipment-compliance.router.ts": "project:compliance:manage",
  "server/routers/violation-event.router.ts": "system:compliance:manage",
  "server/routers/task-cockpit.router.ts": "project:tasks:manage",
  "server/routers/task-execution-log.router.ts": "project:tasks:manage",
  "server/routers/template-usage-stats.router.ts": "system:monitoring:view",
  "server/routers/operations-dashboard.router.ts": "mfg:dashboard:view",
  "server/routers/solution-engine.router.ts": "rnd:solutions:manage",
  "server/routers/knowledge.router.ts": "ai:rag:train",
  "server/deployment/changeManagement.router.ts": "strategy:change:manage",
  "server/services/architecture.router.ts": "system:org:manage",
  "server/services/microsoft-graph.router.ts": "system:microsoft:config",
  "server/services/o365-sync.router.ts": "system:microsoft:config",
  "server/services/performance-trace.router.ts": "system:monitoring:view",
  "server/services/time-reconciliation.router.ts": "hr:attendance:manage",
  "server/services/vector-search.router.ts": "ai:rag:query",
  "server/visitor-management/visitor.router.ts": "hr:visitor:request",
  "server/routers/daily-plan.router.ts": "mfg:scheduling:run",
  "server/approval/approval.router.ts": "oa:forms:manage",
  "server/modules/changeEvent.router.ts": "strategy:change:manage",
  "server/modules/geminiIntegration.router.ts": "devops:gemini:view",
  "server/modules/knowledge-base.router.ts": "ai:rag:train",
  "server/modules/liquidWorkforce.router.ts": "hr:bu-team:manage",
  "server/modules/liquidWorkforceEnhanced.router.ts": "hr:bu-team:manage",
  "server/modules/personalAgent.router.ts": "ai:assistant:chat",
  "server/modules/personalAgentEnhanced.router.ts": "ai:assistant:chat",
  "server/modules/securityEnhanced.router.ts": "system:security:dashboard",
  "server/modules/socialCommunity.router.ts": "collab:community:post",
  "server/modules/socialCommunityEnhanced.router.ts": "collab:community:post",
  "server/modules/trainingEnhanced.router.ts": "hr:training:manage",
  "server/operations-intelligence/operationsIntelligence.router.ts": "mfg:dashboard:view",
  "server/p2-automation/p2Automation.router.ts": "mfg:process:manage",
  "server/kpi-performance/kpiPerformance.router.ts": "hr:performance:manage",
  "server/ime/ime.router.ts": "mfg:process:manage",
};

// ── Processing ──────────────────────────────────────────

let totalFilesModified = 0;
let totalMutationsProtected = 0;
let skippedFiles: string[] = [];

for (const [relPath, permCode] of Object.entries(ROUTER_PERMISSION_MAP)) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    skippedFiles.push(`${relPath} (not found)`);
    continue;
  }

  let content = fs.readFileSync(absPath, "utf-8");
  const originalContent = content;

  // Step 1: Ensure requirePermission is imported
  if (!content.includes("requirePermission")) {
    // Add requirePermission to existing import
    content = content.replace(
      /import\s*\{([^}]*)\}\s*from\s*["']\.\.?\/?_core\/trpc["'];/,
      (match, imports) => {
        const trimmed = imports.trim();
        if (trimmed.includes("requirePermission")) return match;
        return match.replace(imports, `${trimmed}, requirePermission`);
      }
    );
  }

  // Step 2: Replace protectedProcedure on mutation lines only
  // Match patterns like:
  //   protectedProcedure.input(...).mutation(
  //   protectedProcedure.mutation(
  //   protectedProcedure\n    .input(...).mutation(
  const lines = content.split("\n");
  let mutationsChanged = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line or the next few lines have .mutation(
    // We need to determine if this protectedProcedure leads to a mutation
    const hasMutationOnLine = line.includes(".mutation(");
    const hasMutationNext = (i + 1 < lines.length && lines[i + 1]?.includes(".mutation(")) ||
                            (i + 2 < lines.length && lines[i + 2]?.includes(".mutation("));

    // Also check if there's an input chain that leads to mutation
    let isMutationChain = false;
    if (line.includes("protectedProcedure") && !hasMutationOnLine && !hasMutationNext) {
      // Look ahead up to 10 lines for .mutation(
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes(".query(")) break; // It's a query, stop
        if (lines[j].includes(".mutation(")) {
          isMutationChain = true;
          break;
        }
      }
    }

    // Never change query procedures
    const isQueryOnLine = line.includes(".query(");
    if (!isQueryOnLine && line.includes("protectedProcedure") && (hasMutationOnLine || hasMutationNext || isMutationChain)) {
      lines[i] = line.replace("protectedProcedure", `requirePermission('${permCode}')`);
      mutationsChanged++;
    }
  }

  if (mutationsChanged > 0 || content !== originalContent) {
    const newContent = lines.join("\n");
    if (!DRY_RUN) {
      fs.writeFileSync(absPath, newContent, "utf-8");
    }
    console.log(`  [${DRY_RUN ? "DRY" : "OK"}] ${relPath}: ${mutationsChanged} mutations → requirePermission('${permCode}')`);
    totalFilesModified++;
    totalMutationsProtected += mutationsChanged;
  } else {
    skippedFiles.push(`${relPath} (no unprotected mutations)`);
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`  Batch 5 Permission Rollout ${DRY_RUN ? "(DRY RUN)" : "COMPLETE"}`);
console.log(`  Files modified: ${totalFilesModified}`);
console.log(`  Mutations protected: ${totalMutationsProtected}`);
console.log(`  Skipped: ${skippedFiles.length}`);
console.log(`${"═".repeat(60)}`);

if (skippedFiles.length > 0 && skippedFiles.length <= 20) {
  console.log("\nSkipped files:");
  skippedFiles.forEach(f => console.log(`  - ${f}`));
}
