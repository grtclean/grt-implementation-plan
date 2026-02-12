# 性能优化和缓存实现指南

## 概述

本指南提供了 GRT 智能系统的性能优化和缓存实现的完整方案，包括 Redis 缓存、数据库查询优化、索引创建等内容。

---

## 1. Redis 缓存配置

### 1.1 安装 Redis

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Docker
docker run -d -p 6379:6379 redis:latest
```

### 1.2 配置环境变量

```bash
# .env 文件
REDIS_URL=redis://localhost:6379
```

### 1.3 初始化 Redis 连接

```typescript
import { initRedis, warmupCache } from './server/cache';

// 在应用启动时初始化
await initRedis();
await warmupCache();
```

### 1.4 缓存策略

| 数据类型 | 缓存键 | TTL | 说明 |
|---------|------|-----|------|
| 用户权限 | `permissions:{userId}` | 1小时 | 用户权限列表 |
| 菜单配置 | `menu:{userId}` | 1小时 | 用户可访问菜单 |
| 用户数据范围 | `dataScope:{userId}` | 30分钟 | 用户数据访问范围 |
| 能力数据 | `capabilities:{userId}` | 2小时 | 员工能力信息 |
| 全局配置 | `config:global` | 1小时 | 系统全局配置 |

---

## 2. 数据库查询优化

### 2.1 创建索引

运行以下 SQL 语句创建推荐的索引：

```sql
-- 权限系统索引
CREATE INDEX idx_users_id ON users(id);
CREATE INDEX idx_roles_id ON roles(id);
CREATE INDEX idx_permissions_id ON permissions(id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 菜单系统索引
CREATE INDEX idx_menu_items_id ON menu_items(id);
CREATE INDEX idx_menu_items_parent_id ON menu_items(parent_id);
CREATE INDEX idx_menu_item_permissions_menu_id ON menu_item_permissions(menu_item_id);

-- 来访系统索引
CREATE INDEX idx_visitor_requests_id ON visitor_requests(id);
CREATE INDEX idx_visitor_requests_status ON visitor_requests(status);
CREATE INDEX idx_visitor_requests_user_id ON visitor_requests(user_id);

-- AI助手索引
CREATE INDEX idx_ai_assistants_id ON ai_assistants(id);
CREATE INDEX idx_ai_suggestions_assistant_id ON ai_suggestions(assistant_id);

-- 能力管理索引
CREATE INDEX idx_capabilities_id ON capabilities(id);
CREATE INDEX idx_employee_capabilities_employee_id ON employee_capabilities(employee_id);
```

### 2.2 使用优化的查询函数

```typescript
import { getOptimizedUserPermissions, getOptimizedMenu } from './server/query-optimization';

// 获取用户权限（自动使用缓存）
const permissions = await getOptimizedUserPermissions(userId);

// 获取用户菜单（自动使用缓存和权限过滤）
const menu = await getOptimizedMenu(userId, permissions);
```

### 2.3 查询性能监控

```typescript
import { monitorQueryPerformance } from './server/query-optimization';

// 监控查询性能
const result = await monitorQueryPerformance('getUserData', async () => {
  return db.query.getUserData(userId);
});
```

---

## 3. 性能指标目标

| 指标 | 目标 | 说明 |
|------|------|------|
| 权限检查 | < 100ms | 从缓存获取 |
| 菜单加载 | < 200ms | 包括权限过滤 |
| API 响应 | < 500ms | 平均响应时间 |
| 数据库查询 | < 100ms | 单个查询 |
| 页面加载 | < 2s | 完整页面加载 |
| 缓存命中率 | > 80% | 缓存有效性 |

---

## 4. 部署检查清单

### 4.1 前置条件

- [ ] Redis 服务已安装并运行
- [ ] 数据库连接正常
- [ ] 所有索引已创建
- [ ] 环境变量已配置

### 4.2 性能优化

- [ ] 启用 Redis 缓存
- [ ] 创建数据库索引
- [ ] 配置连接池
- [ ] 启用查询监控

### 4.3 监控和告警

- [ ] 配置慢查询日志
- [ ] 设置性能告警
- [ ] 监控缓存命中率
- [ ] 监控内存使用

### 4.4 测试验证

- [ ] 权限检查性能测试
- [ ] 菜单加载性能测试
- [ ] API 响应时间测试
- [ ] 并发压力测试

---

## 5. 故障排查

### 问题1：缓存未生效

**症状：** 查询时间没有改善

**解决方案：**
1. 检查 Redis 连接状态
2. 验证缓存键是否正确
3. 检查 TTL 设置
4. 查看缓存命中日志

### 问题2：数据库查询缓慢

**症状：** 查询执行时间 > 100ms

**解决方案：**
1. 检查是否创建了必要的索引
2. 分析查询执行计划
3. 优化 SQL 查询
4. 考虑使用批量查询

### 问题3：内存占用过高

**症状：** Redis 或应用内存占用持续增加

**解决方案：**
1. 检查缓存 TTL 设置
2. 清理过期缓存
3. 减少缓存数据量
4. 监控内存使用趋势

---

## 6. 最佳实践

### 6.1 缓存策略

```typescript
// ✅ 好的做法：设置合理的TTL
await setCache('permissions:user1', permissions, 3600); // 1小时

// ❌ 不好的做法：永久缓存
await setCache('permissions:user1', permissions, -1);

// ✅ 好的做法：权限变更时清除缓存
await deleteCache(`permissions:${userId}`);

// ✅ 好的做法：使用缓存预热
await warmupCache();
```

### 6.2 查询优化

```typescript
// ✅ 好的做法：使用JOIN替代多个查询
SELECT u.*, r.name FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.id = ?

// ❌ 不好的做法：N+1查询
for (const user of users) {
  const roles = await getRoles(user.id); // 多个查询
}

// ✅ 好的做法：使用分页
SELECT * FROM users LIMIT 20 OFFSET 0

// ❌ 不好的做法：一次性加载所有数据
SELECT * FROM users; // 可能返回数百万条记录
```

### 6.3 监控和告警

```typescript
// ✅ 好的做法：监控查询性能
const result = await monitorQueryPerformance('getUserPermissions', async () => {
  return getOptimizedUserPermissions(userId);
});

// ✅ 好的做法：设置性能告警
if (duration > 1000) {
  logger.warn(`慢查询警告: ${queryName} 耗时 ${duration}ms`);
}
```

---

## 7. 性能基准测试

### 7.1 测试场景

```bash
# 权限检查性能测试
pnpm test:performance -- permission

# 菜单加载性能测试
pnpm test:performance -- menu

# API 响应时间测试
pnpm test:performance -- api

# 并发压力测试
pnpm test:performance -- concurrent
```

### 7.2 预期结果

```
权限检查:
  - 无缓存: 150ms
  - 有缓存: 10ms
  - 改善: 93%

菜单加载:
  - 无缓存: 250ms
  - 有缓存: 20ms
  - 改善: 92%

API响应:
  - 无优化: 800ms
  - 优化后: 300ms
  - 改善: 62%
```

---

## 8. 后续优化建议

### 短期 (1-2周)

1. **实现查询结果缓存** - 缓存常用查询结果
2. **添加性能监控** - 集成 APM 工具（如 New Relic）
3. **优化前端加载** - 实现代码分割和懒加载

### 中期 (2-4周)

1. **实现 CDN** - 加速静态资源分发
2. **数据库分片** - 按用户或部门分片
3. **消息队列** - 异步处理耗时操作

### 长期 (1-3个月)

1. **微服务架构** - 拆分为独立服务
2. **容器化部署** - 使用 Docker 和 Kubernetes
3. **全球分布式** - 多地域部署

---

## 9. 参考资源

- [Redis 官方文档](https://redis.io/documentation)
- [MySQL 性能优化](https://dev.mysql.com/doc/)
- [Node.js 性能最佳实践](https://nodejs.org/en/docs/guides/simple-profiling/)
- [React 性能优化](https://react.dev/reference/react/useMemo)

---

**最后更新：** 2026-01-30  
**版本：** 1.0  
**状态：** 📋 待实施
