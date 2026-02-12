# GRT智能系统 v4.4.0 本地部署完整指南

**版本**: v4.4.0  
**发布日期**: 2026年1月24日  
**作者**: Manus AI  
**文档状态**: 正式发布

---

## 目录

1. [系统概述](#1-系统概述)
2. [系统要求](#2-系统要求)
3. [部署架构](#3-部署架构)
4. [快速部署（Docker方式）](#4-快速部署docker方式)
5. [手动部署（源码方式）](#5-手动部署源码方式)
6. [数据库配置](#6-数据库配置)
7. [环境变量配置](#7-环境变量配置)
8. [第三方服务集成](#8-第三方服务集成)
9. [安全配置](#9-安全配置)
10. [启动与验证](#10-启动与验证)
11. [生产环境优化](#11-生产环境优化)
12. [故障排除](#12-故障排除)
13. [备份与恢复](#13-备份与恢复)
14. [升级指南](#14-升级指南)

---

## 1. 系统概述

### 1.1 系统简介

GRT智能系统是一套面向工业清洗设备制造企业的全流程数字化管理平台，集成了CRM客户管理、项目全生命周期管理、人力资源管理、AI智能诊断、实时协作工作台等核心功能模块。v4.4.0版本新增了基于Nocobase架构的活文档管理平台、Gemini AI智能诊断系统、客户自助服务门户以及WebSocket实时协作功能。

### 1.2 v4.4.0 主要功能

| 功能模块 | 描述 | 技术栈 |
|---------|------|--------|
| 活文档管理 | GTR/CSR文档结构、M0-M12阶段管理 | Nocobase架构 |
| AI智能诊断 | 设备故障诊断、传感器数据分析 | Gemini AI |
| 客户门户 | 自助服务、故障报告、进度查询 | React + tRPC |
| 协作工作台 | 多人实时编辑、光标同步 | WebSocket |
| 文档解析 | PDF/Word/图片解析、表格结构化 | AI + OCR |
| 系统指南 | 角色工作指导书、Help模糊查询 | 知识库系统 |

### 1.3 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端层 (React 19)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Dashboard│ │AI诊断   │ │客户门户 │ │协作工作台│           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│                      API层 (tRPC + Express)                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Auth     │ │Business │ │AI       │ │WebSocket│           │
│  │Router   │ │Router   │ │Router   │ │Service  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│                      服务层                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Gemini   │ │Document │ │Live Doc │ │Training │           │
│  │Judgment │ │Parser   │ │Service  │ │Data     │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│                      数据层                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │MySQL 8.0    │ │Redis 7      │ │S3 Storage   │           │
│  │(Drizzle ORM)│ │(缓存/会话)  │ │(文件存储)   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 系统要求

### 2.1 硬件要求

| 配置项 | 最低配置 | 推荐配置 | 生产环境 |
|-------|---------|---------|---------|
| CPU | 2核 | 4核 | 8核+ |
| 内存 | 4GB | 8GB | 16GB+ |
| 磁盘 | 20GB SSD | 50GB SSD | 100GB+ SSD |
| 网络 | 10Mbps | 100Mbps | 1Gbps |

### 2.2 软件要求

| 软件 | 最低版本 | 推荐版本 | 说明 |
|-----|---------|---------|------|
| 操作系统 | Ubuntu 20.04 / Windows 10 | Ubuntu 22.04 / Windows 11 | 支持Linux/Windows/macOS |
| Node.js | 20.x | 22.x LTS | 必需 |
| pnpm | 8.x | 10.x | 包管理器 |
| MySQL | 8.0 | 8.0.35+ | 主数据库 |
| Redis | 6.x | 7.x | 缓存（可选） |
| Docker | 24.x | 25.x | 容器化部署 |
| Docker Compose | 2.20+ | 2.24+ | 服务编排 |
| Git | 2.30+ | 2.40+ | 版本控制 |

### 2.3 网络端口要求

| 端口 | 服务 | 协议 | 说明 |
|-----|------|-----|------|
| 3000 | GRT应用 | HTTP/WS | 主应用端口 |
| 3306 | MySQL | TCP | 数据库端口 |
| 6379 | Redis | TCP | 缓存端口 |
| 8080 | Adminer | HTTP | 数据库管理（开发） |

---

## 3. 部署架构

### 3.1 单机部署架构

适用于开发环境和小型生产环境：

```
┌────────────────────────────────────────┐
│              单机服务器                 │
│  ┌──────────────────────────────────┐  │
│  │         Docker Engine            │  │
│  │  ┌─────────┐ ┌─────────┐        │  │
│  │  │GRT App  │ │MySQL    │        │  │
│  │  │:3000    │ │:3306    │        │  │
│  │  └─────────┘ └─────────┘        │  │
│  │  ┌─────────┐ ┌─────────┐        │  │
│  │  │Redis    │ │Adminer  │        │  │
│  │  │:6379    │ │:8080    │        │  │
│  │  └─────────┘ └─────────┘        │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 3.2 高可用部署架构

适用于大型生产环境：

```
                    ┌─────────────┐
                    │  负载均衡   │
                    │  (Nginx)    │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  GRT App 1  │ │  GRT App 2  │ │  GRT App 3  │
    │  :3000      │ │  :3000      │ │  :3000      │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌───▼───┐ ┌──────▼──────┐
       │MySQL Master │ │Redis  │ │    S3       │
       │  + Slave    │ │Cluster│ │  Storage    │
       └─────────────┘ └───────┘ └─────────────┘
```

---

## 4. 快速部署（Docker方式）

### 4.1 前置准备

#### 4.1.1 安装Docker（Ubuntu）

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要依赖
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到docker组（需重新登录生效）
sudo usermod -aG docker $USER
```

#### 4.1.2 安装Docker（Windows）

1. 下载并安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. 启用WSL 2后端（推荐）
3. 重启计算机
4. 验证安装：`docker --version`

### 4.2 获取项目代码

```bash
# 克隆项目仓库
git clone https://github.com/your-org/grt-implementation-plan.git
cd grt-implementation-plan

# 切换到v4.4.0版本
git checkout v4.4.0
```

### 4.3 配置环境变量

```bash
# 复制环境变量模板
cp docker/config.env.template .env

# 编辑环境变量
nano .env
```

**必须配置的环境变量：**

```bash
# 数据库配置
DATABASE_URL=mysql://grt:your_secure_password@mysql:3306/grt_db
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_PASSWORD=your_secure_password

# 安全密钥（必须修改！）
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# AI服务配置（如需使用AI功能）
GEMINI_API_KEY=your_gemini_api_key

# 简道云集成（如需使用）
JIANDAOYUN_API_KEY=your_jiandaoyun_api_key
JIANDAOYUN_CORP_ID=your_corp_id

# Microsoft 365集成（如需使用）
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id
```

### 4.4 启动服务

```bash
# 构建并启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f grt-app
```

### 4.5 初始化数据库

```bash
# 进入应用容器
docker compose exec grt-app sh

# 运行数据库迁移
pnpm db:push

# 退出容器
exit
```

### 4.6 验证部署

```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 预期响应
# {"status":"ok","timestamp":"2026-01-24T..."}
```

访问 http://localhost:3000 即可看到GRT智能系统界面。

---

## 5. 手动部署（源码方式）

### 5.1 安装Node.js

#### Ubuntu

```bash
# 使用NodeSource安装Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应显示 v22.x.x
npm --version
```

#### Windows

1. 下载 [Node.js 22 LTS](https://nodejs.org/)
2. 运行安装程序
3. 验证安装：`node --version`

### 5.2 安装pnpm

```bash
# 使用corepack启用pnpm
corepack enable pnpm

# 或使用npm安装
npm install -g pnpm

# 验证安装
pnpm --version  # 应显示 10.x.x
```

### 5.3 安装MySQL 8.0

#### Ubuntu

```bash
# 安装MySQL服务器
sudo apt install -y mysql-server

# 启动MySQL服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 运行安全配置向导
sudo mysql_secure_installation

# 创建数据库和用户
sudo mysql -u root -p
```

```sql
-- 创建数据库
CREATE DATABASE grt_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'grt'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 授权
GRANT ALL PRIVILEGES ON grt_db.* TO 'grt'@'localhost';
FLUSH PRIVILEGES;

EXIT;
```

#### Windows

1. 下载 [MySQL 8.0 Installer](https://dev.mysql.com/downloads/installer/)
2. 选择"Developer Default"安装类型
3. 配置root密码
4. 使用MySQL Workbench创建数据库和用户

### 5.4 安装项目依赖

```bash
# 进入项目目录
cd grt-implementation-plan

# 安装依赖
pnpm install
```

### 5.5 配置环境变量

创建 `.env` 文件：

```bash
# 基础配置
NODE_ENV=production
PORT=3000

# 数据库配置
DATABASE_URL=mysql://grt:your_secure_password@localhost:3306/grt_db

# 安全配置
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# AI服务配置
GEMINI_API_KEY=your_gemini_api_key

# 第三方集成
JIANDAOYUN_API_KEY=your_jiandaoyun_api_key
JIANDAOYUN_CORP_ID=your_corp_id
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id
```

### 5.6 初始化数据库

```bash
# 生成并运行数据库迁移
pnpm db:push
```

### 5.7 构建项目

```bash
# 构建前端和后端
pnpm build
```

### 5.8 启动服务

```bash
# 生产环境启动
pnpm start

# 开发环境启动（支持热重载）
pnpm dev
```

---

## 6. 数据库配置

### 6.1 数据库架构概览

GRT智能系统使用Drizzle ORM管理数据库，主要包含以下数据表：

| 表名 | 描述 | 记录数估计 |
|-----|------|-----------|
| users | 用户账户 | 100-1000 |
| employees | 员工信息 | 50-500 |
| customers | 客户信息 | 100-5000 |
| projects | 项目管理 | 50-1000 |
| tasks | 任务管理 | 500-10000 |
| ai_assistant_configs | AI助手配置 | 10-50 |
| ai_assistant_sessions | AI会话记录 | 1000-100000 |
| naming_rules | 命名规则 | 100-500 |
| training_records | 培训记录 | 100-5000 |
| deadlock_records | 死锁记录 | 10-1000 |

### 6.2 数据库迁移

```bash
# 生成迁移文件
pnpm drizzle-kit generate

# 执行迁移
pnpm drizzle-kit migrate

# 一键执行（推荐）
pnpm db:push
```

### 6.3 数据库备份

```bash
# 使用mysqldump备份
mysqldump -u grt -p grt_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Docker环境备份
docker compose exec mysql mysqldump -u grt -p grt_db > backup.sql
```

### 6.4 数据库性能优化

在 `/etc/mysql/mysql.conf.d/mysqld.cnf` 中添加：

```ini
[mysqld]
# 缓冲池大小（建议为可用内存的70%）
innodb_buffer_pool_size = 4G

# 日志文件大小
innodb_log_file_size = 512M

# 连接数
max_connections = 200

# 查询缓存
query_cache_type = 1
query_cache_size = 128M

# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

---

## 7. 环境变量配置

### 7.1 完整环境变量列表

| 变量名 | 必需 | 默认值 | 描述 |
|-------|-----|--------|------|
| `NODE_ENV` | 是 | development | 运行环境 |
| `PORT` | 否 | 3000 | 应用端口 |
| `DATABASE_URL` | 是 | - | MySQL连接字符串 |
| `JWT_SECRET` | 是 | - | JWT签名密钥 |
| `JWT_EXPIRES_IN` | 否 | 86400 | JWT过期时间（秒） |
| `GEMINI_API_KEY` | 否 | - | Gemini AI API密钥 |
| `JIANDAOYUN_API_KEY` | 否 | - | 简道云API密钥 |
| `JIANDAOYUN_CORP_ID` | 否 | - | 简道云企业ID |
| `MICROSOFT_CLIENT_ID` | 否 | - | Microsoft应用ID |
| `MICROSOFT_CLIENT_SECRET` | 否 | - | Microsoft应用密钥 |
| `MICROSOFT_TENANT_ID` | 否 | - | Microsoft租户ID |
| `REDIS_URL` | 否 | - | Redis连接字符串 |
| `S3_ENDPOINT` | 否 | - | S3存储端点 |
| `S3_BUCKET` | 否 | - | S3存储桶名称 |
| `S3_ACCESS_KEY` | 否 | - | S3访问密钥 |
| `S3_SECRET_KEY` | 否 | - | S3密钥 |
| `LOG_LEVEL` | 否 | info | 日志级别 |

### 7.2 环境变量安全建议

1. **永远不要**将 `.env` 文件提交到版本控制
2. 生产环境使用密钥管理服务（如AWS Secrets Manager、HashiCorp Vault）
3. `JWT_SECRET` 至少使用32字符的随机字符串
4. 定期轮换敏感密钥

生成安全密钥的命令：

```bash
# 生成32字节随机密钥
openssl rand -base64 32
```

---

## 8. 第三方服务集成

### 8.1 Gemini AI集成

用于AI智能诊断、文档解析等功能。

1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 创建API密钥
3. 配置环境变量：

```bash
GEMINI_API_KEY=your_api_key_here
```

### 8.2 简道云集成

用于数据迁移和同步。

1. 登录 [简道云管理后台](https://www.jiandaoyun.com/)
2. 进入"开发者中心" → "API密钥"
3. 创建API密钥并获取企业ID
4. 配置环境变量：

```bash
JIANDAOYUN_API_KEY=your_api_key
JIANDAOYUN_CORP_ID=your_corp_id
```

### 8.3 Microsoft 365集成

用于日历同步、邮件通知等功能。

1. 访问 [Azure Portal](https://portal.azure.com/)
2. 注册新应用程序
3. 配置API权限：
   - `Calendars.ReadWrite`
   - `Mail.Send`
   - `User.Read`
4. 创建客户端密钥
5. 配置环境变量：

```bash
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id
```

### 8.4 S3兼容存储配置

支持AWS S3、阿里云OSS、MinIO等。

```bash
# AWS S3
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=grt-production
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_REGION=ap-northeast-1

# 阿里云OSS
S3_ENDPOINT=https://oss-cn-shanghai.aliyuncs.com
S3_BUCKET=grt-production
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_REGION=cn-shanghai

# MinIO（本地部署）
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=grt-local
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

---

## 9. 安全配置

### 9.1 HTTPS配置

#### 使用Nginx反向代理

```nginx
# /etc/nginx/sites-available/grt
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 获取SSL证书（Let's Encrypt）

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 9.2 防火墙配置

```bash
# 使用UFW配置防火墙
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 查看状态
sudo ufw status
```

### 9.3 安全头配置

在Nginx中添加安全头：

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

---

## 10. 启动与验证

### 10.1 服务启动顺序

1. **数据库服务** → 2. **Redis服务（可选）** → 3. **GRT应用服务**

### 10.2 健康检查端点

| 端点 | 方法 | 描述 |
|-----|------|------|
| `/api/health` | GET | 应用健康状态 |
| `/api/trpc/system.health` | GET | tRPC健康检查 |

### 10.3 验证清单

```bash
# 1. 检查应用健康状态
curl -s http://localhost:3000/api/health | jq

# 2. 检查数据库连接
docker compose exec mysql mysql -u grt -p -e "SELECT 1"

# 3. 检查Redis连接（如启用）
docker compose exec redis redis-cli ping

# 4. 运行测试套件
pnpm test

# 5. 检查日志
docker compose logs -f grt-app
```

### 10.4 常见启动问题

| 问题 | 原因 | 解决方案 |
|-----|------|---------|
| 端口3000被占用 | 其他服务占用 | 修改PORT环境变量或停止占用进程 |
| 数据库连接失败 | MySQL未启动或配置错误 | 检查DATABASE_URL和MySQL服务状态 |
| 权限错误 | 文件权限不正确 | `chmod -R 755 /app` |
| 内存不足 | 系统资源不足 | 增加服务器内存或优化配置 |

---

## 11. 生产环境优化

### 11.1 Node.js优化

```bash
# 设置Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 启用集群模式（使用PM2）
npm install -g pm2
pm2 start dist/index.js -i max --name grt-app
```

### 11.2 PM2配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'grt-app',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    error_file: '/var/log/grt/error.log',
    out_file: '/var/log/grt/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 11.3 数据库连接池

在应用中配置连接池：

```typescript
// server/db.ts
const pool = {
  min: 5,
  max: 20,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 30000
};
```

### 11.4 缓存策略

```typescript
// 使用Redis缓存
const CACHE_TTL = 3600; // 1小时

async function getCachedData(key: string) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchFromDatabase();
  await redis.setex(key, CACHE_TTL, JSON.stringify(data));
  return data;
}
```

---

## 12. 故障排除

### 12.1 日志查看

```bash
# Docker环境
docker compose logs -f grt-app
docker compose logs -f mysql

# 源码部署
tail -f /var/log/grt/error.log
tail -f /var/log/grt/out.log

# PM2
pm2 logs grt-app
```

### 12.2 常见错误及解决方案

#### 错误：ECONNREFUSED 连接数据库失败

```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 检查连接字符串
echo $DATABASE_URL

# 测试连接
mysql -h localhost -u grt -p grt_db
```

#### 错误：JWT_SECRET未配置

```bash
# 生成并设置JWT_SECRET
export JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET" >> .env
```

#### 错误：端口已被占用

```bash
# 查找占用端口的进程
lsof -i :3000
netstat -tlnp | grep 3000

# 终止进程
kill -9 <PID>
```

#### 错误：内存不足

```bash
# 检查内存使用
free -h
docker stats

# 增加swap空间
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 12.3 性能诊断

```bash
# 检查CPU和内存
htop

# 检查磁盘IO
iostat -x 1

# 检查网络
netstat -s

# 检查数据库慢查询
docker compose exec mysql mysql -u root -p -e "SHOW PROCESSLIST"
```

---

## 13. 备份与恢复

### 13.1 自动备份脚本

创建 `/opt/grt/backup.sh`：

```bash
#!/bin/bash

# 配置
BACKUP_DIR="/opt/grt/backups"
MYSQL_USER="grt"
MYSQL_PASSWORD="your_password"
MYSQL_DATABASE="grt_db"
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR

# 生成备份文件名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/grt_backup_$TIMESTAMP.sql.gz"

# 执行备份
mysqldump -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE | gzip > $BACKUP_FILE

# 验证备份
if [ -f "$BACKUP_FILE" ]; then
    echo "备份成功: $BACKUP_FILE"
    echo "文件大小: $(ls -lh $BACKUP_FILE | awk '{print $5}')"
else
    echo "备份失败!"
    exit 1
fi

# 清理旧备份
find $BACKUP_DIR -name "grt_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "已清理${RETENTION_DAYS}天前的备份"
```

### 13.2 配置定时备份

```bash
# 编辑crontab
crontab -e

# 每天凌晨2点执行备份
0 2 * * * /opt/grt/backup.sh >> /var/log/grt/backup.log 2>&1
```

### 13.3 恢复数据库

```bash
# 解压并恢复
gunzip < /opt/grt/backups/grt_backup_20260124_020000.sql.gz | mysql -u grt -p grt_db

# Docker环境恢复
gunzip < backup.sql.gz | docker compose exec -T mysql mysql -u grt -p grt_db
```

---

## 14. 升级指南

### 14.1 升级前准备

1. **备份数据库**
2. **备份配置文件**
3. **查看更新日志**
4. **在测试环境验证**

### 14.2 升级步骤

```bash
# 1. 停止服务
docker compose down
# 或
pm2 stop grt-app

# 2. 备份当前版本
cp -r grt-implementation-plan grt-implementation-plan.bak

# 3. 拉取新版本
cd grt-implementation-plan
git fetch origin
git checkout v4.4.1  # 新版本号

# 4. 安装新依赖
pnpm install

# 5. 运行数据库迁移
pnpm db:push

# 6. 重新构建
pnpm build

# 7. 启动服务
docker compose up -d
# 或
pm2 start ecosystem.config.js

# 8. 验证升级
curl http://localhost:3000/api/health
```

### 14.3 回滚步骤

```bash
# 1. 停止服务
docker compose down

# 2. 恢复备份
rm -rf grt-implementation-plan
mv grt-implementation-plan.bak grt-implementation-plan

# 3. 恢复数据库（如需要）
gunzip < backup.sql.gz | mysql -u grt -p grt_db

# 4. 重启服务
cd grt-implementation-plan
docker compose up -d
```

---

## 附录A：快速启动脚本

### Linux/macOS

创建 `scripts/quick-start.sh`：

```bash
#!/bin/bash
set -e

echo "=== GRT智能系统 v4.4.0 快速启动 ==="

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "错误: 请先安装Docker"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "创建环境变量文件..."
    cp docker/config.env.template .env
    echo "请编辑 .env 文件配置必要的环境变量"
    exit 1
fi

# 启动服务
echo "启动服务..."
docker compose up -d

# 等待服务就绪
echo "等待服务就绪..."
sleep 30

# 运行数据库迁移
echo "运行数据库迁移..."
docker compose exec grt-app pnpm db:push

# 健康检查
echo "执行健康检查..."
curl -s http://localhost:3000/api/health

echo ""
echo "=== 启动完成 ==="
echo "访问地址: http://localhost:3000"
echo "数据库管理: http://localhost:8080 (开发模式)"
```

### Windows

创建 `scripts/quick-start.ps1`：

```powershell
Write-Host "=== GRT智能系统 v4.4.0 快速启动 ===" -ForegroundColor Green

# 检查Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 请先安装Docker Desktop" -ForegroundColor Red
    exit 1
}

# 检查环境变量文件
if (-not (Test-Path .env)) {
    Write-Host "创建环境变量文件..."
    Copy-Item docker/config.env.template .env
    Write-Host "请编辑 .env 文件配置必要的环境变量" -ForegroundColor Yellow
    exit 1
}

# 启动服务
Write-Host "启动服务..."
docker compose up -d

# 等待服务就绪
Write-Host "等待服务就绪..."
Start-Sleep -Seconds 30

# 运行数据库迁移
Write-Host "运行数据库迁移..."
docker compose exec grt-app pnpm db:push

# 健康检查
Write-Host "执行健康检查..."
Invoke-RestMethod -Uri http://localhost:3000/api/health

Write-Host ""
Write-Host "=== 启动完成 ===" -ForegroundColor Green
Write-Host "访问地址: http://localhost:3000"
Write-Host "数据库管理: http://localhost:8080 (开发模式)"
```

---

## 附录B：系统服务文件

创建 `/etc/systemd/system/grt.service`：

```ini
[Unit]
Description=GRT智能系统
After=network.target mysql.service

[Service]
Type=simple
User=grt
WorkingDirectory=/opt/grt/grt-implementation-plan
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=grt
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable grt
sudo systemctl start grt
sudo systemctl status grt
```

---

## 附录C：监控配置

### Prometheus配置

创建 `prometheus.yml`：

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'grt-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Grafana仪表板

导入GRT系统监控仪表板，包含以下指标：

- 请求速率和延迟
- 错误率
- 数据库连接池状态
- 内存和CPU使用率
- AI服务调用统计

---

## 联系与支持

如在部署过程中遇到问题，请通过以下方式获取支持：

- **技术文档**: `/docs` 目录
- **问题反馈**: GitHub Issues
- **技术支持**: support@gerrytech.com

---

**文档版本历史**

| 版本 | 日期 | 作者 | 变更说明 |
|-----|------|-----|---------|
| 1.0 | 2026-01-24 | Manus AI | 初始版本，支持v4.4.0 |
