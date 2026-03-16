/**
 * User preference management
 * Auto-decomposed from server/db.ts
 */
import { sql, type SQL } from "drizzle-orm";
import { requireDb } from "./connection";

// ==================== 用户偏好管理 ====================

export interface UserPreference {
  id: number;
  userId: number;
  language: string;
  theme: string;
  sidebarCollapsed: boolean;
  dashboardLayout: object | null;
  notificationSettings: object | null;
  timezone: string;
  dateFormat: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsertUserPreference {
  userId: number;
  language?: string;
  theme?: string;
  sidebarCollapsed?: boolean;
  dashboardLayout?: object;
  notificationSettings?: object;
  timezone?: string;
  dateFormat?: string;
}

/**
 * 获取用户偏好设置
 */
export async function getUserPreferences(userId: number): Promise<UserPreference | null> {
  const db = await requireDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`SELECT * FROM user_preferences WHERE user_id = ${userId} LIMIT 1`
  );
  
  const rows = result[0] as any[];
  if (!rows || rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    language: row.language,
    theme: row.theme,
    sidebarCollapsed: Boolean(row.sidebar_collapsed),
    dashboardLayout: row.dashboard_layout ? JSON.parse(row.dashboard_layout) : null,
    notificationSettings: row.notification_settings ? JSON.parse(row.notification_settings) : null,
    timezone: row.timezone,
    dateFormat: row.date_format,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 创建或更新用户偏好设置
 */
export async function upsertUserPreferences(
  userId: number,
  preferences: Partial<InsertUserPreference>
): Promise<UserPreference | null> {
  const db = await requireDb();
  if (!db) return null;
  
  // 检查是否已存在
  const existing = await getUserPreferences(userId);
  
  if (existing) {
    // 更新现有记录
    const setParts: SQL[] = [];

    if (preferences.language !== undefined) {
      setParts.push(sql`language = ${preferences.language}`);
    }
    if (preferences.theme !== undefined) {
      setParts.push(sql`theme = ${preferences.theme}`);
    }
    if (preferences.sidebarCollapsed !== undefined) {
      setParts.push(sql`sidebar_collapsed = ${preferences.sidebarCollapsed ? 1 : 0}`);
    }
    if (preferences.dashboardLayout !== undefined) {
      setParts.push(sql`dashboard_layout = ${JSON.stringify(preferences.dashboardLayout)}`);
    }
    if (preferences.notificationSettings !== undefined) {
      setParts.push(sql`notification_settings = ${JSON.stringify(preferences.notificationSettings)}`);
    }
    if (preferences.timezone !== undefined) {
      setParts.push(sql`timezone = ${preferences.timezone}`);
    }
    if (preferences.dateFormat !== undefined) {
      setParts.push(sql`date_format = ${preferences.dateFormat}`);
    }

    if (setParts.length > 0) {
      await db.execute(
        sql`UPDATE user_preferences SET ${sql.join(setParts, sql`, `)} WHERE user_id = ${userId}`
      );
    }
  } else {
    // 创建新记录
    await db.execute(
      sql`INSERT INTO user_preferences (user_id, language, theme, sidebar_collapsed, timezone, date_format) 
          VALUES (${userId}, ${preferences.language || 'zh'}, ${preferences.theme || 'dark'}, 
                  ${preferences.sidebarCollapsed ? 1 : 0}, ${preferences.timezone || 'Asia/Shanghai'}, 
                  ${preferences.dateFormat || 'YYYY-MM-DD'})`
    );
  }
  
  return await getUserPreferences(userId);
}

/**
 * 更新用户语言偏好
 */
export async function updateUserLanguage(userId: number, language: string): Promise<UserPreference | null> {
  return await upsertUserPreferences(userId, { language });
}

/**
 * 更新用户主题偏好
 */
export async function updateUserTheme(userId: number, theme: string): Promise<UserPreference | null> {
  return await upsertUserPreferences(userId, { theme });
}
