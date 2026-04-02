# GRT 智能系统 — 运维手册

> 版本: v4.1.0 | 更新日期: 2026-03-23

---

## 目录

1. [启停命令](#1-启停命令)
2. [日志查看](#2-日志查看)
3. [健康检查](#3-健康检查)
4. [故障定位流程](#4-故障定位流程)
5. [常见异常及处理](#5-常见异常及处理)
6. [备份恢复](#6-备份恢复)
7. [升级与回滚](#7-升级与回滚)
8. [性能调优](#8-性能调优)

---

## 1. 启停命令

### 1.1 启动所有服务

```bash
cd /opt/grt-system
docker compose up -d
```

### 1.2 停止所有服务

```bash
docker compose down
```

> **注意**: `docker compose down` 会停止并移除容器，但不会删除数据卷。数据库数据安全。

### 1.3 重启应用 (不影响数据库)

```bash
docker compose restart grt-app
```

### 1.4 重启所有服务

```bash
docker compose restart
```

### 1.5 重建并启动 (代码更新后)

```bash
docker compose up -d --build grt-app
```

### 1.6 查看服务状态

```bash
docker compose ps

# 预期输出:
# NAME          STATUS          PORTS
# grt-app       Up (healthy)    0.0.0.0:3000->3000/tcp
# grt-postgres  Up (healthy)    0.0.0.0:5432->5432/tcp
# grt-redis     Up (healthy)    0.0.0.0:6379->6379/tcp
```

### 1.7 查看资源使用

```bash
docker stats --no-stream
```

---

## 2. 日志查看

### 2.1 实时日志

```bash
# 应用日志
docker compose logs -f grt-app

# 数据库日志
docker compose logs -f postgres

# 所有服务
docker compose logs -f
```

### 2.2 历史日志

```bash
# 最近 200 行
docker compose logs --tail=200 grt-app

# 按时间范围
docker compose logs --since="2026-03-21T00:00:00" --until="2026-03-21T23:59:59" grt-app
```

### 2.3 Pino 结构化日志格式

GRT 使用 pino 输出结构化 JSON 日志，每行一个 JSON 对象:

```json
{"level":30,"time":1711008000000,"pid":1,"hostname":"grt-app","module":"ai-gateway","msg":"Assistant invoked"}
```

**日志级别对照**:

| level | 名称 | 说明 |
|-------|------|------|
| 10 | trace | 追踪级别 |
| 20 | debug | 调试信息 |
| 30 | info | 正常运行信息 |
| 40 | warn | 警告 |
| 50 | error | 错误 |
| 60 | fatal | 致命错误 |

### 2.4 日志过滤

```bash
# 仅查看错误
docker compose logs grt-app 2>&1 | grep '"level":50'

# 仅查看特定模块
docker compose logs grt-app 2>&1 | grep '"module":"ai-gateway"'

# 格式化输出 (需安装 pino-pretty)
docker compose logs grt-app 2>&1 | npx pino-pretty
```

### 2.5 关键模块日志标识

| module 值 | 对应模块 |
|-----------|---------|
| `env` | 环境变量加载 |
| `ai-gateway` | AI 助手网关 |
| `agent-security` | Agent 安全沙箱 |
| `trpc` | tRPC 路由层 |
| `db` | 数据库操作 |
| `oauth` | 认证/SSO |

---

## 3. 健康检查

### 3.1 应用健康端点

```bash
curl -s http://localhost:3000/api/health | jq .
# 预期: {"status":"ok","timestamp":"2026-03-21T08:00:00.000Z"}
```

### 3.2 数据库健康

```bash
docker compose exec postgres pg_isready -U grt -d grt_db
# 预期: /var/run/postgresql:5432 - accepting connections
```

### 3.3 Redis 健康

```bash
docker compose exec redis redis-cli ping
# 预期: PONG
```

### 3.4 Docker 内置健康检查

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' grt-app
# 预期: healthy

# 查看健康检查历史
docker inspect --format='{{json .State.Health}}' grt-app | jq .
```

### 3.5 自动化健康检查脚本

```bash
#!/usr/bin/env bash
# /opt/grt-system/deploy/healthcheck.sh
set -euo pipefail

HEALTH_URL="http://localhost:3000/api/health"
TIMEOUT=10

echo "[$(date)] 开始健康检查..."

# 检查应用
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$HEALTH_URL" 2>/dev/null || echo "000")
if [ "$APP_STATUS" = "200" ]; then
    echo "[OK] 应用服务正常 (HTTP $APP_STATUS)"
else
    echo "[FAIL] 应用服务异常 (HTTP $APP_STATUS)"
fi

# 检查数据库
DB_STATUS=$(docker compose exec -T postgres pg_isready -U grt -d grt_db 2>/dev/null && echo "ok" || echo "fail")
if [ "$DB_STATUS" = "ok" ]; then
    echo "[OK] 数据库正常"
else
    echo "[FAIL] 数据库异常"
fi

# 检查 Redis
REDIS_STATUS=$(docker compose exec -T redis redis-cli ping 2>/dev/null || echo "fail")
if [ "$REDIS_STATUS" = "PONG" ]; then
    echo "[OK] Redis 正常"
else
    echo "[FAIL] Redis 异常"
fi
```

---

## 4. 故障定位流程

### 排查步骤

```
1. 检查服务状态
   └─ docker compose ps
   └─ 是否有 Exited / Unhealthy 的容器?

2. 查看日志
   └─ docker compose logs --tail=100 grt-app
   └─ 是否有 level:50 (error) 或 level:60 (fatal)?

3. 检查资源
   └─ docker stats --no-stream
   └─ CPU/内存是否超限?

4. 检查网络
   └─ docker compose exec grt-app ping postgres
   └─ 容器间网络是否正常?

5. 检查磁盘
   └─ df -h
   └─ 磁盘空间是否不足?

6. 检查外部依赖
   └─ AI API 连通性
   └─ SSO 服务连通性
```

---

## 5. 常见异常及处理

### 5.1 数据库连接失败

**现象**: 日志中出现 `ECONNREFUSED` 或 `connection refused`

**排查**:

```bash
# 检查 PostgreSQL 容器
docker compose ps postgres
docker compose logs --tail=30 postgres

# 手动测试连接
docker compose exec postgres pg_isready -U grt -d grt_db
```

**处理**:

```bash
# 重启数据库
docker compose restart postgres

# 等待就绪后重启应用
sleep 10
docker compose restart grt-app

# 如果数据卷损坏
docker compose down
docker volume rm grt_postgres_data
docker compose up -d
# 然后重新运行迁移
docker compose exec grt-app sh -c "npx drizzle-kit push"
```

### 5.2 Redis 超时

**现象**: 日志中出现 `Redis connection timeout` 或 `ECONNREFUSED :6379`

**排查**:

```bash
docker compose exec redis redis-cli ping
docker compose exec redis redis-cli info memory
```

**处理**:

```bash
# 重启 Redis
docker compose restart redis

# 如果内存不足，清理缓存
docker compose exec redis redis-cli FLUSHDB
```

### 5.3 AI 模型调用失败

**现象**: AI 助手返回错误，日志中出现 `LLM invoke failed`

**排查**:

```bash
# 查看 AI 相关日志
docker compose logs grt-app 2>&1 | grep '"module":"ai-gateway"' | tail -20

# 测试 AI API 连通性
# Ollama:
curl http://localhost:11434/api/tags
# OpenAI:
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

**处理**:
- 检查 API Key 是否有效
- 检查网络连通性
- 检查账户余额 (OpenAI/DeepSeek)
- 切换到备用 Provider

### 5.4 LLM Provider 全面诊断

```bash
# 查看当前活跃 Provider
docker compose exec grt-app sh -c 'echo $AI_PROVIDER'

# 查看 LLM 调用日志 (包含 provider、model、duration_ms、tokens)
docker compose logs grt-app 2>&1 | grep '"module":"llm"' | tail -20

# 查看调用失败日志
docker compose logs grt-app 2>&1 | grep '"module":"llm"' | grep '"success":false' | tail -10

# 快速测试各 Provider 连通性
# OpenAI:
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Ollama:
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s" \
  http://localhost:11434/api/tags

# DeepSeek:
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  https://api.deepseek.com/v1/models

# Gemini:
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s" \
  "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

### 5.5 内存不足 (OOM)

**现象**: 容器被 kill，`docker compose ps` 显示 `Exited (137)`

**排查**:

```bash
free -h
docker stats --no-stream
dmesg | grep -i "out of memory" | tail -5
```

**处理**:

```bash
# 增加 swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 限制容器内存 (修改 docker-compose.yml)
# grt-app:
#   deploy:
#     resources:
#       limits:
#         memory: 2G
```

### 5.6 端口被占用

**现象**: `bind: address already in use`

```bash
# 查找占用端口的进程
sudo lsof -i :3000
sudo lsof -i :5432

# 终止进程或修改端口
# 修改 docker-compose.yml 中的端口映射
```

---

## 6. 备份恢复

### 6.1 数据库备份

```bash
# 创建备份 (自定义格式，支持并行恢复)
docker compose exec -T postgres pg_dump -U grt -Fc grt_db \
  > /opt/grt-system/backups/grt_db_$(date +%Y%m%d_%H%M%S).dump

# 创建备份 (SQL 文本格式，可读)
docker compose exec -T postgres pg_dump -U grt grt_db \
  > /opt/grt-system/backups/grt_db_$(date +%Y%m%d_%H%M%S).sql
```

### 6.2 数据库恢复

```bash
# 从自定义格式恢复
docker compose exec -T postgres pg_restore -U grt -d grt_db --clean \
  < /opt/grt-system/backups/grt_db_20260321_020000.dump

# 从 SQL 文本恢复
docker compose exec -T postgres psql -U grt -d grt_db \
  < /opt/grt-system/backups/grt_db_20260321_020000.sql
```

### 6.3 Redis 备份

```bash
# Redis 使用 AOF 持久化，数据存储在 docker volume 中
# 手动触发 RDB 快照
docker compose exec redis redis-cli BGSAVE

# 复制 RDB 文件
docker cp grt-redis:/data/dump.rdb /opt/grt-system/backups/redis_$(date +%Y%m%d).rdb
```

### 6.4 自动备份定时任务

```bash
# 每天凌晨 2 点备份
crontab -e
# 添加:
0 2 * * * /opt/grt-system/deploy/backup.sh >> /opt/grt-system/logs/backup.log 2>&1
```

---

## 7. 升级与回滚

### 7.1 标准升级流程

```bash
cd /opt/grt-system

# 第 1 步: 备份
docker compose exec -T postgres pg_dump -U grt -Fc grt_db \
  > /opt/grt-system/backups/pre_upgrade_$(date +%Y%m%d_%H%M%S).dump

# 第 2 步: 拉取新代码
git fetch origin
git log origin/master --oneline -5  # 查看将要更新的内容
git pull origin master

# 第 3 步: 重建应用镜像
docker compose up -d --build grt-app

# 第 4 步: 执行数据库迁移 (如有新表)
docker compose exec grt-app sh -c "npx drizzle-kit push"

# 第 5 步: 验证
curl -s http://localhost:3000/api/health | jq .
docker compose logs --tail=20 grt-app
```

### 7.2 回滚

```bash
# 第 1 步: 回退代码
git log --oneline -10  # 查看提交历史
git checkout <之前的 commit hash>

# 第 2 步: 重建
docker compose up -d --build grt-app

# 第 3 步: 恢复数据库 (如迁移有破坏性修改)
docker compose exec -T postgres pg_restore -U grt -d grt_db --clean \
  < /opt/grt-system/backups/pre_upgrade_20260321_020000.dump

# 第 4 步: 验证
curl -s http://localhost:3000/api/health | jq .
```

---

## 8. 性能调优

### 8.1 Node.js 内存

```bash
# 在 docker-compose.yml 中设置
environment:
  - NODE_OPTIONS=--max-old-space-size=2048
```

### 8.2 PostgreSQL 优化

```bash
# 编辑 PostgreSQL 配置 (通过 docker-compose.yml command)
postgres:
  command: >
    postgres
    -c shared_buffers=256MB
    -c effective_cache_size=1GB
    -c work_mem=16MB
    -c maintenance_work_mem=128MB
    -c max_connections=100
```

### 8.3 Redis 内存限制

```bash
redis:
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### 8.4 Nginx Worker 优化

```nginx
worker_processes auto;
worker_connections 1024;

http {
    keepalive_timeout 65;
    keepalive_requests 100;
}
```

### 8.5 监控关键指标

| 指标 | 正常范围 | 告警阈值 |
|------|---------|---------|
| CPU 使用率 | < 70% | > 85% |
| 内存使用率 | < 75% | > 90% |
| 磁盘使用率 | < 80% | > 90% |
| API 响应时间 (P95) | < 500ms | > 2000ms |
| AI 调用响应时间 | < 10s | > 30s |
| 数据库连接数 | < 50 | > 80 |
| 错误率 | < 1% | > 5% |
