/**
 * 菜单导航系统数据库Schema定义
 * 支持动态菜单、权限控制、国际化
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  primaryKey,
  index,
} from 'drizzle-orm/mysql-core';

/**
 * 菜单项表
 * 定义系统中的所有菜单项
 */
export const menuItems = mysqlTable(
  'grt_menu_items',
  {
    id: int().autoincrement().primaryKey(),

    // 菜单基本信息
    code: varchar('code', { length: 128 }).notNull().unique(), // 菜单编码
    name: varchar('name', { length: 128 }).notNull(),          // 菜单名称
    icon: varchar('icon', { length: 64 }),                     // 图标（lucide-react图标名称）
    path: varchar('path', { length: 256 }),                    // 路由路径

    // 菜单层级
    parentId: int('parent_id'),                                 // 父菜单ID
    level: int('level').default(1),                            // 菜单层级（1=一级，2=二级等）
    order: int('order').default(0),                            // 排序顺序

    // 菜单类型
    menuType: varchar('menu_type', { length: 32 }).default('link'), // link, divider, group等

    // 权限和可见性
    requiredPermission: varchar('required_permission', { length: 128 }), // 所需权限编码
    requiredRole: varchar('required_role', { length: 128 }),           // 所需角色
    requiredCertificate: varchar('required_certificate', { length: 128 }), // 所需认证
    visibleRoles: json('visible_roles'),                        // 可见的角色列表
    hiddenRoles: json('hidden_roles'),                          // 隐藏的角色列表

    // 国际化
    i18nKey: varchar('i18n_key', { length: 256 }),            // i18n键
    descriptionI18nKey: varchar('description_i18n_key', { length: 256 }), // 描述i18n键

    // 菜单属性
    badge: varchar('badge', { length: 64 }),                  // 徽章文本（如"新"、"3"）
    badgeColor: varchar('badge_color', { length: 32 }),       // 徽章颜色
    isExternal: boolean('is_external').default(false),         // 是否外部链接
    openInNewTab: boolean('open_in_new_tab').default(false),   // 是否新标签页打开
    divider: boolean('divider').default(false),                // 是否分割线
    collapsible: boolean('collapsible').default(true),         // 是否可折叠

    // 状态
    isActive: boolean('is_active').default(true),
    isVisible: boolean('is_visible').default(true),

    // 元数据
    metadata: json('metadata'),                                // 额外的元数据

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    codeIdx: index('menu_code_idx').on(table.code),
    parentIdIdx: index('menu_parent_id_idx').on(table.parentId),
    levelIdx: index('menu_level_idx').on(table.level),
  })
);

/**
 * 菜单权限关联表
 * 定义菜单项的权限要求
 */
export const menuPermissions = mysqlTable(
  'grt_menu_permissions',
  {
    id: int().autoincrement().primaryKey(),

    // 关联信息
    menuItemId: int('menu_item_id').notNull(),
    permissionId: int('permission_id').notNull(),

    // 权限类型
    permissionType: varchar('permission_type', { length: 32 }).default('required'), // required, optional

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    menuItemIdIdx: index('menu_perm_menu_id_idx').on(table.menuItemId),
    permissionIdIdx: index('menu_perm_perm_id_idx').on(table.permissionId),
  })
);

/**
 * 菜单角色关联表
 * 定义菜单项对不同角色的可见性
 */
export const menuRoles = mysqlTable(
  'grt_menu_roles',
  {
    id: int().autoincrement().primaryKey(),

    // 关联信息
    menuItemId: int('menu_item_id').notNull(),
    roleId: int('role_id').notNull(),

    // 可见性
    isVisible: boolean('is_visible').default(true),
    canAccess: boolean('can_access').default(true),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    menuItemIdIdx: index('menu_role_menu_id_idx').on(table.menuItemId),
    roleIdIdx: index('menu_role_role_id_idx').on(table.roleId),
  })
);

/**
 * 用户菜单自定义表
 * 允许用户自定义菜单显示
 */
export const userMenuCustomization = mysqlTable(
  'grt_user_menu_customization',
  {
    id: int().autoincrement().primaryKey(),

    // 用户信息
    userId: varchar('user_id', { length: 64 }).notNull(),

    // 菜单项信息
    menuItemId: int('menu_item_id').notNull(),

    // 自定义设置
    isHidden: boolean('is_hidden').default(false),
    order: int('order').default(0),
    customName: varchar('custom_name', { length: 128 }),
    customIcon: varchar('custom_icon', { length: 64 }),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_menu_user_id_idx').on(table.userId),
    menuItemIdIdx: index('user_menu_item_id_idx').on(table.menuItemId),
  })
);

/**
 * 菜单配置表
 * 存储菜单系统的全局配置
 */
export const menuConfigs = mysqlTable(
  'grt_menu_configs',
  {
    id: int().autoincrement().primaryKey(),

    // 配置键
    configKey: varchar('config_key', { length: 128 }).notNull().unique(),
    configValue: json('config_value').notNull(),

    // 配置描述
    description: text('description'),

    // 配置类型
    configType: varchar('config_type', { length: 64 }), // layout, theme, behavior等

    // 状态
    isActive: boolean('is_active').default(true),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    configKeyIdx: index('menu_config_key_idx').on(table.configKey),
  })
);

/**
 * 菜单访问日志表
 * 记录用户对菜单项的访问
 */
export const menuAccessLogs = mysqlTable(
  'grt_menu_access_logs',
  {
    id: int().autoincrement().primaryKey(),

    // 用户信息
    userId: varchar('user_id', { length: 64 }).notNull(),

    // 菜单项信息
    menuItemId: int('menu_item_id').notNull(),
    menuCode: varchar('menu_code', { length: 128 }),
    menuPath: varchar('menu_path', { length: 256 }),

    // 访问信息
    accessCount: int('access_count').default(1),
    lastAccessAt: timestamp('last_access_at').defaultNow(),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('menu_log_user_id_idx').on(table.userId),
    menuItemIdIdx: index('menu_log_menu_id_idx').on(table.menuItemId),
  })
);

/**
 * 菜单搜索索引表
 * 用于菜单搜索功能
 */
export const menuSearchIndex = mysqlTable(
  'grt_menu_search_index',
  {
    id: int().autoincrement().primaryKey(),

    // 菜单项信息
    menuItemId: int('menu_item_id').notNull(),
    menuCode: varchar('menu_code', { length: 128 }).notNull(),

    // 搜索内容
    searchText: text('search_text'),
    keywords: json('keywords'),

    // 搜索权重
    weight: int('weight').default(1),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    menuItemIdIdx: index('menu_search_menu_id_idx').on(table.menuItemId),
  })
);

/**
 * 导出类型定义
 */
export type MenuItem = typeof menuItems.$inferSelect;
export type MenuPermission = typeof menuPermissions.$inferSelect;
export type MenuRole = typeof menuRoles.$inferSelect;
export type UserMenuCustomization = typeof userMenuCustomization.$inferSelect;
export type MenuConfig = typeof menuConfigs.$inferSelect;
export type MenuAccessLog = typeof menuAccessLogs.$inferSelect;
export type MenuSearchIndex = typeof menuSearchIndex.$inferSelect;

/**
 * 菜单项的完整类型定义（用于前端）
 */
export type MenuItemWithChildren = MenuItem & {
  children?: MenuItemWithChildren[];
  isAccessible?: boolean;
};
