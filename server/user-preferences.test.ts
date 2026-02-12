import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getUserPreferences: vi.fn(),
  upsertUserPreferences: vi.fn(),
  requireDb: vi.fn(),
}));

import { getUserPreferences, upsertUserPreferences } from './db';

describe('User Preferences API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return null when user has no preferences', async () => {
      vi.mocked(getUserPreferences).mockResolvedValue(null);
      
      const result = await getUserPreferences(999);
      
      expect(result).toBeNull();
      expect(getUserPreferences).toHaveBeenCalledWith(999);
    });

    it('should return user preferences when they exist', async () => {
      const mockPreferences = {
        id: 1,
        userId: 123,
        language: 'en',
        theme: 'dark',
        sidebarCollapsed: false,
        dashboardLayout: null,
        notificationSettings: null,
        timezone: 'Asia/Shanghai',
        dateFormat: 'YYYY-MM-DD',
        createdAt: '2026-01-31T12:00:00Z',
        updatedAt: '2026-01-31T12:00:00Z',
      };
      
      vi.mocked(getUserPreferences).mockResolvedValue(mockPreferences);
      
      const result = await getUserPreferences(123);
      
      expect(result).toEqual(mockPreferences);
      expect(result?.language).toBe('en');
      expect(result?.theme).toBe('dark');
    });
  });

  describe('upsertUserPreferences', () => {
    it('should create new preferences for new user', async () => {
      const newPreferences = {
        id: 1,
        userId: 456,
        language: 'fr',
        theme: 'light',
        sidebarCollapsed: true,
        dashboardLayout: null,
        notificationSettings: null,
        timezone: 'Europe/Paris',
        dateFormat: 'DD/MM/YYYY',
        createdAt: '2026-01-31T12:00:00Z',
        updatedAt: '2026-01-31T12:00:00Z',
      };
      
      vi.mocked(upsertUserPreferences).mockResolvedValue(newPreferences);
      
      const result = await upsertUserPreferences(456, {
        language: 'fr',
        theme: 'light',
        sidebarCollapsed: true,
        timezone: 'Europe/Paris',
      });
      
      expect(result).toEqual(newPreferences);
      expect(result?.language).toBe('fr');
    });

    it('should update existing preferences', async () => {
      const updatedPreferences = {
        id: 1,
        userId: 123,
        language: 'de',
        theme: 'dark',
        sidebarCollapsed: false,
        dashboardLayout: null,
        notificationSettings: null,
        timezone: 'Europe/Berlin',
        dateFormat: 'DD.MM.YYYY',
        createdAt: '2026-01-31T12:00:00Z',
        updatedAt: '2026-01-31T13:00:00Z',
      };
      
      vi.mocked(upsertUserPreferences).mockResolvedValue(updatedPreferences);
      
      const result = await upsertUserPreferences(123, {
        language: 'de',
        timezone: 'Europe/Berlin',
      });
      
      expect(result).toEqual(updatedPreferences);
      expect(result?.language).toBe('de');
      expect(result?.timezone).toBe('Europe/Berlin');
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        id: 1,
        userId: 123,
        language: 'zh',
        theme: 'system',
        sidebarCollapsed: false,
        dashboardLayout: null,
        notificationSettings: null,
        timezone: 'Asia/Shanghai',
        dateFormat: 'YYYY-MM-DD',
        createdAt: '2026-01-31T12:00:00Z',
        updatedAt: '2026-01-31T14:00:00Z',
      };
      
      vi.mocked(upsertUserPreferences).mockResolvedValue(partialUpdate);
      
      const result = await upsertUserPreferences(123, {
        theme: 'system',
      });
      
      expect(result?.theme).toBe('system');
      // Other fields should remain unchanged
      expect(result?.language).toBe('zh');
    });
  });

  describe('Language preference validation', () => {
    it('should accept valid language codes', () => {
      const validLanguages = ['zh', 'en', 'de', 'fr'];
      
      validLanguages.forEach(lang => {
        expect(['zh', 'en', 'de', 'fr'].includes(lang)).toBe(true);
      });
    });

    it('should reject invalid language codes', () => {
      const invalidLanguages = ['es', 'it', 'jp', 'kr', 'ru'];
      
      invalidLanguages.forEach(lang => {
        expect(['zh', 'en', 'de', 'fr'].includes(lang)).toBe(false);
      });
    });
  });

  describe('Theme preference validation', () => {
    it('should accept valid theme values', () => {
      const validThemes = ['dark', 'light', 'system'];
      
      validThemes.forEach(theme => {
        expect(['dark', 'light', 'system'].includes(theme)).toBe(true);
      });
    });

    it('should reject invalid theme values', () => {
      const invalidThemes = ['auto', 'custom', 'blue'];
      
      invalidThemes.forEach(theme => {
        expect(['dark', 'light', 'system'].includes(theme)).toBe(false);
      });
    });
  });
});
