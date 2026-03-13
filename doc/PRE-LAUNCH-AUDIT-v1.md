# GRT 5.0 Pre-Launch System Audit & Phased Optimization Plan

**Date:** 2026-03-10
**Author:** CTO Digital Assistant
**Scope:** Full-stack self-inspection before initial system launch

---

## Part 1: Digital Agent Sandbox Architecture

### 1.1 Agent Role Topology (18 Roles x 5 AI Levels)

```
                          ┌──────────────────────────────────────┐
                          │        GRT Enterprise OS 5.0         │
                          │   Five-Engine Architecture (E1-E5)   │
                          └──────────────┬───────────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
    ┌─────────▼──────────┐   ┌──────────▼──────────┐   ┌──────────▼──────────┐
    │  E1: Me Engine     │   │  E3: Operations     │   │  E4: Resources      │
    │  千人千面个人门户    │   │  项目/销售/生产/研发  │   │  HR/财务/OA/系统     │
    └─────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘
              │                          │                          │
              └──────────────────────────┼──────────────────────────┘
                                         │
                        ┌────────────────┼────────────────┐
                        │                │                │
                   ┌────▼────┐     ┌─────▼─────┐   ┌─────▼─────┐
                   │ L1-L2   │     │  L3-L4    │   │   L5      │
                   │ 初级助理 │     │ 高级助理   │   │ 专家助理   │
                   │ 监督执行 │     │ 半自主    │   │ 全自主     │
                   └─────────┘     └───────────┘   └───────────┘
```

### 1.2 Six Digital Agent Personas & Sandbox

| # | Agent Persona | Role(s) | Sandbox Scope | Primary Workbench | Core Routers | I/O Relationships |
|---|--------------|---------|---------------|-------------------|-------------|-------------------|
| 1 | **销售数字助理** (Sales DA) | `bu_sales` L2 | BU-scoped leads + CRM | SalesCRMWorkbench (5 tabs) | `crm`, `leadAnalytics`, `leadAutoFollow`, `aiSales`, `campaign` | **IN**: Customer inquiries, Market signals → **OUT**: Quotations, Visit plans, Pipeline updates → PM |
| 2 | **设计数字助理** (Design DA) | `bu_mech`, `bu_elec` L2 | Project-scoped BOM + PLM | PdmWorkbench + DrawingLibrary + RndNpiWorkbench | `plm`, `pdm`, `rndNpi`, `bom`, `designEngine`, `fmea` | **IN**: Requirements from PM, ECR from Service → **OUT**: Frozen drawings, BOM baselines, Design reviews → Production |
| 3 | **生产数字助理** (Production DA) | `team_lead`, `production_worker` L2 | Station-scoped MES + WO | ShopfloorMasterBoard + ProcessTrialWorkbench | `production`, `processSteps`, `mes`, `oee`, `qualityInterlock` | **IN**: Released BOM + PLC programs from Design → **OUT**: As-built records, Quality data → Service |
| 4 | **服务数字助理** (Service DA) | `cs_engineer` L2 | Customer-scoped tickets | AfterSalesWorkbench (5 tabs) | `afterSales`, `customerTicket`, `customerRepair`, `delivery` | **IN**: Equipment serial + warranty from Production → **OUT**: Field insights, ECR requests → Design (closed loop) |
| 5 | **项目数字助理** (Project DA) | `bu_pm` L3 | Cross-BU project view | Project360Cockpit + StageGateDashboard | `project`, `projectGate`, `aiPlanning`, `stageGate`, `taskBoard` | **IN**: Sales order → **OUT**: M0-M12 milestones, Gate reviews, Resource requests → All |
| 6 | **管理数字助理** (Management DA) | `bu_gm`, `director` L4 | BU/Global analytics | CeoExecutiveCockpit + BuManagerCockpit | `analytics`, `okr`, `governance`, `operationsDashboard` | **IN**: KPIs from all agents → **OUT**: Strategic decisions, Resource allocation, Approvals |

### 1.3 Agent Input/Output Flow (M0→M12 Lifecycle)

```
M0 Customer Inquiry
  │
  ▼ [Sales DA]
  ├─ Lead capture (leadImport.router)
  ├─ Opportunity scoring (leadAnalytics.router)
  └─ Quotation → Contract
        │
        ▼ [Project DA]  M1-M2 Project Setup
        ├─ Project creation (project.router)
        ├─ Stage-gate pipeline (projectGate.router)
        ├─ Resource planning (aiPlanning.router)
        └─ Requirements definition
              │
              ▼ [Design DA]  M3-M5 Engineering
              ├─ Drawing creation (plm.router → DrawingLibrary)
              ├─ BOM generation (bom.router)
              ├─ Design review (plm.submitReview → plm.recordDecision)
              ├─ FMEA analysis (fmea.router)
              ├─ Design freeze gate (plm.designFreezeApproved)
              ├─ PDM baseline capture (pdm.baseline.create)
              └─ Manufacturing readiness (pdm.readiness.runChecks)
                    │
                    ▼ [Production DA]  M5-M9 Manufacturing
                    ├─ Work order execution (production.router)
                    ├─ Process step tracking (processSteps.router)
                    ├─ Quality interlock (qualityInterlock.router)
                    ├─ As-built deviation recording (pdm.asBuilt.create)
                    └─ FAT coordination (fatSat.router)
                          │
                          ▼ [Service DA]  M9-M12 Delivery & Service
                          ├─ SAT execution (fatSat.router)
                          ├─ Warranty activation (afterSales.router)
                          ├─ Field service tickets (customerTicket.router)
                          ├─ Spare parts management (supplyChain.sparePart)
                          └─ Field insights → ECR (pdm.fieldInsight → pdm.eco)
                                │
                                ▼ [Design DA] ← Closed Loop
                                └─ ECO workflow (pdm.eco.submitEcr → changeEvent cascade)
```

### 1.4 Sandbox Simulation Structure

```
┌─────────────────────────────────────────────────────────┐
│                  Simulation Layer                        │
├─────────────────┬───────────────────┬───────────────────┤
│ SimulatorDash   │ ProcessTrialWB    │ HR Sandbox        │
│ 15 actions      │ M0-M12 dry-run   │ Org restructure   │
│ 3 test suites   │ Quality gate sim  │ Headcount plan    │
│ Module integ.   │ Risk scenario     │ Skill matrix sim  │
│ SSE telemetry   │ Approval mock     │ Career path sim   │
├─────────────────┴───────────────────┴───────────────────┤
│                  G-Token Economy                         │
│  L1: 100 tokens/month → L5: 1000 tokens/month          │
│  Task cost: 1-50 tokens based on complexity (1-5)       │
│  Refund on task failure, bonus on efficiency              │
└─────────────────────────────────────────────────────────┘
```

---

## Part 2: Intelligent KPI Framework

### 2.1 Sales DA KPIs

| KPI | Formula | Source Table(s) | Threshold | Alert Rule |
|-----|---------|----------------|-----------|-----------|
| Lead Conversion Rate | `won_leads / total_leads * 100` | `leads` (status=won vs total) | >15% green, <8% red | Weekly if <8% for 2 weeks |
| Pipeline Velocity | `avg(won_date - created_date)` days | `leads` (status=won) | <30d green, >60d red | Monthly trend alert |
| Quotation Win Rate | `won_quotes / total_quotes * 100` | `crm_opportunities` | >25% green | Quarterly review |
| Customer Response Time | `avg(first_response - inquiry_date)` hours | `customer_tickets` | <4h green, >24h red | Real-time if >24h |
| Visit Plan Completion | `completed_visits / planned_visits * 100` | `crm_activities` | >80% green | Weekly if <60% |

### 2.2 Design DA KPIs

| KPI | Formula | Source Table(s) | Threshold | Alert Rule |
|-----|---------|----------------|-----------|-----------|
| Drawing Release Rate | `released_docs / total_docs * 100` | `plm_documents` (currentStatus) | >70% green | Per-project milestone |
| Design Freeze Rate | `frozen_docs / total_docs * 100` | `plm_documents` (designFreezeApproved) | 100% at M5 | Gate block if <100% |
| Review Turnaround | `avg(reviewed_at - requested_at)` hours | `plm_design_reviews` | <48h green, >96h red | Daily if pending >72h |
| ECO Cycle Time | `avg(eco_close_date - ecr_submit_date)` days | `pdm_eco_workflow` (stepType close) | <14d green, >30d red | Weekly trending |
| Rework Frequency | `avg(total_versions)` per document | `plm_documents` (totalVersions) | <3 green, >5 red | Per-release alert |
| Readiness Score | `passed_checks / 7 * 100` | `pdm_readiness_checks` | 100% at M5 | Gate block if <100% |
| BOM Accuracy | `(1 - deviation_count / total_items) * 100` | `pdm_as_built_deviations` + `bom_items` | >98% green | Per-project alert |

### 2.3 Production DA KPIs

| KPI | Formula | Source Table(s) | Threshold | Alert Rule |
|-----|---------|----------------|-----------|-----------|
| OEE (Overall Equipment Effectiveness) | `availability * performance * quality` | `oee_records` | >85% green, <65% red | Shift-level alert |
| First Pass Yield | `good_units / total_units * 100` | `quality_inspection_records` | >95% green | Daily per-station |
| Cycle Time Variance | `abs(actual - standard) / standard * 100` | `process_step_logs` | <10% green, >25% red | Real-time per step |
| As-Built Deviation Rate | `critical_deviations / total_stations` | `pdm_as_built_deviations` (severity=critical) | 0 critical | Immediate escalation |
| WO Completion Rate | `completed_WOs / planned_WOs * 100` | `work_orders` | >90% green | Weekly if <80% |

### 2.4 Service DA KPIs

| KPI | Formula | Source Table(s) | Threshold | Alert Rule |
|-----|---------|----------------|-----------|-----------|
| Ticket Resolution Time | `avg(resolved_at - created_at)` hours | `customer_tickets` | <48h green, >120h red | Daily if SLA breach |
| Customer Satisfaction | `avg(csat_score)` 1-5 | `customer_feedback` | >4.0 green, <3.0 red | Monthly trend |
| Repeat Issue Rate | `insights with occurrence_count >= 3` | `pdm_field_insights` | <5% green | Auto-ECR if >3 |
| Spare Parts Fill Rate | `in_stock / requested * 100` | `spare_parts` + `spare_part_consumption_logs` | >90% green | Auto-reorder if <70% |
| Warranty Cost Ratio | `warranty_cost / revenue * 100` | `warranty_claims` | <3% green | Quarterly review |

### 2.5 Project DA KPIs

| KPI | Formula | Source Table(s) | Threshold | Alert Rule |
|-----|---------|----------------|-----------|-----------|
| Milestone On-Time Rate | `on_time_milestones / total_milestones * 100` | `project_milestones` | >85% green | Gate review if <70% |
| Gate Pass Rate | `passed_gates / attempted_gates * 100` | `project_gates` (status=passed) | >80% green | Escalate if <60% |
| Resource Utilization | `allocated_hours / available_hours * 100` | `resource_allocations` | 70-90% green | Alert if >100% |
| Budget Variance | `(actual - planned) / planned * 100` | `project_budgets` | <5% green, >15% red | Monthly if >10% |
| Risk Mitigation Rate | `mitigated_risks / total_risks * 100` | `project_risks` | >80% green | Weekly if <60% |

### 2.6 Management DA KPIs

| KPI | Formula | Source Table(s) | Threshold | Alert Rule |
|-----|---------|----------------|-----------|-----------|
| Revenue per Employee | `total_revenue / headcount` | `bu_financials` + `employees` | Year-over-year growth | Quarterly |
| Project Portfolio Health | `green_projects / total_projects * 100` | `projects` (derived from KPIs) | >75% green | Monthly review |
| Cross-BU Collaboration | `cross_bu_projects / total_projects * 100` | `projects` (multi-BU flag) | >20% target | Quarterly |
| Innovation Index | `new_products / total_products * 100` | `pdm_products` (lifecycle=concept+design) | >15% target | Annual |
| Employee Engagement | `avg(engagement_score)` | `employee_surveys` | >4.0 green | Annual survey |

---

## Part 3: Process Simulation & Bug Findings

### 3.1 End-to-End Process Simulation Results

#### Simulation A: Sales→Delivery Full Lifecycle (Happy Path)

```
Step 1: Sales DA creates lead           → trpc.crm.createLead ✅
Step 2: Lead qualified, create project   → trpc.project.create ✅
Step 3: PM sets up stage gates           → trpc.projectGate.createGate ✅
Step 4: Design creates drawings          → trpc.plm.createDocument ✅
Step 5: Upload version                   → trpc.plm.uploadVersion ✅
Step 6: Submit for review                → trpc.plm.submitReview ✅
Step 7: Approve review                   → trpc.plm.recordDecision ✅
Step 8: Create PDM baseline              → trpc.pdm.baseline.create ✅
Step 9: Run readiness checks             → trpc.pdm.readiness.runChecks ✅
Step 10: Production work order           → trpc.production.createWorkOrder ✅
Step 11: Process step execution          → trpc.processSteps.recordStep ✅
Step 12: Record as-built deviation       → trpc.pdm.asBuilt.create ✅
Step 13: FAT coordination               → trpc.fatSat.createTest ✅
Step 14: Service ticket                  → trpc.customerTicket.create ✅
Step 15: Field insight → ECR             → trpc.pdm.fieldInsight.createEcoFromInsight ✅
Step 16: ECO approval → change cascade   → trpc.pdm.eco.approveEco → changeEvent ✅
```

**Result: 16/16 steps trace successfully through router → service → DB**

#### Simulation B: Error Paths & Edge Cases

| Test Case | Expected | Actual | Status |
|-----------|----------|--------|--------|
| Create lead without BU context | 403 BU required | ✅ Blocked by gateway-bu-context | PASS |
| Upload version to non-existent doc | FK error | ✅ assertDocumentExists throws | PASS |
| Approve ECO without permission | 403 Forbidden | ✅ requirePermission blocks | PASS |
| Submit review to self | Allow (no self-review check) | ⚠️ Allowed | **GAP** |
| Create baseline with missing BOM | Partial snapshot | ✅ Captures available data only | PASS |
| Readiness check with zero BOM items | Fail check | ✅ bom_approved → failed | PASS |
| Delete released document | Should block | ⚠️ No delete procedure exists | **GAP** |
| Concurrent version upload | Race condition | ⚠️ No optimistic lock | **GAP** |

### 3.2 Consolidated Bug Findings

#### CRITICAL (Must Fix Before Launch)

| # | Category | Description | Impact | Files |
|---|----------|-------------|--------|-------|
| C1 | Type Safety | 1,170 `as any` assertions across 200+ client pages | Silent runtime failures on API contract changes | All pages |
| C2 | i18n Coverage | 100+ hardcoded Chinese strings in 20+ production pages | Non-Chinese users blocked | AdminDashboard, Home, CostStandards, BomExcelImport, etc. |

#### HIGH (Should Fix Before Launch)

| # | Category | Description | Impact | Files |
|---|----------|-------------|--------|-------|
| H1 | Console Logging | 22 console.* statements in 9 production pages | Data leak in DevTools | AIAssistantHub, DeadlockMonitor, DigitalCloudHall, etc. |
| H2 | Stub Pages | 13 pages are stubs ("Coming soon" / <20 lines) | User sees empty pages | NDAManagement, SalesMaterialsLibrary, SmartMeeting, etc. |
| H3 | Error Boundaries | 40+ complex pages without ErrorBoundary | Single error crashes entire page | CeoExecutiveCockpit, SalaryReport, SupervisorWorkbench, etc. |
| H4 | Self-Review | PLM allows reviewer = document owner | Audit compliance gap | plm.router.ts submitReview |
| H5 | No Document Delete | No way to obsolete/delete PLM documents via API | Data lifecycle gap | plm.router.ts |
| H6 | Dead Import | `sopRouter` imported but not registered | Dead code | server/routers.ts:181 |

#### MEDIUM (Fix in First Iteration)

| # | Category | Description | Impact | Files |
|---|----------|-------------|--------|-------|
| M1 | Loading States | 10+ dashboards missing loading/error UI | Users see blank or stale data | CeoExecutiveCockpit, SalaryReport, etc. |
| M2 | Optimistic Lock | No version conflict detection on concurrent PLM uploads | Data loss in concurrent editing | plm.service.ts |
| M3 | i18n Domains | 6 domain modules need content (marketing, workspace, etc.) | Incomplete translation coverage | client/src/lib/i18n/ |

#### LOW (Post-Launch Backlog)

| # | Category | Description | Impact | Files |
|---|----------|-------------|--------|-------|
| L1 | LazyFallback | Hardcoded "加载中..." in lazy loading spinner | Minor i18n gap | App.tsx |
| L2 | TODO Comments | 2 TODO markers in employee/user-profile routers | Documentation only | server/routers/ |

---

## Part 4: Phased Optimization Plan

### Phase 0 (P0): Launch Blockers — Before Go-Live (Days 1-3)

| Task | Effort | Priority | Description |
|------|--------|----------|-------------|
| P0-1: Remove 22 console.* | 1h | CRITICAL | Replace with error boundaries or remove in 9 files |
| P0-2: Remove dead sopRouter import | 5min | HIGH | Delete line 181 from server/routers.ts |
| P0-3: Add self-review guard | 30min | HIGH | Block reviewer === owner in plm.submitReview |
| P0-4: Add ErrorBoundary to top-15 pages | 3h | HIGH | Wrap CeoExecutiveCockpit, SalaryReport, SupervisorWorkbench, etc. |
| P0-5: Complete 6 stub pages | 4h | HIGH | NDAManagement, SalesMaterialsLibrary, SmartMeeting minimum viable |
| P0-6: Add loading states to dashboards | 2h | MEDIUM | CeoExecutiveCockpit, SalaryReport, BuManagerCockpit |

### Phase 1 (P1): Type Safety Sprint — Week 1

| Task | Effort | Priority | Description |
|------|--------|----------|-------------|
| P1-1: Create `@/types/api.ts` | 4h | CRITICAL | Define strict TypeScript types for all 86 routers' responses |
| P1-2: Fix top-30 `as any` pages | 8h | CRITICAL | Eliminate as-any from most-used pages (workbenches, dashboards) |
| P1-3: Enable `strict: true` in tsconfig | 2h | HIGH | Incremental strict mode with targeted suppressions |
| P1-4: tRPC client type generation | 2h | HIGH | Auto-generate client types from router definitions |

### Phase 2 (P2): i18n Completion — Week 2

| Task | Effort | Priority | Description |
|------|--------|----------|-------------|
| P2-1: AdminDashboard i18n | 2h | HIGH | Move 30+ hardcoded strings to admin.ts |
| P2-2: BomExcelImport i18n | 1h | HIGH | Move field labels to manufacturing.ts |
| P2-3: CostStandards i18n | 1h | MEDIUM | Move 59+ labels to finance.ts |
| P2-4: Complete 6 empty domain modules | 4h | MEDIUM | marketing, workspace, ido, document-governance, meeting-intelligence, robot-cleaning |
| P2-5: LazyFallback i18n | 15min | LOW | Use t("common.loading") |

### Phase 3 (P3): Process Integrity — Week 3

| Task | Effort | Priority | Description |
|------|--------|----------|-------------|
| P3-1: PLM document obsolete procedure | 2h | HIGH | Add updateDocument status=obsolete with permission guard |
| P3-2: Optimistic locking for PLM | 3h | MEDIUM | Add version check on concurrent upload (compare latest version ID) |
| P3-3: KPI dashboard auto-computation | 6h | MEDIUM | Implement getAgentKPIs procedure computing formulas from Part 2 |
| P3-4: Digital agent sandbox dry-run | 4h | MEDIUM | Add processSimulation.runScenario with 16-step happy path test |
| P3-5: G-Token economy activation | 2h | LOW | Seed initial token allocations per agent level |

### Phase 4 (P4): Architecture Quality — Week 4

| Task | Effort | Priority | Description |
|------|--------|----------|-------------|
| P4-1: Reduce `as any` to <200 | 12h | HIGH | Systematic type-fixing across remaining 170+ pages |
| P4-2: Add integration test suite | 8h | MEDIUM | End-to-end M0→M12 test scenario in Vitest |
| P4-3: Performance profiling | 4h | MEDIUM | Identify slow queries (>500ms), add DB indexes |
| P4-4: Security re-audit | 2h | MEDIUM | Verify all new routers since Round 7 have RBAC |
| P4-5: Documentation generation | 4h | LOW | Auto-generate API docs from router manifest |

---

## Part 5: System Health Scorecard

| Dimension | Current | Target (Post-P0) | Target (Post-P4) |
|-----------|---------|-------------------|-------------------|
| Security | 10/10 | 10/10 | 10/10 |
| Auth/RBAC | 10/10 | 10/10 | 10/10 |
| Tests | 10/10 (12,897 tests) | 10/10 | 10/10 (+ integration) |
| Type Safety | 6/10 (1,170 `as any`) | 6/10 | 9/10 (<200 `as any`) |
| i18n Coverage | 7/10 | 7/10 | 9/10 |
| Error Handling | 5/10 | 8/10 | 9/10 |
| Mock Data | 10/10 | 10/10 | 10/10 |
| Observability | 10/10 (pino) | 10/10 | 10/10 |
| Query Safety | 10/10 | 10/10 | 10/10 |
| Process Integrity | 7/10 | 8/10 | 9/10 |
| **Overall** | **8.5/10** | **8.9/10** | **9.6/10** |

---

## Part 6: Agent KPI Dashboard Specification

### Dashboard Layout (for Management DA)

```
┌──────────────────────────────────────────────────────────┐
│  GRT Digital Agent KPI Dashboard                         │
├─────────┬──────────┬──────────┬──────────┬──────────────┤
│ Sales   │ Design   │ Produc.  │ Service  │ Project      │
│ DA      │ DA       │ DA       │ DA       │ DA           │
├─────────┼──────────┼──────────┼──────────┼──────────────┤
│ Conv 18%│ Freeze87%│ OEE 82% │ SLA 94% │ On-time 88%  │
│ Vel 24d │ Rev 36h  │ FPY 96% │ CSAT 4.2│ Budget +3%   │
│ Win 28% │ ECO 11d  │ CT ±8%  │ Repeat 4%│ Gate 85%     │
│ Resp 3h │ Rework 2 │ Dev 0cr │ Fill 91%│ Risk 82%     │
│ Visit82%│ BOM 99%  │ WO 93%  │ Warr 2% │ Util 78%     │
├─────────┴──────────┴──────────┴──────────┴──────────────┤
│  Trend: ▁▂▃▅▆▇ (6-month rolling)                       │
│  Alerts: 3 yellow, 0 red                                │
│  Next Review: M5 Gate — Project P-2026-003 (Mar 15)     │
└──────────────────────────────────────────────────────────┘
```

### Data Sources for Auto-Computation

| KPI Category | Primary Tables | Aggregation |
|-------------|---------------|-------------|
| Sales KPIs | leads, crm_opportunities, crm_activities | Per-BU per-month |
| Design KPIs | plm_documents, plm_design_reviews, pdm_eco_workflow, pdm_readiness_checks | Per-project |
| Production KPIs | oee_records, quality_inspections, process_step_logs, pdm_as_built_deviations | Per-station per-shift |
| Service KPIs | customer_tickets, pdm_field_insights, spare_parts | Per-product per-quarter |
| Project KPIs | project_milestones, project_gates, resource_allocations | Per-project per-gate |

---

## Appendix A: Router Inventory by Agent

### Sales DA Routers (10)
`crm`, `leadAnalytics`, `leadAutoFollow`, `leadImport`, `aiSales`, `aiSalesEnhanced`,
`campaign`, `buSalesTarget`, `socialPlatformConfig`, `customerAuthorization`

### Design DA Routers (14)
`plm`, `pdm`, `rndNpi`, `bom`, `bomExcelImport`, `bomImport`, `bomVerification`,
`designEngine`, `fmea`, `fmeaDynamic`, `controlPlan`, `changeEvent`,
`digitalThread`, `rdVerification`

### Production DA Routers (12)
`production`, `productionAdvanced`, `productionExecution`, `processSteps`,
`processManagement`, `mes`, `oeeDashboard`, `smartInventory`,
`smartProductionScheduling`, `qualityInterlock`, `qualityAdvanced`, `scheduling`

### Service DA Routers (8)
`afterSales`, `customerTicket`, `customerRepair`, `delivery`,
`serviceDashboard`, `fieldService`, `certification`, `globalServiceDashboard`

### Project DA Routers (10)
`project`, `projectGate`, `project360`, `aiPlanning`, `planningDependency`,
`stageGate`, `taskBoard`, `taskCockpit`, `devTasks`, `rdVerification`

### Management DA Routers (8)
`analytics`, `okr`, `governance`, `operationsDashboard`, `visionDashboard`,
`bu`, `buSalesTarget`, `ceoDashboard`
