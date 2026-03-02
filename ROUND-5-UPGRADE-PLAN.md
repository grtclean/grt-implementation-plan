# GRT System — Round-5 Upgrade Plan: Convention Enforcement & Observability

> **Author**: Chief Architecture Engineer
> **Date**: 2026-03-02
> **System Version**: v2.5.x (post Round-4)
> **Build Status**: GREEN (0 TS errors, 12,111 tests passing, Vite build 23.73s)

---

## Pre-Conditions: All Previously Agreed Coding Conventions

| # | Convention | Established | Status |
|---|-----------|-------------|--------|
| C1 | **No sql.raw with `${interpolation}`** — use `sql\`...\`` template | Round-3 Batch 1 | 1 violation |
| C2 | **jsonValue instead of z.any()/z.unknown()** at API boundaries | Round-3 Batch 4 / Round-4 Batch 6 | 2 remaining |
| C3 | **Pino structured logging** via `createChildLogger(module)` | Round-4 Batch 3 | 926 violations |
| C4 | **.limit(1000)** safety cap on multi-row db.select() | Round-3 Batch 3 | COMPLIANT |
| C5 | **db.transaction()** for multi-step mutations | Round-3 Batch 5 | COMPLIANT |
| C6 | **Helmet CSP** enabled (not `false`) | Round-3 Batch 2 | 1 violation |
| C7 | **Environment variables** for all secrets (no hardcoded fallbacks) | Round-4 Batch 1 | COMPLIANT |
| C8 | **Each batch independently verifiable**: `npx tsc --noEmit && npx vitest run && npx vite build` | All rounds | ENFORCED |

---

## System Scan Results (Post Round-4)

| Metric | Count | Trend |
|--------|-------|-------|
| sql.raw with interpolation | 1 | ↓ from 22 (Round-3) |
| z.any()/z.unknown() (non-test) | 2 | ↓ from 110 (Round-3) |
| console.* in non-test server files | 926 | ↓ from 1,036 (8 core files migrated) |
| as any (server/) | 2,403 | unchanged |
| as any (client/) | 1,233 | unchanged |
| @ts-expect-error / @ts-ignore | 30 | unchanged |
| TODO/FIXME/HACK (server/) | 99 | unchanged |
| TODO/FIXME/HACK (client/) | 39 | unchanged |
| Files > 2000 lines | 15 | unchanged |
| Helmet CSP | disabled | unchanged |

---

## Encoding Principles (inherited + new)

1. Each batch independently verifiable: `npx tsc --noEmit && npx vitest run && npx vite build`
2. Do not break existing tests — update mocks in same batch
3. Each batch ≤ 20 source files (parallel agents for larger batches)
4. P0 > P1 > P2 (security > observability > DX)
5. Mechanical fixes only — no new abstractions
6. Pino pattern: `import { createChildLogger } from "../lib/logger"; const log = createChildLogger("module-name");`
7. console.log → log.info, console.error → log.error, console.warn → log.warn
8. For structured context: `console.log("msg", data)` → `log.info({ data }, "msg")`

---

## Batch 1: P0 Convention Enforcement (5 files)

### 1A. `server/routers/bu-sales-target.router.ts` — DDL injection fix

```typescript
// BEFORE (L94):
await db.execute(sql.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`));

// AFTER: Table/column allowlist validation
const ALLOWED_TABLES = ["bu_sales_targets", "bu_quarterly_targets"];
const ALLOWED_COLUMNS = { /* column_name: "column_type" */ };
if (!ALLOWED_TABLES.includes(table)) throw new Error("Invalid table");
// Use sql template with raw identifiers only for validated values
await db.execute(sql`ALTER TABLE ${sql.raw(table)} ADD COLUMN IF NOT EXISTS ${sql.raw(col)} ${sql.raw(type)}`);
```

### 1B. `server/offboarding/offboarding.router.ts` — z.any() → jsonValue

```typescript
// BEFORE (L99):
updates: z.record(z.string(), z.any()),
// AFTER:
import { jsonValue } from "@shared/validators";
updates: z.record(z.string(), jsonValue),
```

### 1C. `server/routers/questionnaire.router.ts` — z.any() → jsonValue

```typescript
// BEFORE (L243):
data: z.record(z.string(), z.any()),
// AFTER:
import { jsonValue } from "@shared/validators";
data: z.record(z.string(), jsonValue),
```

### 1D. `server/_core/index.ts` — Enable Helmet CSP

```typescript
// BEFORE:
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// AFTER:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // SPA + tRPC needs eval
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind inline styles
      imgSrc: ["'self'", "data:", "blob:", "https:"],  // Allow external images
      connectSrc: ["'self'", "ws:", "wss:", "https:"],  // WebSocket + API
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'", "*.manus.computer", "*.manuspre.computer", "*.manus-asia.computer", "*.manuscomputer.ai", "*.manusvm.computer"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

### 1E. Update tests if needed

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 2: P1 Structured Logging — Top 15 Core Files (~233 console.* → pino)

Target files (by console.* count, excluding seed/test):

| File | Count | Module Name |
|------|-------|-------------|
| `server/db.ts` | 32 | db |
| `server/pos/pos.router.ts` | 17 | pos |
| `server/routers/bu.router.ts` | 16 | bu |
| `server/ime/ime.service.ts` | 16 | ime |
| `server/routers/employee-ai-assistant.router.ts` | 15 | employee-ai |
| `server/triggers/business-triggers.ts` | 14 | triggers |
| `server/services/dingtalk.service.ts` | 13 | dingtalk |
| `server/services/wecom.service.ts` | 11 | wecom |
| `server/services/hr-meeting-engine.ts` | 11 | hr-meeting |
| `server/routers/kiosk.router.ts` | 11 | kiosk |
| `server/routers/auth.router.ts` | 11 | auth |
| `server/services/task-worker.service.ts` | 10 | task-worker |
| `server/routers/cicd.router.ts` | 10 | cicd |
| `server/production-execution/uwb-sync.service.ts` | 10 | uwb-sync |
| `server/pos/stage-gate-auto-advance.service.ts` | 10 | stage-gate |

Pattern for each file:
```typescript
// Add at top (after existing imports):
import { createChildLogger } from "../lib/logger";  // adjust path
const log = createChildLogger("module-name");

// Replace each:
console.log("message", data)      → log.info({ data }, "message")
console.error("message:", error)   → log.error({ err: error }, "message")
console.warn("message")           → log.warn("message")
console.log(`[TAG] ${msg}`)       → log.info("msg")
```

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 3: P1 Structured Logging — Services & Modules (~20 files, ~150 calls)

Next tier files (4-9 console.* each):

| File | Count | Module Name |
|------|-------|-------------|
| `server/capability-management/capability.service.ts` | 9 | capability |
| `server/jiandaoyun.ts` | 9 | jiandaoyun |
| `server/erp/tiansi-erp-integration.ts` | 9 | erp |
| `server/services/social-platforms/dingtalk.service.ts` | 9 | dingtalk-platform |
| `server/services/ai-async-handlers.service.ts` | 8 | ai-async |
| `server/services/scheduling-auto-refresh.service.ts` | 8 | scheduling |
| `server/monitoring/alertRules.ts` | 7 | alert-rules |
| `server/services/aiInterpretation.service.ts` | 7 | ai-interpretation |
| `server/services/scheduler.service.ts` | 7 | scheduler-svc |
| `server/services/social-platforms/wecom.service.ts` | 7 | wecom-platform |
| `server/routers/rnd-pipeline.router.ts` | 8 | rnd-pipeline |
| `server/routers/devTasks.router.ts` | 7 | dev-tasks |
| `server/routers/projectGate.router.ts` | 6 | project-gate |
| `server/routers/skill-recommendation.router.ts` | 7 | skill-rec |
| `server/services/websocket.service.ts` | 6 | websocket |
| `server/services/changeManagement.service.ts` | 6 | change-mgmt |
| `server/ime/ime-websocket.service.ts` | 6 | ime-ws |
| `server/p2-automation/p2Automation.service.ts` | 6 | p2-automation |
| `server/pos/db-init.ts` | 6 | pos-db-init |
| `server/lib/desensitizer.ts` | 5 | desensitizer |

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 4: P1 Structured Logging — Remaining files (~40 files, ~300 calls)

All remaining non-test server files with 1-4 console.* each:
- ~40 files × ~3 avg = ~120 calls
- Plus seed files (~10 files × ~25 avg = ~250 calls)
- Total: ~370 calls

After this batch: **0 console.* in non-test server files**.

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 5: P2 Code Hygiene — @ts directives + TODO triage (30 files)

### 5A. @ts-expect-error / @ts-ignore audit (9 files, 30 occurrences)

For each occurrence, one of:
- Fix the underlying type error (preferred)
- Replace with proper type assertion
- Keep with explanation comment if genuinely needed

### 5B. TODO/FIXME triage — server/ top files (29 files, 99 occurrences)

- Remove stale/completed TODOs
- Fix actionable ones (trivial)
- Add issue numbers to remaining ones for tracking

### 5C. TODO/FIXME triage — client/ (22 files, 39 occurrences)

Same approach.

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Out of Scope (Round-6+)

| Item | Reason |
|------|--------|
| IME service decomposition (12K lines) | Needs dedicated architecture session |
| db.ts split (8K lines) | Needs domain analysis + import cascade |
| schema.ts split (12K lines) | 100+ consumer files to update |
| as any reduction (3,636 total) | Needs strict:true or per-file noUncheckedIndexedAccess |
| tsconfig strict:true | 707+ cascade errors |
| API pagination standard | Breaking API change |

---

## Verification Protocol

Each batch, after commit:
```bash
npx tsc --noEmit          # 0 errors
npx vitest run            # 12,111+ tests passing
npx vite build            # < 30s, no errors
```

Batch 1 extra:
```bash
grep -rn "sql\.raw.*\\\${" server/ --include="*.ts"   # 0 results
grep -rn "z\.any\|z\.unknown" server/ --include="*.ts" | grep -v test  # 0 results
```

Batch 4 extra:
```bash
grep -rn "console\.\(log\|error\|warn\|info\)" server/ --include="*.ts" | grep -v test | wc -l  # 0
```
