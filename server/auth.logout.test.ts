import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createMockContext } from "./_test/helpers";

describe("auth.logout", () => {
  it("returns success response", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    // The placeholder implementation returns { success: true, message: '操作成功' }
    expect(result).toMatchObject({ success: true });
  });
});
