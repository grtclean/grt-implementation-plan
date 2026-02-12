# Redis 配置指南

## 概述

GRT智能系统支持Redis缓存以提升性能。当配置了Redis后，系统将使用Redis作为主缓存，同时保留内存缓存作为备份。当Redis不可用时，系统会自动回退到内存缓存。

## 配置方式

### 1. 环境变量配置

在 Manus 平台的 Settings → Secrets 中添加以下环境变量：

```
REDIS_URL=redis://username:password@host:port/database
```

### 2. 常见Redis服务提供商配置

#### Upstash (推荐 - 免费层可用)

```
REDIS_URL=rediss://default:your-password@your-endpoint.upstash.io:6379
```

**获取步骤：**
1. 访问 https://upstash.com/
2. 创建免费账户
3. 创建新的 Redis 数据库
4. 复制 REST URL 或 Redis URL

#### Redis Cloud (Redis Labs)

```
REDIS_URL=redis://default:your-password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

**获取步骤：**
1. 访问 https://redis.com/try-free/
2. 创建免费账户
3. 创建新的数据库
4. 在 Configuration 中获取连接信息

#### Railway

```
REDIS_URL=redis://default:password@containers-us-west-123.railway.app:6379
```

**获取步骤：**
1. 访问 https://railway.app/
2. 创建新项目
3. 添加 Redis 服务
4. 复制 REDIS_URL 环境变量

#### 自托管 Redis

```
REDIS_URL=redis://username:password@your-server-ip:6379/0
```

### 3. 连接字符串格式

```
redis[s]://[[username][:password]@][host][:port][/db-number]
```

- `redis://` - 标准连接
- `rediss://` - TLS/SSL 加密连接（推荐用于生产环境）
- `username` - 用户名（可选，默认为 default）
- `password` - 密码
- `host` - Redis 服务器地址
- `port` - 端口（默认 6379）
- `db-number` - 数据库编号（默认 0）

## 缓存策略

### TTL 配置

系统使用以下默认缓存过期时间：

| 缓存类型 | TTL | 说明 |
|---------|-----|------|
| 权限 (Permissions) | 1小时 | 用户权限列表 |
| 菜单 (Menus) | 1小时 | 用户菜单结构 |
| 用户数据 (User Data) | 30分钟 | 用户基本信息 |
| 能力 (Capabilities) | 2小时 | 用户能力等级 |
| 会话 (Session) | 24小时 | 用户会话信息 |
| 来访请求 (Visitor) | 5分钟 | 来访申请缓存 |

### 缓存键前缀

| 前缀 | 用途 |
|-----|------|
| `perm:` | 权限缓存 |
| `menu:` | 菜单缓存 |
| `user:` | 用户数据缓存 |
| `cap:` | 能力缓存 |
| `scope:` | 数据范围缓存 |
| `visitor:` | 来访请求缓存 |
| `config:` | 系统配置缓存 |

## 性能基准

### 内存缓存 (无Redis)

| 操作 | 平均耗时 |
|-----|---------|
| 写入 | 0.10ms |
| 读取 | 0.06ms |
| 100并发写入 | 0.34ms |
| 批量失效 | 0.34ms |

### Redis缓存 (预期)

| 操作 | 预期耗时 |
|-----|---------|
| 写入 | 1-5ms |
| 读取 | 1-3ms |
| 100并发写入 | 50-100ms |
| 批量失效 | 10-50ms |

## 故障处理

### 自动回退机制

当Redis连接失败时，系统会自动：

1. 记录错误日志
2. 切换到内存缓存
3. 继续正常运行

### 手动清除缓存

如需手动清除缓存，可以通过以下方式：

1. **清除所有权限缓存**
   ```typescript
   await cacheManager.invalidateAllPermissions();
   ```

2. **清除所有菜单缓存**
   ```typescript
   await cacheManager.invalidateAllMenus();
   ```

3. **清除特定用户缓存**
   ```typescript
   await cacheManager.invalidateUserAllCache(userId);
   ```

4. **清空所有缓存**
   ```typescript
   await cacheManager.clear();
   ```

## 监控和调试

### 获取缓存统计

```typescript
const stats = cacheManager.getStats();
console.log(stats);
// {
//   type: 'redis' | 'memory',
//   memoryStats: {
//     size: 100,
//     keys: ['perm:user1', 'menu:user1', ...]
//   }
// }
```

### 日志输出

系统启动时会输出缓存状态：

- `✅ Redis缓存已启用` - Redis连接成功
- `⚠️ Redis连接失败，使用内存缓存` - Redis连接失败
- `ℹ️ 未配置REDIS_URL，使用内存缓存` - 未配置Redis

## 最佳实践

1. **生产环境必须使用TLS连接** (`rediss://`)
2. **设置合理的连接超时** (默认5秒)
3. **监控Redis内存使用** (避免超出限制)
4. **定期检查缓存命中率** (优化TTL配置)
5. **使用独立的Redis实例** (避免与其他服务共享)

## 常见问题

### Q: Redis连接失败怎么办？

A: 系统会自动回退到内存缓存，不影响正常使用。检查：
- 网络连接是否正常
- Redis服务是否运行
- 连接字符串是否正确
- 防火墙是否允许连接

### Q: 缓存数据不一致怎么办？

A: 可以手动清除相关缓存：
```typescript
await cacheManager.invalidateUserAllCache(userId);
```

### Q: 如何迁移到Redis？

A: 只需设置 `REDIS_URL` 环境变量并重启服务，系统会自动使用Redis。
