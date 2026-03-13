# GRT System Round-6 Hardening Plan — Unbounded Queries + Express Hardening

> **Status**: Pending approval
> **Prerequisite**: Rounds 1-5 complete (SQL injection, Helmet+CORS, .limit batch 1, input validation, transactions, pino logging, CSP, @ts cleanup)
> **Scope**: Remaining unbounded queries + Express runtime hardening + last console.* stragglers

---

## Convention Compliance Audit (2026-03-02)

| # | Convention | Status | Detail |
|---|---|---|---|
| C1 | No sql.raw interpolation | **CLEAN** | 0 violations |
| C2 | No z.any/z.unknown at API boundaries | **CLEAN** | 0 violations |
| C3 | Pino structured logging | **99.2%** | 7 in `query-optimization.ts` (production code) |
| C4 | .limit() on multi-row queries | **73%** | 90 unbounded queries remaining |
| C5 | db.transaction for multi-ops | **OK** | All multi-deletes verified (intentional or wrapped) |
| C6 | Helmet CSP enabled | **DONE** | SPA-compatible directives active |
| C7 | No hardcoded secrets | **CLEAN** | 0 violations |
| C8 | No @ts-ignore | **CLEAN** | 0 violations (7 @ts-expect-error for optional deps) |
| C9 | dangerouslySetInnerHTML | **SAFE** | 3 uses: 2 with DOMPurify, 1 developer-controlled CSS |
| C10 | UPDATE/DELETE with WHERE | **OK** | 16 flagged → all verified (long .set() blocks, 2 intentional bulk ops) |

### Remaining Gaps

| Issue | Count | Risk | Batch |
|---|---|---|---|
| Unbounded db.select() | 90 (66 in db.ts) | P0 — OOM on large tables | 1 |
| JSON body limit 50MB | 1 | P1 — DoS vector | 2 |
| No rate limiting middleware | 0 installed | P1 — API abuse | 2 |
| Last console.* in prod code | 7 | P2 — Convention gap | 2 |
| index.js bundle 3MB | 1 chunk | P3 — Load time | Deferred |
| as any (1,938 server + 1,233 client) | 3,171 | P3 — Maintainability | Deferred |

---

## Encoding Principles

1. Each batch independently verifiable: `npx tsc --noEmit && npx vitest run && npx vite build`
2. Mechanical changes only — no new abstractions
3. ≤20 files per batch for reviewability
4. P0 > P1 > P2

---

## Batch 1: Unbounded Query Safety Cap (P0) — ~18 files, 90 queries

### Problem

90 `db.select().from(table)` chains without `.limit()` that return potentially unbounded result sets. Concentrated in `db.ts` (66), rest scattered across 17 files.

Excludes: single-row lookups (`.where(eq(table.id, specificId))`), queries already having `.limit()`, seed files.

### Fix Strategy

Mechanical `.limit(1000)` append to each query chain, same pattern as Round-3 Batch 3:

```typescript
// BEFORE:
const result = await db.select().from(table).where(condition);
// AFTER:
const result = await db.select().from(table).where(condition).limit(1000);

// BEFORE (with orderBy):
return db.select().from(table).orderBy(desc(table.createdAt));
// AFTER:
return db.select().from(table).orderBy(desc(table.createdAt)).limit(1000);
```

### File Breakdown

| File | Count |
|------|-------|
| `server/db.ts` | 66 |
| `server/ai-assistants/kpiAssistant.ts` | 3 |
| `server/services/gamification.service.ts` | 3 |
| `server/salaryReportExport.ts` | 2 |
| `server/capability-management/capability.service.ts` | 2 |
| 13 other files (1 each) | 13 |

### Test Impact

None — `.limit()` doesn't affect mock chains (mock `.limit()` returns self).

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 2: Express Runtime Hardening (P1) — 3 files

### 2A. JSON Body Size Limit — `server/_core/index.ts`

```typescript
// BEFORE:
app.use(express.json({ limit: "50mb" }));

// AFTER:
app.use(express.json({ limit: "10mb" }));
```

Rationale: 50MB is excessive for JSON API payloads. 10MB accommodates base64-encoded file uploads while preventing DoS. File uploads should use multipart/form-data (already separate).

### 2B. Rate Limiting — `server/_core/index.ts`

```bash
pnpm add express-rate-limit
```

```typescript
import rateLimit from "express-rate-limit";

// Global rate limiter — after CORS, before routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,                 // 1000 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use(limiter);
```

Conservative limit (1000/15min = ~1.1 req/s) — enough for any legitimate user, blocks brute-force. AI assistant endpoints already have per-user rate config but this adds IP-level protection.

### 2C. Last Console.* — `server/query-optimization.ts`

7 `console.log/warn/error` → pino via `createChildLogger("query-opt")`:

```typescript
import { createChildLogger } from "./lib/logger";
const log = createChildLogger("query-opt");

// console.log(`✅ 从缓存获取权限 (${userId})`) →
log.debug({ userId }, "Permission cache hit");
// console.warn(`⚠️ 慢查询警告...`) →
log.warn({ queryName, duration }, "Slow query detected");
// console.error(`❌ 查询失败...`) →
log.error({ err: error, queryName, duration }, "Query failed");
```

### Test Impact

- Rate limiting: no test impact (tests don't go through Express middleware)
- Body limit: no test impact (tests use tRPC callers, not HTTP)
- Console migration: may need mock adjustment if query-optimization tests exist

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Not in Scope (Deferred)

| Item | Reason |
|------|--------|
| index.js 3MB bundle splitting | manualChunks already configured; further splitting needs lazy-loading audit |
| 3,171 `as any` elimination | Requires `strict:true` migration, independent project |
| db.ts split (8,220 lines) | Functional, organizational debt only |
| ime.service.ts split (12,146 lines) | Functional, needs dedicated session |
| schema.ts split (12,301 lines) | 100+ file cascade |
| 95 server TODOs | All legitimate future-work markers |

---

## Verification

After each batch:
1. `npx tsc --noEmit` — 0 errors
2. `npx vitest run` — 326/327+ tests passing
3. `npx vite build` — passes
4. Batch 1: `python3 -c "..." | grep "Total needing .limit()"` — should be 0
5. Batch 2: `grep -rn "console\." server/query-optimization.ts` — should be 0
