# GRT智能系统 Windows 11 快速安装指南

> **版本**: v2.5.21  
> **更新日期**: 2026-01-28

---

## 前置要求

| 软件 | 版本要求 | 下载地址 |
|------|----------|----------|
| Node.js | 22.x LTS | https://nodejs.org/ |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/installer/ |
| Git | 最新版 | https://git-scm.com/download/win |
| VS Code | 最新版 | https://code.visualstudio.com/ |

---

## 第一步：安装基础环境

### 1.1 安装 Node.js

1. 下载 Node.js 22.x LTS Windows 安装包
2. 运行安装程序，选择默认选项
3. 验证安装：
   ```powershell
   node --version   # 应显示 v22.x.x
   npm --version    # 应显示 10.x.x
   ```

### 1.2 安装 pnpm

```powershell
npm install -g pnpm
pnpm --version   # 应显示 9.x.x
```

### 1.3 安装 MySQL 8.0

1. 下载 MySQL Installer
2. 选择 "Developer Default" 安装类型
3. 设置 root 密码（请记住此密码）
4. 完成安装后，验证服务运行：
   ```powershell
   Get-Service MySQL*
   ```

---

## 第二步：解压项目代码

### 2.1 创建项目目录

```powershell
# 创建项目目录
mkdir D:\Projects
cd D:\Projects
```

### 2.2 解压代码包

将 `grt-system-v2.5.21.tar.gz` 复制到 `D:\Projects\` 目录，然后解压：

```powershell
# 使用 Git Bash 或 7-Zip 解压
# Git Bash 方式:
tar -xzvf grt-system-v2.5.21.tar.gz

# 或使用 7-Zip 图形界面解压
```

解压后目录结构：
```
D:\Projects\grt-implementation-plan\
├── client\           # 前端代码
├── server\           # 后端代码
├── drizzle\          # 数据库schema
├── scripts\          # 部署脚本
├── docs\             # 文档
├── package.json
└── ...
```

---

## 第三步：初始化数据库

### 3.1 登录 MySQL

```powershell
mysql -u root -p
# 输入root密码
```

### 3.2 执行初始化脚本

**方式一：使用提供的SQL脚本**

```sql
-- 在MySQL命令行中执行
source D:/Projects/grt-implementation-plan/scripts/mysql-init.sql
```

**方式二：手动创建**

```sql
-- 创建数据库
CREATE DATABASE grt_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（请修改密码）
CREATE USER 'grt_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

---

## 第四步：配置环境变量

### 4.1 创建环境配置文件

在项目根目录创建 `.env` 文件：

```powershell
cd D:\Projects\grt-implementation-plan
notepad .env
```

### 4.2 填写环境变量

```env
# 数据库配置
DATABASE_URL=mysql://grt_user:YourSecurePassword123!@localhost:3306/grt_system

# JWT密钥（请生成随机字符串）
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# 应用配置
NODE_ENV=production
VITE_APP_TITLE=GRT智能系统
VITE_APP_ID=grt-local

# OAuth配置（本地开发可留空或配置本地认证）
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=

# 可选：AI服务配置
GEMINI_API_KEY=your-gemini-api-key
```

### 4.3 生成JWT密钥

```powershell
# 使用Node.js生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将生成的字符串填入 `JWT_SECRET`。

---

## 第五步：安装依赖并构建

### 5.1 安装项目依赖

```powershell
cd D:\Projects\grt-implementation-plan
pnpm install
```

### 5.2 同步数据库结构

```powershell
pnpm db:push
```

### 5.3 构建项目

```powershell
pnpm build
```

---

## 第六步：启动服务

### 6.1 开发模式启动

```powershell
pnpm dev
```

访问 http://localhost:3000 查看系统。

### 6.2 生产模式启动

```powershell
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start dist/index.js --name grt-system

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

---

## 第七步：验证安装

### 7.1 检查服务状态

```powershell
# 检查Node服务
pm2 status

# 检查MySQL服务
Get-Service MySQL*

# 检查端口
netstat -an | findstr "3000"
```

### 7.2 访问系统

打开浏览器访问：http://localhost:3000

---

## 常见问题

### Q1: pnpm install 失败

```powershell
# 清理缓存重试
pnpm store prune
pnpm install
```

### Q2: 数据库连接失败

1. 检查MySQL服务是否运行
2. 检查用户名密码是否正确
3. 检查DATABASE_URL格式

### Q3: 端口被占用

```powershell
# 查找占用端口的进程
netstat -ano | findstr "3000"

# 结束进程
taskkill /PID <进程ID> /F
```

### Q4: TypeScript编译错误

```powershell
# 重新安装依赖
rm -rf node_modules
pnpm install
pnpm build
```

---

## 下一步

1. **配置Claude Code** - 参考 `docs/dev-specs/ai-collaboration-workflow.md`
2. **配置ChatGPT** - 参考 `docs/dev-specs/chatgpt-prompts.md`
3. **运维管理** - 参考 `docs/deployment/windows11-operations-guide.md`

---

## 技术支持

如遇问题，请检查：
1. `logs/` 目录下的日志文件
2. PM2日志：`pm2 logs`
3. MySQL错误日志

---

**祝您部署顺利！**
