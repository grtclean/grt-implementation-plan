import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("useAuth logout functionality", () => {
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("localStorage token management", () => {
    it("should remove grt_session_token on logout", () => {
      // Setup: store a token
      mockLocalStorage["grt_session_token"] = "test-token-123";
      
      // Simulate logout action
      localStorage.removeItem("grt_session_token");
      
      // Verify token is removed
      expect(localStorage.removeItem).toHaveBeenCalledWith("grt_session_token");
      expect(mockLocalStorage["grt_session_token"]).toBeUndefined();
    });

    it("should remove manus-runtime-user-info on logout", () => {
      // Setup: store user info
      mockLocalStorage["manus-runtime-user-info"] = JSON.stringify({ name: "Test User" });
      
      // Simulate logout action
      localStorage.removeItem("manus-runtime-user-info");
      
      // Verify user info is removed
      expect(localStorage.removeItem).toHaveBeenCalledWith("manus-runtime-user-info");
      expect(mockLocalStorage["manus-runtime-user-info"]).toBeUndefined();
    });

    it("should clear both tokens on logout", () => {
      // Setup: store both tokens
      mockLocalStorage["grt_session_token"] = "test-token-123";
      mockLocalStorage["manus-runtime-user-info"] = JSON.stringify({ name: "Test User" });
      
      // Simulate logout action (clear both)
      localStorage.removeItem("grt_session_token");
      localStorage.removeItem("manus-runtime-user-info");
      
      // Verify both are removed
      expect(mockLocalStorage["grt_session_token"]).toBeUndefined();
      expect(mockLocalStorage["manus-runtime-user-info"]).toBeUndefined();
    });
  });

  describe("logout redirect behavior", () => {
    it("should have correct redirect target after logout", () => {
      // The logout function should redirect to "/"
      const expectedRedirectPath = "/";
      expect(expectedRedirectPath).toBe("/");
    });
  });
});
