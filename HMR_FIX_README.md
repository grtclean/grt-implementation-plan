# GRT系统 HMR修复 - 快速入门

## 🚀 最快解决方案（30秒）

### 方案1：一键修复 + 启动（推荐）

```powershell
# 在PowerShell中运行：
cd D:\Projects\grt-implementation-plan
powershell -ExecutionPolicy Bypass -File ".\start-grt-fixed.ps1"

# 然后选择选项 4（完全修复 + 启动）
```

### 方案2：自动修复脚本

```powershell
cd D:\Projects\grt-implementation-plan
powershell -ExecutionPolicy Bypass -File ".\fix-hmr-windows.ps1"
```

## 📋 问题症状

- ❌ 页面反复刷新/闪烁
- ❌ 浏览器显示白屏
- ❌ 控制台错误：`WebSocket connection failed: Invalid frame header`

## 🔧 文件说明

| 文件 | 用途 | 使用场景 |
|------|------|--------|
| `fix-hmr-windows.ps1` | 完整的自动修复脚本 | 一次性完整修复 |
| `start-grt-fixed.ps1` | 交互式启动脚本 | 日常开发启动 |
| `.env.local.hmr-fix` | 环境变量配置模板 | 手动配置 |
| `vite.config.hmr.ts` | Vite配置示例 | 参考配置 |
| `HMR_FIX_GUIDE.md` | 详细指南 | 深入了解 |

## ⚡ 快速修复步骤

### 步骤1：停止服务器

```powershell
# 在PowerShell中按 Ctrl+C
# 或在任务管理器中结束 node.exe 进程
```

### 步骤2：清除缓存

```powershell
cd D:\Projects\grt-implementation-plan

# 清除Vite缓存
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
```

### 步骤3：配置环境变量

复制 `.env.local.hmr-fix` 到 `.env.local`：

```powershell
Copy-Item ".env.local.hmr-fix" ".env.local" -Force
```

### 步骤4：启动服务器

```powershell
pnpm dev
```

### 步骤5：测试

访问 `http://localhost:3000` - 页面应该正常加载

## 🎯 三种启动模式

### 模式1：标准模式（WebSocket）- 最快

```powershell
.\start-grt-fixed.ps1
# 选择选项 1
```

**优点**：最快的热更新  
**缺点**：某些网络环境下可能失败

### 模式2：HTTP轮询模式 - 更稳定

```powershell
.\start-grt-fixed.ps1
# 选择选项 2
```

**优点**：更稳定，兼容性好  
**缺点**：性能略低

### 模式3：禁用HMR模式 - 最稳定

```powershell
.\start-grt-fixed.ps1
# 选择选项 3
```

**优点**：完全不依赖HMR，最稳定  
**缺点**：需要手动刷新浏览器才能看到更改

## 🔍 诊断步骤

### 1. 打开浏览器开发者工具

```
按 F12 或 Ctrl+Shift+I
```

### 2. 查看Console标签

查看是否有错误信息，特别是：
- `WebSocket connection failed`
- `Invalid frame header`
- `server connection lost`

### 3. 查看Network标签

查看是否有多个重定向请求

### 4. 查看开发服务器日志

在PowerShell窗口中查看是否有错误信息

## 🆘 常见问题

### Q: 修复脚本需要管理员权限吗？

A: 不需要。但如果遇到权限问题，请以管理员身份运行PowerShell。

### Q: 修复脚本会删除我的代码吗？

A: 不会。脚本只清除缓存，不会删除源代码。

### Q: 修复后问题仍然存在怎么办？

A: 尝试以下步骤：
1. 使用模式3（禁用HMR）
2. 清除浏览器Cookie
3. 使用无痕模式测试
4. 重启计算机

### Q: 如何回滚修复？

A: 修复脚本不会修改源代码。如需回滚：
1. 恢复 `.env.local` 的备份
2. 重新运行 `pnpm install`

## 📞 获取帮助

### 查看详细指南

```powershell
# 打开详细指南
notepad HMR_FIX_GUIDE.md
```

### 查看脚本帮助

```powershell
Get-Help .\fix-hmr-windows.ps1 -Full
```

### 生成诊断报告

```powershell
# 收集系统信息
systeminfo > system-info.txt
node --version > node-version.txt
pnpm --version > pnpm-version.txt
```

## 📚 相关文档

- [详细HMR修复指南](./HMR_FIX_GUIDE.md)
- [项目README](./README.md)
- [开发指南](./DEVELOPMENT_GUIDE.md)

## 🎉 成功标志

修复成功的标志：

✓ 页面正常加载，不再闪烁  
✓ 浏览器Console中没有HMR相关错误  
✓ 修改代码后页面自动更新（如果启用HMR）  
✓ 访问 http://localhost:3000 显示GRT系统主界面  

## 📝 修复记录

| 日期 | 问题 | 解决方案 | 状态 |
|------|------|--------|------|
| 2026-02-05 | WebSocket HMR连接失败 | 创建修复脚本 | ✓ 已解决 |

---

**需要帮助？** 请查看 [HMR_FIX_GUIDE.md](./HMR_FIX_GUIDE.md) 获取详细信息。

**最后更新**: 2026-02-05
