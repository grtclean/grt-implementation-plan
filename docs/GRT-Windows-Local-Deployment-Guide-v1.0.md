# GRT智能系统 Windows本地部署指南 v1.0

**文档版本**: 1.0  
**更新日期**: 2026年1月24日  
**作者**: Manus AI  
**适用系统**: Windows 10/11 (64位)

---

## 目录

1. [环境要求](#1-环境要求)
2. [软件安装](#2-软件安装)
3. [项目部署](#3-项目部署)
4. [数据库配置](#4-数据库配置)
5. [环境变量配置](#5-环境变量配置)
6. [启动服务](#6-启动服务)
7. [验证部署](#7-验证部署)
8. [生产环境配置](#8-生产环境配置)
9. [常见问题排查](#9-常见问题排查)
10. [维护与备份](#10-维护与备份)

---

## 1. 环境要求

### 1.1 硬件要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|----------|----------|
| CPU | 4核心 | 8核心及以上 |
| 内存 | 8GB | 16GB及以上 |
| 硬盘 | 50GB SSD | 100GB SSD |
| 网络 | 100Mbps | 1Gbps |

### 1.2 软件要求

| 软件 | 版本要求 | 用途 |
|------|----------|------|
| Node.js | 22.x LTS | 运行时环境 |
| MySQL | 8.0+ | 数据库 |
| Git | 2.40+ | 版本控制 |
| pnpm | 8.0+ | 包管理器 |

### 1.3 网络要求

- 能够访问 npm 镜像源（可配置国内镜像）
- 能够访问 GitHub（用于克隆代码）
- 开放端口：3000（应用）、3306（MySQL）

---

## 2. 软件安装

### 2.1 安装 Node.js

**方法一：官网下载安装（推荐）**

1. 访问 Node.js 官网：https://nodejs.org/
2. 下载 **22.x LTS** 版本的 Windows 安装包（.msi）
3. 双击运行安装程序，按默认选项完成安装
4. 安装完成后，打开 **PowerShell** 或 **命令提示符**，验证安装：

```powershell
node --version
# 应显示 v22.x.x

npm --version
# 应显示 10.x.x
```

**方法二：使用 nvm-windows（多版本管理）**

1. 下载 nvm-windows：https://github.com/coreybutler/nvm-windows/releases
2. 安装 nvm-setup.exe
3. 安装 Node.js：

```powershell
nvm install 22
nvm use 22
```

### 2.2 安装 pnpm

打开 PowerShell（以管理员身份运行）：

```powershell
# 安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
# 应显示 8.x.x 或更高
```

**配置国内镜像（可选，加速下载）**：

```powershell
pnpm config set registry https://registry.npmmirror.com
```

### 2.3 安装 MySQL 8.0

**方法一：MySQL Installer（推荐）**

1. 访问 MySQL 官网：https://dev.mysql.com/downloads/installer/
2. 下载 **MySQL Installer for Windows**
3. 运行安装程序，选择 **Custom** 安装类型
4. 选择安装组件：
   - MySQL Server 8.0
   - MySQL Workbench（可选，图形化管理工具）
5. 配置 MySQL Server：
   - 选择 **Standalone MySQL Server**
   - 端口保持默认 **3306**
   - 设置 root 密码（请牢记此密码）
   - 配置为 Windows Service，服务名 **MySQL80**
   - 勾选 **Start the MySQL Server at System Startup**

6. 完成安装后，验证服务状态：

```powershell
# 检查 MySQL 服务状态
Get-Service MySQL80

# 或使用 mysql 命令行
mysql -u root -p
# 输入密码后应进入 MySQL 命令行
```

**方法二：使用 Docker Desktop（适合开发环境）**

1. 安装 Docker Desktop for Windows
2. 运行 MySQL 容器：

```powershell
docker run -d --name grt-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=your_password mysql:8.0
```

### 2.4 安装 Git

1. 访问 Git 官网：https://git-scm.com/download/win
2. 下载并安装 Git for Windows
3. 安装时选择：
   - 默认编辑器：选择您熟悉的编辑器（如 VS Code）
   - PATH 环境：选择 **Git from the command line and also from 3rd-party software**
   - 行尾转换：选择 **Checkout as-is, commit Unix-style line endings**

4. 验证安装：

```powershell
git --version
# 应显示 git version 2.x.x
```

---

## 3. 项目部署

### 3.1 获取项目代码

**方式一：从 GitHub 克隆（如果有仓库）**

```powershell
# 创建项目目录
mkdir C:\Projects
cd C:\Projects

# 克隆项目
git clone https://github.com/your-org/grt-implementation-plan.git
cd grt-implementation-plan
```

**方式二：从压缩包解压**

1. 将项目压缩包复制到 `C:\Projects\` 目录
2. 解压到 `C:\Projects\grt-implementation-plan\`

### 3.2 安装项目依赖

```powershell
cd C:\Projects\grt-implementation-plan

# 安装所有依赖
pnpm install

# 如果遇到权限问题，以管理员身份运行 PowerShell
```

**依赖安装可能遇到的问题**：

| 问题 | 解决方案 |
|------|----------|
| 网络超时 | 配置国内镜像：`pnpm config set registry https://registry.npmmirror.com` |
| node-gyp 编译失败 | 安装 Windows Build Tools：`npm install -g windows-build-tools` |
| 权限不足 | 以管理员身份运行 PowerShell |

### 3.3 项目目录结构

```
grt-implementation-plan/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── pages/         # 页面组件
│   │   ├── contexts/      # React Context
│   │   └── lib/           # 工具库
│   └── public/            # 静态资源
├── server/                 # 后端代码
│   ├── services/          # 业务服务
│   ├── _core/             # 核心框架
│   ├── routers.ts         # tRPC 路由
│   └── db.ts              # 数据库操作
├── drizzle/               # 数据库 Schema
│   ├── schema.ts          # 表结构定义
│   └── migrations/        # 迁移文件
├── shared/                # 共享代码
├── docs/                  # 文档
├── .env.example           # 环境变量模板
├── package.json           # 项目配置
└── pnpm-lock.yaml         # 依赖锁定文件
```

---

## 4. 数据库配置

### 4.1 创建数据库

打开 MySQL 命令行或 MySQL Workbench：

```sql
-- 创建数据库
CREATE DATABASE grt_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（可选，推荐生产环境使用）
CREATE USER 'grt_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4.2 执行数据库迁移

```powershell
cd C:\Projects\grt-implementation-plan

# 生成迁移文件并执行
pnpm db:push
```

**如果 db:push 交互式提示卡住**，可以手动执行 SQL 脚本（见附录 A）。

### 4.3 验证数据库表

```sql
USE grt_system;
SHOW TABLES;
```

应该看到以下核心表（部分列表）：

| 表名 | 说明 |
|------|------|
| user | 用户表 |
| change_requests | 变更请求表 |
| change_approvals | 变更审批表 |
| releases | 发布表 |
| release_packages | 发布包表 |
| acknowledgements | 版本确认表 |
| cab_members | CAB成员表 |
| governance_audit_logs | 治理审计日志 |
| job_profiles | 岗位画像表 |
| candidates | 候选人表 |
| onboarding_plans | 入职计划表 |
| probation_reviews | 转正评估表 |
| project_stage_gates | 项目阶段门表 |
| project_gate_approvals | 阶段门审批表 |
| project_gate_documents | 阶段门文档表 |

---

## 5. 环境变量配置

### 5.1 创建环境变量文件

在项目根目录创建 `.env` 文件：

```powershell
cd C:\Projects\grt-implementation-plan
copy .env.example .env
```

### 5.2 编辑环境变量

使用文本编辑器（如 VS Code、Notepad++）打开 `.env` 文件，配置以下变量：

```env
# ============ 数据库配置 ============
DATABASE_URL=mysql://grt_user:your_secure_password@localhost:3306/grt_system

# ============ 应用配置 ============
NODE_ENV=development
PORT=3000

# ============ 安全配置 ============
JWT_SECRET=your_jwt_secret_key_at_least_32_characters_long

# ============ OAuth 配置（如果使用 Manus OAuth）============
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/oauth

# ============ 可选：第三方服务 ============
# Microsoft Graph API（用于邮件通知）
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id

# Gemini API（用于 AI 功能）
GEMINI_API_KEY=your_gemini_api_key

# 简道云 API（如果需要数据同步）
JIANDAOYUN_API_KEY=your_api_key
JIANDAOYUN_CORP_ID=your_corp_id
```

### 5.3 环境变量说明

| 变量名 | 必需 | 说明 |
|--------|------|------|
| DATABASE_URL | ✅ | MySQL 连接字符串 |
| JWT_SECRET | ✅ | JWT 签名密钥，至少32字符 |
| NODE_ENV | ✅ | 环境标识：development/production |
| PORT | ❌ | 应用端口，默认3000 |
| VITE_APP_ID | ❌ | Manus OAuth 应用ID |
| MICROSOFT_CLIENT_ID | ❌ | Microsoft Graph API 客户端ID |
| GEMINI_API_KEY | ❌ | Google Gemini API 密钥 |

---

## 6. 启动服务

### 6.1 开发模式启动

```powershell
cd C:\Projects\grt-implementation-plan

# 启动开发服务器（支持热重载）
pnpm dev
```

启动成功后，您将看到类似输出：

```
[12:00:00] Starting dev server...
[12:00:02] [OAuth] Initialized
[12:00:02] Server running at http://localhost:3000
```

### 6.2 生产模式启动

```powershell
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

### 6.3 使用 PM2 进程管理（推荐生产环境）

```powershell
# 安装 PM2
npm install -g pm2

# 使用 PM2 启动
pm2 start dist/index.js --name grt-system

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs grt-system
```

### 6.4 创建 Windows 服务（可选）

使用 **node-windows** 将应用注册为 Windows 服务：

```powershell
# 安装 node-windows
npm install -g node-windows

# 创建服务安装脚本 install-service.js
```

创建 `install-service.js`：

```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'GRT System',
  description: 'GRT智能系统服务',
  script: 'C:\\Projects\\grt-implementation-plan\\dist\\index.js',
  nodeOptions: [],
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'PORT', value: '3000' }
  ]
});

svc.on('install', () => {
  svc.start();
  console.log('服务已安装并启动');
});

svc.install();
```

运行安装：

```powershell
node install-service.js
```

---

## 7. 验证部署

### 7.1 访问应用

打开浏览器，访问：http://localhost:3000

您应该看到 GRT 系统登录页面或首页。

### 7.2 检查 API 健康状态

```powershell
# 使用 curl 或浏览器访问
curl http://localhost:3000/api/trpc/health
```

### 7.3 验证数据库连接

在应用日志中应该看到：

```
[Database] Connected to MySQL
[Database] Connection pool initialized
```

### 7.4 功能验证清单

| 功能 | 验证方法 | 预期结果 |
|------|----------|----------|
| 首页加载 | 访问 http://localhost:3000 | 显示系统首页 |
| 用户登录 | 点击登录按钮 | 跳转到登录页面 |
| 实施路径 | 访问 /roadmap | 显示实施路径页面 |
| 风险控制 | 访问 /compliance | 显示合规仪表板 |
| 系统分析 | 访问 /analytics | 显示系统分析页面 |

---

## 8. 生产环境配置

### 8.1 使用 Nginx 反向代理

安装 Nginx for Windows：https://nginx.org/en/docs/windows.html

配置 `nginx.conf`：

```nginx
http {
    upstream grt_backend {
        server 127.0.0.1:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # 重定向到 HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name your-domain.com;

        ssl_certificate     C:/nginx/ssl/cert.pem;
        ssl_certificate_key C:/nginx/ssl/key.pem;

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
    }
}
```

### 8.2 配置 SSL 证书

**使用 Let's Encrypt（推荐）**：

1. 安装 win-acme：https://www.win-acme.com/
2. 运行 wacs.exe 申请证书
3. 配置自动续期

**使用自签名证书（仅测试）**：

```powershell
# 使用 OpenSSL 生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem
```

### 8.3 防火墙配置

```powershell
# 允许 HTTP/HTTPS 入站
New-NetFirewallRule -DisplayName "GRT HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "GRT HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

---

## 9. 常见问题排查

### 9.1 端口被占用

```powershell
# 查看端口占用
netstat -ano | findstr :3000

# 终止占用进程
taskkill /PID <进程ID> /F
```

### 9.2 MySQL 连接失败

**错误**: `ECONNREFUSED 127.0.0.1:3306`

**解决方案**：
1. 检查 MySQL 服务是否运行：`Get-Service MySQL80`
2. 检查防火墙是否阻止 3306 端口
3. 验证用户名密码是否正确

### 9.3 pnpm install 失败

**错误**: `EPERM: operation not permitted`

**解决方案**：
1. 以管理员身份运行 PowerShell
2. 删除 node_modules 和 pnpm-lock.yaml 后重试
3. 检查杀毒软件是否阻止

### 9.4 前端页面空白

**可能原因**：
1. 检查浏览器控制台错误
2. 确认 NODE_ENV 配置正确
3. 清除浏览器缓存

### 9.5 API 请求 401 错误

**解决方案**：
1. 检查 JWT_SECRET 是否配置
2. 清除浏览器 Cookie 后重新登录
3. 检查 OAuth 配置是否正确

### 9.6 中文乱码问题

**数据库乱码**：
```sql
ALTER DATABASE grt_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**PowerShell 乱码**：
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

---

## 10. 维护与备份

### 10.1 数据库备份

**手动备份**：

```powershell
# 创建备份目录
mkdir C:\Backups\grt

# 执行备份
mysqldump -u root -p grt_system > C:\Backups\grt\backup_$(Get-Date -Format "yyyyMMdd").sql
```

**自动备份（使用 Windows 任务计划）**：

1. 创建备份脚本 `backup.bat`：

```batch
@echo off
set BACKUP_DIR=C:\Backups\grt
set DATE=%date:~0,4%%date:~5,2%%date:~8,2%
mysqldump -u root -p your_password grt_system > %BACKUP_DIR%\backup_%DATE%.sql
```

2. 在任务计划程序中创建每日任务

### 10.2 日志管理

**应用日志位置**：
- PM2 日志：`C:\Users\<用户名>\.pm2\logs\`
- 自定义日志：`C:\Projects\grt-implementation-plan\logs\`

**日志轮转配置**（PM2）：

```powershell
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 10.3 更新部署

```powershell
cd C:\Projects\grt-implementation-plan

# 拉取最新代码
git pull origin main

# 安装新依赖
pnpm install

# 执行数据库迁移
pnpm db:push

# 重新构建
pnpm build

# 重启服务
pm2 restart grt-system
```

### 10.4 监控建议

| 监控项 | 工具 | 阈值 |
|--------|------|------|
| CPU 使用率 | Windows 性能监视器 | < 80% |
| 内存使用 | Windows 性能监视器 | < 80% |
| 磁盘空间 | Windows 性能监视器 | > 20% 可用 |
| 应用响应时间 | PM2 监控 | < 500ms |
| 数据库连接数 | MySQL Workbench | < 100 |

---

## 附录 A：数据库初始化 SQL 脚本

如果 `pnpm db:push` 无法正常执行，可以手动运行以下 SQL 脚本：

```sql
-- 详见 docs/database-init.sql 文件
```

---

## 附录 B：环境变量完整列表

```env
# 完整环境变量模板
# 详见 .env.example 文件
```

---

## 附录 C：快速启动命令速查

| 操作 | 命令 |
|------|------|
| 安装依赖 | `pnpm install` |
| 开发模式 | `pnpm dev` |
| 生产构建 | `pnpm build` |
| 生产启动 | `pnpm start` |
| 数据库迁移 | `pnpm db:push` |
| 运行测试 | `pnpm test` |
| PM2 启动 | `pm2 start dist/index.js --name grt-system` |
| PM2 重启 | `pm2 restart grt-system` |
| PM2 停止 | `pm2 stop grt-system` |
| PM2 日志 | `pm2 logs grt-system` |

---

## 技术支持

如遇到部署问题，请联系：
- 技术支持邮箱：support@example.com
- 文档仓库：https://github.com/your-org/grt-docs

---

**文档结束**
