/**
 * 部署包生成服务
 * 生成包含项目代码、配置模板、部署脚本的部署包
 */

import { z } from "zod";

// 部署包配置模板
const dockerComposeTemplate = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "\${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
      - JWT_SECRET=\${JWT_SECRET}
      - VITE_APP_ID=\${VITE_APP_ID}
      - OAUTH_SERVER_URL=\${OAUTH_SERVER_URL}
      - VITE_OAUTH_PORTAL_URL=\${VITE_OAUTH_PORTAL_URL}
      - BUILT_IN_FORGE_API_URL=\${BUILT_IN_FORGE_API_URL}
      - BUILT_IN_FORGE_API_KEY=\${BUILT_IN_FORGE_API_KEY}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=\${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=grt_system
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
`;

const envTemplate = `# GRT智慧系统环境变量配置
# 请根据实际情况修改以下配置

# 应用配置
NODE_ENV=production
PORT=3000

# 数据库配置
DATABASE_URL=mysql://root:your_password@db:3306/grt_system
MYSQL_ROOT_PASSWORD=your_secure_password

# JWT密钥（请使用强随机字符串）
JWT_SECRET=your_jwt_secret_key_here

# OAuth配置
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login

# AI服务配置
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your_forge_api_key

# 可选：Gemini API配置
GEMINI_API_KEY=your_gemini_api_key

# 可选：外部数据平台集成
EXT_SYNC_API_KEY=your_ext_sync_api_key
EXT_SYNC_CORP_ID=your_corp_id
`;

const dockerfileTemplate = `# GRT智慧系统 Dockerfile
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

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/index.js"]
`;

const deployScriptTemplate = `#!/bin/bash
# GRT智慧系统部署脚本

set -e

echo "=========================================="
echo "GRT智慧系统部署脚本"
echo "=========================================="

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker未安装，请先安装Docker"
    exit 1
fi

# 检查docker-compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "错误: docker-compose未安装，请先安装docker-compose"
    exit 1
fi

# 检查环境变量文件
if [ ! -f "config.env" ]; then
    echo "警告: config.env文件不存在，正在从模板创建..."
    cp config.env.template config.env
    echo "请编辑config.env文件配置环境变量后重新运行此脚本"
    exit 1
fi

echo "1. 加载环境变量..."
export $(cat config.env | grep -v '^#' | xargs)

echo "2. 构建Docker镜像..."
docker-compose build

echo "3. 启动服务..."
docker-compose up -d

echo "4. 等待服务启动..."
sleep 10

echo "5. 初始化数据库..."
docker-compose exec app pnpm db:push

echo "6. 验证部署..."
curl -s http://localhost:3000/api/health | jq .

echo ""
echo "=========================================="
echo "部署完成!"
echo "访问地址: http://localhost:3000"
echo "=========================================="
`;

const readmeTemplate = `# GRT智慧系统部署包

## 系统要求

- Docker 20.10+
- docker-compose 2.0+
- 最低配置: 2核CPU / 4GB内存 / 20GB SSD
- 推荐配置: 4核CPU / 8GB内存 / 50GB SSD

## 快速部署

### 1. 配置环境变量

\`\`\`bash
cp config.env.template config.env
# 编辑config.env，配置数据库密码、JWT密钥等
\`\`\`

### 2. 执行部署脚本

\`\`\`bash
chmod +x deploy.sh
./deploy.sh
\`\`\`

### 3. 验证部署

\`\`\`bash
curl http://localhost:3000/api/health
\`\`\`

## 手动部署步骤

### Docker部署

\`\`\`bash
# 1. 获取部署包
# 已包含在此部署包中

# 2. 配置环境变量
cp config.env.template config.env
# 编辑config.env

# 3. 启动服务
docker-compose up -d

# 4. 初始化数据库
docker-compose exec app pnpm db:push

# 5. 验证部署
curl http://localhost:3000/api/health
\`\`\`

### 本地开发部署

\`\`\`bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp config.env.template .env

# 3. 初始化数据库
pnpm db:push

# 4. 启动开发服务器
pnpm dev
\`\`\`

## 目录结构

\`\`\`
grt-deployment-package/
├── README.md           # 部署说明
├── deploy.sh           # 自动部署脚本
├── docker-compose.yml  # Docker编排文件
├── Dockerfile          # Docker镜像构建文件
├── config.env.template # 环境变量模板
└── src/                # 源代码目录
\`\`\`

## 常见问题

### Q: 如何更新系统？

\`\`\`bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
docker-compose down
docker-compose build
docker-compose up -d
docker-compose exec app pnpm db:push
\`\`\`

### Q: 如何查看日志？

\`\`\`bash
docker-compose logs -f app
\`\`\`

### Q: 如何备份数据库？

\`\`\`bash
docker-compose exec db mysqldump -u root -p grt_system > backup.sql
\`\`\`

## 技术支持

如有问题，请联系GRT技术支持团队。
`;

export interface DeploymentPackageContent {
  filename: string;
  content: string;
}

export function generateDeploymentPackageFiles(): DeploymentPackageContent[] {
  return [
    { filename: "README.md", content: readmeTemplate },
    { filename: "docker-compose.yml", content: dockerComposeTemplate },
    { filename: "Dockerfile", content: dockerfileTemplate },
    { filename: "config.env.template", content: envTemplate },
    { filename: "deploy.sh", content: deployScriptTemplate },
  ];
}

export function generateDeploymentPackageZipContent(): string {
  // 生成部署包的JSON描述，前端将根据此生成实际的ZIP文件
  const files = generateDeploymentPackageFiles();
  return JSON.stringify({
    name: "grt-deployment-package",
    version: "4.8.23",
    generatedAt: new Date().toISOString(),
    files: files.map(f => ({
      filename: f.filename,
      content: f.content,
    })),
  });
}
