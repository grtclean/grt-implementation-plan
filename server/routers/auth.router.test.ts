/**
 * Auth Router — Unit Tests
 * Tests 13 procedures: me, logout, getPreferences, updatePreferences,
 * updateLanguagePreference, updateThemePreference, getLanguagePreference,
 * getFavorites, addFavorite, removeFavorite, isFavorite, updateFavoriteOrder,
 * reorderFavorites
 *
 * Uses dynamic imports (await import("../db")) for DB functions — mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdminCaller,
  createAnonymousCaller,
} from "../_test/trpc-test-utils";

const { mockGetUserPreferences, mockUpsertUserPreferences, mockGetUserFavorites,
  mockAddUserFavorite, mockRemoveUserFavorite, mockIsFavorite, mockUpdateFavoriteOrder,
} = vi.hoisted(() => ({
  mockGetUserPreferences: vi.fn(),
  mockUpsertUserPreferences: vi.fn(),
  mockGetUserFavorites: vi.fn(),
  mockAddUserFavorite: vi.fn(),
  mockRemoveUserFavorite: vi.fn(),
  mockIsFavorite: vi.fn(),
  mockUpdateFavoriteOrder: vi.fn(),
}));

vi.mock("../db", () => ({
  getUserPreferences: mockGetUserPreferences,
  upsertUserPreferences: mockUpsertUserPreferences,
  getUserFavorites: mockGetUserFavorites,
  addUserFavorite: mockAddUserFavorite,
  removeUserFavorite: mockRemoveUserFavorite,
  isFavorite: mockIsFavorite,
  updateFavoriteOrder: mockUpdateFavoriteOrder,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const caller = () => createAdminCaller();

const samplePrefs = {
  language: "en", theme: "light", sidebarCollapsed: true,
  timezone: "UTC", dateFormat: "YYYY-MM-DD",
  dashboardLayout: null, notificationSettings: null,
};

const sampleFavorite = {
  id: 1, userId: 1, menuPath: "/projects", menuName: "项目管理",
  menuNameEn: "Projects", sortOrder: 0,
};

describe("auth router", () => {

  // ═══ me ═══
  describe("me", () => {
    it("returns user for authenticated caller", async () => {
      const result = await caller().auth.me();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("role");
    });

    it("returns null for anonymous caller", async () => {
      const result = await createAnonymousCaller().auth.me();
      expect(result).toBeNull();
    });
  });

  // ═══ logout ═══
  describe("logout", () => {
    it("returns success", async () => {
      const result = await caller().auth.logout();
      expect(result.success).toBe(true);
    });
  });

  // ═══ getPreferences ═══
  describe("getPreferences", () => {
    it("returns user preferences from DB", async () => {
      mockGetUserPreferences.mockResolvedValueOnce(samplePrefs);
      const result = await caller().auth.getPreferences();
      expect(result.language).toBe("en");
      expect(result.theme).toBe("light");
    });

    it("returns defaults when no prefs", async () => {
      mockGetUserPreferences.mockResolvedValueOnce(null);
      const result = await caller().auth.getPreferences();
      expect(result.language).toBe("zh");
      expect(result.theme).toBe("dark");
    });

    it("returns defaults on error", async () => {
      mockGetUserPreferences.mockRejectedValueOnce(new Error("DB down"));
      const result = await caller().auth.getPreferences();
      expect(result.language).toBe("zh");
    });
  });

  // ═══ updatePreferences ═══
  describe("updatePreferences", () => {
    it("updates preferences", async () => {
      mockUpsertUserPreferences.mockResolvedValueOnce(samplePrefs);
      const result = await caller().auth.updatePreferences({ language: "en" });
      expect(result.success).toBe(true);
      expect(result.preferences).toBeTruthy();
    });

    it("returns failure on error", async () => {
      mockUpsertUserPreferences.mockRejectedValueOnce(new Error("fail"));
      const result = await caller().auth.updatePreferences({ theme: "dark" });
      expect(result.success).toBe(false);
    });
  });

  // ═══ updateLanguagePreference ═══
  describe("updateLanguagePreference", () => {
    it("updates language", async () => {
      mockUpsertUserPreferences.mockResolvedValueOnce({});
      const result = await caller().auth.updateLanguagePreference({ language: "de" });
      expect(result.success).toBe(true);
      expect(result.language).toBe("de");
    });

    it("rejects invalid language", async () => {
      await expect(caller().auth.updateLanguagePreference({
        language: "xx" as any,
      })).rejects.toThrow();
    });
  });

  // ═══ updateThemePreference ═══
  describe("updateThemePreference", () => {
    it("updates theme", async () => {
      mockUpsertUserPreferences.mockResolvedValueOnce({});
      const result = await caller().auth.updateThemePreference({ theme: "system" });
      expect(result.success).toBe(true);
      expect(result.theme).toBe("system");
    });
  });

  // ═══ getLanguagePreference ═══
  describe("getLanguagePreference", () => {
    it("returns language from prefs", async () => {
      mockGetUserPreferences.mockResolvedValueOnce({ language: "fr" });
      const result = await caller().auth.getLanguagePreference();
      expect(result.language).toBe("fr");
    });

    it("defaults to zh when no prefs", async () => {
      mockGetUserPreferences.mockResolvedValueOnce(null);
      const result = await caller().auth.getLanguagePreference();
      expect(result.language).toBe("zh");
    });
  });

  // ═══ getFavorites ═══
  describe("getFavorites", () => {
    it("returns user favorites", async () => {
      mockGetUserFavorites.mockResolvedValueOnce([sampleFavorite]);
      const result = await caller().auth.getFavorites();
      expect(result).toHaveLength(1);
    });

    it("returns empty on error", async () => {
      mockGetUserFavorites.mockRejectedValueOnce(new Error("fail"));
      const result = await caller().auth.getFavorites();
      expect(result).toEqual([]);
    });
  });

  // ═══ addFavorite ═══
  describe("addFavorite", () => {
    it("adds a favorite", async () => {
      mockAddUserFavorite.mockResolvedValueOnce(sampleFavorite);
      const result = await caller().auth.addFavorite({
        menuPath: "/projects", menuName: "项目管理",
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ removeFavorite ═══
  describe("removeFavorite", () => {
    it("removes a favorite", async () => {
      mockRemoveUserFavorite.mockResolvedValueOnce(true);
      const result = await caller().auth.removeFavorite({ menuPath: "/projects" });
      expect(result.success).toBe(true);
    });
  });

  // ═══ isFavorite ═══
  describe("isFavorite", () => {
    it("returns true when favorited", async () => {
      mockIsFavorite.mockResolvedValueOnce(true);
      const result = await caller().auth.isFavorite({ menuPath: "/projects" });
      expect(result).toBe(true);
    });

    it("returns false when not favorited", async () => {
      mockIsFavorite.mockResolvedValueOnce(false);
      const result = await caller().auth.isFavorite({ menuPath: "/unknown" });
      expect(result).toBe(false);
    });
  });

  // ═══ updateFavoriteOrder ═══
  describe("updateFavoriteOrder", () => {
    it("updates order", async () => {
      mockUpdateFavoriteOrder.mockResolvedValueOnce(true);
      const result = await caller().auth.updateFavoriteOrder({
        menuPath: "/projects", newOrder: 2,
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ reorderFavorites ═══
  describe("reorderFavorites", () => {
    it("reorders multiple favorites", async () => {
      mockUpdateFavoriteOrder.mockResolvedValue(true);
      const result = await caller().auth.reorderFavorites({
        orders: [
          { menuPath: "/a", newOrder: 0 },
          { menuPath: "/b", newOrder: 1 },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══ Auth Guards ═══
  describe("authentication", () => {
    // me is publicProcedure — no auth guard
    it("rejects anonymous for logout", async () => {
      await expect(createAnonymousCaller().auth.logout()).rejects.toThrow();
    });
    it("rejects anonymous for getPreferences", async () => {
      await expect(createAnonymousCaller().auth.getPreferences()).rejects.toThrow();
    });
    it("rejects anonymous for updatePreferences", async () => {
      await expect(createAnonymousCaller().auth.updatePreferences({})).rejects.toThrow();
    });
    it("rejects anonymous for updateLanguagePreference", async () => {
      await expect(createAnonymousCaller().auth.updateLanguagePreference({ language: "en" })).rejects.toThrow();
    });
    it("rejects anonymous for updateThemePreference", async () => {
      await expect(createAnonymousCaller().auth.updateThemePreference({ theme: "dark" })).rejects.toThrow();
    });
    it("rejects anonymous for getLanguagePreference", async () => {
      await expect(createAnonymousCaller().auth.getLanguagePreference()).rejects.toThrow();
    });
    it("rejects anonymous for getFavorites", async () => {
      await expect(createAnonymousCaller().auth.getFavorites()).rejects.toThrow();
    });
    it("rejects anonymous for addFavorite", async () => {
      await expect(createAnonymousCaller().auth.addFavorite({ menuPath: "/x", menuName: "X" })).rejects.toThrow();
    });
    it("rejects anonymous for removeFavorite", async () => {
      await expect(createAnonymousCaller().auth.removeFavorite({ menuPath: "/x" })).rejects.toThrow();
    });
    it("rejects anonymous for isFavorite", async () => {
      await expect(createAnonymousCaller().auth.isFavorite({ menuPath: "/x" })).rejects.toThrow();
    });
    it("rejects anonymous for updateFavoriteOrder", async () => {
      await expect(createAnonymousCaller().auth.updateFavoriteOrder({ menuPath: "/x", newOrder: 0 })).rejects.toThrow();
    });
    it("rejects anonymous for reorderFavorites", async () => {
      await expect(createAnonymousCaller().auth.reorderFavorites({ orders: [] })).rejects.toThrow();
    });
  });
});
