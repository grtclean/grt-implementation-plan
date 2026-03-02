/**
 * 数据库查询优化模块
 * 使用索引、连接池、查询优化等技术提升性能
 */

import { requireDb } from './db';
import {
  getUserPermissionsCache,
  setUserPermissionsCache,
  getMenuCache,
  setMenuCache,
} from './cache';
import { createChildLogger } from "./lib/logger";

const log = createChildLogger("query-opt");

/**
 * 优化的权限查询
 * 使用缓存和数据库连接池
 */
export async function getOptimizedUserPermissions(userId: string) {
  // 1. 尝试从缓存获取
  const cachedPermissions = await getUserPermissionsCache(userId);
  if (cachedPermissions) {
    log.debug({ userId }, "Permission cache hit");
    return cachedPermissions;
  }

  // 2. 从数据库查询
  log.debug({ userId }, "Permission cache miss, querying DB");
  const db = await requireDb();
  // 注意：这里需要根据实际的schema实现权限查询
  // 占位符实现
  const permissions: string[] = [];

  // 3. 存入缓存
  await setUserPermissionsCache(userId, permissions);

  return permissions;
}

/**
 * 优化的菜单查询
 * 使用缓存和权限过滤
 */
export async function getOptimizedMenu(userId: string, userPermissions: string[]) {
  // 1. 尝试从缓存获取
  const cachedMenu = await getMenuCache(userId);
  if (cachedMenu) {
    log.debug({ userId }, "Menu cache hit");
    return cachedMenu;
  }

  // 2. 从数据库查询
  log.debug({ userId }, "Menu cache miss, querying DB");
  const db = await requireDb();
  // 注意：这里需要根据实际的schema实现菜单查询
  // 占位符实现
  const allMenus: any[] = [];

  // 3. 根据权限过滤菜单
  const filteredMenus = filterMenusByPermission(allMenus, userPermissions);

  // 4. 存入缓存
  await setMenuCache(userId, filteredMenus);

  return filteredMenus;
}

/**
 * 根据权限过滤菜单
 */
function filterMenusByPermission(menus: any[], permissions: string[]) {
  return menus.filter((menu) => {
    if (!menu.requiredPermission) return true;
    return permissions.includes(menu.requiredPermission);
  });
}

/**
 * 批量查询优化
 * 使用单个查询替代多个查询
 */
export async function getBatchUserData(userId: string) {
  // 使用单个查询获取所有用户相关数据
  const db = await requireDb();
  // 占位符实现
  return { userId, data: {} };
}

/**
 * 分页查询优化
 * 使用LIMIT和OFFSET进行高效分页
 */
export async function getPaginatedData(
  tableName: string,
  page: number = 1,
  pageSize: number = 20
) {
  const db = await requireDb();
  const offset = (page - 1) * pageSize;
  // 占位符实现 - 实际使用时需要根据表名动态查询
  return { page, pageSize, offset, data: [] };
}

/**
 * 查询性能监控
 * 记录查询执行时间
 */
export async function monitorQueryPerformance(
  queryName: string,
  queryFn: () => Promise<any>
) {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    if (duration > 100) {
      log.warn({ queryName, duration }, "Slow query detected");
    } else {
      log.debug({ queryName, duration }, "Query completed");
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error({ err: error, queryName, duration }, "Query failed");
    throw error;
  }
}

/**
 * 数据库连接池配置
 * 推荐配置:
 * - 最小连接数: 5
 * - 最大连接数: 20
 * - 连接超时: 30秒
 * - 空闲超时: 5分钟
 */
export const DATABASE_POOL_CONFIG = {
  min: 5,
  max: 20,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 300000,
};

/**
 * 查询优化建议
 * 
 * 1. 使用索引
 *    - 在频繁查询的字段上创建索引
 *    - 例如: user_id, role_id, permission_id
 * 
 * 2. 使用连接池
 *    - 复用数据库连接
 *    - 减少连接建立的开销
 * 
 * 3. 使用缓存
 *    - 缓存频繁查询的数据
 *    - 设置合理的TTL
 * 
 * 4. 避免N+1查询
 *    - 使用JOIN替代多个查询
 *    - 使用批量查询
 * 
 * 5. 使用分页
 *    - 大数据集使用分页查询
 *    - 避免一次性加载所有数据
 * 
 * 6. 查询监控
 *    - 监控慢查询
 *    - 记录查询执行时间
 *    - 定期优化
 */

/**
 * 数据库索引建议
 */
export const RECOMMENDED_INDEXES = [
  // 权限系统
  'CREATE INDEX idx_users_id ON users(id)',
  'CREATE INDEX idx_roles_id ON roles(id)',
  'CREATE INDEX idx_permissions_id ON permissions(id)',
  'CREATE INDEX idx_user_roles_user_id ON user_roles(user_id)',
  'CREATE INDEX idx_user_roles_role_id ON user_roles(role_id)',
  'CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id)',
  'CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id)',
  
  // 菜单系统
  'CREATE INDEX idx_menu_items_id ON menu_items(id)',
  'CREATE INDEX idx_menu_items_parent_id ON menu_items(parent_id)',
  'CREATE INDEX idx_menu_item_permissions_menu_id ON menu_item_permissions(menu_item_id)',
  
  // 来访系统
  'CREATE INDEX idx_visitor_requests_id ON visitor_requests(id)',
  'CREATE INDEX idx_visitor_requests_status ON visitor_requests(status)',
  'CREATE INDEX idx_visitor_requests_user_id ON visitor_requests(user_id)',
  
  // AI助手
  'CREATE INDEX idx_ai_assistants_id ON ai_assistants(id)',
  'CREATE INDEX idx_ai_suggestions_assistant_id ON ai_suggestions(assistant_id)',
  
  // 能力管理
  'CREATE INDEX idx_capabilities_id ON capabilities(id)',
  'CREATE INDEX idx_employee_capabilities_employee_id ON employee_capabilities(employee_id)',
];
