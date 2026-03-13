# GRT Round-7 Deep Hardening Plan — SQL Injection + Unbounded Queries

> **Status**: Pending approval
> **Date**: 2026-03-02
> **Prerequisites**: Rounds 1-6 complete (pino migration, @ts-ignore, rate limit, Helmet, CSP fix)
> **Scope**: SQL injection elimination (P0) + remaining unbounded query safety caps (P1)

---

## Convention Audit Results (C1-C10)

| # | Convention | Status | Details |
|---|-----------|--------|---------|
| C1 | No `console.*` in server prod code | CLEAN | 0 real hits (24 in test file, 3 in JSDoc comments) |
| C2 | No `sql.raw()` with interpolation | **FAILING** | **292 injection vectors** in `ime.service.ts` + 7 in other files |
| C3 | All `db.select()` have `.limit()` | **FAILING** | **292 unbounded** non-aggregate queries across 84 files |
| C4 | No `z.any()`/`z.unknown()` in inputs | CLEAN | 0 |
| C5 | No `@ts-ignore` | CLEAN | 0 |
| C6 | JSON body limit ≤ 10MB | CLEAN | 10MB |
| C7 | Rate limiting | CLEAN | 1000/15min |
| C8 | Helmet + CSP | CLEAN | Properly configured |
| C9 | No leaked secrets | CLEAN | 0 |
| C10 | No `eval()`/`new Function()` | CLEAN | 0 |

---

## Batch 1 (P0): SQL Injection — `ime.service.ts` Functions L906-L2000

**Scope**: 16 functions, ~35 dangerous `sql.raw()` interpolations

### Target Functions

| Function | Lines | Dangerous `sql.raw` | Pattern |
|----------|-------|---------------------|---------|
| `detectMeetingPatterns` | L906 | 1 | Dynamic WHERE |
| `getPatternInsights` | L1023 | 1 | Dynamic WHERE |
| `getMeetingCultureReport` | L1042 | 1 | Dynamic WHERE |
| `generateHrSignals` | L1097 | 2 | Dynamic WHERE + subquery |
| `getPromotionCandidates` | L1238 | 1 | Dynamic WHERE |
| `recommendTraining` | L1260 | 3 | Dynamic WHERE + subquery |
| `startLiveSession` | L1352 | 1 | SELECT with interpolation |
| `processLiveSegment` | L1382 | 2 | INSERT/UPDATE |
| `endLiveSession` | L1444 | 2 | SELECT/UPDATE |
| `computeMeetingCost` | L1524 | 2 | Dynamic WHERE + subquery |
| `getCostDashboard` | L1626 | 4 | Multi-query with WHERE |
| `extractAndTrackActionItems` | L1843 | 2 | INSERT/UPDATE |
| `updateActionItemStatus` | L1954 | 1 | UPDATE |
| `getActionItemDashboard` | L1919 | 2 | Dynamic WHERE |
| `extractAndTrackTopics` | L2108 | 2 | INSERT/UPDATE |
| `updateTopicStatus` | L2211 | 1 | UPDATE |

### Conversion Pattern

```typescript
// BEFORE (injection risk):
const conditions: string[] = ["1=1"];
if (filters.channelId) conditions.push(`mc.channel_id = '${filters.channelId}'`);
if (filters.dateFrom) conditions.push(`mr.meeting_date >= '${filters.dateFrom}'`);
const where = conditions.join(" AND ");
const result = await db.execute(sql.raw(`SELECT ... WHERE ${where}`));

// AFTER (parameterized):
const conditions: SQL[] = [sql`1=1`];
if (filters.channelId) conditions.push(sql`mc.channel_id = ${filters.channelId}`);
if (filters.dateFrom) conditions.push(sql`mr.meeting_date >= ${filters.dateFrom}`);
const where = sql.join(conditions, sql` AND `);
const result = await db.execute(sql`SELECT ... WHERE ${where}`);
```

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 2 (P0): SQL Injection — `ime.service.ts` Functions L2000-L4000

**Scope**: ~20 functions, ~50 dangerous `sql.raw()` interpolations

### Target Functions

| Function | Dangerous | Pattern |
|----------|-----------|---------|
| `getTopicContinuityDashboard` | 2 | Dynamic WHERE |
| `getSentimentDashboard` | 5 | Multi-query |
| `computeMeetingHealth` | 6 | Multi-query + trend |
| `getHealthDashboard` | 2 | Dynamic WHERE |
| `getOptimizationRecommendations` | 1 | Dynamic WHERE |
| `generateDigest` | 11 | Heavy multi-query |
| `getDigestHistory` | 1 | Dynamic WHERE |
| `getActiveAlerts` | 4 | Multi-query |
| `computeMeetingRoi` | 4 | Multi-query |
| `getRoiDashboard` | 7 | Heavy multi-query |
| `optimizeAttendees` | 3 | Multi-query |
| `getOptimizationDashboard` | 3 | Multi-query |
| `suggestParticipantsForTopic` | 2 | Dynamic WHERE |
| `predictMeetingEffectiveness` | 6 | Multi-query |
| `getPredictionDashboard` | 5 | Multi-query |
| `detectMeetingFatigue` | 2 | Dynamic WHERE |
| `generateExecutiveDashboardExcel` | 8 | Heavy multi-query |

Same conversion pattern as Batch 1.

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 3 (P0): SQL Injection — `ime.service.ts` Functions L4000-L8000

**Scope**: ~35 functions, ~80 dangerous `sql.raw()` interpolations

### Target Functions (highest density region)

| Function | Dangerous | Pattern |
|----------|-----------|---------|
| `queryPeriodMetrics` | 9 | Heavy parameterized period queries |
| `computeExpertProfiles` | 1 | Dynamic WHERE |
| `getKnowledgeDashboard` | 2 | Multi-query |
| `generateMeetingBrief` | 2 | Dynamic WHERE |
| `createWorkflowRule` | 1 | INSERT |
| `askMeetingAssistant` | 7 | Heavy multi-query |
| `getWorkflowDashboard` | 2 | Dynamic WHERE |
| `getMeetingCultureScore` | 6 | Multi-query |
| `generateCoachingPlan` | 4 | Multi-query |
| `createIntegration/syncIntegration` | 3 | INSERT/UPDATE |
| `updateSystemSetting/getSystemSettings` | 4 | Dynamic SET/SELECT |
| `evaluateAchievements` | 7 | Heavy multi-query |
| `createTeamChallenge` | 4 | INSERT + multi-query |
| `analyzeFeedbackTrends` | 5 | Multi-query |
| `generateImprovementInitiative` | 4 | Multi-query |
| `getGamificationDashboard/getFeedbackDashboard` | 3 | Dynamic WHERE |
| `createCompliancePolicy/getComplianceOverview` | 4 | INSERT + multi-query |
| `generateGovernanceReport/getComplianceHistory` | 4 | Multi-query |
| `executeHrActions` | 8 | Heavy UPDATE/INSERT |
| `buildCollaborationNetwork/getCollaborationNetworkStats` | 4 | Multi-query |
| `createLinkageRule/listLinkageRules/getLinkageDashboard` | 7 | Dynamic WHERE |
| `checkRateLimit/getApiKeyUsageStats/getApiUsageLogs` | 5 | Dynamic WHERE |

Same conversion pattern.

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 4 (P0): SQL Injection — `ime.service.ts` Functions L8000-L12146

**Scope**: ~45 functions, ~125 dangerous `sql.raw()` interpolations

### Target Functions

Functions in this range cover:
- Participant load analysis (L8000-8600)
- Recurring series detection (L8600-9100)
- Decision tracking & velocity (L9100-10300)
- Time allocation analysis (L10300-10800)
- Agenda intelligence (L10800-11200)
- Facilitator analysis (L11200-12146)

All follow the same `sql.raw()` → `sql``\` conversion pattern.

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 5 (P0): SQL Injection — Remaining Files (7 hits)

### 5A. `server/procurement/procurement.router.ts` — 3 hits (L605-638)

Dynamic GROUP BY column — currently uses `sql.raw(groupColumn)` where `groupColumn` comes from an allowlist. **Low risk** but should validate:

```typescript
// Already safe — groupColumn from code allowlist, not user input
// Keep sql.raw() but add explicit allowlist guard
const ALLOWED_GROUP_COLUMNS = ["supplier_id", "category", "status", "department"];
if (!ALLOWED_GROUP_COLUMNS.includes(groupColumn)) throw new Error("Invalid group column");
```

### 5B. `server/routers/bu-sales-target.router.ts` — 2 hits (L92-98)

DDL `ALTER TABLE` — inherently requires `sql.raw()`. Already annotated as safe. **No change needed** — DDL identifiers cannot be parameterized.

### 5C. `server/production-execution/production-execution.db.ts` — 1 hit (L378)

Static SQL without interpolation. Check and confirm.

### 5D. `server/routers/workspace.router.ts` — comment only, no action needed.

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 6 (P1): Unbounded Query Safety — 292 queries across 84 files

### Top Files

| File | Unbounded | Action |
|------|-----------|--------|
| `server/delivery/delivery.router.ts` | 34 | Add `.limit(1000)` |
| `server/routers/oa-forms.router.ts` | 13 | Add `.limit(1000)` |
| `server/routers/smart-meeting.router.ts` | 13 | Add `.limit(1000)` |
| `server/procurement/procurement.router.ts` | 11 | Add `.limit(1000)` |
| `server/services/meeting.service.ts` | 11 | Add `.limit(1000)` |
| `server/db.ts` | 10 | Add `.limit(1000)` |
| `server/services/after-sales.service.ts` | 9 | Add `.limit(1000)` |
| `server/routers/cicd.router.ts` | 7 | Add `.limit(1000)` |
| `server/routers/vision-dashboard.router.ts` | 7 | Add `.limit(1000)` |
| `server/routers/cloud-hall.router.ts` | 6 | Add `.limit(1000)` |
| `server/services/fat-sat.service.ts` | 6 | Add `.limit(1000)` |
| (73 more files with 1-5 each) | ~165 | Add `.limit(1000)` |

### Mechanical fix

```typescript
// BEFORE:
const items = await db.select().from(table).where(condition);
// AFTER:
const items = await db.select().from(table).where(condition).limit(1000);
```

Exclude:
- `count()` aggregate queries (already excluded)
- Single-row lookups with `eq(table.id, ...)` + `.limit(1)` (already excluded)
- Seed files

**Verify**: `npx tsc --noEmit && npx vitest run && npx vite build`

---

## Batch 7 (P1): Minor Cleanup

### 7A. `server/_core/voiceTranscription.ts` — 3 console.* in JSDoc → already comments, no action

### 7B. `server/test-business-trigger.ts` — 24 console.* → this is a test utility, acceptable

### 7C. Final audit pass — confirm 0 violations across all C1-C10 conventions

---

## Encoding Principles

1. Each batch independently verifiable: `npx tsc --noEmit && npx vitest run && npx vite build`
2. Don't break existing tests — update mocks if needed
3. P0 (security) before P1 (safety caps)
4. Mechanical conversions only — no new abstractions
5. ime.service.ts batches split by line range to keep each PR reviewable (~3000 lines per batch)
6. Batch 6 uses parallel agents for speed (one for top-10 files, one for remaining 74)

---

## NOT in Round-7 Scope

| Item | Reason |
|------|--------|
| 145 static `sql.raw()` (no interpolation) in ime.service.ts | Safe — no injection vector |
| `sql.raw()` for DDL (ALTER TABLE) | Required — DDL can't use parameters |
| `sql.raw()` for allowlisted column names | Safe with validation |
| Full pagination standardization | API-breaking change, needs version migration |
| `strict: true` in tsconfig | 700+ cascade, independent project |
| schema.ts split (12K lines) | Organizational, not security |
| db.ts split (8K lines) | Organizational, not security |
| ime.service.ts split (12K lines) | Would help maintainability but not a security fix |

---

## Verification

After all batches:
1. `npx tsc --noEmit` — 0 errors
2. `npx vitest run` — all tests passing
3. `npx vite build` — passes
4. `grep -rn "sql.raw" server/ime/ime.service.ts | grep '\${'` — 0 interpolated sql.raw
5. Python unbounded query audit script — 0 unbounded non-aggregate queries
