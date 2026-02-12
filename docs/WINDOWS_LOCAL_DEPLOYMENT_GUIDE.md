# GRT智能系统 - Windows 11本地部署完整指南

## 目录

1. [系统要求](#系统要求)
2. [快速开始](#快速开始)
3. [环境配置](#环境配置)
4. [常见问题排查](#常见问题排查)
5. [性能优化](#性能优化)
6. [生产部署](#生产部署)

---

## 系统要求

### 硬件要求

- **操作系统**: Windows 11（Server或Professional版本）
- **处理器**: Intel i5/i7或AMD Ryzen 5/7（4核以上）
- **内存**: 最少8GB RAM（建议16GB）
- **磁盘空间**: 最少10GB可用空间

### 软件要求

| 软件 | 版本 | 下载链接 |
|------|------|--------|
| Node.js | v18.0.0+ | https://nodejs.org/ |
| pnpm | v8.0.0+ | https://pnpm.io/installation |
| Git | 最新版本 | https://git-scm.com/ |
| PowerShell | 7.0+ (可选) | https://github.com/PowerShell/PowerShell |

### 验证安装

打开PowerShell或CMD，运行以下命令验证版本：

```bash
node -v          # 应显示 v24.13.0 或更高
pnpm -v          # 应显示 10.4.1 或更高
git --version    # 应显示 git version 2.x.x
```

---

## 快速开始

### 第1步：克隆或下载项目

如果尚未下载项目，请从Manus平台导出最新版本：

```bash
# 进入项目目录
cd D:\Projects\grt-implementation-plan
```

### 第2步：安装依赖

```bash
# 清除旧的node_modules和缓存
pnpm store prune
rmdir /s /q node_modules
del pnpm-lock.yaml

# 重新安装依赖
pnpm install
```

**预期耗时**: 5-10分钟（取决于网络速度）

### 第3步：配置环境变量

1. 在项目根目录创建 `.env.local` 文件
2. 复制 `.env.local.example` 的内容到 `.env.local`
3. 填入您的配置值（见下一节）

### 第4步：初始化数据库

```bash
# 生成数据库迁移文件
pnpm db:push

# 如果出现错误，尝试：
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 第5步：启动开发服务器

```bash
# 启动开发服务器
pnpm dev

# 预期输出：
# Server running on http://localhost:3000/
# WebSocket collaboration available at ws://localhost:3000/ws/collaboration
```

### 第6步：访问应用

打开浏览器，访问：
```
http://localhost:3000
```

---

## 环境配置

### 必需的环境变量

#### OAuth认证配置

这些变量用于Manus OAuth认证系统：

```env
# 从Manus平台获取的应用ID
VITE_APP_ID=your_app_id_here

# Manus OAuth门户URL（不要修改）
VITE_OAUTH_PORTAL_URL=https://api.manus.im

# OAuth服务器URL（不要修改）
OAUTH_SERVER_URL=https://api.manus.im
```

**获取VITE_APP_ID的步骤**：
1. 登录 https://grtplan-mkq7dyle.manus.space
2. 进入 Settings → OAuth Applications
3. 复制 Application ID

#### 数据库配置

```env
# MySQL/TiDB连接字符串
DATABASE_URL=mysql://root:password@localhost:3306/grt_dev
```

**本地MySQL安装**（如果尚未安装）：
- 下载: https://dev.mysql.com/downloads/mysql/
- 安装后，创建数据库：
  ```sql
  CREATE DATABASE grt_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

#### JWT配置

```env
# 用于会话加密的密钥（最少32个字符）
JWT_SECRET=your_very_long_secret_key_at_least_32_characters_long
```

**生成安全的JWT_SECRET**：
```powershell
# 在PowerShell中运行
$bytes = [System.Text.Encoding]::UTF8.GetBytes((Get-Random -SetSeed (Get-Date).Ticks).ToString())
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
[System.Convert]::ToBase64String($hash)
```

### 可选的环境变量

```env
# 应用标题和Logo
VITE_APP_TITLE=GRT智能系统
VITE_APP_LOGO=https://your-cdn.com/logo.png

# Manus内置API（用于LLM、存储等）
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_key_here

# 分析配置
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=your_website_id

# 所有者信息
OWNER_NAME=Your Name
OWNER_OPEN_ID=your_open_id
```

### WebSocket HMR配置（用于热模块替换）

如果遇到WebSocket连接错误，添加以下配置：

```env
# Vite HMR配置
VITE_HMR_HOST=localhost
VITE_HMR_PORT=3000
VITE_HMR_PROTOCOL=ws
```

---

## 常见问题排查

### 问题1：主界面闪烁且不显示内容

**症状**：
- 打开localhost:3000后，页面闪烁
- 浏览器控制台显示"Failed to construct 'URL': Invalid URL"
- WebSocket连接失败

**原因**：
- VITE_OAUTH_PORTAL_URL或VITE_APP_ID未配置
- 环境变量未正确加载

**解决方案**：

```powershell
# 1. 检查.env.local文件是否存在
Test-Path D:\Projects\grt-implementation-plan\.env.local

# 2. 确保.env.local包含以下内容
# VITE_OAUTH_PORTAL_URL=https://api.manus.im
# VITE_APP_ID=your_app_id_here

# 3. 重启开发服务器
# Ctrl+C 停止当前服务器
# pnpm dev 重新启动
```

### 问题2：WebSocket连接失败 - Invalid frame header

**症状**：
- 浏览器控制台显示"WebSocket connection to 'ws://localhost:3000/?token=...' failed: Invalid frame header"
- Vite显示"server connection lost. Polling for restart..."

**原因**：
- Vite HMR配置不正确
- 防火墙阻止WebSocket连接

**解决方案**：

```powershell
# 1. 添加HMR配置到.env.local
# VITE_HMR_HOST=localhost
# VITE_HMR_PORT=3000
# VITE_HMR_PROTOCOL=ws

# 2. 检查防火墙设置
# Windows防火墙 → 允许应用通过防火墙 → 找到Node.js → 勾选专用和公用

# 3. 如果在虚拟机中运行，配置正确的主机IP
# VITE_HMR_HOST=your_machine_ip  # 例如 192.168.1.100
```

### 问题3：数据库连接失败

**症状**：
- 启动时显示"Error: connect ECONNREFUSED 127.0.0.1:3306"
- 无法执行 `pnpm db:push`

**原因**：
- MySQL服务未运行
- DATABASE_URL配置错误

**解决方案**：

```powershell
# 1. 检查MySQL服务状态
Get-Service -Name MySQL* | Select-Object Name, Status

# 2. 启动MySQL服务
Start-Service -Name MySQL80  # 或您的MySQL版本

# 3. 验证连接
mysql -u root -p -h localhost

# 4. 创建数据库
# CREATE DATABASE grt_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 问题4：pnpm install 失败

**症状**：
- 显示"ERR_PNPM_NO_MATCHING_VERSION"或网络错误

**原因**：
- npm registry不可用
- 网络连接问题

**解决方案**：

```powershell
# 1. 清除pnpm缓存
pnpm store prune

# 2. 更换npm registry
pnpm config set registry https://registry.npmmirror.com

# 3. 重新安装
pnpm install

# 4. 恢复原registry（可选）
pnpm config set registry https://registry.npmjs.org/
```

### 问题5：端口3000被占用

**症状**：
- 显示"Error: listen EADDRINUSE :::3000"

**解决方案**：

```powershell
# 1. 查找占用3000端口的进程
netstat -ano | findstr :3000

# 2. 杀死进程（假设PID为12345）
taskkill /PID 12345 /F

# 3. 或使用不同的端口
$env:VITE_DEV_SERVER_PORT=3001
pnpm dev
```

---

## 性能优化

### 1. 增加Node.js内存限制

如果遇到内存不足错误，增加Node.js可用内存：

```powershell
# 在PowerShell中设置环境变量
$env:NODE_OPTIONS = "--max-old-space-size=4096"

# 或在.env.local中添加
NODE_OPTIONS=--max-old-space-size=4096
```

### 2. 优化pnpm安装速度

```powershell
# 使用更快的registry
pnpm config set registry https://registry.npmmirror.com

# 并行安装
pnpm install --parallel
```

### 3. 启用磁盘缓存

```powershell
# 在vite.config.ts中已配置，确保.vite目录存在
# 如果缓存过大，可以清除：
rmdir /s /q .vite
```

---

## 生产部署

### 构建生产版本

```powershell
# 构建前端和后端
pnpm build

# 输出目录：
# - dist/  （前端构建输出）
# - server/  （后端代码）
```

### 使用PM2进行生产部署

```powershell
# 1. 安装PM2
npm install -g pm2

# 2. 启动应用
pm2 start "pnpm dev" --name grt-system

# 3. 查看应用状态
pm2 status

# 4. 查看日志
pm2 logs grt-system

# 5. 设置开机自启
pm2 startup
pm2 save
```

### Docker部署（可选）

项目包含 `Dockerfile`，可以构建Docker镜像：

```powershell
# 构建镜像
docker build -t grt-system:latest .

# 运行容器
docker run -p 3000:3000 -e DATABASE_URL=... grt-system:latest
```

---

## 获取帮助

如遇到问题，请按以下步骤操作：

1. **查看错误日志**：
   - 浏览器F12 → Console标签页
   - PowerShell终端输出

2. **检查环境配置**：
   - 确保.env.local存在且包含所有必需变量
   - 验证DATABASE_URL和VITE_OAUTH_PORTAL_URL

3. **重启开发服务器**：
   - Ctrl+C停止服务器
   - `pnpm dev` 重新启动

4. **清除缓存**：
   - `pnpm store prune`
   - `rmdir /s /q node_modules`
   - `pnpm install`

5. **联系支持**：
   - 访问 https://help.manus.im
   - 提供错误日志和系统信息

---

## 下一步

- 阅读 [项目README](../README.md)
- 查看 [API文档](./API_DOCUMENTATION.md)
- 学习 [开发指南](./DEVELOPMENT_GUIDE.md)
