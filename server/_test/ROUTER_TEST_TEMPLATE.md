# tRPC Router Test Template (Meta-Prompt)

Use this template when generating tests for any new tRPC router in the GRT system.

## Import Pattern

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAuthenticatedCaller, createAnonymousCaller, createAdminCaller } from "./_test/trpc-test-utils";

// Mock the database layer
vi.mock("./db", () => ({
  requireDb: vi.fn(async () => ({
    select: () => ({ from: () => ({ orderBy: vi.fn(), where: vi.fn() }) }),
    insert: () => ({ values: () => ({ returning: vi.fn() }) }),
  })),
  // Re-export any other db functions used by the router
}));

beforeEach(() => {
  vi.clearAllMocks();
});
```

## 4 Required Test Categories

Every router test file MUST cover these four categories:

### 1. Happy Path
Test normal operation with valid inputs and expected DB responses.

```ts
describe("<router>.<procedure>", () => {
  it("returns expected data on success", async () => {
    // Setup mock DB return
    mockFn.mockResolvedValueOnce(expectedData);
    const caller = createAuthenticatedCaller();
    const result = await caller.<router>.<procedure>(validInput);
    expect(result).toMatchObject(expectedShape);
  });
});
```

### 2. Auth Guard
Test that `protectedProcedure` endpoints reject unauthenticated callers.

```ts
it("rejects unauthenticated requests", async () => {
  const caller = createAnonymousCaller();
  await expect(caller.<router>.<mutation>(input)).rejects.toThrow();
});
```

### 3. Input Validation
Test that Zod schemas reject invalid input.

```ts
it("rejects invalid input via Zod", async () => {
  const caller = createAuthenticatedCaller();
  await expect(caller.<router>.<procedure>(invalidInput)).rejects.toThrow();
});
```

### 4. DB Fallback
Test behavior when `requireDb()` throws (common pattern: return mock data or empty array).

```ts
it("falls back to mock data when DB fails", async () => {
  mockOrderBy.mockRejectedValueOnce(new Error("DB error"));
  const caller = createAuthenticatedCaller();
  const result = await caller.<router>.list();
  expect(Array.isArray(result)).toBe(true);
});
```

## Mock Context Variants

| Factory | Use Case |
|---------|----------|
| `createAuthenticatedCaller()` | Regular user (role: "user") |
| `createAnonymousCaller()` | No user (tests auth guards) |
| `createAdminCaller()` | Admin user (role: "admin") |

All accept optional `overrides` to customize user fields:
```ts
const caller = createAuthenticatedCaller({ name: "Custom User", role: "admin" });
```

## File Naming Convention

```
server/<router-name>.router.test.ts
```

## Running Tests

```bash
pnpm vitest run server/<router-name>.router  # Single router
pnpm test                                     # All tests
```

## Tips

- Always use `vi.clearAllMocks()` in `beforeEach` to prevent state leakage
- Mock `requireDb` at the module level with `vi.mock("./db", ...)`
- For procedures that use `from(table).orderBy(...)`, mock the `.orderBy` return
- For procedures that use `from(table).where(...)`, mock the `.where` return
- Prefer `mockResolvedValueOnce` over `mockResolvedValue` for test isolation
- Test file should be self-contained — no shared state between `describe` blocks
