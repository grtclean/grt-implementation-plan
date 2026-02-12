# GRT系统 HMR修复指南

## 问题描述

在Windows 11本地开发环境中，访问 `http://localhost:3000` 时出现以下症状：

- ❌ 页面反复刷新/闪烁
- ❌ 浏览器显示白屏
- ❌ 控制台错误：`WebSocket connection failed: Invalid frame header`
- ❌ 提示：`[vite] server connection lost. Polling for restart...`

## 根本原因

Vite开发服务器的**热模块替换（HMR）WebSocket连接失败**，导致客户端无限尝试重新连接，造成页面反复刷新。

## 快速修复（推荐）

### 方法1：使用自动修复脚本（最简单）

```powershell
# 1. 打开PowerShell
# 2. 导航到项目目录
cd D:\Projects\grt-implementation-plan

# 3. 运行修复脚本
powershell -ExecutionPolicy Bypass -File ".\fix-hmr-windows.ps1"

# 脚本会自动：
# ✓ 停止开发服务器
# ✓ 清除Vite缓存
# ✓ 清除浏览器缓存
# ✓ 重新安装依赖
# ✓ 更新Vite配置
# ✓ 配置环境变量
# ✓ 启动开发服务器
```

### 方法2：手动修复（分步骤）

#### 步骤1：停止开发服务器

```powershell
# 在PowerShell中按 Ctrl+C 停止当前运行的服务器
# 或者在任务管理器中结束 node.exe 进程
```

#### 步骤2：清除缓存

```powershell
cd D:\Projects\grt-implementation-plan

# 清除Vite缓存
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.esbuild -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# 清除浏览器缓存（Chrome）
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*" -ErrorAction SilentlyContinue

# 清除浏览器缓存（Edge）
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache\*" -ErrorAction SilentlyContinue
```

#### 步骤3：配置环境变量

复制 `.env.local.hmr-fix` 的内容到 `.env.local`：

```powershell
# 方法A：使用PowerShell
Copy-Item ".env.local.hmr-fix" ".env.local" -Force

# 方法B：手动编辑
# 1. 打开 .env.local
# 2. 添加以下内容：
```

```env
# Vite HMR Configuration
VITE_HMR_HOST=localhost
VITE_HMR_PORT=3000
VITE_HMR_PROTOCOL=ws

# Database
DATABASE_URL=mysql://root:Gerry123456@localhost:3306/grt_dev

# Node Environment
NODE_ENV=development
PORT=3000
```

#### 步骤4：重新安装依赖

```powershell
cd D:\Projects\grt-implementation-plan
pnpm install
```

#### 步骤5：启动开发服务器

```powershell
cd D:\Projects\grt-implementation-plan
pnpm dev
```

#### 步骤6：测试

1. 打开浏览器访问 `http://localhost:3000`
2. 页面应该正常加载，不再闪烁
3. 打开开发者工具（F12）检查Console是否有错误

## 如果问题仍然存在

### 方案A：禁用HMR（最稳定）

编辑 `.env.local`，添加：

```env
VITE_HMR_DISABLED=true
```

然后重启开发服务器：

```powershell
pnpm dev
```

### 方案B：使用HTTP轮询代替WebSocket

编辑 `.env.local`，修改：

```env
VITE_HMR_PROTOCOL=http
```

然后重启开发服务器：

```powershell
pnpm dev
```

### 方案C：检查防火墙设置

Windows防火墙可能阻止WebSocket连接：

```powershell
# 1. 打开Windows防火墙
# 2. 点击"允许应用通过防火墙"
# 3. 找到 node.exe 或 pnpm
# 4. 确保勾选"专用"和"公用"
# 5. 点击"确定"
```

### 方案D：检查端口占用

```powershell
# 查看端口3000是否被占用
netstat -ano | findstr :3000

# 如果被占用，结束占用进程
# 获取PID后，运行：
taskkill /PID <PID> /F

# 或者使用不同的端口
$env:PORT=3001
pnpm dev
```

## 浏览器开发者工具诊断

### 打开开发者工具

```
按 F12 或 Ctrl+Shift+I
```

### 检查Network标签

1. 点击 **Network** 标签
2. 查看是否有多个重定向请求
3. 记录重定向的URL

### 检查Console标签

1. 点击 **Console** 标签
2. 查看是否有错误信息
3. 记录错误内容

### 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|--------|
| `WebSocket connection failed: Invalid frame header` | HMR WebSocket连接失败 | 使用方案A（禁用HMR）或方案B（HTTP轮询） |
| `[vite] server connection lost` | Vite服务器连接丢失 | 重启开发服务器 |
| `Cannot find module` | 依赖缺失 | 运行 `pnpm install` |
| `EADDRINUSE: address already in use :::3000` | 端口被占用 | 使用不同的端口或结束占用进程 |
| `ECONNREFUSED` | 无法连接到服务器 | 确保开发服务器正在运行 |

## 完整的修复脚本使用

### 基本用法

```powershell
.\fix-hmr-windows.ps1
```

### 高级选项

```powershell
# 跳过依赖重新安装（加快速度）
.\fix-hmr-windows.ps1 -SkipNodeModules

# 干运行模式（不实际执行，仅显示将要执行的操作）
.\fix-hmr-windows.ps1 -DryRun

# 指定项目路径
.\fix-hmr-windows.ps1 -ProjectPath "D:\Projects\grt-implementation-plan"

# 组合使用
.\fix-hmr-windows.ps1 -SkipNodeModules -DryRun
```

### 脚本执行流程

```
1. 验证项目路径
   ↓
2. 停止开发服务器
   ↓
3. 清除Vite缓存
   ↓
4. 清除浏览器缓存
   ↓
5. 重新安装依赖
   ↓
6. 更新Vite配置
   ↓
7. 创建/更新环境变量文件
   ↓
8. 启动开发服务器
   ↓
9. 访问 http://localhost:3000
```

## 预防措施

### 定期维护

```powershell
# 每周清除一次缓存
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
```

### 保持依赖最新

```powershell
pnpm update
```

### 定期重启开发服务器

建议每天重启一次开发服务器，特别是在长时间开发后。

## 文件说明

| 文件 | 说明 |
|------|------|
| `fix-hmr-windows.ps1` | 自动修复脚本（推荐） |
| `vite.config.hmr.ts` | Vite HMR配置示例 |
| `.env.local.hmr-fix` | 环境变量配置模板 |
| `HMR_FIX_GUIDE.md` | 本文档 |

## 获取帮助

### 查看脚本帮助

```powershell
Get-Help .\fix-hmr-windows.ps1 -Full
```

### 查看开发服务器日志

```powershell
# 在PowerShell中查看完整的服务器输出
pnpm dev 2>&1 | Tee-Object -FilePath "dev-server.log"
```

### 生成诊断报告

```powershell
# 收集系统信息
systeminfo > system-info.txt

# 收集Node.js版本
node --version > node-version.txt

# 收集pnpm版本
pnpm --version > pnpm-version.txt

# 收集npm包版本
pnpm list > package-versions.txt
```

## 常见问题（FAQ）

### Q: 修复脚本需要管理员权限吗？

A: 不需要。但如果遇到权限问题，请以管理员身份运行PowerShell。

### Q: 修复脚本会删除我的代码吗？

A: 不会。脚本只清除缓存和node_modules中的临时文件，不会删除源代码。

### Q: 修复脚本需要多长时间？

A: 通常需要3-5分钟，取决于网络速度和磁盘性能。

### Q: 我可以在修复过程中中断吗？

A: 可以，但建议让脚本完整运行。如果中断，请手动重启开发服务器。

### Q: 如何回滚修复？

A: 修复脚本不会修改源代码，只是清除缓存和重新安装依赖。如需回滚，可以：
1. 恢复 `.env.local` 的备份
2. 重新运行 `pnpm install`

### Q: 修复后问题仍然存在怎么办？

A: 请尝试以下步骤：
1. 使用方案A（禁用HMR）
2. 使用方案B（HTTP轮询）
3. 检查防火墙设置
4. 检查端口占用
5. 重启计算机

## 在线部署

如果您的系统也在线部署到 `https://grtplan-mkq7dyle.manus.space/`，请参考：

[在线部署指南](./DEPLOYMENT_GUIDE.md)

## 相关文档

- [项目README](./README.md)
- [开发指南](./DEVELOPMENT_GUIDE.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)

---

**最后更新**: 2026-02-05
**作者**: GRT System Development Team
