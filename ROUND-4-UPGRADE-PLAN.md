# GRT System — Chief Architect Operational Profile & Round-4 Upgrade Plan

> **Author**: Chief Architecture Engineer
> **Date**: 2026-03-02
> **System Version**: v2.5.x (post Round-3 hardening)
> **Build Status**: GREEN (0 TS errors, 12,111 tests passing, Vite build 29.8s)

---

## Part I: System Operational Profile

### 1.1 System Scale

| Metric | Value |
|--------|-------|
| Total source files (.ts + .tsx) | 6,316 |
| Server TypeScript files | 3,507 |
| React component files (.tsx) | 1,985 |
| Test files (.test.ts) | 824 |
| tRPC router files | 147 |
| Page components | 376 |
| Drizzle schema files | 49 |
| SQL migration files | 23 |
| Runtime dependencies | 92 |
| Dev dependencies | 33 |
| Total tests | 12,111 |
| Test files | 327 |

### 1.2 Architecture Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 7 + TypeScript |
| Routing | Wouter (SPA, eager imports) |
| UI Framework | shadcn/ui + Tailwind CSS + Lucide |
| API Layer | tRPC v11 (end-to-end type safety) |
| Backend | Express + Node.js |
| ORM | Drizzle ORM (parameterized SQL) |
| Database | PostgreSQL / TiDB |
| Auth | JWT (OAuth + local-auth) |
| i18n | Domain-split modules (zh/en/de/fr) |
| Testing | Vitest (100% router coverage) |
| Security | Helmet + CORS + Gateway audit middleware |

### 1.3 Hardening History (3 Rounds Completed)

| Round | Date | Scope | Commits |
|-------|------|-------|---------|
| Round 1 | 2026-02-28 | Code freeze audit — 15 risk items (P0-P2): secrets, limits, console, JWT | `6de0dd3` |
| Round 2 | 2026-03-01 | 5-batch: JWT guard, DOMPurify, path traversal, memory leaks, N+1, X-Request-ID, manualChunks | `a8702ca` → `c5214d9` |
| Round 3 | 2026-03-02 | 5-batch: SQL injection (70 vectors), Helmet/CORS, .limit(1000), jsonValue, transactions | `859b5ae` → `7dd3c33` |

**Cumulative security posture:**
- SQL injection: **Eliminated** (0 `sql.raw` with interpolation in DML; 1 DDL with allowlist guard)
- XSS: DOMPurify on user HTML
- HTTP headers: Helmet (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
- CORS: Whitelist-only origin validation
- Cookie: `secure` + `sameSite` correct per environment
- Input validation: `jsonValue` replacing `z.any()`/`z.unknown()` at API boundaries
- Unbounded queries: `.limit(1000)` safety cap on all multi-row SELECTs
- Transactions: Critical multi-step mutations wrapped
- Memory leaks: Interval/listener cleanup in services
- N+1 queries: Batch loading patterns
- Path traversal: Basename validation on file operations

### 1.4 Current Health Scorecard

| Category | Score | Detail |
|----------|-------|--------|
| **Type Safety** | 6/10 | 0 TS errors but 2,403 `as any` in server/ |
| **Security** | 9/10 | 3 rounds hardened; 1 hardcoded credential to rotate |
| **Test Coverage** | 10/10 | 327 files, 12,111 tests, 100% router coverage |
| **Code Organization** | 4/10 | 3 monolith files >8K lines each |
| **Observability** | 3/10 | 1,036 unstructured console.* calls |
| **i18n Completeness** | 60% | Core done; 6+ domain modules awaiting content |
| **API Consistency** | 7/10 | 110 `z.any()`/`z.unknown()` remain; no pagination standard |
| **Build Performance** | 8/10 | 29.8s with manualChunks; chunk size warning |
| **Dependency Hygiene** | 8/10 | 92 runtime deps, no known vulnerabilities |
| **Circular Dependencies** | 10/10 | None detected |

---

## Part II: Self-Inspection Findings (Round-4 Input)

### 2.1 P0 — Credential Exposure (CRITICAL)

| # | Finding | File | Line |
|---|---------|------|------|
| F1 | **Hardcoded DingTalk webhook access_token** (live credential in VCS) | `server/multi-channel-webhook.ts` | 337 |
| F2 | **Hardcoded DingTalk HMAC signing secret** (live credential in VCS) | `server/multi-channel-webhook.ts` | 338 |
| F3 | **Fallback sync secret key** `'grt-sync-default-key'` (forgeable HMAC) | `server/sync/DataSyncSchema.ts` | 186 |

### 2.2 P0 — Monolith Files (Maintainability Crisis)

| File | Lines | Problem |
|------|-------|---------|
| `drizzle/schema.ts` | 12,301 | Single file with ALL core tables; 100+ import consumers |
| `server/ime/ime.service.ts` | 12,143 | 343 sql.raw calls, 336 `as any`; untestable monolith |
| `server/db.ts` | 8,220 | 72 `as any`; mixed concerns (queries + business logic) |
| `client/src/App.tsx` | 1,801 | 376 eager route imports; no code splitting |

### 2.3 P1 — Type Safety Debt

| Metric | Count | Concentration |
|--------|-------|---------------|
| `as any` in server/ | 2,403 | ime.service.ts (336), processSteps.service.ts (60), permission.service.ts (36) |
| `as any` in client/src/ | ~1,226 | Spread across 270 files |
| `z.any()` / `z.unknown()` remaining | 110 | campaign, ai-assistant, analytics, cicd routers |
| `@ts-ignore` / `@ts-nocheck` | 4 | 2 files (documented) |

### 2.4 P1 — Observability Gap

| Metric | Count |
|--------|-------|
| `console.log` in server/ (non-test) | ~640 |
| `console.error` in server/ (non-test) | ~250 |
| `console.warn` in server/ (non-test) | ~146 |
| **Total unstructured logging** | **1,036** |

No structured logger (Pino/Winston). No log levels. No correlation IDs in log output. No log aggregation integration.

### 2.5 P1 — Incomplete Implementations

| Area | Count | Detail |
|------|-------|--------|
| TODO comments in server/ | 91 | POS router (15), changeManagement (14), capability-evidence (8), stage-gate-auto-advance (5) |
| Stub routers (in-memory, no DB) | ~4 | capability-evidence, parts of POS |
| Stub pages (mock data) | ~4 | Compensation, DeptPerformance, SalesAnalytics, TeamPerformance |
| i18n empty domain modules | 6 | manufacturing, quality, rnd, supply-chain, after-sales, ai |

### 2.6 P2 — Build & Bundle

| Issue | Detail |
|-------|--------|
| Chunk size warning | Several chunks >500KB after minification |
| No code splitting | App.tsx eager-imports all 376 pages |
| No lazy loading | Every route loaded at startup |
| Mermaid.js in main bundle | Heavy library not dynamically imported |

### 2.7 P2 — Schema & API Design

| Issue | Detail |
|-------|--------|
| `roleEnum3` DB mismatch | DB has 'user'\|'admin'; app manages 18 roles separately |
| Missing `bu_department_mappings` table | Referenced in service but not in schema |
| No API pagination standard | 423 `.limit(1000)` — safe but not user-facing paginated |
| CSP policy disabled | Helmet CSP off for SPA flexibility |

---

## Part III: Round-4 Upgrade Plan — 6 Batches

> **Codename**: "Structural Integrity"
> **Focus**: Credential rotation → Code splitting → Monolith decomposition → Structured logging → Type safety reduction
> **Principle**: Security first, then performance, then maintainability
> **Estimated scope**: ~80 files, 6 independent batches

---

### Batch 1: Credential Rotation & Secret Hygiene (P0) — 3 files

**Goal**: Zero hardcoded secrets in VCS.

#### 1A. `server/multi-channel-webhook.ts` — Extract DingTalk credentials

```typescript
// BEFORE (L337-338):
webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=8d003ada...',
secret: 'SEC179f421...',

// AFTER:
webhookUrl: process.env.DINGTALK_WEBHOOK_URL || '',
secret: process.env.DINGTALK_WEBHOOK_SECRET || '',
```

Add to `.env.example`:
```
DINGTALK_WEBHOOK_URL=
DINGTALK_WEBHOOK_SECRET=
```

Add runtime guard — if either is empty, skip DingTalk channel (don't crash, don't silently use empty token).

#### 1B. `server/sync/DataSyncSchema.ts` — Remove fallback secret

```typescript
// BEFORE (L186):
this.secretKey = secretKey || process.env.SYNC_SECRET_KEY || 'grt-sync-default-key';

// AFTER:
this.secretKey = secretKey || process.env.SYNC_SECRET_KEY || '';
// + guard: if (!this.secretKey) throw new Error('SYNC_SECRET_KEY is required');
```

#### 1C. Full-repo secret scan

```bash
grep -rn "password\s*[:=]\s*['\"]" server/ --include="*.ts" | grep -v test | grep -v node_modules
grep -rn "secret\s*[:=]\s*['\"][A-Za-z0-9]" server/ --include="*.ts" | grep -v test | grep -v node_modules
grep -rn "apiKey\s*[:=]\s*['\"]" server/ --include="*.ts" | grep -v test | grep -v node_modules
```

Review and extract any additional findings to env vars.

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

### Batch 2: Route-Level Code Splitting (P1) — 3 files

**Goal**: Reduce initial bundle from ~4MB to <1MB via lazy loading.

#### 2A. `client/src/App.tsx` — Convert 376 eager imports to lazy

```typescript
// BEFORE:
import Home from "./pages/Home";
import ProjectManagement from "./pages/ProjectManagement";
// ... 374 more

// AFTER:
import { lazy, Suspense } from "react";
const Home = lazy(() => import("./pages/Home"));
const ProjectManagement = lazy(() => import("./pages/ProjectManagement"));
// ... 374 more

// Wrap routes:
<Suspense fallback={<PageSkeleton />}>
  <Route path="/"><ProtectedRoute component={Home} /></Route>
</Suspense>
```

Strategy:
- Keep top-5 most-visited pages eager (Home, Login, Layout shell)
- Lazy-load all others with `React.lazy()` + `Suspense`
- Create a simple `<PageSkeleton />` loading fallback (shadcn Skeleton)

#### 2B. `vite.config.ts` — Optimize chunk strategy

- Add `build.rollupOptions.output.manualChunks` for vendor splitting:
  - `vendor-react`: react, react-dom, wouter
  - `vendor-ui`: @radix-ui/*, tailwind-merge, lucide-react
  - `vendor-charts`: recharts, three
  - `vendor-trpc`: @trpc/*, @tanstack/react-query
  - `vendor-heavy`: mermaid, katex, exceljs, pdfkit (dynamic import only)

#### 2C. Heavy library dynamic imports

- Mermaid.js: `const Mermaid = lazy(() => import("..."))` — only load on pages that use it
- KaTeX: Same pattern
- ExcelJS/PDFKit: Already server-side, ensure not bundled in client

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build` — check chunk sizes reduced

---

### Batch 3: Structured Logging Foundation (P1) — ~15 files

**Goal**: Replace top-50 highest-traffic `console.*` with structured logger; establish pattern for gradual migration.

#### 3A. Install & configure Pino

```bash
pnpm add pino pino-pretty
```

Create `server/lib/logger.ts`:
```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});

export function createChildLogger(module: string) {
  return logger.child({ module });
}
```

#### 3B. Migrate core infrastructure files first (~15 files)

Priority files (highest console.* concentration in critical path):
| File | console.* count | Action |
|------|----------------|--------|
| `server/_core/index.ts` | 15 | Replace all |
| `server/db.ts` | 32 | Replace all |
| `server/_core/local-auth.ts` | 6 | Replace all |
| `server/_core/oauth.ts` | 1 | Replace |
| `server/_core/sdk.ts` | 7 | Replace all |
| `server/_core/gateway-audit.middleware.ts` | 4 | Replace all |
| `server/cache-manager.ts` | 9 | Replace all |
| `server/cache.ts` | 7 | Replace all |
| `server/scheduler.ts` | 10 | Replace all |
| `server/index.ts` | 2 | Replace |
| `server/security/auditLog.ts` | 4 | Replace |
| `server/audit/audit-logger.ts` | 2 | Replace |
| `server/notification-service.ts` | 4 | Replace |
| `server/queue/message-queue.ts` | 3 | Replace |
| `server/lib/mailer.ts` | 1 | Replace |

Pattern:
```typescript
// BEFORE:
console.log("[AUTH] User logged in:", userId);
console.error("[DB] Query failed:", error);

// AFTER:
import { createChildLogger } from "../lib/logger";
const log = createChildLogger("auth");
log.info({ userId }, "User logged in");
log.error({ err: error }, "Query failed");
```

Remaining ~985 console.* calls are left for gradual migration (not in this round).

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

### Batch 4: IME Service Decomposition (P1) — ~10 files created/modified

**Goal**: Break `server/ime/ime.service.ts` (12,143 lines) into domain-coherent modules.

#### Decomposition Map

| New Module | Functions Extracted | Est. Lines |
|------------|-------------------|------------|
| `server/ime/ime-contribution.service.ts` | getContributionDashboard, getEmployeeTrend, computeDepartmentRollup, getDepartmentComparison | ~800 |
| `server/ime/ime-analysis.service.ts` | analyzeSpeakerEngagement, auditMeetingCompliance, assessMeetingHealth | ~1,200 |
| `server/ime/ime-knowledge.service.ts` | extractKnowledgeGraph, buildExpertProfile, generateRetrospective | ~1,000 |
| `server/ime/ime-reporting.service.ts` | getMeetingFullReport, generateMeetingBrief, generateMeetingMinutes, getMeetingTimeline | ~1,200 |
| `server/ime/ime-management.service.ts` | getManagementDashboard, generateHRActions | ~800 |
| `server/ime/ime-linkage.service.ts` | updateLinkageRule and related linkage functions | ~600 |
| `server/ime/ime-shared.ts` | Shared types, helper functions, common SQL fragments | ~300 |
| `server/ime/ime.service.ts` (remaining) | Re-export barrel + any unsplit functions | ~2,000 |

#### Strategy

1. Create `server/ime/ime-shared.ts` with shared types and helpers
2. Extract each module with its functions, keeping the same function signatures
3. Update `ime.service.ts` to re-export all functions from sub-modules (backward compatible)
4. Update `ime.router.ts` imports if needed
5. No behavior change — pure structural refactor

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

### Batch 5: `as any` Reduction — Top 100 (P1) — ~8 files

**Goal**: Eliminate the 100 densest `as any` occurrences with proper typing.

#### Target files (highest concentration):

| File | `as any` count | Strategy |
|------|---------------|----------|
| `server/ime/ime.service.ts` | 336 | Type the `db.execute()` return values with generics |
| `server/db.ts` | 72 | Type function return values properly |
| `server/production-steps/processSteps.service.ts` | 60 | Type process step records |
| `server/production-steps/qualityMaterialPerformance.service.ts` | 53 | Type quality records |
| `server/meeting-intelligence/meeting-task-loop.service.ts` | 38 | Type meeting task records |
| `server/permission-management/permission.service.ts` | 36 | Type permission objects |
| `server/modules/socialCommunity.router.ts` | 38 | Type social community records |
| `server/modules/stageGate.router.ts` | 37 | Type stage gate records |

#### Common patterns to fix:

```typescript
// Pattern A: db.execute() result typing
// BEFORE:
const result = await db.execute(sql`SELECT ...`) as any;
const rows = result.rows;

// AFTER:
const result = await db.execute<{ id: number; name: string }>(sql`SELECT ...`);
const rows = result.rows;

// Pattern B: Drizzle select result
// BEFORE:
const items = await db.select().from(table).where(...);
const name = (items[0] as any).name;

// AFTER:
const items = await db.select().from(table).where(...);
const name = items[0].name;  // Drizzle already infers the type

// Pattern C: JSON field access
// BEFORE:
const config = row.jsonField as any;
config.someKey;

// AFTER:
interface MyConfig { someKey: string; ... }
const config = row.jsonField as MyConfig;
config.someKey;
```

Focus: eliminate the top 100 most egregious `as any` (those hiding real type errors), not all 2,403.

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

### Batch 6: Remaining Input Validators + CSP Tightening (P1/P2) — ~12 files

#### 6A. Remaining `z.any()`/`z.unknown()` — 110 → <30

Target the remaining 110 occurrences across:
- `server/routers/campaign.router.ts`
- `server/ai-assistants/ai-assistant.router.ts`
- `server/routers/analytics.router.ts`
- `server/routers/annual-planning.router.ts`
- `server/routers/cicd.router.ts`
- Other scattered files

Same pattern as Round-3 Batch-4:
```typescript
import { jsonValue } from "@shared/validators";
// z.any() → jsonValue
// z.unknown() → jsonValue
// z.record(z.string(), z.any()) → z.record(z.string(), jsonValue)
```

#### 6B. CSP Policy — Tighten Helmet config

```typescript
// BEFORE:
app.use(helmet({ contentSecurityPolicy: false, ... }));

// AFTER:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // tRPC needs inline for some transforms
      styleSrc: ["'self'", "'unsafe-inline'"],    // Tailwind inline styles
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "wss:", "https://api.openai.com", "https://generativelanguage.googleapis.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'", "*.manus.computer", "*.manuscomputer.ai"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

#### 6C. DB Schema alignment

- Create `bu_department_mappings` table in drizzle schema (referenced in service but missing)
- Add migration script

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Part IV: Out of Scope (Deferred to Round 5+)

| Item | Reason | Estimated Effort |
|------|--------|------------------|
| `drizzle/schema.ts` split (12K lines) | 100+ consumer files; needs tooling for re-export barrel | 2-3 days |
| `server/db.ts` decomposition (8K lines) | Mixed queries + business logic; needs domain separation | 2-3 days |
| `tsconfig strict: true` | 707+ cascading type errors | 1 week |
| Full `as any` elimination (2,403 remaining after batch 5) | Requires strict mode | Ongoing |
| Full `console.*` migration (985 remaining after batch 3) | Mechanical but low-risk | 2-3 days |
| API pagination standard | Breaking change; needs versioned API | 1 week |
| TODO/stub completion (91 TODOs) | Feature work, not hardening | Ongoing |
| i18n domain modules (6 empty) | Content translation work | 3-5 days |
| ESLint + Prettier integration | DX improvement | 1 day |

---

## Part V: Execution Summary

| Batch | Priority | Scope | Files | Key Deliverable |
|-------|----------|-------|-------|-----------------|
| 1 | **P0** | Credential rotation | 3 | Zero secrets in VCS |
| 2 | **P1** | Route code splitting | 3 | Initial bundle <1MB |
| 3 | **P1** | Structured logging | 15 | Pino logger + 50 top call sites |
| 4 | **P1** | IME decomposition | 10 | 12K→6×2K module files |
| 5 | **P1** | `as any` reduction | 8 | Top 100 eliminated |
| 6 | **P1/P2** | Validators + CSP | 12 | 110→<30 z.any(); CSP enabled |

**Total**: ~51 files, 6 independent batches
**Verification per batch**: `npx tsc --noEmit && npx vitest run && npx vite build`
**Each batch independently committable and reversible**

---

## Appendix: Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│                  GRT System Health — 2026-03-02          │
├──────────────────┬──────────┬────────────────────────────┤
│ Metric           │ Current  │ Target (Post Round-4)      │
├──────────────────┼──────────┼────────────────────────────┤
│ TS errors        │ 0        │ 0                          │
│ Tests passing    │ 12,111   │ 12,111+                    │
│ Test files       │ 327      │ 327+                       │
│ sql.raw (unsafe) │ 0        │ 0                          │
│ Hardcoded secrets│ 3        │ 0 ← Batch 1               │
│ as any (server)  │ 2,403    │ ~2,300 ← Batch 5           │
│ console.* (prod) │ 1,036    │ ~985 ← Batch 3             │
│ z.any/z.unknown  │ 110      │ <30 ← Batch 6              │
│ Monolith >8K LOC │ 3        │ 2 ← Batch 4                │
│ Initial bundle   │ ~4MB     │ <1MB ← Batch 2             │
│ CSP policy       │ disabled │ enabled ← Batch 6          │
│ Build time       │ 29.8s    │ <25s ← Batch 2             │
│ @ts-ignore       │ 4        │ 4 (documented)             │
│ Circular deps    │ 0        │ 0                          │
│ TODO comments    │ 91       │ 91 (deferred)              │
└──────────────────┴──────────┴────────────────────────────┘
```
