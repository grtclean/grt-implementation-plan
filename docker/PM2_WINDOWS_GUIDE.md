# Windows PM2 进程管理指南

本指南详细说明如何在Windows 11上使用PM2管理GRT智能系统的Node.js进程。

## 目录

1. [安装和配置](#安装和配置)
2. [基本命令](#基本命令)
3. [进程管理](#进程管理)
4. [监控和日志](#监控和日志)
5. [自启动配置](#自启动配置)
6. [故障排查](#故障排查)

---

## 安装和配置

### 前置条件

- Windows 11
- Node.js 18+ (已安装)
- npm 或 pnpm (已安装)
- 管理员权限

### 安装PM2

```powershell
# 全局安装PM2
npm install -g pm2

# 验证安装
pm2 --version

# 更新PM2到最新版本
npm install -g pm2@latest
```

### 配置PM2

```powershell
# 设置PM2主目录（可选）
$env:PM2_HOME = "C:\Users\$env:USERNAME\.pm2"

# 初始化PM2
pm2 init

# 验证配置
pm2 info
```

---

## 基本命令

### 启动应用

```powershell
# 使用ecosystem.config.js启动所有应用
cd C:\GRT-Implementation
pm2 start ecosystem.config.js

# 启动特定应用
pm2 start ecosystem.config.js --only grt-app

# 使用特定环境启动
pm2 start ecosystem.config.js --env production
```

### 停止应用

```powershell
# 停止所有应用
pm2 stop all

# 停止特定应用
pm2 stop grt-app

# 停止并删除应用
pm2 delete grt-app
```

### 重启应用

```powershell
# 重启所有应用
pm2 restart all

# 重启特定应用
pm2 restart grt-app

# 0秒停机重启（适用于集群模式）
pm2 reload all
```

### 查看应用列表

```powershell
# 列出所有应用
pm2 list

# 查看应用详细信息
pm2 info grt-app

# 查看应用配置
pm2 show grt-app
```

---

## 进程管理

### 集群模式配置

在`ecosystem.config.js`中配置集群模式：

```javascript
{
  instances: "max",      // 使用所有CPU核心
  exec_mode: "cluster",  // 集群模式
  max_memory_restart: "1G", // 内存超过1G时重启
}
```

### 内存管理

```powershell
# 设置内存限制（1GB）
pm2 start app.js --max-memory-restart 1G

# 查看内存使用情况
pm2 monit

# 手动重启超过内存限制的进程
pm2 restart grt-app
```

### 进程监听

```powershell
# 实时监控进程
pm2 monit

# 查看进程树
pm2 prettylist

# 查看进程统计
pm2 stats
```

---

## 监控和日志

### 查看日志

```powershell
# 查看所有日志
pm2 logs

# 查看特定应用日志
pm2 logs grt-app

# 查看错误日志
pm2 logs grt-app --err

# 查看最后100行日志
pm2 logs grt-app --lines 100

# 实时跟踪日志
pm2 logs grt-app --follow
```

### 日志文件位置

日志文件默认位置：

```
C:\Users\<username>\.pm2\logs\
├── grt-app-out.log      # 标准输出
├── grt-app-error.log    # 错误输出
├── grt-backup-out.log   # 备份服务输出
└── grt-monitor-out.log  # 监控服务输出
```

### 清理日志

```powershell
# 清理所有日志
pm2 flush

# 清理特定应用日志
pm2 flush grt-app

# 保存日志快照
pm2 save
```

### 监控仪表板

```powershell
# 启动Web监控仪表板（需要PM2 Plus）
pm2 web

# 访问地址: http://localhost:9615
```

---

## 自启动配置

### Windows启动时自动启动PM2

#### 方法1: 使用PM2内置命令（推荐）

```powershell
# 以管理员身份运行PowerShell

# 生成启动脚本
pm2 startup windows-startup --user $env:USERNAME

# 保存当前进程列表
pm2 save

# 验证启动脚本已创建
Get-ScheduledTask -TaskName "PM2" -ErrorAction SilentlyContinue
```

#### 方法2: 手动创建Windows任务计划

```powershell
# 以管理员身份运行PowerShell

# 创建任务计划
$TaskName = "GRT-PM2-Startup"
$TaskPath = "\GRT\"
$Action = New-ScheduledTaskAction -Execute "C:\Program Files\nodejs\npm.cmd" -Argument "start pm2 start ecosystem.config.js" -WorkingDirectory "C:\GRT-Implementation"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserID "$env:USERDOMAIN\$env:USERNAME" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Action $Action -Trigger $Trigger -Principal $Principal -Description "GRT智能系统PM2自启动"

# 验证任务
Get-ScheduledTask -TaskName $TaskName
```

#### 方法3: 使用批处理脚本

创建`C:\GRT-Implementation\startup.bat`：

```batch
@echo off
REM GRT智能系统启动脚本
cd C:\GRT-Implementation
call pm2 start ecosystem.config.js
```

然后在任务计划中执行此脚本。

### 验证自启动配置

```powershell
# 查看PM2启动脚本
pm2 startup

# 查看已保存的进程列表
pm2 list

# 重启计算机测试
Restart-Computer

# 重启后验证进程
pm2 list
```

### 禁用自启动

```powershell
# 删除启动脚本
pm2 unstartup windows-startup

# 删除任务计划
Unregister-ScheduledTask -TaskName "PM2" -Confirm:$false
```

---

## 故障排查

### 常见问题

#### 问题1: PM2命令找不到

```powershell
# 解决方案1: 检查npm全局路径
npm config get prefix

# 解决方案2: 添加npm全局路径到PATH
$env:Path += ";C:\Users\$env:USERNAME\AppData\Roaming\npm"

# 解决方案3: 重新安装PM2
npm install -g pm2@latest
```

#### 问题2: 应用无法启动

```powershell
# 检查应用日志
pm2 logs grt-app --err

# 检查应用配置
pm2 show grt-app

# 检查环境变量
pm2 env grt-app

# 手动运行应用测试
node dist/index.js
```

#### 问题3: 内存泄漏

```powershell
# 监控内存使用
pm2 monit

# 启用内存限制重启
pm2 restart grt-app --max-memory-restart 1G

# 分析内存使用
pm2 profile grt-app
```

#### 问题4: 进程频繁重启

```powershell
# 查看重启历史
pm2 logs grt-app

# 检查最小运行时间设置
pm2 show grt-app | grep min_uptime

# 增加最小运行时间
pm2 restart grt-app --min-uptime 30s
```

### 调试模式

```powershell
# 启用PM2调试日志
$env:PM2_DEBUG = "true"
pm2 start ecosystem.config.js

# 查看详细日志
pm2 logs --raw

# 禁用调试模式
$env:PM2_DEBUG = "false"
```

### 重置PM2

```powershell
# 警告: 此操作将删除所有进程和日志
pm2 kill

# 重新初始化
pm2 init

# 重新启动应用
pm2 start ecosystem.config.js
```

---

## 高级配置

### 性能优化

```javascript
// ecosystem.config.js
{
  instances: "max",
  exec_mode: "cluster",
  max_memory_restart: "1G",
  
  // 优雅关闭
  kill_timeout: 5000,
  listen_timeout: 3000,
  
  // 重启策略
  restart_delay: 4000,
  max_restarts: 10,
  min_uptime: "10s",
  
  // 环境变量
  env: {
    NODE_ENV: "production",
    NODE_OPTIONS: "--max-old-space-size=2048"
  }
}
```

### 健康检查

```powershell
# 定期检查应用健康状态
$HealthCheckUrl = "http://localhost:3000/api/health"

while ($true) {
    try {
        $Response = Invoke-WebRequest -Uri $HealthCheckUrl -UseBasicParsing -TimeoutSec 5
        if ($Response.StatusCode -eq 200) {
            Write-Host "应用健康状态: OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "应用健康检查失败，正在重启..." -ForegroundColor Red
        pm2 restart grt-app
    }
    
    Start-Sleep -Seconds 60
}
```

### 日志轮转

```powershell
# 安装日志轮转模块
npm install -g pm2-logrotate

# 配置日志轮转
pm2 install pm2-logrotate

# 配置轮转参数
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
```

---

## 常用命令速查表

| 命令 | 说明 |
|------|------|
| `pm2 start ecosystem.config.js` | 启动所有应用 |
| `pm2 stop all` | 停止所有应用 |
| `pm2 restart all` | 重启所有应用 |
| `pm2 reload all` | 0秒停机重启 |
| `pm2 delete all` | 删除所有应用 |
| `pm2 list` | 列出应用 |
| `pm2 logs` | 查看日志 |
| `pm2 monit` | 实时监控 |
| `pm2 save` | 保存进程列表 |
| `pm2 resurrect` | 恢复进程列表 |
| `pm2 startup` | 配置自启动 |
| `pm2 unstartup` | 禁用自启动 |

---

## 相关文档

- [PM2官方文档](https://pm2.keymetrics.io/)
- [Windows任务计划](https://docs.microsoft.com/zh-cn/windows/win32/taskschd/task-scheduler-start-page)
- [PowerShell文档](https://docs.microsoft.com/zh-cn/powershell/)

---

**最后更新**: 2026年2月5日  
**版本**: 1.0.0
