# GRT 智能系统 — Linux 部署指南

> 版本: v4.1.0 | 更新日期: 2026-03-23 | 适用环境: Ubuntu 22.04 / 24.04 LTS

---

## 目录

1. [系统要求](#1-系统要求)
2. [服务器准备](#2-服务器准备)
3. [Docker + Docker Compose 安装](#3-docker--docker-compose-安装)
4. [项目部署](#4-项目部署)
5. [环境变量配置](#5-环境变量配置)
6. [数据库初始化](#6-数据库初始化)
7. [Redis 配置](#7-redis-配置)
8. [Nginx 反向代理配置](#8-nginx-反向代理配置)
9. [HTTPS 证书 (Let's Encrypt)](#9-https-证书-lets-encrypt)
10. [健康检查与监控](#10-健康检查与监控)
11. [日志管理](#11-日志管理)
12. [升级与回滚](#12-升级与回滚)
13. [常见问题](#13-常见问题)

---

## 1. 系统要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| 操作系统 | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 2 核 | 4 核及以上 |
| 内存 | 4 GB | 8 GB 及以上 |
| 磁盘 | 40 GB SSD | 100 GB SSD |
| 网络 | 可访问外网 (拉取镜像) | 内网 + 外网双网卡 |
| Docker | 24.0+ | 27.0+ |
| Docker Compose | v2.20+ | v2.29+ |

> **注意**: 若需在内网离线环境部署，请提前在有网络的机器上执行 `docker save` 导出镜像。

### 系统依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl git wget ca-certificates gnupg lsb-release
```

---

## 2. 服务器准备

### 2.1 创建部署用户

```bash
# 创建专用用户 (避免使用 root)
sudo adduser grt-deploy
sudo usermod -aG sudo grt-deploy

# 切换到部署用户
su - grt-deploy
```

### 2.2 防火墙配置

```bash
# 安装并配置 UFW
sudo apt install -y ufw

# 允许 SSH、HTTP、HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 如需直接访问应用端口 (开发/测试环境)
sudo ufw allow 3000/tcp

# 启用防火墙
sudo ufw enable
sudo ufw status
```

### 2.3 时区与 NTP 同步

```bash
# 设置时区
sudo timedatectl set-timezone Asia/Shanghai

# 安装并启用 NTP 同步
sudo apt install -y chrony
sudo systemctl enable chrony
sudo systemctl start chrony

# 验证
timedatectl status
```

### 2.4 创建部署目录

```bash
sudo mkdir -p /opt/grt-system/{data,logs,backups,uploads}
sudo chown -R $USER:$USER /opt/grt-system
```

### 2.5 系统内核参数优化 (可选)

```bash
# 提高文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 优化网络参数
sudo tee -a /etc/sysctl.conf <<EOF
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
vm.overcommit_memory = 1
EOF
sudo sysctl -p
```

---

## 3. Docker + Docker Compose 安装

### 3.1 安装 Docker Engine

```bash
# 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 添加 Docker 软件源
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 将当前用户加入 docker 组 (免 sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### 3.2 验证安装

```bash
docker --version
# Docker version 27.x.x

docker compose version
# Docker Compose version v2.29.x

# 运行测试容器
docker run --rm hello-world
```

### 3.3 国内镜像加速 (可选)

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://registry.docker-cn.com"
  ]
}
EOF
sudo systemctl daemon-reload && sudo systemctl restart docker
```

---

## 4. 项目部署

### 4.1 拉取代码

```bash
cd /opt
sudo git clone https://your-git-server.com/grt/grt-implementation-plan.git grt-system
sudo chown -R $USER:$USER /opt/grt-system
cd /opt/grt-system
```

### 4.2 使用安装脚本 (推荐)

项目自带安装脚本，执行以下命令完成目录创建、环境文件初始化、镜像拉取和数据库迁移:

```bash
chmod +x deploy/install.sh
./deploy/install.sh
```

脚本会:
1. 检查 `docker`、`git`、`curl` 是否已安装
2. 创建数据目录 `/opt/grt-system/{data,logs,backups,uploads}`
3. 复制 `.env.example` 为 `.env` (如不存在)
4. 拉取 Docker 镜像并构建应用镜像
5. 启动 PostgreSQL，执行 `drizzle-kit push` 迁移

### 4.3 手动部署

如果不使用安装脚本:

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量 (必须修改密码和密钥)
nano .env

# 构建并启动所有服务
docker compose up -d --build

# 查看服务状态
docker compose ps
```

### 4.4 服务说明

`docker-compose.yml` 包含以下服务:

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| `grt-app` | grt-app | 3000 | 应用服务 (Node.js 22) |
| `postgres` | grt-postgres | 5432 | PostgreSQL 16 数据库 |
| `redis` | grt-redis | 6379 | Redis 7 缓存 |
| `adminer` | grt-adminer | 8080 | 数据库管理 (仅开发环境) |

启动 Adminer (仅开发):

```bash
docker compose --profile dev up -d adminer
```

---

## 5. 环境变量配置

编辑 `.env` 文件，以下为关键变量说明:

### 5.1 核心配置

```bash
# 运行环境: development / production / test
NODE_ENV=production

# 数据库连接字符串
DATABASE_URL=postgresql://grt:your_secure_password@postgres:5432/grt_db

# PostgreSQL 密码 (docker compose 创建数据库时使用)
POSTGRES_PASSWORD=your_secure_password

# JWT 密钥 (至少 32 位随机字符串)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

### 5.2 认证配置

```bash
# 本地认证模式 (true=内置账号体系, false=SSO)
LOCAL_AUTH=true
VITE_LOCAL_AUTH=true

# SSO 地址 (LOCAL_AUTH=false 时生效)
VITE_OAUTH_PORTAL_URL=https://sso.your-domain.com
```

### 5.3 AI 模型配置

```bash
# AI 提供商: openai / ollama / deepseek
AI_PROVIDER=ollama

# OpenAI 配置
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# Ollama 配置 (本地模型)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.1

# DeepSeek 配置
DEEPSEEK_API_KEY=your-deepseek-key

# Gemini 配置
GEMINI_API_KEY=your-gemini-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_MODEL=gemini-2.0-flash

# 区域路由: US / CN / DE
APP_REGION=CN
```

### 5.4 安全配置

```bash
# 加密主密钥 (64 位十六进制字符串)
ENCRYPTION_MASTER_KEY=your-64-char-hex-key

# 许可证密钥
LICENSE_SECRET=your-license-secret

# 同步密钥
SYNC_SECRET_KEY=your-sync-secret
```

### 5.5 Redis 配置

```bash
REDIS_URL=redis://localhost:6379
# 带密码: redis://:your_password@localhost:6379
```

### 5.6 前端配置

```bash
VITE_APP_ID=grt-production
VITE_APP_TITLE=GRT智能系统
VITE_API_URL=/api
```

---

## 6. 数据库初始化

### 6.1 自动迁移 (推荐)

安装脚本已包含迁移步骤。手动执行:

```bash
# 确保数据库容器已启动
docker compose up -d postgres

# 等待数据库就绪
until docker compose exec -T postgres pg_isready -U grt -d grt_db; do
  sleep 2
done

# 执行 Drizzle ORM 迁移
docker compose run --rm grt-app sh -c "npx drizzle-kit push"
```

### 6.2 生产环境迁移

生产环境建议使用 `generate + migrate` 两步模式:

```bash
# 生成迁移文件 (可审查 SQL)
npx drizzle-kit generate

# 执行迁移
npx drizzle-kit migrate
```

### 6.3 数据库管理

```bash
# 启动 Drizzle Studio (可视化管理)
npx drizzle-kit studio

# 直接连接 PostgreSQL
docker compose exec postgres psql -U grt -d grt_db
```

---

## 7. Redis 配置

### 7.1 默认配置

`docker-compose.yml` 中 Redis 已配置 AOF 持久化:

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
```

### 7.2 添加密码保护

```bash
# 修改 docker-compose.yml 中 redis 的 command:
command: redis-server --appendonly yes --requirepass your_redis_password

# 同时更新 .env 中的 REDIS_URL:
REDIS_URL=redis://:your_redis_password@redis:6379
```

### 7.3 内存限制

```bash
# 在 docker-compose.yml 中添加:
redis:
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## 8. Nginx 反向代理配置

### 8.1 安装 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 8.2 配置文件

```bash
sudo tee /etc/nginx/sites-available/grt-system <<'EOF'
server {
    listen 80;
    server_name your-domain.com;

    # 强制跳转 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书 (Let's Encrypt 路径)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # 客户端上传限制
    client_max_body_size 50M;

    # 反向代理到 GRT 应用
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API 路径 (更长超时，适配 AI 调用)
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/grt-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 9. HTTPS 证书 (Let's Encrypt)

### 9.1 安装 Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 9.2 获取证书

```bash
sudo certbot --nginx -d your-domain.com
```

### 9.3 自动续期

```bash
# Certbot 自动安装 systemd timer，验证:
sudo systemctl status certbot.timer

# 手动测试续期
sudo certbot renew --dry-run
```

---

## 10. 健康检查与监控

### 10.1 HTTP 健康检查端点

```bash
# 检查应用健康状态
curl -s http://localhost:3000/api/health | jq .

# 预期响应:
# { "status": "ok", "timestamp": "2026-03-21T08:00:00.000Z" }
```

### 10.2 Docker 健康检查

`docker-compose.yml` 已配置各服务的健康检查:

```bash
# 查看所有服务健康状态
docker compose ps

# 查看特定服务健康日志
docker inspect --format='{{json .State.Health}}' grt-app | jq .
```

### 10.3 LLM Provider 健康检查

GRT 的统一 LLM 层 (`server/llm/`) 内置了全 Provider 健康检查:

```bash
# 通过 tRPC 调用健康检查 (需登录)
curl -s http://localhost:3000/api/trpc/llm.healthCheckAll | jq .

# 或在 Node.js 中调用
# import { providerRegistry } from "../llm";
# const results = await providerRegistry.healthCheckAll();
```

### 10.4 自动化监控脚本

```bash
#!/usr/bin/env bash
# /opt/grt-system/deploy/healthcheck.sh
set -euo pipefail

HEALTH_URL="http://localhost:3000/api/health"
ALERT_WEBHOOK="${ALERT_WEBHOOK_URL:-}"

status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$status" != "200" ]; then
    echo "[ALERT] GRT health check failed: HTTP $status"
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{\"text\": \"GRT健康检查失败: HTTP $status, 时间: $(date)\"}"
    fi
    exit 1
fi

echo "[OK] GRT health check passed"
```

添加到 crontab:

```bash
# 每 5 分钟检查一次
echo "*/5 * * * * /opt/grt-system/deploy/healthcheck.sh >> /opt/grt-system/logs/healthcheck.log 2>&1" | crontab -
```

---

## 11. 日志管理

### 11.1 查看容器日志

```bash
# 查看应用日志
docker compose logs -f grt-app

# 查看最近 100 行
docker compose logs --tail=100 grt-app

# 查看所有服务日志
docker compose logs -f

# 按时间过滤
docker compose logs --since="2026-03-21T08:00:00" grt-app
```

### 11.2 Pino 结构化日志

GRT 使用 pino 输出结构化 JSON 日志，每行一个 JSON 对象:

```json
{"level":30,"time":1711008000000,"pid":1,"hostname":"grt-app","module":"ai-gateway","msg":"Assistant invoked","assistantId":"solution","userId":42,"responseTimeMs":1234}
```

常用字段:

| 字段 | 说明 |
|------|------|
| `level` | 日志级别: 10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal |
| `module` | 模块名 (由 `createChildLogger` 创建) |
| `msg` | 日志消息 |
| `err` | 错误对象 (含 stack) |
| `time` | Unix 毫秒时间戳 |

### 11.3 日志过滤

```bash
# 过滤错误日志
docker compose logs grt-app 2>&1 | grep '"level":50'

# 使用 pino-pretty 格式化 (需安装)
docker compose logs grt-app 2>&1 | npx pino-pretty

# 过滤特定模块
docker compose logs grt-app 2>&1 | grep '"module":"ai-gateway"'
```

### 11.4 日志轮转

```bash
sudo tee /etc/logrotate.d/grt-system <<EOF
/opt/grt-system/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
```

---

## 12. 升级与回滚

### 12.1 升级流程

```bash
cd /opt/grt-system

# 1. 备份数据库
docker compose exec postgres pg_dump -U grt grt_db > \
  /opt/grt-system/backups/grt_db_$(date +%Y%m%d_%H%M%S).sql

# 2. 拉取最新代码
git pull origin master

# 3. 重新构建并启动 (零停机)
docker compose up -d --build grt-app

# 4. 执行数据库迁移 (如有)
docker compose exec grt-app sh -c "npx drizzle-kit push"

# 5. 验证健康
curl -s http://localhost:3000/api/health | jq .
```

### 12.2 回滚操作

```bash
# 1. 回退代码到指定版本
git log --oneline -10  # 查看最近提交
git checkout <commit-hash>

# 2. 重新构建
docker compose up -d --build grt-app

# 3. 恢复数据库 (如需要)
docker compose exec -T postgres psql -U grt -d grt_db < \
  /opt/grt-system/backups/grt_db_20260321_080000.sql

# 4. 验证
curl -s http://localhost:3000/api/health | jq .
```

### 12.3 自动备份脚本

```bash
#!/usr/bin/env bash
# /opt/grt-system/deploy/backup.sh
set -euo pipefail

BACKUP_DIR="/opt/grt-system/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETAIN_DAYS=30

mkdir -p "$BACKUP_DIR"

# 数据库备份
docker compose exec -T postgres pg_dump -U grt -Fc grt_db \
  > "$BACKUP_DIR/grt_db_${TIMESTAMP}.dump"

echo "Backup created: $BACKUP_DIR/grt_db_${TIMESTAMP}.dump"

# 清理旧备份
find "$BACKUP_DIR" -name "*.dump" -mtime +${RETAIN_DAYS} -delete
echo "Cleaned backups older than ${RETAIN_DAYS} days"
```

```bash
# 每天凌晨 2 点自动备份
echo "0 2 * * * /opt/grt-system/deploy/backup.sh >> /opt/grt-system/logs/backup.log 2>&1" | crontab -
```

---

## 13. 常见问题

### 13.1 端口冲突

```bash
# 检查端口占用
sudo lsof -i :3000
sudo lsof -i :5432
sudo lsof -i :6379

# 修改端口映射: 编辑 docker-compose.yml
ports:
  - "3001:3000"  # 将主机端口改为 3001
```

### 13.2 内存不足

```bash
# 查看内存使用
free -h
docker stats --no-stream

# 增加 swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 13.3 数据库连接失败

```bash
# 检查 PostgreSQL 容器状态
docker compose ps postgres
docker compose logs postgres

# 手动测试连接
docker compose exec postgres pg_isready -U grt -d grt_db

# 常见原因:
# 1. 密码不匹配 — 检查 .env 中 POSTGRES_PASSWORD 和 DATABASE_URL 中的密码
# 2. 容器未启动 — docker compose up -d postgres
# 3. 数据卷损坏 — docker volume rm grt_postgres_data 后重新初始化
```

### 13.4 Redis 连接超时

```bash
# 检查 Redis 容器
docker compose exec redis redis-cli ping
# 预期输出: PONG

# 检查内存使用
docker compose exec redis redis-cli info memory
```

### 13.5 AI 模型调用失败

```bash
# 检查 AI_PROVIDER 配置
grep AI_PROVIDER .env

# 测试 Ollama 连接 (如使用 Ollama)
curl http://localhost:11434/api/tags

# 测试 OpenAI 连接
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# 查看 AI 相关日志
docker compose logs grt-app 2>&1 | grep '"module":"ai-gateway"'
```

### 13.6 构建失败 (内存不足)

```bash
# Vite 构建需要较多内存，确保 NODE_OPTIONS 已设置
# Dockerfile 中已设置: NODE_OPTIONS=--max-old-space-size=4096

# 如果仍然 OOM，可以在宿主机限制:
docker compose build --build-arg NODE_OPTIONS=--max-old-space-size=4096 grt-app
```

### 13.7 中文编码问题

```bash
# 确保系统 locale 正确
locale
# 应显示 UTF-8

# 设置 locale
sudo apt install -y locales
sudo locale-gen en_US.UTF-8 zh_CN.UTF-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

---

## 附录: 快速启停命令

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启应用 (不影响数据库)
docker compose restart grt-app

# 查看状态
docker compose ps

# 查看资源使用
docker stats --no-stream
```
