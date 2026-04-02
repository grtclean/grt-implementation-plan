# GRT System 资产盘点报告

**盘点日期**: 2026-04-02
**盘点执行者**: Claude (资深系统整理工程师)
**项目版本**: v4.4.5 (beebdce)
**约束**: 纯只读扫描，未修改任何文件

---

## 总览摘要

| 指标 | 数值 |
|------|------|
| 项目名称 | grt-implementation-plan |
| 前端框架 | React 19 + Vite + TypeScript |
| 后端框架 | Express + tRPC + Drizzle ORM |
| 数据库 | PostgreSQL 16 (主) + MSSQL (ERP×2) |
| 缓存 | Redis (可选，生产环境) |
| TypeScript文件 | 1,256 (server) + 931 (client TSX) |
| 测试文件 | 722 |
| tRPC路由 | 338 |
| 页面组件 | 535+ |
| 注册用户 | 131 (含95活跃员工) |
| DB表 | 794+ |

---

## 1. 系统服务清单

### 1.1 前端服务

| 字段 | 内容 |
|------|------|
| 服务名称 | GRT Web Client |
| 服务类型 | SPA (Single Page Application) |
| 所在路径 | `client/` |
| 构建工具 | Vite |
| 启动方式 | `npm run dev` → Vite dev server / `npm run build` → 静态文件 |
| 关键配置 | `vite.config.ts`, `client/index.html` |
| 监听端口 | 开发: 5173 (Vite) / 生产: 由Express托管 |
| 依赖 | React 19, Wouter, tRPC Client, Tailwind CSS, shadcn/ui |
| 备注 | **无独立client/package.json**，前后端共用根package.json (monorepo单包模式) |

### 1.2 后端服务

| 字段 | 内容 |
|------|------|
| 服务名称 | GRT API Server |
| 服务类型 | Express + tRPC |
| 所在路径 | `server/` |
| 入口文件 | `server/_core/index.ts` |
| 启动方式 | 开发: `tsx watch server/_core/index.ts` / 生产: `node dist/index.js` |
| 关键配置 | `.env`, `.env.development`, `.env.production` |
| 监听端口 | **3000** (HTTP + tRPC + 静态文件托管) |
| 依赖 | Express, @trpc/server, Drizzle ORM, pg, mssql |
| 备注 | **前后端同进程**，Express同时托管Vite dev middleware和tRPC API |

### 1.3 WebSocket服务

| 字段 | 内容 |
|------|------|
| 服务名称 | WebSocket (3个) |
| 服务类型 | ws (升级HTTP连接，共享端口3000) |
| 所在路径 | `server/services/websocket.service.ts`, `server/ime/ime-websocket.service.ts`, `server/services/camera-event-websocket.service.ts` |
| 启动方式 | 随主API进程自动初始化 (`initWebSocketServer(server)`) |
| 监听端口 | **3000** (与HTTP共享，路径升级) |
| 备注 | **与API共用同一进程和端口**，使用`noServer`模式升级HTTP连接 |

### 1.4 PostgreSQL

| 字段 | 内容 |
|------|------|
| 服务名称 | PostgreSQL |
| 服务类型 | 关系数据库 (主数据库) |
| 连接配置 | `DATABASE_URL` in `.env` |
| 监听端口 | **5432** |
| ORM | Drizzle ORM |
| Schema | `drizzle/schema.ts` + 20个领域schema文件 |
| 表数量 | 794+ |
| 备注 | 开发环境本地PG，生产可Docker部署 |

### 1.5 MSSQL (ERP连接×2)

| 字段 | 内容 |
|------|------|
| 服务名称 | TianSi ERP MSSQL |
| 服务类型 | 外部ERP数据库 (只读查询) |
| 连接配置 | `TIANSI_MSSQL_*` in `.env` |
| 端口 | **1433** |
| 路由 | `server/erp/tiansi-erp.router.ts` |

| 字段 | 内容 |
|------|------|
| 服务名称 | 金蝶K/3 MSSQL |
| 服务类型 | 外部ERP数据库 (只读查询) |
| 连接配置 | `KINGDEE_MSSQL_*` in `.env` |
| 端口 | **1433** |
| 路由 | `server/erp/kingdee-erp.router.ts`, `server/erp/kingdee-mssql.ts` |

**⚠ 架构风险**: MSSQL ERP被tRPC路由直接查询，前端请求可触发ERP查询。建议评估是否需要中间缓存层。

### 1.6 Redis

| 字段 | 内容 |
|------|------|
| 服务名称 | Redis (可选) |
| 服务类型 | 缓存 |
| 连接配置 | `REDIS_URL` in `.env.production` |
| 端口 | **6379** |
| 实现 | `server/cache-manager.ts` — 当`REDIS_URL`不存在时自动降级为内存缓存 |
| 备注 | **开发环境不需要Redis**，仅生产环境使用 |

### 1.7 Worker/异步任务

| 字段 | 内容 |
|------|------|
| 服务名称 | 内进程Worker |
| 服务类型 | 异步任务处理 |
| 所在路径 | `server/workers/` |
| Worker列表 | `clawWorker.ts`, `externalSyncWorker.ts`, `knowledgeWorker.ts`, `payrollCalculator.ts`, `solutionEngineWorker.ts` |
| 执行方式 | **主API进程内同步/异步执行** |
| 备注 | **⚠ 潜在性能风险**: Worker未独立进程，计算密集型任务(如payroll)在主进程执行 |

### 1.8 定时任务

| 字段 | 内容 |
|------|------|
| 实现方式 | `setInterval` / 内存定时器 |
| 涉及文件 | `server/cache-manager.ts`, `server/cache/cache-service.ts`, `server/erp/tiansi-erp-integration.ts`, `server/queue/message-queue.ts` 等10个文件 |
| 备注 | 无外部Cron/调度系统，所有定时任务随API进程启动/停止 |

### 1.9 Nginx (Docker部署模式)

| 字段 | 内容 |
|------|------|
| 配置文件 | `docker/nginx.conf`, `docker/default.conf` |
| 用途 | 反向代理(Docker部署时) |
| 端口 | **80/443** (docker-compose.windows.yml) |
| 备注 | 仅Docker部署模式使用，本地开发不需要 |

### 1.10 PM2 (生产进程管理)

| 字段 | 内容 |
|------|------|
| 配置文件 | `ecosystem.config.cjs`, `ecosystem.config.js` |
| 进程名 | `grt-system` |
| 模式 | fork (单实例) |
| 入口 | `dist/index.js` |
| 备注 | 生产环境使用PM2管理Node进程 |

---

## 2. 端口清单

| 端口 | 协议 | 服务 | 来源文件 | 对外暴露 | 备注 |
|------|------|------|----------|----------|------|
| **3000** | HTTP/WS | Express API + tRPC + WebSocket + 前端托管 | `server/_core/index.ts:317`, `docker-compose.yml` | 是 | **主服务端口，承载全部功能** |
| **5173** | HTTP | Vite Dev Server | Vite默认 | 仅开发 | 开发模式下Vite HMR端口 |
| **5432** | TCP | PostgreSQL | `.env:DATABASE_URL`, `docker-compose.yml` | Docker内部 | 主数据库 |
| **6379** | TCP | Redis | `.env.production:REDIS_URL`, `docker-compose.yml` | Docker内部 | 仅生产环境 |
| **1433** | TCP | TianSi MSSQL | `.env:TIANSI_MSSQL_*` | 内网 | ERP直连 (10.2.1.230) |
| **1433** | TCP | 金蝶K/3 MSSQL | `.env:KINGDEE_MSSQL_*` | 内网 | ERP直连 (10.2.1.249) |
| **80** | HTTP | Nginx (Docker) | `docker-compose.windows.yml` | 是 | Docker部署模式 |
| **443** | HTTPS | Nginx (Docker) | `docker-compose.windows.yml` | 是 | Docker部署模式 |
| **8080** | HTTP | Adminer (DB管理) | `docker-compose.yml` | Docker内部 | 数据库管理工具 |
| **3306** | TCP | MySQL (Docker Windows) | `docker-compose.windows.yml` | Docker内部 | Windows Docker模式备选 |

---

## 3. 环境变量清单

### 3.1 核心配置

| 变量名 | 所在文件 | 用途 | 敏感 | 值 |
|--------|----------|------|------|-----|
| NODE_ENV | .env.development/.production | 运行环境 | 否 | development/production |
| PORT | .env | API监听端口 | 否 | 3000 |
| LOCAL_AUTH | .env | 本地认证模式 | 否 | true |
| APP_REGION | .env.development | 应用区域 | 否 | china |

### 3.2 数据库

| 变量名 | 所在文件 | 用途 | 敏感 | 值 |
|--------|----------|------|------|-----|
| DATABASE_URL | .env, .env.development, .env.production | PostgreSQL连接串 | **是** | ***MASKED*** |
| REDIS_URL | .env.production | Redis连接串 | **是** | ***MASKED*** |
| TIANSI_MSSQL_HOST | .env | TianSi ERP地址 | **是** | ***MASKED*** |
| TIANSI_MSSQL_PORT | .env | TianSi ERP端口 | 是 | ***MASKED*** |
| TIANSI_MSSQL_DATABASE | .env | TianSi ERP数据库名 | 是 | ***MASKED*** |
| TIANSI_MSSQL_USER | .env | TianSi ERP用户名 | **是** | ***MASKED*** |
| TIANSI_MSSQL_PASSWORD | .env | TianSi ERP密码 | **是** | ***MASKED*** |
| KINGDEE_MSSQL_HOST | .env | 金蝶K/3地址 | **是** | ***MASKED*** |
| KINGDEE_MSSQL_PORT | .env | 金蝶K/3端口 | 是 | ***MASKED*** |
| KINGDEE_MSSQL_DATABASE | .env | 金蝶K/3数据库名 | 是 | ***MASKED*** |
| KINGDEE_MSSQL_USER | .env | 金蝶K/3用户名 | **是** | ***MASKED*** |
| KINGDEE_MSSQL_PASSWORD | .env | 金蝶K/3密码 | **是** | ***MASKED*** |

### 3.3 安全与认证

| 变量名 | 所在文件 | 用途 | 敏感 | 值 |
|--------|----------|------|------|-----|
| JWT_SECRET | .env, .env.development, .env.production | JWT签名密钥 | **是** | ***MASKED*** |
| ENCRYPTION_MASTER_KEY | .env, .env.production | 数据加密主密钥 | **是** | ***MASKED*** |
| MICROSOFT_CLIENT_ID | .env | Microsoft OAuth客户端ID | 是 | ***MASKED*** |
| MICROSOFT_CLIENT_SECRET | .env | Microsoft OAuth密钥 | **是** | ***MASKED*** |
| MICROSOFT_TENANT_ID | .env | Microsoft租户ID | 是 | ***MASKED*** |
| SYNC_SECRET_KEY | .env.production | 同步HMAC密钥 | **是** | ***MASKED*** |

### 3.4 第三方集成

| 变量名 | 所在文件 | 用途 | 敏感 | 值 |
|--------|----------|------|------|-----|
| OPENAI_API_KEY | .env.production | OpenAI API密钥 | **是** | ***MASKED*** |
| OPENAI_BASE_URL | .env.production | OpenAI API地址 | 否 | ***MASKED*** |
| OPENAI_MODEL | .env.production | AI模型名 | 否 | ***MASKED*** |
| AI_PROVIDER | .env.development/.production | AI提供者(gemini/openai/ollama) | 否 | 按环境 |
| JIANDAOYUN_API_KEY | .env | 简道云API密钥 | **是** | ***MASKED*** |
| JIANDAOYUN_CORP_ID | .env | 简道云企业ID | 是 | ***MASKED*** |
| DINGTALK_WEBHOOK_URL | .env.production | 钉钉Webhook | 是 | ***MASKED*** |
| DINGTALK_WEBHOOK_SECRET | .env.production | 钉钉Webhook密钥 | **是** | ***MASKED*** |
| WECOM_WEBHOOK_URL | .env.production | 企业微信Webhook | 是 | ***MASKED*** |

### 3.5 邮件

| 变量名 | 所在文件 | 用途 | 敏感 | 值 |
|--------|----------|------|------|-----|
| SMTP_HOST | .env.production | SMTP服务器 | 否 | ***MASKED*** |
| SMTP_PORT | .env.production | SMTP端口 | 否 | ***MASKED*** |
| SMTP_USER | .env.production | SMTP用户名 | 是 | ***MASKED*** |
| SMTP_PASS | .env.production | SMTP密码 | **是** | ***MASKED*** |
| SMTP_SECURE | .env.production | SMTP加密 | 否 | ***MASKED*** |
| EMAIL_FROM_NAME | .env.production | 发件人名称 | 否 | ***MASKED*** |
| EMAIL_FROM_ADDRESS | .env.production | 发件人地址 | 否 | ***MASKED*** |

### 3.6 前端(VITE_)

| 变量名 | 所在文件 | 用途 | 敏感 | 值 |
|--------|----------|------|------|-----|
| VITE_APP_ID | .env | 应用ID | 否 | local |
| VITE_LOCAL_AUTH | .env | 前端本地认证 | 否 | true |
| VITE_ANALYTICS_ENDPOINT | .env | 统计分析端点 | 否 | (空) |
| VITE_ANALYTICS_WEBSITE_ID | .env | 统计网站ID | 否 | (空) |
| VITE_OAUTH_PORTAL_URL | .env.production | OAuth门户URL | 否 | ***MASKED*** |

---

## 4. 部署文件清单

| 文件名 | 路径 | 类别 | 作用 | 关键 | 风险提示 |
|--------|------|------|------|------|----------|
| `.env` | 根目录 | 环境配置 | 主环境变量 | **是** | **⚠ 含敏感密钥(JWT/DB/MSSQL/OAuth)** |
| `.env.development` | 根目录 | 环境配置 | 开发环境 | 是 | 含DB连接串 |
| `.env.production` | 根目录 | 环境配置 | 生产环境 | **是** | **⚠ 含全部生产密钥** |
| `.env.test` | 根目录 | 环境配置 | 测试环境 | 否 | |
| `.env.example` | 根目录 | 模板 | 环境变量模板 | 是 | 安全(无实际值) |
| `docker-compose.yml` | 根目录 | Docker | 主Docker编排 | **是** | PG+Redis+API+Adminer |
| `docker-compose.windows.yml` | 根目录 | Docker | Windows Docker编排 | 是 | MySQL+Redis+API+Nginx |
| `Dockerfile` | 根目录 | Docker | API容器构建 | **是** | |
| `docker/Dockerfile` | docker/ | Docker | Docker目录构建 | 是 | |
| `docker/Dockerfile.backend` | docker/ | Docker | 后端独立构建 | 是 | |
| `docker/docker-compose.yml` | docker/ | Docker | Docker子目录编排 | 是 | **⚠ 可能与根目录compose冲突** |
| `docker/nginx.conf` | docker/ | Nginx | Nginx主配置 | **是** | Docker反向代理 |
| `docker/default.conf` | docker/ | Nginx | Nginx站点配置 | 是 | |
| `docker/init-db.sql` | docker/ | 数据库 | DB初始化SQL | **是** | |
| `docker/backup.sh` | docker/ | 运维 | 备份脚本 | 是 | |
| `docker/restore.sh` | docker/ | 运维 | 恢复脚本 | 是 | |
| `ecosystem.config.cjs` | 根目录 | PM2 | PM2进程管理 | **是** | 生产进程配置 |
| `ecosystem.config.js` | 根目录 | PM2 | PM2配置(JS版) | 是 | **⚠ 两个PM2配置并存** |
| `package.json` | 根目录 | NPM | 依赖+脚本 | **是** | 99依赖+34devDeps |
| `pnpm-lock.yaml` | 根目录 | PNPM | 依赖锁定 | **是** | |
| `drizzle.config.ts` | 根目录 | Drizzle | ORM/迁移配置 | **是** | |
| `tsconfig.json` | 根目录 | TypeScript | TS编译配置 | **是** | strict:true |
| `vite.config.ts` | 根目录 | Vite | 前端构建配置 | **是** | |
| `deploy/start.sh` | deploy/ | 部署 | 启动脚本 | 是 | |
| `deploy/stop.sh` | deploy/ | 部署 | 停止脚本 | 是 | |
| `deploy/restart.sh` | deploy/ | 部署 | 重启脚本 | 是 | |
| `deploy/backup.sh` | deploy/ | 部署 | 备份脚本 | 是 | |
| `deploy/restore.sh` | deploy/ | 部署 | 恢复脚本 | 是 | |
| `deploy/upgrade.sh` | deploy/ | 部署 | 升级脚本 | 是 | |
| `deploy/healthcheck.sh` | deploy/ | 部署 | 健康检查 | 是 | |
| `deploy/install.sh` | deploy/ | 部署 | 安装脚本 | 是 | |
| `deploy/build_release.sh` | deploy/ | 部署 | 构建发布包 | 是 | |
| `release/grt-linux-deploy-pack.tar.gz` | release/ | 发布包 | Linux部署包 | 是 | |
| `uploads/` | 根目录 | 上传目录 | 用户上传文件 | 是 | 当前仅`contracts/`子目录 |

---

## 5. 风险与待确认项

### ⚠ 已确认风险

| 编号 | 风险 | 位置 | 严重度 | 说明 |
|------|------|------|--------|------|
| R-01 | **敏感凭证在.env中明文存储** | `.env`, `.env.production` | 高 | JWT_SECRET, DB密码, MSSQL密码, OAuth密钥, API密钥均明文。建议使用Vault或加密环境变量 |
| R-02 | **.env未被.gitignore排除** | `.gitignore` | 高 | 需确认.env是否已提交到Git。如已提交，需轮换所有密钥 |
| R-03 | **Worker在主进程执行** | `server/workers/` | 中 | payrollCalculator等计算密集型Worker与API共进程，高负载时可能阻塞请求 |
| R-04 | **MSSQL ERP被API直接查询** | `server/erp/` | 中 | 前端请求可触发ERP查询，无缓存层，ERP故障可能级联影响API |
| R-05 | **两个PM2配置并存** | `ecosystem.config.cjs` + `.js` | 低 | 可能导致部署混淆 |
| R-06 | **多个docker-compose文件** | 根目录 + docker/ | 低 | 根目录和docker/各有一份，可能存在双部署模式混淆 |
| R-07 | **WebSocket与HTTP共用进程** | `server/_core/index.ts` | 低 | 3个WebSocket服务与API共进程共端口，高并发WS可能影响API |
| R-08 | **定时任务无外部调度** | `server/cache-manager.ts`等 | 低 | 所有定时任务用setInterval实现，进程重启会丢失状态 |

### ❓ 待人工确认

| 编号 | 问题 | 说明 |
|------|------|------|
| Q-01 | `.env`是否已提交Git？ | 如已提交，需轮换全部密钥 |
| Q-02 | 生产环境是Docker部署还是PM2直跑？ | 两种配置均存在 |
| Q-03 | Nginx是否在生产环境使用？ | docker/nginx.conf存在但未确认部署 |
| Q-04 | Redis在生产是否已启用？ | `.env.production`有REDIS_URL但开发环境未配 |
| Q-05 | MSSQL ERP (10.2.1.230/249) 当前是否可达？ | 网络连通性需确认 |
| Q-06 | `uploads/contracts/`目录是否需要持久化？ | Docker部署需挂载卷 |
| Q-07 | IIS是否曾经或当前使用？ | 未发现web.config，但Windows环境可能有历史配置 |
| Q-08 | `release/`下的tar.gz是否为最新可用部署包？ | 日期为20260323 |

---

## 目录结构摘要

```
grt-implementation-plan/
├── client/                 # 前端 (React + Vite)
│   ├── src/
│   │   ├── pages/          # 535+ 页面组件
│   │   ├── components/     # UI组件 + Layout
│   │   ├── config/         # 菜单配置
│   │   ├── contexts/       # React Context
│   │   ├── hooks/          # 自定义Hooks
│   │   └── lib/            # 工具库 + i18n
│   └── public/             # 静态资源
├── server/                 # 后端 (Express + tRPC)
│   ├── _core/              # 入口 + tRPC + 中间件
│   ├── routers/            # 338 tRPC路由文件
│   ├── db/                 # 数据库连接 (23模块)
│   ├── services/           # 业务服务
│   ├── workers/            # 异步Worker (5个)
│   ├── erp/                # ERP集成 (TianSi + 金蝶)
│   ├── seed/               # 种子数据
│   └── permissions/        # 权限配置
├── drizzle/                # Drizzle Schema + 迁移
├── shared/                 # 前后端共享类型
├── scripts/                # 工具脚本 + 种子 + PDCA验证
├── data/                   # Excel数据源
├── deploy/                 # 部署脚本
├── docker/                 # Docker配置
├── release/                # 构建发布包
├── uploads/                # 用户上传
├── docs/                   # 文档
├── .env*                   # 环境变量 (12个文件)
├── docker-compose*.yml     # Docker编排 (2个)
├── ecosystem.config.*      # PM2配置 (2个)
├── Dockerfile              # Docker构建
├── package.json            # 依赖 (99+34)
└── vite.config.ts          # Vite构建
```
