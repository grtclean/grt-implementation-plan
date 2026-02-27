# GRT System — 4-Phase Master Release Plan

> Approved by: CEO + Architecture Board
> Date: 2026-02-25
> Basis: 4M1E Deep Improvement Analysis + CTO Architectural Constraints

---

## Architectural Pillars (Enforced on ALL Phases)

| # | Pillar | Rule |
|---|--------|------|
| 1 | **Performance First (Caching)** | Heavy cross-module aggregations MUST use Redis read-through cache. No synchronous multi-table JOINs in hot paths. Key pattern: `{module}:{entityId}:{slice}` TTL=60s. |
| 2 | **Automated QA (Testing)** | Any feature that physically blocks production (SOP binding, equipment scheduling, etc.) MUST ship with Jest/unit tests. Factory floor cannot break. |
| 3 | **Data Border Compliance** | All new queries must respect cross-border desensitization rules. No US/EU PII leaks to China servers. PII filter middleware required. |

## Execution Rule

**Strictly phase-by-phase.** Do NOT build Phase N+1 backend logic if Phase N dependencies are missing.

---

## Phase 0 — Cockpit UI Shell (CURRENT)

**Status: COMPLETE**

| Item | File | Status |
|------|------|--------|
| Backend aggregation router (safeSlice pattern) | `server/routers/project360.router.ts` | Done |
| Router registration | `server/routers.ts` | Done |
| Mock-first frontend (typed interfaces + 3 demo projects) | `client/src/pages/Project360Cockpit.tsx` | Done |
| Route + menu entry | `App.tsx` + `menuConfig.ts` | Done |
| TypeScript clean build | `npx tsc --noEmit` = 0 errors | Done |

**CEO Review URL:** `http://localhost:3000/project-360-cockpit`

---

## Phase 1 — Infrastructure & Interlocks

> Goal: Build the foundation layer that all later phases depend on.

| # | Module | Description | Dependencies | QA Required |
|---|--------|-------------|-------------|-------------|
| 1.1 | **Data Desensitization Gateway** | Middleware that strips/masks PII fields before cross-border API responses. Rule engine: field-level policies per data classification. | None (foundational) | Yes — unit tests for each masking rule |
| 1.2 | **SOP + Role Quality Interlock** | SOP version binding to roles. When a new SOP version is published, affected roles get a mandatory acknowledgment workflow. Blocks production step sign-off until acknowledged. | Existing: `sop_db` tables, `processSteps` router | **Yes — critical path.** Jest tests for: version binding, role resolution, production-blocking logic |
| 1.3 | **OEE Dashboard** | Overall Equipment Effectiveness dashboard. Reads from existing `production_stages` + `project_process_instances`. Display only — no new writes. | Existing: production-process-schema | No (read-only) |
| 1.4 | **Compliance Calendar** | Calendar view of upcoming compliance deadlines (certifications, audits, regulatory). Aggregates from `certification` + `regional_compliance` tables. | Existing: certification module | No (read-only) |

**Entry criteria:** Phase 0 Cockpit UI approved by CEO.
**Exit criteria:** All 4 items deployed. SOP interlock passes Jest suite. Desensitization gateway active on staging.

---

## Phase 2 — Cross-Domain Fusion

> Goal: Connect data across modules to create composite business insights.

| # | Module | Description | Dependencies |
|---|--------|-------------|-------------|
| 2.1 | **Employee Digital Profile** | Unified employee view: skills, certifications, training, performance, assigned projects. Redis-cached aggregation. | Phase 1.1 (desensitization for PII fields) |
| 2.2 | **ECO Cost Impact** | When an Engineering Change Order is approved, auto-calculate downstream cost impact (BOM delta, labor re-estimation). | Phase 1.2 (SOP interlock for approval gates) |
| 2.3 | **Dynamic FMEA** | FMEA items auto-update RPN when linked production data changes (defect rates, occurrence data from QC). | Phase 1.3 (OEE data feeds occurrence metric) |
| 2.4 | **Real-time Supplier Risk** | Supplier risk score derived from delivery performance, QC rejection rates, and compliance status. | Phase 1.4 (compliance calendar feeds certification status) |

**Entry criteria:** Phase 1 fully deployed + Jest green.
**Exit criteria:** All 4 fusion modules deployed with Redis caching. Employee Profile passes PII desensitization audit.

---

## Phase 3 — AI Prediction

> Goal: Use accumulated structured data to build predictive models.

| # | Module | Description | Dependencies |
|---|--------|-------------|-------------|
| 3.1 | **AI Training Closed-Loop** | Training recommendations based on skill gaps detected in Employee Digital Profile. Auto-schedule courses. | Phase 2.1 (Employee Digital Profile) |
| 3.2 | **Equipment Health -> Scheduling Link** | Predictive maintenance triggers auto-rescheduling of production stages when equipment health degrades. | Phase 2.3 (Dynamic FMEA health signals) |
| 3.3 | **Smart Safety Stock** | AI-driven inventory reorder points based on supplier risk scores and production schedule. | Phase 2.4 (Supplier Risk scores) |
| 3.4 | **Carbon Footprint Tracker** | Calculate and predict carbon footprint per project based on material usage, logistics, and energy consumption. | Phase 2.2 (ECO Cost Impact for material tracking) |

**Entry criteria:** Phase 2 fully deployed + Redis cache layer operational.
**Exit criteria:** All 4 AI modules deployed. Equipment scheduling passes Jest suite (production-blocking).

---

## Phase 4 — Ultimate Digital Thread

> Goal: Wire the full Digital Thread end-to-end. The Project 360 Cockpit becomes the live, Redis-cached, CEO-grade command center.

| # | Module | Description | Dependencies |
|---|--------|-------------|-------------|
| 4.1 | **Redis Caching Layer** | Replace all mock data in Project 360 Cockpit with Redis-cached live aggregation. Key: `p360:{projectId}:{slice}` TTL=60s. Invalidation via Drizzle hooks. | Phase 1-3 all complete (all data sources exist) |
| 4.2 | **Project 360 Cockpit (Live)** | Upgrade Phase 0 cockpit from mock-first to live-first. Remove mock fallbacks. Add real-time health scoring. | Phase 4.1 (Redis layer) |
| 4.3 | **Impact Chain Visualization** | Visual graph showing how an ECO cascades through BOM -> Cost -> Production -> Quality -> Acceptance. Interactive node-link diagram. | Phase 2.2 + 2.3 (ECO impact + Dynamic FMEA) |
| 4.4 | **AI Automated Reports** | Weekly auto-generated executive summary per project. PDF export. Uses all Digital Thread data. | Phase 3 AI models + Phase 4.2 (live cockpit data) |

**Entry criteria:** Phases 1-3 fully deployed, all Jest suites green.
**Exit criteria:** CEO can open `/project-360-cockpit`, select any project, and see fully live data across all 6 slices with <2s load time.

---

## Dependency Graph

```
Phase 0 (Cockpit UI Shell) ──── DONE
    │
    ▼
Phase 1 (Infrastructure)
    ├── 1.1 Desensitization Gateway ─────────────┐
    ├── 1.2 SOP+Role Interlock [JEST] ──────┐    │
    ├── 1.3 OEE Dashboard ─────────────┐    │    │
    └── 1.4 Compliance Calendar ───┐    │    │    │
                                   │    │    │    │
                                   ▼    ▼    ▼    ▼
Phase 2 (Cross-Domain Fusion)
    ├── 2.1 Employee Digital Profile (←1.1)
    ├── 2.2 ECO Cost Impact (←1.2)
    ├── 2.3 Dynamic FMEA (←1.3)
    └── 2.4 Supplier Risk (←1.4)
                    │
                    ▼
Phase 3 (AI Prediction)
    ├── 3.1 Training Closed-Loop (←2.1)
    ├── 3.2 Equipment Health→Scheduling [JEST] (←2.3)
    ├── 3.3 Smart Safety Stock (←2.4)
    └── 3.4 Carbon Footprint (←2.2)
                    │
                    ▼
Phase 4 (Ultimate Digital Thread)
    ├── 4.1 Redis Caching Layer
    ├── 4.2 Project 360 Cockpit (Live)
    ├── 4.3 Impact Chain Visualization
    └── 4.4 AI Automated Reports
```

---

## Version History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-25 | Architecture Board | Initial 4-Phase plan approved |
