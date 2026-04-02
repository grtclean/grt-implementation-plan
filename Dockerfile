# GRT智能系统 Docker镜像
# 版本: v4.0.0
# 基于 Node.js 22 LTS — 3-stage build

# ============================================
# 阶段1: 依赖安装 (全部依赖, 含 devDependencies)
# ============================================
FROM node:22-alpine AS deps

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml* ./

# 安装 pnpm 并安装全部依赖 (需要 devDependencies 用于 build + drizzle-kit)
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ============================================
# 阶段2: 构建
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建时环境变量
ARG DATABASE_URL
ARG JWT_SECRET
ARG VITE_APP_ID
ARG VITE_APP_TITLE="GRT智能系统"
ARG VITE_LOCAL_AUTH="true"

ENV DATABASE_URL=${DATABASE_URL}
ENV JWT_SECRET=${JWT_SECRET}
ENV VITE_APP_ID=${VITE_APP_ID}
ENV VITE_APP_TITLE=${VITE_APP_TITLE}
ENV VITE_LOCAL_AUTH=${VITE_LOCAL_AUTH}

# 启用 pnpm 并构建
RUN corepack enable pnpm && pnpm run build

# 安装生产依赖到独立目录 (排除 devDependencies)
RUN mkdir /app/prod_modules && \
    cp package.json pnpm-lock.yaml /app/prod_modules/ && \
    cd /app/prod_modules && \
    corepack enable pnpm && pnpm install --frozen-lockfile --prod

# ============================================
# 阶段3: 生产运行
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 grt

# 复制构建产物 (仅生产依赖)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prod_modules/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/shared ./shared

# 复制 drizzle-kit + tsx (用于容器内 migration)
COPY --from=deps /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=deps /app/node_modules/tsx ./node_modules/tsx
COPY --from=deps /app/node_modules/.bin/drizzle-kit ./node_modules/.bin/drizzle-kit

# 设置文件权限
RUN chown -R grt:nodejs /app

USER grt

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动命令
CMD ["node", "dist/index.js"]
