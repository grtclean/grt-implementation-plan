# GRT智能系统阿里云部署实施指南

**版本**: 1.0  
**日期**: 2026年1月17日  
**作者**: Manus AI  
**适用对象**: 运维工程师、开发团队

---

## 目录

1. [阿里云环境准备](#1-阿里云环境准备)
2. [开发环境搭建](#2-开发环境搭建)
3. [系统部署流程](#3-系统部署流程)
4. [CI/CD自动化部署](#4-cicd自动化部署)
5. [运维与监控](#5-运维与监控)
6. [故障排查指南](#6-故障排查指南)

---

## 1. 阿里云环境准备

### 1.1 账号与认证

在开始部署前，需要完成以下准备工作：

| 步骤 | 操作 | 预计时间 | 说明 |
|------|------|----------|------|
| 1 | 注册阿里云账号 | 10分钟 | https://www.aliyun.com |
| 2 | 完成企业实名认证 | 1-3天 | 需要营业执照 |
| 3 | 开通RAM子账号 | 30分钟 | 权限分离，安全管理 |
| 4 | 申请ICP备案 | 15-20天 | 域名备案必须 |

#### 1.1.1 RAM子账号权限配置

为开发和运维团队创建独立的RAM子账号，遵循最小权限原则：

```json
// 开发人员权限策略
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:Describe*",
        "ecs:StartInstance",
        "ecs:StopInstance",
        "rds:Describe*",
        "oss:GetObject",
        "oss:PutObject"
      ],
      "Resource": "*"
    }
  ]
}
```

```json
// 运维人员权限策略
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}
```

### 1.2 网络环境搭建

#### 1.2.1 创建VPC专有网络

登录阿里云控制台，按以下步骤创建VPC：

**步骤1**: 进入 VPC控制台 → 专有网络 → 创建专有网络

```
VPC名称: grt-production-vpc
IPv4网段: 172.16.0.0/16
描述: GRT生产环境专有网络
```

**步骤2**: 创建交换机（子网）

| 交换机名称 | 可用区 | IPv4网段 | 用途 |
|------------|--------|----------|------|
| grt-app-switch | 可用区A | 172.16.1.0/24 | 应用服务器 |
| grt-db-switch | 可用区A | 172.16.2.0/24 | 数据库 |
| grt-app-switch-b | 可用区B | 172.16.3.0/24 | 应用服务器(备) |

#### 1.2.2 创建安全组

**应用服务器安全组** (grt-app-sg):

```bash
# 入站规则
协议    端口范围    授权对象           说明
TCP     22         办公室公网IP        SSH管理
TCP     80         0.0.0.0/0          HTTP
TCP     443        0.0.0.0/0          HTTPS
TCP     3000       172.16.0.0/16      Node.js应用(内网)

# 出站规则
协议    端口范围    授权对象           说明
ALL     ALL        0.0.0.0/0          允许所有出站
```

**数据库安全组** (grt-db-sg):

```bash
# 入站规则
协议    端口范围    授权对象           说明
TCP     3306       grt-app-sg         MySQL(仅应用服务器)
TCP     6379       grt-app-sg         Redis(仅应用服务器)
```

### 1.3 云资源购买与配置

#### 1.3.1 ECS云服务器

**购买配置**:

```
实例规格: ecs.c7.xlarge (4核8G)
镜像: Ubuntu 22.04 64位
系统盘: 50GB ESSD PL0
数据盘: 100GB ESSD PL0 (挂载到/data)
网络: grt-production-vpc / grt-app-switch
安全组: grt-app-sg
公网IP: 暂不分配(通过SLB访问)
购买数量: 2台
```

**初始化脚本** (创建实例时填入):

```bash
#!/bin/bash
# 更新系统
apt-get update && apt-get upgrade -y

# 安装基础工具
apt-get install -y curl wget git vim htop net-tools

# 安装Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 安装Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 安装Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# 安装pnpm
npm install -g pnpm

# 创建应用目录
mkdir -p /data/grt-system
chown -R ubuntu:ubuntu /data

# 配置时区
timedatectl set-timezone Asia/Shanghai

echo "初始化完成!"
```

#### 1.3.2 RDS MySQL

**购买配置**:

```
数据库类型: MySQL 8.0
系列: 高可用版
规格: mysql.n4.medium.1 (4核16G)
存储类型: ESSD PL1
存储空间: 200GB
网络: grt-production-vpc / grt-db-switch
```

**创建数据库和账号**:

```sql
-- 登录RDS控制台执行或通过DMS
-- 创建数据库
CREATE DATABASE grt_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用账号
CREATE USER 'grt_app'@'172.16.%' IDENTIFIED BY '您的强密码';
GRANT SELECT, INSERT, UPDATE, DELETE ON grt_production.* TO 'grt_app'@'172.16.%';

-- 创建管理员账号
CREATE USER 'grt_admin'@'172.16.%' IDENTIFIED BY '您的强密码';
GRANT ALL PRIVILEGES ON grt_production.* TO 'grt_admin'@'172.16.%';

FLUSH PRIVILEGES;
```

#### 1.3.3 Redis缓存

**购买配置**:

```
版本: Redis 7.0
架构: 标准版-单副本
规格: 2GB
网络: grt-production-vpc / grt-db-switch
```

**配置参数**:

```
maxmemory-policy: allkeys-lru
timeout: 0
tcp-keepalive: 300
```

#### 1.3.4 OSS对象存储

**创建Bucket**:

```
Bucket名称: grt-production-files
地域: 与ECS相同地域
存储类型: 标准存储
读写权限: 私有
```

**配置CORS**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>https://your-domain.com</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

#### 1.3.5 SLB负载均衡

**创建实例**:

```
实例名称: grt-production-slb
规格: 性能保障型slb.s2.small
网络: grt-production-vpc
```

**配置监听**:

| 前端协议/端口 | 后端协议/端口 | 健康检查 | 说明 |
|---------------|---------------|----------|------|
| HTTPS/443 | HTTP/3000 | /api/health | 主服务 |
| HTTP/80 | - | - | 重定向到HTTPS |

**添加后端服务器**:

```
服务器组: grt-app-servers
成员: ECS-1 (权重100), ECS-2 (权重100)
端口: 3000
```

---

## 2. 开发环境搭建

### 2.1 本地开发环境

#### 2.1.1 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 20.x | 22.x |
| pnpm | 8.x | 9.x |
| Git | 2.30+ | 最新 |
| VS Code | 1.80+ | 最新 |
| Docker | 24.x | 最新 |

#### 2.1.2 安装开发工具

**Windows (使用PowerShell管理员)**:

```powershell
# 安装Chocolatey包管理器
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装开发工具
choco install nodejs-lts git vscode docker-desktop -y

# 安装pnpm
npm install -g pnpm
```

**macOS**:

```bash
# 安装Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装开发工具
brew install node@22 git
brew install --cask visual-studio-code docker

# 安装pnpm
npm install -g pnpm
```

**Linux (Ubuntu/Debian)**:

```bash
# 安装Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装pnpm
sudo npm install -g pnpm

# 安装Git
sudo apt-get install -y git

# 安装Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

#### 2.1.3 VS Code扩展推荐

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### 2.2 项目初始化

#### 2.2.1 克隆项目

```bash
# 从Git仓库克隆
git clone https://github.com/your-org/grt-system.git
cd grt-system

# 或从Manus导出
# 在Manus管理界面 → Settings → GitHub → 导出到仓库
```

#### 2.2.2 安装依赖

```bash
# 安装项目依赖
pnpm install

# 如果遇到权限问题
sudo chown -R $(whoami) ~/.pnpm-store
pnpm install
```

#### 2.2.3 环境变量配置

创建 `.env` 文件（基于 `.env.example`）:

```bash
# 复制示例文件
cp .env.example .env

# 编辑环境变量
vim .env
```

**开发环境 `.env` 配置**:

```bash
# 数据库配置
DATABASE_URL="mysql://grt_app:password@localhost:3306/grt_development"

# Redis配置
REDIS_URL="redis://localhost:6379"

# JWT密钥 (生成: openssl rand -base64 32)
JWT_SECRET="your-jwt-secret-key"

# OSS配置
OSS_ACCESS_KEY_ID="your-access-key"
OSS_ACCESS_KEY_SECRET="your-secret-key"
OSS_BUCKET="grt-development-files"
OSS_REGION="oss-cn-shanghai"

# 应用配置
VITE_APP_TITLE="GRT智能系统(开发)"
VITE_APP_ID="grt-dev"
NODE_ENV="development"
```

#### 2.2.4 数据库初始化

```bash
# 生成数据库迁移
pnpm db:push

# 查看数据库状态
pnpm drizzle-kit studio
```

#### 2.2.5 启动开发服务器

```bash
# 启动开发服务器
pnpm dev

# 访问应用
# http://localhost:3000
```

### 2.3 开发工作流

#### 2.3.1 Git分支策略

```
main          ← 生产环境分支，只接受PR合并
  │
  ├── develop ← 开发主分支，日常开发合并到这里
  │     │
  │     ├── feature/xxx  ← 功能开发分支
  │     ├── bugfix/xxx   ← Bug修复分支
  │     └── hotfix/xxx   ← 紧急修复分支
  │
  └── release/v1.x.x ← 发布分支
```

#### 2.3.2 开发流程

```
1. 从develop创建功能分支
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-feature

2. 开发并提交
   git add .
   git commit -m "feat: add new feature"

3. 推送并创建PR
   git push origin feature/new-feature
   # 在GitHub/GitLab创建Pull Request

4. 代码审查后合并
   # 审查通过后合并到develop

5. 删除功能分支
   git branch -d feature/new-feature
```

#### 2.3.3 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | feat: add user authentication |
| fix | Bug修复 | fix: resolve login issue |
| docs | 文档更新 | docs: update API documentation |
| style | 代码格式 | style: format code with prettier |
| refactor | 重构 | refactor: simplify user service |
| test | 测试 | test: add unit tests for auth |
| chore | 构建/工具 | chore: update dependencies |

### 2.4 测试环境

#### 2.4.1 本地Docker测试环境

创建 `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: grt-mysql-dev
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: grt_development
      MYSQL_USER: grt_app
      MYSQL_PASSWORD: devpassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    container_name: grt-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

启动测试环境：

```bash
# 启动数据库服务
docker-compose -f docker-compose.dev.yml up -d

# 查看服务状态
docker-compose -f docker-compose.dev.yml ps

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

---

## 3. 系统部署流程

### 3.1 部署准备

#### 3.1.1 构建生产版本

```bash
# 本地构建
pnpm build

# 构建产物在 dist/ 目录
ls -la dist/
```

#### 3.1.2 创建部署包

```bash
# 创建部署目录
mkdir -p deploy

# 复制必要文件
cp -r dist deploy/
cp package.json deploy/
cp pnpm-lock.yaml deploy/
cp -r drizzle deploy/

# 创建生产环境配置
cat > deploy/.env.production << 'EOF'
NODE_ENV=production
DATABASE_URL=mysql://grt_app:password@rds-endpoint:3306/grt_production
REDIS_URL=redis://redis-endpoint:6379
JWT_SECRET=your-production-jwt-secret
OSS_ACCESS_KEY_ID=your-access-key
OSS_ACCESS_KEY_SECRET=your-secret-key
OSS_BUCKET=grt-production-files
OSS_REGION=oss-cn-shanghai
EOF

# 打包
tar -czvf grt-system-v1.0.0.tar.gz deploy/
```

### 3.2 服务器部署

#### 3.2.1 上传部署包

```bash
# 使用SCP上传到服务器
scp grt-system-v1.0.0.tar.gz ubuntu@your-ecs-ip:/data/

# 或使用阿里云OSS中转
aliyun oss cp grt-system-v1.0.0.tar.gz oss://grt-deploy-bucket/
```

#### 3.2.2 SSH连接服务器

```bash
# 连接到ECS
ssh ubuntu@your-ecs-ip

# 或通过堡垒机
ssh -J bastion@bastion-ip ubuntu@internal-ecs-ip
```

#### 3.2.3 部署应用

```bash
# 进入数据目录
cd /data

# 解压部署包
tar -xzvf grt-system-v1.0.0.tar.gz

# 进入应用目录
cd deploy

# 安装生产依赖
pnpm install --prod

# 配置环境变量
cp .env.production .env

# 运行数据库迁移
pnpm db:push

# 启动应用
pnpm start
```

### 3.3 Docker部署（推荐）

#### 3.3.1 创建Dockerfile

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 生产镜像
FROM node:22-alpine AS runner

WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/drizzle ./drizzle

# 安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 启动应用
CMD ["node", "dist/index.js"]
```

#### 3.3.2 创建docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  grt-app:
    build: .
    container_name: grt-app
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - OSS_ACCESS_KEY_ID=${OSS_ACCESS_KEY_ID}
      - OSS_ACCESS_KEY_SECRET=${OSS_ACCESS_KEY_SECRET}
      - OSS_BUCKET=${OSS_BUCKET}
      - OSS_REGION=${OSS_REGION}
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    image: nginx:alpine
    container_name: grt-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - grt-app
```

#### 3.3.3 Nginx配置

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream grt_backend {
        server grt-app:3000;
        keepalive 32;
    }

    # HTTP重定向到HTTPS
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS服务
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers on;

        # 安全头
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Gzip压缩
        gzip on;
        gzip_types text/plain text/css application/json application/javascript;

        location / {
            proxy_pass http://grt_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # 健康检查端点
        location /api/health {
            proxy_pass http://grt_backend;
            access_log off;
        }
    }
}
```

#### 3.3.4 部署命令

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down
```

### 3.4 PM2部署（备选方案）

#### 3.4.1 安装PM2

```bash
# 全局安装PM2
sudo npm install -g pm2

# 安装日志轮转
pm2 install pm2-logrotate
```

#### 3.4.2 PM2配置文件

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'grt-system',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/data/logs/grt-error.log',
    out_file: '/data/logs/grt-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

#### 3.4.3 PM2命令

```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs grt-system

# 重启应用
pm2 restart grt-system

# 停止应用
pm2 stop grt-system

# 设置开机自启
pm2 startup
pm2 save
```

---

## 4. CI/CD自动化部署

### 4.1 GitHub Actions配置

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: registry.cn-shanghai.aliyuncs.com
  IMAGE_NAME: grt-system/app

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Build application
        run: pnpm build

      - name: Login to Aliyun Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.ALIYUN_REGISTRY_USERNAME }}
          password: ${{ secrets.ALIYUN_REGISTRY_PASSWORD }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.ECS_HOST }}
          username: ${{ secrets.ECS_USERNAME }}
          key: ${{ secrets.ECS_SSH_KEY }}
          script: |
            cd /data/grt-system
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

### 4.2 阿里云云效配置

如果使用阿里云云效（Flow），创建流水线：

```yaml
# .yunxiao/pipeline.yml
stages:
  - name: 构建
    jobs:
      - name: 构建镜像
        steps:
          - step: npmBuild@1
            inputs:
              nodeVersion: '22'
              buildCommand: 'pnpm install && pnpm build'
          - step: dockerBuild@1
            inputs:
              dockerfile: Dockerfile
              imageName: grt-system
              imageTag: ${PIPELINE_ID}

  - name: 部署
    jobs:
      - name: 部署到ECS
        steps:
          - step: deployToECS@1
            inputs:
              ecsId: ${ECS_INSTANCE_ID}
              deployScript: |
                docker pull registry.cn-shanghai.aliyuncs.com/grt-system/app:${PIPELINE_ID}
                docker-compose up -d
```

---

## 5. 运维与监控

### 5.1 日志管理

#### 5.1.1 配置日志收集

```bash
# 安装阿里云日志服务Agent
wget http://logtail-release-cn-shanghai.oss-cn-shanghai.aliyuncs.com/linux64/logtail.sh
chmod +x logtail.sh
./logtail.sh install cn-shanghai

# 配置日志采集
cat > /etc/ilogtail/user_log_config.json << 'EOF'
{
  "metrics": {
    "project": "grt-logs",
    "logstore": "app-logs",
    "endpoint": "cn-shanghai.log.aliyuncs.com"
  }
}
EOF
```

#### 5.1.2 应用日志配置

```typescript
// server/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: '/data/logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '/data/logs/combined.log' 
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;
```

### 5.2 监控告警

#### 5.2.1 云监控配置

在阿里云控制台配置以下告警规则：

| 指标 | 阈值 | 持续时间 | 通知方式 |
|------|------|----------|----------|
| CPU使用率 | >80% | 5分钟 | 短信+钉钉 |
| 内存使用率 | >85% | 5分钟 | 短信+钉钉 |
| 磁盘使用率 | >80% | 5分钟 | 邮件 |
| RDS连接数 | >80% | 3分钟 | 短信+钉钉 |
| SLB异常请求 | >100/分钟 | 1分钟 | 短信+钉钉 |

#### 5.2.2 应用健康检查

```typescript
// server/routes/health.ts
import { Router } from 'express';
import { db } from '../db';
import { redis } from '../redis';

const router = Router();

router.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
    }
  };

  try {
    // 检查数据库
    await db.execute('SELECT 1');
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  try {
    // 检查Redis
    await redis.ping();
    health.checks.redis = 'ok';
  } catch (error) {
    health.checks.redis = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
```

### 5.3 备份策略

#### 5.3.1 数据库备份

```bash
# 创建备份脚本
cat > /data/scripts/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/data/backups/mysql
MYSQL_HOST=your-rds-endpoint
MYSQL_USER=grt_admin
MYSQL_PASS=your-password
MYSQL_DB=grt_production

mkdir -p $BACKUP_DIR

# 执行备份
mysqldump -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS $MYSQL_DB | gzip > $BACKUP_DIR/grt_$DATE.sql.gz

# 上传到OSS
aliyun oss cp $BACKUP_DIR/grt_$DATE.sql.gz oss://grt-backups/mysql/

# 清理7天前的本地备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: grt_$DATE.sql.gz"
EOF

chmod +x /data/scripts/backup-db.sh

# 添加定时任务
crontab -e
# 每天凌晨2点执行备份
0 2 * * * /data/scripts/backup-db.sh >> /data/logs/backup.log 2>&1
```

---

## 6. 故障排查指南

### 6.1 常见问题

#### 6.1.1 应用无法启动

```bash
# 检查端口占用
netstat -tlnp | grep 3000

# 检查日志
docker-compose logs grt-app
# 或
pm2 logs grt-system

# 检查环境变量
docker-compose exec grt-app env | grep -E "DATABASE|REDIS"
```

#### 6.1.2 数据库连接失败

```bash
# 测试数据库连接
mysql -h rds-endpoint -u grt_app -p -e "SELECT 1"

# 检查安全组
# 确保ECS安全组允许访问RDS的3306端口

# 检查RDS白名单
# 确保ECS内网IP在RDS白名单中
```

#### 6.1.3 Redis连接失败

```bash
# 测试Redis连接
redis-cli -h redis-endpoint ping

# 检查Redis密码
redis-cli -h redis-endpoint -a your-password ping
```

### 6.2 性能优化

#### 6.2.1 Node.js优化

```bash
# 增加内存限制
NODE_OPTIONS="--max-old-space-size=4096" node dist/index.js

# 启用集群模式
pm2 start ecosystem.config.js -i max
```

#### 6.2.2 数据库优化

```sql
-- 查看慢查询
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- 分析查询计划
EXPLAIN SELECT * FROM your_table WHERE condition;

-- 添加索引
CREATE INDEX idx_column ON table_name(column_name);
```

### 6.3 紧急回滚

```bash
# Docker回滚到上一版本
docker-compose down
docker tag grt-system/app:latest grt-system/app:rollback
docker pull grt-system/app:previous-version
docker tag grt-system/app:previous-version grt-system/app:latest
docker-compose up -d

# 数据库回滚
# 从备份恢复
gunzip < /data/backups/mysql/grt_20260117.sql.gz | mysql -h rds-endpoint -u grt_admin -p grt_production
```

---

## 附录

### A. 常用命令速查

| 操作 | 命令 |
|------|------|
| 查看容器状态 | `docker-compose ps` |
| 查看容器日志 | `docker-compose logs -f` |
| 重启服务 | `docker-compose restart` |
| 进入容器 | `docker-compose exec grt-app sh` |
| 查看资源使用 | `docker stats` |
| 清理无用镜像 | `docker system prune -a` |

### B. 联系方式

| 角色 | 联系方式 | 职责 |
|------|----------|------|
| 运维负责人 | ops@grt.com | 服务器、网络、安全 |
| 开发负责人 | dev@grt.com | 应用开发、Bug修复 |
| 阿里云工单 | 控制台提交 | 云服务技术支持 |

---

**文档版本**: 1.0  
**创建日期**: 2026-01-17  
**作者**: Manus AI
